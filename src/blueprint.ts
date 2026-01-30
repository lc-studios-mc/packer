import type { EntrySource } from "./entry-source";
import { toPosixPath } from "./utils";

export class Blueprint {
	readonly map = new Map<string, EntrySource[]>();

	get(key: string): EntrySource[] {
		const properKey = toPosixPath(key);
		let array = this.map.get(properKey);
		if (array === undefined) {
			array = [];
			this.map.set(properKey, array);
		}
		return array;
	}
}
