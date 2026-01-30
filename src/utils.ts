import path from "node:path";

export const asArray = <T>(input: T | T[] | undefined | null): T[] => {
	if (input === undefined || input === null) return [];
	if (Array.isArray(input)) return input;
	return [input] as T[];
};

export const normalizePath = (p: string) => p.split(path.sep).join("/");
