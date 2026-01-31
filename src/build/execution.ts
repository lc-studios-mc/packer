import type { ResolvedBuildConfig } from "@/config";
import type { ConsolaInstance } from "consola";
import path from "node:path";
import { createArchive, type ArchiveSource } from "./archiver";
import { buildPack } from "./pack";
import { isAbortError } from "@/utils";

export type BuildExecutionContext = {
	buildConfig: ResolvedBuildConfig;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

const buildPacks = async (ctx: BuildExecutionContext): Promise<boolean> => {
	ctx.logger.info(`Building ${ctx.buildConfig.packs.length} packs...`);

	const promises = ctx.buildConfig.packs.map(async (pack) => {
		try {
			await buildPack({
				packConfig: pack,
				parentConfig: ctx.buildConfig,
				parentCtx: ctx,
				logger: ctx.logger.withTag(pack.name),
				signal: ctx.signal,
			});
		} catch (error) {
			if (!isAbortError(error)) {
				ctx.logger.error(`Pack '${pack.name}' build failed:`, error);
			}
			throw error;
		}
	});

	const packBuildResults = await Promise.allSettled(promises);
	const anyPackFailed = packBuildResults.some((result) => result.status === "rejected");

	return anyPackFailed;
};

const createArchives = async (ctx: BuildExecutionContext): Promise<void> => {
	const promises = ctx.buildConfig.archives.map(async (outFile) => {
		try {
			const sources: ArchiveSource[] = ctx.buildConfig.packs.map((pack) => ({
				name: pack.name,
				path: pack.outDir,
			}));
			await createArchive({
				outFile,
				sources,
				logger: ctx.logger,
				signal: ctx.signal,
			});
		} catch (error) {
			if (!isAbortError(error)) {
				ctx.logger.error(`Failed to create archive '${path.basename(outFile)}':`, error);
			}
			throw error;
		}
	});

	await Promise.allSettled(promises);
};

export const executeBuild = async (ctx: BuildExecutionContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	if (ctx.buildConfig.packs.length <= 0) {
		ctx.logger.warn("No packs are configured");
		return;
	}

	const anyPackFailed = await buildPacks(ctx);

	ctx.signal.throwIfAborted();

	if (anyPackFailed) {
		ctx.logger.warn("Skipping archive creation");
	} else {
		await createArchives(ctx);
	}
};
