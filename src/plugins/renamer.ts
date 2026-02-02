import type { PackPlugin } from "@/config";
import type { EntrySource } from "@/entry-source";
import { globMap, toPosixPath } from "@/utils";
import path from "node:path";

type PathFunction = (currentPath: path.ParsedPath) => string;

export type RenamerOptions = {
	path?: string;
	patterns?: string | string[];
	ignore?: string | string[];
	newPath?: string | PathFunction;
};

export const createRenamerPlugin = (options: RenamerOptions): PackPlugin => ({
	name: "renamer",
	apply: ({ blueprint }) => {
		const processEntry = (key: string, sources: EntrySource[]): void => {
			if (sources.length <= 0) return;
			if (options.newPath === undefined) return;

			const parsedPath = path.parse(key);
			const newPathRaw =
				typeof options.newPath === "string" ? options.newPath : options.newPath(parsedPath);
			const newPath = toPosixPath(newPathRaw);

			blueprint.map.delete(key);
			blueprint.get(newPath).push(...sources);
		};

		if (options.path !== undefined) {
			const sources = blueprint.get(options.path);
			processEntry(options.path, sources);
			return;
		}

		if (options.patterns !== undefined) {
			const matches = globMap(blueprint.map, options.patterns, {
				ignore: options.ignore,
			});
			for (const [matchedPath, sources] of matches) {
				processEntry(matchedPath, sources);
			}
			return;
		}

		for (const [path, sources] of blueprint.map) {
			processEntry(path, sources);
		}
	},
});

export const replacePathExt =
	(ext: string): PathFunction =>
	({ dir, name }) => {
		const actualExt = ext.startsWith(".") ? ext : `.${ext}`;
		return path.join(dir, `${name}${actualExt}`);
	};
