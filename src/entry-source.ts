import type { PackLayer } from "./types";

export const EntrySourceKind = {
	Buffer: "buffer",
	File: "file",
	Object: "object",
} as const;
export type EntrySourceKind = (typeof EntrySourceKind)[keyof typeof EntrySourceKind];

export type EntrySource =
	| { kind: typeof EntrySourceKind.Buffer; data: Buffer }
	| { kind: typeof EntrySourceKind.File; path: string; packLayer?: PackLayer }
	| { kind: typeof EntrySourceKind.Object; object: object };
