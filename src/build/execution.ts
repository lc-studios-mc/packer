import type { ResolvedBuildConfig } from "@/config";
import type { ConsolaInstance } from "consola";

export type BuildExecutionContext = {
	buildConfig: ResolvedBuildConfig;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

export const executeBuild = async (ctx: BuildExecutionContext): Promise<void> => {
	ctx.logger.info("Building...");

	// TODO: Implement build
};
