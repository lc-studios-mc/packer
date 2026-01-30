import type { ResolvedBuildConfig, ResolvedPackConfig } from "@/config";
import type { ConsolaInstance } from "consola";
import type { BuildExecutionContext } from "./execution";

export type BuildPackContext = {
	packConfig: ResolvedPackConfig;
	parentConfig: ResolvedBuildConfig;
	parentCtx: BuildExecutionContext;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

export const buildPack = async (ctx: BuildPackContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	ctx.logger.debug("Building pack...");

	// TODO: Implement pack build
};
