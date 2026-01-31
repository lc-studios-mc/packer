import archiver from "archiver";
import type { ConsolaInstance } from "consola";
import fs from "fs-extra";
import path from "node:path";

export type ArchiveSource = {
	path: string;
	name: string;
};

export type ArchiverConfig = {
	sources: ArchiveSource[];
	outFile: string;
	compressionLevel?: number;
	logger?: ConsolaInstance;
	signal?: AbortSignal;
};

export const createArchive = async (config: ArchiverConfig): Promise<void> => {
	const { sources, outFile, compressionLevel = 9, logger, signal } = config;

	signal?.throwIfAborted();

	const outputPath = path.resolve(outFile);

	const outputDir = path.dirname(outputPath);
	await fs.ensureDir(outputDir);

	const output = fs.createWriteStream(outputPath);
	const archive = archiver("zip", {
		zlib: { level: compressionLevel },
	});

	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			signal?.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			archive.destroy();
			reject(new DOMException(signal?.reason, "AbortError"));
		};

		const onError = (err: Error) => {
			cleanup();
			reject(err);
		};

		signal?.addEventListener("abort", onAbort, { once: true });

		output.on("close", () => {
			logger?.info(`Archive created: ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
			cleanup();
			resolve();
		});

		output.on("error", onError);

		archive.on("warning", (error) => {
			logger?.warn(`Archive creation warning: ${error.message}`);
		});

		archive.on("error", onError);

		archive.pipe(output);

		for (const dir of sources) {
			archive.directory(dir.path, dir.name);
		}

		archive.finalize();
	});
};
