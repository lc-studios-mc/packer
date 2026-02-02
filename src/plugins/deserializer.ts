import type { PackPlugin } from "@/config";
import type { EntrySource } from "@/entry-source";
import { getParser, type Parser } from "@/serializer";
import { globMap } from "@/utils";
import fs from "fs-extra";
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
	parser: Parser,
	encoding?: BufferEncoding,
): Promise<object> => {
	if (source.kind === "object") return source.data;

	let buffer: string | Buffer;
	if (source.kind === "buffer") {
		buffer = source.content;
	} else {
		buffer = await fs.readFile(source.path);
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

			const ext = path.extname(key);

			const parser = getParser(ext, options.parsers);
			if (parser === undefined) {
				throw new Error(`No parser available for file type '${ext}'`);
			}

			const newSources: EntrySource[] = [];

			for (const source of sources) {
				const deserialized = await deserializeEntrySource(source, parser, options.encoding);

				newSources.push({
					kind: "object",
					data: deserialized,
				});
			}

			blueprint.map.set(key, newSources);
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

		for (const [path, sources] of blueprint.map) {
			processEntry(path, sources);
		}
	},
});
