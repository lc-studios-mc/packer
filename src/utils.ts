import { ExecaError, execaSync } from "execa";
import os from "node:os";
import path from "node:path";

export const toPosixPath = (p: string) => p.split(path.sep).join("/");

export const isAbortError = (error: unknown): error is Error => {
	return error instanceof Error && error.name === "AbortError";
};

export const asArray = <T>(input: T | T[] | undefined | null): T[] => {
	if (input === undefined || input === null) return [];
	if (Array.isArray(input)) return input;
	return [input] as T[];
};

export const isWsl = (): boolean => {
	const release = os.release().toLowerCase();
	return release.includes("microsoft") || release.includes("wsl");
};

export const resolveWslPath = (linuxPath: string): string => {
	try {
		const winPath = execaSync("wslpath", ["-w", "-a", linuxPath]).stdout;
		return winPath;
	} catch (error) {
		const stderr = (error as ExecaError).stderr || "Unknown error";
		throw new Error(`Could not resolve WSL path: ${stderr}`, { cause: error });
	}
};
