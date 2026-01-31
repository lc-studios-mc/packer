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

export type PackModifierArgs = {
	blueprint: Blueprint;
	packConfig: ResolvedPackConfig;
	signal: AbortSignal;
};

export type PackModifierFunction = (args: PackModifierArgs) => void | Promise<void>;

export type PackModifier =
	| PackModifierFunction
	| {
			apply: PackModifierFunction;
			name?: string;
	  };

export type PackConfig = {
	outDir: string;
	name?: string;
	layers?: OneOrMore<PackLayer>;
	targets?: OneOrMore<PackTarget>;
	modifiers?: OneOrMore<PackModifier>;
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

export type ResolvedPackModifier = {
	name: string;
	apply: PackModifierFunction;
};

export type ResolvedPackConfig = {
	outDir: string;
	name: string;
	layers: ResolvedPackLayer[];
	targets: ResolvedPackTarget[];
	modifiers: ResolvedPackModifier[];
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

const resolvePackModifier = (modifier: PackModifier, index: number): ResolvedPackModifier => {
	if (typeof modifier === "function") {
		return {
			name: index.toString(),
			apply: modifier,
		};
	} else {
		return {
			name: modifier.name ?? index.toString(),
			apply: modifier.apply,
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
		modifiers: asArray(pack.modifiers).map(resolvePackModifier),
	};
};

export const resolveBuildConfig = (config: BuildConfig): ResolvedBuildConfig => {
	return {
		packs: asArray(config.packs).map(resolvePackConfig),
		archives: asArray(config.archives).map((p) => path.resolve(p)),
	};
};
