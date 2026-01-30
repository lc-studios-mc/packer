import type { ResolvedBuildConfig } from "@/config";
import { isAbortError } from "@/utils";
import { type ConsolaInstance } from "consola";
import EventEmitter from "node:events";
import { executeBuild } from "./execution";

export type SessionContext = {
	buildConfig: ResolvedBuildConfig;
	logger: ConsolaInstance;
	signal: AbortSignal;
};

export class Session {
	readonly ee = new EventEmitter<{
		complete: [];
		error: [error: unknown];
		abort: [reason?: unknown];
	}>();

	private _isStarted = false;
	private _currentBuildController?: AbortController;
	private _currentBuildPromise?: Promise<void>;
	private _isAbortingBuild = false;

	constructor(private readonly ctx: SessionContext) {}

	async start(): Promise<void> {
		if (this.ctx.signal.aborted) {
			this.ee.emit("abort", this.ctx.signal.reason);
			return;
		}

		if (this._isStarted) {
			this.ee.emit("error", new Error("This session is already started"));
			return;
		}

		this._isStarted = true;

		this.ctx.logger.debug("Session started");

		// TODO: Read watch option
		const watch = false;

		if (watch) {
			await this.watch();
		} else {
			await this.runOnce();
		}
	}

	private async runOnce(): Promise<void> {
		this.ctx.logger.debug("Starting one-time build...");

		try {
			await this.executeBuild();

			this.ctx.signal.throwIfAborted();

			this.ee.emit("complete");
		} catch (error) {
			if (isAbortError(error)) {
				this.ee.emit("abort", error.message);
			} else {
				this.ee.emit("error", error);
			}
		}
	}

	private async watch(): Promise<void> {
		this.ctx.logger.debug("Starting watch mode...");

		// TODO: Implement watch

		await new Promise<void>((resolve) => {
			const onSessionAbort = async () => {
				try {
					await this.abortCurrentExecution();
					this.ee.emit("abort", this.ctx.signal.reason);
				} catch (error) {
					this.ee.emit("error", error);
				} finally {
					resolve();
				}
			};

			// Watch mode can only be stopped via abort
			this.ctx.signal.addEventListener("abort", onSessionAbort, { once: true });
		});
	}

	private async executeBuild(): Promise<void> {
		this.ctx.signal.throwIfAborted();

		if (this._isAbortingBuild) return;

		await this.abortCurrentExecution();

		const buildController = new AbortController();
		this._currentBuildController = buildController;

		const onSessionAbort = () => {
			buildController.abort(this.ctx.signal.reason);
		};
		this.ctx.signal.addEventListener("abort", onSessionAbort, { once: true });

		try {
			const startTime = performance.now();

			// TODO: Run actual build
			this._currentBuildPromise = executeBuild({
				buildConfig: this.ctx.buildConfig,
				logger: this.ctx.logger,
				signal: buildController.signal,
			});

			await this._currentBuildPromise;

			const endTime = performance.now();
			const totalTimeText = (endTime - startTime).toFixed(2);

			this.ctx.logger.success(`Build finished in ${totalTimeText} ms`);
		} catch (error) {
			if (isAbortError(error)) {
				throw error; // Re-throw abort error as-is so upstream can know it's aborted
			} else {
				throw new Error(`Build failed`, { cause: error });
			}
		} finally {
			this.ctx.signal.removeEventListener("abort", onSessionAbort);

			if (this._currentBuildController === buildController) {
				this._currentBuildController = undefined;
				this._currentBuildPromise = undefined;
			}
		}
	}

	private async abortCurrentExecution(): Promise<void> {
		if (this._isAbortingBuild) return;
		if (!this._currentBuildController) return;

		this._isAbortingBuild = true;

		try {
			this._currentBuildController.abort();

			if (this._currentBuildPromise) {
				await this._currentBuildPromise;
			}
		} catch (error) {
			if (isAbortError(error)) {
				this.ctx.logger.info(`Aborted current build`);
			} else {
				throw new Error(`Error aborting current build`, { cause: error });
			}
		} finally {
			this._currentBuildController = undefined;
			this._currentBuildPromise = undefined;
			this._isAbortingBuild = false;
		}
	}
}
