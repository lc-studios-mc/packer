import { resolveBuildConfig, type BuildConfig } from "@/config";
import { isAbortError } from "@/utils";
import { createConsola, type LogLevel } from "consola";
import packageConfig from "../../package.json" with { type: "json" };
import { Session } from "./session";

export type BuildOptions = {
	logLevel?: LogLevel;
	signal?: AbortSignal;
};

export type BuildResult = {
	error?: unknown;
};

export const build = async (
	config: BuildConfig,
	options: BuildOptions = {},
): Promise<BuildResult> => {
	const { logLevel, signal } = options;

	const logger = createConsola({
		level: logLevel,
		defaults: {
			tag: "run",
		},
	});

	logger.info("@lc-studios-mc/packer", packageConfig.version);

	const resolvedConfig = resolveBuildConfig(config);

	if (logger.level >= 4) {
		logger.debug("Resolved config:");
		console.dir(resolvedConfig, {
			depth: 5,
		});
	}

	const sessionController = new AbortController();
	const sessionSignal = sessionController.signal;

	const onUserAbort = () => sessionController.abort(signal?.reason);
	signal?.addEventListener("abort", onUserAbort, { once: true });

	try {
		signal?.throwIfAborted();

		const session = new Session({
			buildConfig: resolvedConfig,
			logger: logger.withTag("session"),
			signal: sessionSignal,
		});

		const sessionPromise = new Promise<void>((resolve, reject) => {
			session.ee.once("complete", () => resolve());
			session.ee.once("error", (error) => reject(error));
			session.ee.once("abort", (reason) => reject(new DOMException(String(reason), "AbortError")));
		});

		session.start();

		await sessionPromise;

		logger.debug("Session completed successfully");

		return {};
	} catch (error) {
		if (isAbortError(error)) {
			if (error.message.trim() === "") {
				logger.warn("Aborted");
			} else {
				logger.warn(`Aborted. Reason:`, error.message);
			}
		} else {
			logger.error("Error:", error);
		}
		return { error };
	} finally {
		signal?.removeEventListener("abort", onUserAbort);
		sessionController.abort();

		logger.debug("Exiting...");
	}
};
