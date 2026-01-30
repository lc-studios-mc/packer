import { createConsola, type LogLevel } from "consola";
import { resolveBuildConfig, type BuildConfig } from "./config";

export type BuildOptions = {
	logLevel?: LogLevel;
	signal?: AbortSignal;
};

export const build = async (config: BuildConfig, options: BuildOptions = {}): Promise<void> => {
	const { logLevel, signal } = options;

	const logger = createConsola({
		level: logLevel,
	});

	const resolvedConfig = resolveBuildConfig(config);

	if (logger.level >= 4) {
		logger.debug("Resolved config:");
		console.dir(resolvedConfig, {
			depth: 4,
		});
	}
};
