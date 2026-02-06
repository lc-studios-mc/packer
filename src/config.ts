import path from "node:path";
import type { Blueprint } from "./blueprint";
import type { OneOrMore } from "./types";
import { asArray } from "./utils";

export type PackLayer = {
	dir: string;
	name?: string;
	include?: OneOrMore<string>;
	exclude?: OneOrMore<string>;
};

export const PackTargetMode = {
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

export type PackPluginArgs = {
	blueprint: Blueprint;
	packConfig: ResolvedPackConfig;
	signal: AbortSignal;
};

export type PackPluginFunction = (args: PackPluginArgs) => void | Promise<void>;

export type PackPlugin =
	| PackPluginFunction
	| {
			apply: PackPluginFunction;
			name?: string;
	  };

export type PackConfig = {
	outDir: string;
	name?: string;
	layers?: OneOrMore<PackLayer>;
	targets?: OneOrMore<PackTarget>;
	plugins?: OneOrMore<PackPlugin>;
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

export type ResolvedPackPlugin = {
	apply: PackPluginFunction;
	name?: string;
};

export type ResolvedPackConfig = {
	outDir: string;
	name: string;
	layers: ResolvedPackLayer[];
	targets: ResolvedPackTarget[];
	plugins: ResolvedPackPlugin[];
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

const resolvePackPlugin = (plugin: PackPlugin, index: number): ResolvedPackPlugin => {
	if (typeof plugin === "function") {
		return {
			apply: plugin,
		};
	} else {
		return {
			name: plugin.name,
			apply: plugin.apply,
		};
	}
};

const resolvePackConfig = (pack: PackConfig): ResolvedPackConfig => {
	const outDir = path.resolve(pack.outDir);
	return {
		outDir,
		name: pack.name ?? path.basename(outDir),
		layers: asArray(pack.layers).map(resolvePackLayer),
		targets: asArray(pack.targets).map(resolvePackTarget),
		plugins: asArray(pack.plugins).map(resolvePackPlugin),
	};
};

export const resolveBuildConfig = (config: BuildConfig): ResolvedBuildConfig => {
	return {
		packs: asArray(config.packs).map(resolvePackConfig),
		archives: asArray(config.archives).map((p) => path.resolve(p)),
	};
};
