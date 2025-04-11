import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { configDotenv } from "dotenv";
import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

const { parsed, error } = configDotenv();

if (error) {
	console.log(error);
} else {
	const result = await build({
		entryPoints: [
			"src/client/client.tsx",
			"src/client/create_project.tsx",
			"src/client/projects.css",
		],
		minify: false,
		bundle: true,
		outdir: "build-client",
		plugins: [
			polyfillNode({
				polyfills: {
					path: true,
				},
			}),
		],
		loader: {
			".png": "dataurl",
		},
		metafile: true,
		define: {
			// Preprocessing step to insert a string with the API key stored in
			// .env in place of a variable expression
			"process.env.MAPTILER_API_KEY": `"${process.env.MAPTILER_API_KEY}"`,
		},
	});

	execSync("rm -f build-client/*.gz");
	execSync("gzip --keep --force build-client/*");

	if (result.metafile) {
		await writeFile(
			"./build-client/meta.json",
			JSON.stringify(result.metafile),
		);
	}
}
