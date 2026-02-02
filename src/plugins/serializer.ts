import type { PackPlugin } from "@/config";
import { EntrySourceKind, type EntrySource } from "@/entry-source";
import { getStringifier, type Stringifier } from "@/serializer";
import { globMap } from "@/utils";
import deepmerge from "@fastify/deepmerge";
import path from "node:path";

export type SerializerOptions = {
	path?: string;
	patterns?: string | string[];
	ignore?: string | string[];
	separator?: string;
	encoding?: BufferEncoding;
	stringifiers?: Record<string, Stringifier>;
};

export const createSerializerPlugin = (options: SerializerOptions): PackPlugin => ({
	name: "serializer",
	apply: ({ blueprint }) => {
		const merge = deepmerge({ all: true });

		const processEntry = (key: string, sources: EntrySource[]): void => {
			if (sources.length <= 0) return;

			const ext = path.extname(key);

			const stringifier = getStringifier(ext, options.stringifiers);
			if (stringifier === undefined) {
				throw new Error(`No stringifier available for file type '${ext}'`);
			}

			const finalTexts: string[] = [];
			const pendingObjects: object[] = [];

			const flushPendingObjects = () => {
				if (pendingObjects.length <= 0) return;
				const merged = merge(...pendingObjects);
				pendingObjects.length = 0;
				try {
					const text = stringifier(merged);
					finalTexts.push(text);
				} catch (error) {
					throw new Error("Failed to stringify", { cause: error });
				}
			};

			for (const source of sources) {
				if (source.kind === EntrySourceKind.Object) {
					pendingObjects.push(source.data);
					continue;
				}

				if (source.kind === EntrySourceKind.Buffer) {
					flushPendingObjects();
					finalTexts.push(source.content.toString(options.encoding));
					continue;
				}

				throw new Error(`Cannot serialize EntrySource of kind '${source.kind}'`);
			}

			flushPendingObjects();

			const finalText = finalTexts.join(options.separator);
			const finalSource: EntrySource = {
				kind: "buffer",
				content: finalText,
				encoding: options.encoding,
			};

			blueprint.map.set(key, [finalSource]);
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
