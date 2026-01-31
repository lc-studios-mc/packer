import { Blueprint } from "@/blueprint";
import { PackTargetMode, type ResolvedBuildConfig, type ResolvedPackConfig } from "@/config";
import { EntrySourceKind, type EntrySource } from "@/entry-source";
import { toPosixPath } from "@/utils";
import type { ConsolaInstance } from "consola";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";
import type { BuildExecutionContext } from "./execution";

export type BuildPackContext = {
	packConfig: ResolvedPackConfig;
	parentConfig: ResolvedBuildConfig;
	parentCtx: BuildExecutionContext;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

const ensureCleanOutDir = async (ctx: BuildPackContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	const outDir = ctx.packConfig.outDir;

	if (await fs.pathExists(outDir)) {
		await fs.rm(outDir, { recursive: true });
		ctx.logger.debug(`Deleted outDir: ${outDir}`);
	}

	if (!(await fs.pathExists(outDir))) {
		await fs.mkdirp(outDir);
		ctx.logger.debug(`Created outDir: ${outDir}`);
	}
};

const cleanTargets = async (ctx: BuildPackContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	const promises = ctx.packConfig.targets.map(async (target) => {
		if (!(await fs.pathExists(target.dest))) return;

		const stats = await fs.lstat(target.dest);

		if (target.mode === PackTargetMode.Link) {
			if (!stats.isSymbolicLink()) {
				throw new Error(`Delete ${target.dest} and try again`);
			}

			const linkDest = await fs.readlink(target.dest);
			if (linkDest !== ctx.packConfig.outDir) {
				throw new Error(`Delete ${target.dest} and try again`);
			}

			// No need for removing the good symlink

			return;
		}

		if (target.mode === PackTargetMode.Copy) {
			if (!stats.isDirectory()) {
				throw new Error(`Delete ${target.dest} and try again`);
			}

			await fs.rm(target.dest, { recursive: true });
			ctx.logger.debug(`Deleted existing target (copy) at ${target.dest}`);
		}
	});

	await Promise.all(promises);
};

const scanLayers = async (ctx: BuildPackContext, blueprint: Blueprint): Promise<void> => {
	ctx.signal.throwIfAborted();

	const layers = ctx.packConfig.layers;
	let scannedEntryCount = 0;

	for (const layer of layers) {
		const rootDir = layer.dir;

		if (!(await fs.pathExists(rootDir))) {
			throw new Error(`Root dir of the pack layer '${layer.name}' does not exist: ${rootDir}`);
		}

		const matchedPaths = await glob(layer.include, {
			cwd: rootDir,
			ignore: layer.exclude,
			signal: ctx.signal,
		});

		for (const relativePath of matchedPaths) {
			const absPath = path.join(rootDir, relativePath);
			const destPath = toPosixPath(relativePath);

			blueprint.get(destPath).push({
				kind: EntrySourceKind.File,
				path: absPath,
				packLayer: layer,
			});

			scannedEntryCount++;
		}
	}

	ctx.logger.debug(`Scanned total ${scannedEntryCount} entries from ${layers.length} pack layers`);
};

const executeBlueprintEntry = async (
	absDestPath: string,
	sources: EntrySource[],
): Promise<void> => {
	const source = sources[sources.length - 1]; // Last one wins
	if (!source) return;

	if (source.kind === "file") {
		await fs.ensureDir(path.dirname(absDestPath));
		await fs.copy(source.path, absDestPath);
	} else if (source.kind === "buffer") {
		await fs.outputFile(absDestPath, source.buffer, { encoding: source.encoding });
	} else if (source.kind === "object") {
		await fs.outputFile(absDestPath, String(source.object), { encoding: source.encoding });
	}
};

const executeBlueprint = async (ctx: BuildPackContext, blueprint: Blueprint): Promise<void> => {
	for (const [relativeDestPath, sources] of blueprint.map) {
		ctx.signal.throwIfAborted();

		const absDestPath = path.resolve(path.join(ctx.packConfig.outDir, relativeDestPath));

		await executeBlueprintEntry(absDestPath, sources);

		ctx.logger.debug(`Executed ${relativeDestPath}`);
	}

	ctx.logger.debug(`Executed ${blueprint.map.size} blueprint entries`);
};

const populateTargets = async (ctx: BuildPackContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	const promises = ctx.packConfig.targets.map(async (target) => {
		if (await fs.pathExists(target.dest)) return;

		await fs.ensureDir(path.dirname(target.dest));

		if (target.mode === PackTargetMode.Link) {
			await fs.symlink(ctx.packConfig.outDir, target.dest, "junction");
			ctx.logger.debug(`Created a link at target: ${target.dest}`);
			return;
		}

		if (target.mode === PackTargetMode.Copy) {
			await fs.copy(ctx.packConfig.outDir, target.dest);
			ctx.logger.debug(`Copied output to target: ${target.dest}`);
		}
	});

	await Promise.all(promises);
};

export const buildPack = async (ctx: BuildPackContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	ctx.logger.debug("Building pack...");

	await ensureCleanOutDir(ctx);
	await cleanTargets(ctx);

	const blueprint = new Blueprint();
	await scanLayers(ctx, blueprint);
	await executeBlueprint(ctx, blueprint);

	await populateTargets(ctx);
};
