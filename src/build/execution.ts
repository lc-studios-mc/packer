import type { ResolvedBuildConfig } from "@/config";
import type { ConsolaInstance } from "consola";
import { buildPack } from "./pack";

export type BuildExecutionContext = {
	buildConfig: ResolvedBuildConfig;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

const buildPacks = async (ctx: BuildExecutionContext): Promise<boolean> => {
	ctx.logger.info(`Building ${ctx.buildConfig.packs.length} packs...`);

	const promises = ctx.buildConfig.packs.map(async (pack) => {
		try {
			await buildPack({
				packConfig: pack,
				parentConfig: ctx.buildConfig,
				parentCtx: ctx,
				logger: ctx.logger.withTag(pack.name),
				signal: ctx.signal,
			});
		} catch (error) {
			ctx.logger.error(`Pack '${pack.name}' build failed:`, error);
			throw error;
		}
	});

	const packBuildResults = await Promise.allSettled(promises);
	const anyPackFailed = !packBuildResults.some((result) => result.status === "rejected");

	return anyPackFailed;
};

export const executeBuild = async (ctx: BuildExecutionContext): Promise<void> => {
	ctx.signal.throwIfAborted();

	if (ctx.buildConfig.packs.length <= 0) {
		ctx.logger.warn("No packs are configured");
		return;
	}

	const anyPackFailed = await buildPacks(ctx);
};
