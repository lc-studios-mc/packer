import type { ResolvedPackLayer } from "./config";

export const EntrySourceKind = {
	File: "file",
	Buffer: "buffer",
	Custom: "custom",
} as const;
export type EntrySourceKind = (typeof EntrySourceKind)[keyof typeof EntrySourceKind];

export type EntrySource =
	| { kind: typeof EntrySourceKind.File; path: string; packLayer?: ResolvedPackLayer }
	| { kind: typeof EntrySourceKind.Buffer; content: string | Buffer; encoding?: BufferEncoding }
	| {
			kind: typeof EntrySourceKind.Custom;
			input: unknown;
			encoding?: BufferEncoding;
			toString?: (input: unknown) => string;
	  };
