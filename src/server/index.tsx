import { mkdir, readFile, writeFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { configDotenv } from "dotenv";
import { type Context, Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { html } from "hono/html";
import { logger } from "hono/logger";
import type { BaseMime } from "hono/utils/mime";
import { z } from "zod";
import {
	handleClientWebSocketClose,
	handleClientWebSocketError,
	handleClientWebSocketMessage,
	handleClientWebSocketOpen,
} from "./Project.js";
// import sharp from 'sharp';
import { getTileData } from "./TileManager.js";
import { getUserByUsernamePassword, insertUser } from "./auth.js";
import createAuthed, { getUserFromContext } from "./authed_hono.js";
import Index from "./components/Index.js";
import Login from "./components/Login.js";
import Register from "./components/Register.js";

const { parsed: envParsed, error: envParseError } = configDotenv();
if (envParseError) {
	console.log(envParseError);
}

// Base app object, where all network functionality is eventually attached
const app = new Hono();
app.use(logger());

// Start getting ready for the WebSocket server functionality
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

// Serve the Register page
app.get("/register", (c) => {
	return c.html(html`<!DOCTYPE html>${<Register />}`);
});

// Basic logout, just tell the client to remove their auth token
app.get("/logout", (c) => {
	deleteCookie(c, "auth_token");
	return c.redirect("/");
});

// Handle form POSTs to /register. On success, a user is created and redirected
// to a blank /projects page
// TODO: informative errors. Maybe use session tokens, separate from auth
// tokens, to store information per session. Like a map to objects with members
// like last_page_error?: string. Just need a universal middleware to include
// a new session token when the user doesn't send one in their Cookies header.
app.post("/register", async (c) => {
	const formData = await c.req.formData();
	let username = formData.get("username");
	let password = formData.get("password");
	if (!username || !password) {
		// TODO: error, tell user both must be provided
		c.status(500);
		return c.body(null);
	}
	username = username.toString();
	password = password.toString();
	const dbUser = await insertUser(username, password);
	if (dbUser?.auth_token) {
		setCookie(c, "auth_token", dbUser.auth_token);
		return c.redirect("/projects");
	}
	// TODO: informative error. Just say registration failed
	c.status(500);
	return c.redirect("/register");
});

app.get("/login", (c) => {
	return c.html(html`<!DOCTYPE html>${<Login />}`);
});

app.post("/login", async (c) => {
	const formData = await c.req.formData();
	let username = formData.get("username");
	let password = formData.get("password");
	if (!username || !password) {
		// TODO: error, tell user both must be provided
		return c.redirect("/login");
	}
	username = username.toString();
	password = password.toString();
	const dbUser = await getUserByUsernamePassword(username, password);
	if (dbUser?.auth_token) {
		setCookie(c, "auth_token", dbUser.auth_token);
		return c.redirect("/projects");
	}
	// TODO: informative error. Just say registration failed
	return c.redirect("/login");
});

app.get("/", (c) => {
	const user = getUserFromContext(c);
	if (user) {
		return c.html(
			html`<!DOCTYPE html>${<Index title="Collaborative EPANET" user={user} />}`,
		);
	}
	return c.html(html`<!DOCTYPE html>${<Index title="Collaborative EPANET" />}`);
});

async function readFileArrayBuffer(path: string): Promise<ArrayBuffer> {
	const contents = await readFile(path);
	const arrayBuffer = await new Blob([contents]).arrayBuffer();
	return arrayBuffer;
}

/**
 * Helper function for serving the handful of fully static files this project
 * needs. TODO: cache the files in memory
 * @param c A Hono Context
 * @param path Where the file is, relative to where the server was started
 * @param content_type The file's MIME, if found
 * @returns A Response object that can be returned from a route handler.
 * 404 response if the file wasn't found
 */
async function serveFile(
	c: Context,
	path: string,
	content_type: BaseMime,
): Promise<Response> {
	const accept_encoding = c.req.header("Accept-Encoding");
	if (accept_encoding?.includes("gzip")) {
		// Look for a compressed version and try to return it
		try {
			const contents = await readFileArrayBuffer(`${path}.gz`);
			c.header("Content-Type", content_type);
			c.header("Content-Encoding", "gzip");
			c.status(200);
			return c.body(contents);
		} catch (e) {
			// Most likely there isn't a gzip'ed file, so fall through to the normal read
		}
	}
	try {
		const contents = await readFileArrayBuffer(path);
		c.header("Content-Type", content_type);
		c.status(200);
		return c.body(contents);
	} catch (e) {
		// If we also couldn't read the normal version, 404
		c.status(404);
		return c.body(null);
	}
}

app.get("/static/client.js", async (c) => {
	return await serveFile(c, "build-client/client.js", "text/javascript");
});

app.get("/static/client.js.map", async (c) => {
	return await serveFile(c, "build-client/client.js.map", "application/json");
});

app.get("/static/create_project.js", async (c) => {
	return await serveFile(
		c,
		"build-client/create_project.js",
		"text/javascript",
	);
});

app.get("/static/client.css", async (c) => {
	return await serveFile(c, "build-client/client.css", "text/css");
});

app.get("/static/client.css.map", async (c) => {
	return await serveFile(c, "build-client/client.css.map", "application/json");
});

app.get("/static/create_project.css", async (c) => {
	return await serveFile(c, "build-client/create_project.css", "text/css");
});

app.get("/static/projects.css", async (c) => {
	return await serveFile(c, "build-client/projects.css", "text/css");
});

app.get("/font/:fontstack/:range_pbf", async (c) => {
	return await serveFile(
		c,
		`static/demotiles/font/${c.req.param().fontstack}/${c.req.param().range_pbf}`,
		"font/woff2",
	);
});

app.get("/static/icons/junction.webp", async (c) => {
	return await serveFile(c, "static/icons/junction.webp", "image/webp");
});

app.get("/static/icons/cursor.webp", async (c) => {
	return await serveFile(c, "static/icons/cursor.webp", "image/webp");
});

// Caching layer for satellite tiles. Reduces API key use substantially when
// constantly refreshing a project page in development.
app.get(
	"/tiles/satellite/:format_str/:size_str/:z_str/:x_str/:y_ext",
	async (c) => {
		const format = z
			.enum(["jpg", "webp", "avif"])
			.parse(c.req.param().format_str);
		const sizeStr = z.enum(["128", "256", "512"]).parse(c.req.param().size_str);
		const size = z.coerce.number().parse(sizeStr);
		const zoom = z.coerce
			.number()
			.int()
			.min(0)
			.max(18)
			.parse(c.req.param().z_str);
		const x = z.coerce.number().int().parse(c.req.param().x_str);
		const [yStr, fileExt] = c.req.param().y_ext.split(".");
		// fileExt should == format, but we need to be sure
		if (fileExt !== format) {
			c.status(400);
			return c.body("File extension must match overall tile format");
		}
		const y = z.coerce.number().int().parse(yStr);
		c.header("Cache-Control", "max-age=86400");
		if (format === "jpg") {
			c.header("Content-Type", "image/jpeg");
		} else if (format === "avif") {
			c.header("Content-Type", "image/avif");
		} else if (format === "webp") {
			c.header("Content-Type", "image/webp");
		}
		return c.body(await getTileData(zoom, x, y, format, size));
	},
);

// Empty WebSocket endpoint, mostly for testing
app.get(
	"/ws",
	upgradeWebSocket((c) => {
		return {
			onOpen: (open, ws) => {
				handleClientWebSocketOpen(ws);
			},
			onClose: (close, ws) => {
				handleClientWebSocketClose(ws);
			},
			onError: (error, ws) => {
				handleClientWebSocketError(ws);
			},
			onMessage: async (message, ws) => {
				await handleClientWebSocketMessage(ws, message);
			},
		};
	}),
);

// Finally, attach any routes that always need authentication to the root app.
const authed = createAuthed(upgradeWebSocket);
app.route("/", authed);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

const server = serve({
	fetch: app.fetch,
	port,
});
injectWebSocket(server);
