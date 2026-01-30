import path from "node:path";
import type {
	BuildConfig,
	PackConfig,
	PackLayer,
	PackTarget,
	ResolvedBuildConfig,
	ResolvedPackConfig,
	ResolvedPackLayer,
	ResolvedPackTarget,
} from "./types";
import { asArray } from "./utils";

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
