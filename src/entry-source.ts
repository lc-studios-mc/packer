import type { ResolvedPackLayer } from "./config";

export const EntrySourceKind = {
	File: "file",
	Buffer: "buffer",
	Object: "object",
} as const;
export type EntrySourceKind = (typeof EntrySourceKind)[keyof typeof EntrySourceKind];

export type EntrySource =
	| { kind: typeof EntrySourceKind.File; path: string; packLayer?: ResolvedPackLayer }
	| { kind: typeof EntrySourceKind.Buffer; content: string | Buffer; encoding?: BufferEncoding }
	| { kind: typeof EntrySourceKind.Object; data: object };
