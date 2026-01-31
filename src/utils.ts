import path from "node:path";

export const asArray = <T>(input: T | T[] | undefined | null): T[] => {
	if (input === undefined || input === null) return [];
	if (Array.isArray(input)) return input;
	return [input] as T[];
};

export const toPosixPath = (p: string) => p.split(path.sep).join("/");

export const isFileUrl = (value: string): boolean => {
	try {
		const url = new URL(value);
		return url.protocol === "file:";
	} catch (e) {
		return false; // Not a valid URL at all, so not a file URL
	}
};

export const isAbortError = (error: unknown): error is Error => {
	return error instanceof Error && error.name === "AbortError";
};
