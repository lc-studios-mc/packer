export type Parser = (text: string) => unknown;
export type Stringifier = (data: unknown) => string;

const defaultParsers: Record<string, Parser> = {
	".json": (text) => JSON.parse(text),
};

const defaultStringifiers: Record<string, Stringifier> = {
	".json": (data) => JSON.stringify(data, null, 2),
	".lang": (data) => {
		if (typeof data !== "object" || data === null) return String(data);

		const lines: string[] = [];
		const processObject = (object: object, keyPrefix = "") => {
			for (const [key, value] of Object.entries(object)) {
				if (typeof value === "object") {
					processObject(value, `${keyPrefix}${key}.`);
				} else {
					const line = `${keyPrefix}${key}=${value}`;
					lines.push(line);
				}
			}
		};
		processObject(data);

		return lines.join("\n");
	},
};

export const getParser = (
	ext: string,
	customParsers: Record<string, Parser> = {},
): Parser | undefined => {
	return customParsers[ext] ?? customParsers["*"] ?? defaultParsers[ext];
};

export const getStringifier = (
	ext: string,
	customStringifiers: Record<string, Stringifier> = {},
): Stringifier | undefined => {
	return customStringifiers[ext] ?? customStringifiers["*"] ?? defaultStringifiers[ext];
};
