import type { PackPlugin } from "@/config";
import type { EntrySource } from "@/entry-source";
import { getParser, type Parser } from "@/serializer";
import { globMap } from "@/utils";
import fs from "fs-extra";
import { isBinaryFile } from "isbinaryfile";
import path from "node:path";

export type DeserializerOptions = {
	path?: string;
	patterns?: string | string[];
	ignore?: string | string[];
	encoding?: BufferEncoding;
	parsers?: Record<string, Parser>;
};

const deserializeEntrySource = async (
	source: EntrySource,
	ext: string,
	encoding?: BufferEncoding,
	parsers?: Record<string, Parser>,
): Promise<object> => {
	if (source.kind === "object") return source.data;

	let buffer: string | Buffer;
	let pathDisplay: string;

	if (source.kind === "buffer") {
		buffer = source.content;
		pathDisplay = "(memory buffer)";
	} else {
		buffer = await fs.readFile(source.path);
		pathDisplay = source.path;
	}

	if (await isBinaryFile(buffer)) {
		throw new Error(`Cannot deserialize binary: ${pathDisplay}`);
	}

	const parser = getParser(ext, parsers);
	if (parser === undefined) {
		throw new Error(`No parser available for file type '${ext}'`);
	}

	try {
		const text = buffer.toString(encoding);
		const parsed = parser(text);
		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch (error) {
		throw new Error("Failed to parse", { cause: error });
	}
};

export const createDeserializerPlugin = (options: DeserializerOptions): PackPlugin => ({
	name: "deserializer",
	apply: async ({ blueprint }) => {
		const processEntry = async (key: string, sources: EntrySource[]): Promise<void> => {
			if (sources.length <= 0) return;

			blueprint.map.delete(key);
			const newSources = blueprint.get(key);
			const ext = path.extname(key);

			for (const source of sources) {
				const deserialized = await deserializeEntrySource(
					source,
					ext,
					options.encoding,
					options.parsers,
				);

				newSources.push({
					kind: "object",
					data: deserialized,
				});
			}
		};

		if (options.path !== undefined) {
			const sources = blueprint.get(options.path);
			await processEntry(options.path, sources);
			return;
		}

		if (options.patterns !== undefined) {
			const matches = globMap(blueprint.map, options.patterns, {
				ignore: options.ignore,
			});
			for (const [matchedPath, sources] of matches) {
				await processEntry(matchedPath, sources);
			}
			return;
		}

		throw new Error("'path' or 'patterns' must be specified in the options");
	},
});
