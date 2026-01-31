import path from "node:path";
import type { OneOrMore } from "./types";
import { asArray } from "./utils";

export type PackLayer = {
	dir: string;
	name?: string;
	include?: OneOrMore<string>;
	exclude?: OneOrMore<string>;
};

export const PackTargetMode = {
	Copy: "copy",
	Link: "link",
} as const;
export type PackTargetMode = (typeof PackTargetMode)[keyof typeof PackTargetMode];

export type PackTarget =
	| string
	| {
			dest: string;
			/** @default "link" */
			mode?: PackTargetMode;
	  };

export type PackConfig = {
	outDir: string;
	name?: string;
	layers?: OneOrMore<PackLayer>;
	targets?: OneOrMore<PackTarget>;
};

export type BuildConfig = {
	packs?: OneOrMore<PackConfig>;
	archives?: OneOrMore<string>;
};

export type ResolvedPackLayer = {
	dir: string;
	name: string;
	include: string[];
	exclude: string[];
};

export type ResolvedPackTarget = {
	dest: string;
	mode: PackTargetMode;
};

export type ResolvedPackConfig = {
	outDir: string;
	name: string;
	layers: ResolvedPackLayer[];
	targets: ResolvedPackTarget[];
};

export type ResolvedBuildConfig = {
	packs: ResolvedPackConfig[];
	archives: string[];
};

const resolvePackTarget = (target: PackTarget): ResolvedPackTarget => {
	if (typeof target === "string") {
		return {
			dest: path.resolve(target),
			mode: "link",
		};
	} else {
		return {
			dest: path.resolve(target.dest),
			mode: target.mode ?? "link",
		};
	}
};

const resolvePackLayer = (layer: PackLayer, index: number): ResolvedPackLayer => {
	const dir = path.resolve(layer.dir);
	const name = layer.name ?? index.toString();
	const include = asArray(layer.include);
	if (include.length <= 0) {
		include.push("**/*");
	}

	return {
		dir,
		name,
		include,
		exclude: asArray(layer.exclude),
	};
};

const resolvePackConfig = (pack: PackConfig): ResolvedPackConfig => {
	const outDir = path.resolve(pack.outDir);
	return {
		outDir,
		name: pack.name ?? path.basename(outDir),
		layers: asArray(pack.layers).map(resolvePackLayer),
		targets: asArray(pack.targets).map(resolvePackTarget),
	};
};

export const resolveBuildConfig = (config: BuildConfig): ResolvedBuildConfig => {
	return {
		packs: asArray(config.packs).map(resolvePackConfig),
		archives: asArray(config.archives).map((p) => path.resolve(p)),
	};
};
