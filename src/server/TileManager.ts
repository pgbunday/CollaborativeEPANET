// TileManager.ts: exposes a simple interface (TileFormats and getTileData),
// backed by a filesystem based cache, for managing all kinds of tile data.
// Rather than just the original JPEGs, we can re-encode to WEBP, AVIF, and
// tiles smaller than 512x512, like 256x256 for still decent quality or
// 128x128 for extreme data saving.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Fetches the JPG file for the given tile and saves it. Does not check any
// cache.
async function downloadOriginalJpgData(
	z: number,
	x: number,
	y: number,
): Promise<Uint8Array<ArrayBufferLike>> {
	const response = await fetch(
		`https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${process.env.MAPTILER_API_KEY}`,
	);
	const data = await response.bytes();
	await mkdir(`static/tiles/satellite/jpg/512/${z}/${x}`, { recursive: true });
	await writeFile(`static/tiles/satellite/jpg/512/${z}/${x}/${y}.jpg`, data);
	return data;
}

export type TileFormats = "jpg" | "webp" | "avif";

// Assuming an original JPG exists (512x512), this resizes and converts it to a
// different format. The resulting file is also cached on the filesystem.
async function originalJpgConvert(
	z: number,
	x: number,
	y: number,
	format: TileFormats,
	size: number,
): Promise<Buffer<ArrayBufferLike>> {
	const img = sharp(`static/tiles/satellite/jpg/512/${z}/${x}/${y}.jpg`);
	await mkdir(`static/tiles/satellite/${format}/${size}/${z}/${x}`, {
		recursive: true,
	});
	if (format === "avif") {
		const avifBuffer = await img
			.resize(size, size)
			.avif({ effort: 0 })
			.toBuffer();
		await writeFile(
			`static/tiles/satellite/${format}/${size}/${z}/${x}/${y}.avif`,
			avifBuffer,
		);
		return avifBuffer;
	}
	if (format === "jpg") {
		const jpgBuffer = await img.resize(size, size).jpeg().toBuffer();
		await writeFile(
			`static/tiles/satellite/${format}/${size}/${z}/${x}/${y}.jpg`,
			jpgBuffer,
		);
		return jpgBuffer;
	}
	if (format === "webp") {
		const webpBuffer = await img
			.resize(size, size)
			.webp({ effort: 0 })
			.toBuffer();
		await writeFile(
			`static/tiles/satellite/${format}/${size}/${z}/${x}/${y}.webp`,
			webpBuffer,
		);
		return webpBuffer;
	}
	throw new Error(`Unrecognized format: ${format}`);
}

async function tileExists(
	z: number,
	x: number,
	y: number,
	format: TileFormats,
	size: number,
): Promise<boolean> {
	try {
		const info = await stat(
			`static/tiles/satellite/${format}/${size}/${z}/${x}/${y}.${format}`,
		);
		return info.size > 0;
	} catch (e) {
		return false;
	}
}

async function originalJpgTileExists(
	z: number,
	x: number,
	y: number,
): Promise<boolean> {
	return tileExists(z, x, y, "jpg", 512);
}

async function readTileDataFromFs(
	z: number,
	x: number,
	y: number,
	format: TileFormats,
	size: number,
): Promise<Buffer> {
	return readFile(
		`static/tiles/satellite/${format}/${size}/${z}/${x}/${y}.${format}`,
	);
}

export async function getTileData(
	z: number,
	x: number,
	y: number,
	format: TileFormats,
	size: number,
) {
	if (await tileExists(z, x, y, format, size)) {
		return readTileDataFromFs(z, x, y, format, size);
	}
	if (await originalJpgTileExists(z, x, y)) {
		return originalJpgConvert(z, x, y, format, size);
	}
	const original = await downloadOriginalJpgData(z, x, y);
	if (format === "jpg" && size === 512) {
		return original;
	}
	return originalJpgConvert(z, x, y, format, size);
}
