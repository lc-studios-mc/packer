import type { PackPlugin } from "@/config";
import { isFileUrl } from "@/utils";
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ScriptBundlerOptions = {
	entry: string;
	tsconfig?: string;
	minify?: boolean;
	sourceMap?: boolean;
};

export const createScriptBundlerPlugin = (options: ScriptBundlerOptions): PackPlugin => ({
	name: "script-bundler",
	apply: async ({ blueprint, packConfig }) => {
		const entry = path.resolve(options.entry);
		const outdir = path.join(packConfig.outDir, "scripts");
		const sourceRoot = path.dirname(entry);
		const tsconfig = options.tsconfig === undefined ? undefined : path.resolve(options.tsconfig);

		let bundleOptions: esbuild.BuildOptions = {
			entryPoints: [entry],
			outdir,
			tsconfig,
			bundle: true,
			minify: options.minify,
			external: ["@minecraft"],
			format: "esm",
			platform: "node",
			write: false, // Use custom write implementation
		};

		if (options.sourceMap) {
			bundleOptions = {
				...bundleOptions,
				sourcemap: "linked",
				sourceRoot,
			};
		}

		const buildResult = await esbuild.build(bundleOptions);

		for (const outputFile of buildResult.outputFiles ?? []) {
			let content: string | Buffer;

			if (path.extname(outputFile.path) === ".map") {
				// Tweak source map contents to work with the Minecraft script debugger
				const data = JSON.parse(outputFile.text);
				const sources = data.sources as string[];
				data.sources = sources.map((value) => {
					const absPath = path.resolve(outdir, isFileUrl(value) ? fileURLToPath(value) : value);
					const relativePath = path.relative(sourceRoot, absPath);
					return relativePath;
				});

				content = JSON.stringify(data, null, 2);
			} else {
				content = outputFile.text;
			}

			const destPath = path.relative(packConfig.outDir, outputFile.path).split(path.sep).join("/");

			blueprint.get(destPath).push({
				kind: "buffer",
				content,
				encoding: "utf8",
			});
		}
	},
});
