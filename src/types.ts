type OneOrMore<T> = T | T[];

export type PackLayer = {
	dir: string;
	include?: OneOrMore<string>;
	exclude?: OneOrMore<string>;
};

export const PackTargetMode = {
	Copy: "copy",
	Link: "link",
} as const;
export type PackTargetMode = (typeof PackTargetMode)[keyof typeof PackTargetMode];

export type PackTarget =
	| string
	| {
			dest: string;
			/** @default "link" */
			mode?: PackTargetMode;
	  };

export type PackConfig = {
	outDir: string;
	layers?: OneOrMore<PackLayer>;
	targets?: OneOrMore<PackTarget>;
};

export type BuildConfig = {
	packs?: OneOrMore<PackConfig>;
};

export type ResolvedPackLayer = {
	dir: string;
	include: string[];
	exclude: string[];
};

export type ResolvedPackTarget = {
	dest: string;
	mode: PackTargetMode;
};

export type ResolvedPackConfig = {
	outDir: string;
	layers: ResolvedPackLayer[];
	targets: ResolvedPackTarget[];
};

export type ResolvedBuildConfig = {
	packs: ResolvedPackConfig[];
};
