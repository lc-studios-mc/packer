import path from "node:path";
import type { OneOrMore } from "./types";
import { asArray } from "./utils";

export type PackLayer = {
	dir: string;
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
	layers?: OneOrMore<PackLayer>;
	targets?: OneOrMore<PackTarget>;
};

export type BuildConfig = {
	packs?: OneOrMore<PackConfig>;
};

export type ResolvedPackLayer = {
	dir: string;
	include: string[];
	exclude: string[];
};

export type ResolvedPackTarget = {
	dest: string;
	mode: PackTargetMode;
};

export type ResolvedPackConfig = {
	outDir: string;
	layers: ResolvedPackLayer[];
	targets: ResolvedPackTarget[];
};

export type ResolvedBuildConfig = {
	packs: ResolvedPackConfig[];
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

const resolvePackLayer = (layer: PackLayer): ResolvedPackLayer => {
	return {
		dir: path.resolve(layer.dir),
		include: asArray(layer.include),
		exclude: asArray(layer.exclude),
	};
};

const resolvePackConfig = (pack: PackConfig): ResolvedPackConfig => {
	return {
		outDir: path.resolve(pack.outDir),
		layers: asArray(pack.layers).map(resolvePackLayer),
		targets: asArray(pack.targets).map(resolvePackTarget),
	};
};

export const resolveBuildConfig = (config: BuildConfig): ResolvedBuildConfig => {
	return {
		packs: asArray(config.packs).map(resolvePackConfig),
	};
};
