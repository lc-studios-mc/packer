import { isWsl, resolveWslPath } from "@/utils";
import { execa } from "execa";

const ROBOCOPY_FLAGS: readonly string[] = [
	"/MIR",
	"/COPY:DT",
	"/DCOPY:DAT",
	"/R:0",
	"/W:0",
	"/MT:32",
	"/XJ",
];

const robocopy = async (source: string, target: string): Promise<void> => {
	try {
		const args = [source, target, ...ROBOCOPY_FLAGS];
		const result = await execa("robocopy.exe", args, {
			reject: false,
			windowsHide: true,
		});

		if (result.exitCode === undefined || result.exitCode >= 8) {
			throw new Error(`Robocopy failed: ${result.stderr}`);
		}
	} catch (error) {
		throw new Error(`Error executing Robocopy`, { cause: error });
	}
};

const rsync = async (source: string, target: string): Promise<void> => {
	throw new Error("rsync support is not implemented yet");
};

export const syncDirectory = async (source: string, target: string): Promise<void> => {
	const platform = process.platform;

	if (platform === "win32") {
		await robocopy(source, target);
		return;
	}

	if (platform === "linux") {
		if (isWsl()) {
			const sourceWin = resolveWslPath(source);
			const targetWin = resolveWslPath(target);
			await robocopy(sourceWin, targetWin);
			return;
		}

		await rsync(source, target);
		return;
	}

	if (platform === "darwin") {
		await rsync(source, target);
		return;
	}

	throw new Error(`Unsupported platform: ${platform}`);
};
