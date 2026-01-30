import type { ResolvedPackLayer } from "./config";

export const EntrySourceKind = {
	Buffer: "buffer",
	File: "file",
	Object: "object",
} as const;
export type EntrySourceKind = (typeof EntrySourceKind)[keyof typeof EntrySourceKind];

export type EntrySource =
	| { kind: typeof EntrySourceKind.Buffer; buffer: Buffer }
	| { kind: typeof EntrySourceKind.File; path: string; packLayer?: ResolvedPackLayer }
	| { kind: typeof EntrySourceKind.Object; object: object };
