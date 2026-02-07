import { ExecaError, execaSync } from "execa";
import os from "node:os";
import path from "node:path";
import picomatch from "picomatch";

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

export const isFileUrl = (value: string): boolean => {
	try {
		const url = new URL(value);
		return url.protocol === "file:";
	} catch (e) {
		return false; // Not a valid URL at all, so not a file URL
	}
};

export const globMap = <V>(
	map: Map<string, V>,
	glob: string | string[],
	options?: picomatch.PicomatchOptions,
): Map<string, V> => {
	const matches = new Map<string, V>();
	const isMatch = picomatch(glob, options);

	for (const key of map.keys()) {
		if (isMatch(key)) {
			matches.set(key, map.get(key)!);
		}
	}

	return matches;
};

export const getEnv = (key: string): string | undefined => process.env[key];

export const getEnvWithFallback = (key: string, fallback: string): string =>
	process.env[key] ?? fallback;

export const getEnvRequired = (key: string, customErrorMsg?: string): string => {
	const value = process.env[key];
	if (typeof value !== "string")
		throw new Error(customErrorMsg ?? `The environment variable '${key}' is required but not set`);
	return value;
};

export const parseVersionString = (versionString: string): number[] => {
	const parts = versionString.split(".");
	if (parts.length !== 3) {
		throw new Error(
			'The string must contain exactly three integer parts separated by dots (e.g., "1.2.3")',
		);
	}

	const numbers = parts.map((part) => {
		const num = Number(part);
		if (part.trim() === "" || !Number.isInteger(num)) {
			throw new Error(`The segment "${part}" is not a valid integer`);
		}
		return num;
	});

	return numbers;
};
