import { serve } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import { logger } from 'hono/logger';
import { html } from 'hono/html';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { deleteCookie, setCookie } from 'hono/cookie';
import { getUserByUsernamePassword, insertUser } from './auth.js';
import { createNodeWebSocket } from '@hono/node-ws';
import type { BaseMime } from 'hono/utils/mime';
import { configDotenv } from 'dotenv';
import Register from './server_components/Register.js';
import Login from './server_components/Login.js';
import Index from './server_components/Index.js';
import createAuthed, { getUserFromContext } from './authed_hono.js';
import { z } from 'zod';

const { parsed: envParsed, error: envParseError } = configDotenv();
if (envParseError) {
  console.log(envParseError);
}

// Base app object, where all network functionality is eventually attached
const app = new Hono()
app.use(logger());

// Start getting ready for the WebSocket server functionality
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

// Serve the Register page
app.get('/register', (c) => {
  return c.html(html`<!DOCTYPE html>${<Register />}`);
});

// Basic logout, just tell the client to remove their auth token
app.get('/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.redirect('/');
})

// Handle form POSTs to /register. On success, a user is created and redirected
// to a blank /projects page
// TODO: informative errors. Maybe use session tokens, separate from auth
// tokens, to store information per session. Like a map to objects with members
// like last_page_error?: string. Just need a universal middleware to include
// a new session token when the user doesn't send one in their Cookies header.
app.post('/register', async (c) => {
  const formData = await c.req.formData();
  let username = formData.get('username');
  let password = formData.get('password');
  if (!username || !password) {
    // TODO: error, tell user both must be provided
    c.status(500);
    return c.body(null);
  }
  username = username.toString();
  password = password.toString();
  const dbUser = await insertUser(username, password);
  if (dbUser && dbUser.auth_token) {
    setCookie(c, 'auth_token', dbUser.auth_token)
    return c.redirect('/projects');
  } else {
    // TODO: informative error. Just say registration failed
    c.status(500);
    return c.redirect('/register');
  }
})

app.get('/login', (c) => {
  return c.html(html`<!DOCTYPE html>${<Login />}`);
})

app.post('/login', async (c) => {
  const formData = await c.req.formData();
  let username = formData.get('username');
  let password = formData.get('password');
  if (!username || !password) {
    // TODO: error, tell user both must be provided
    return c.redirect('/login');
  }
  username = username.toString();
  password = password.toString();
  const dbUser = await getUserByUsernamePassword(username, password);
  if (dbUser && dbUser.auth_token) {
    setCookie(c, 'auth_token', dbUser.auth_token)
    return c.redirect('/projects');
  } else {
    // TODO: informative error. Just say registration failed
    return c.redirect('/login');
  }
})

app.get('/', (c) => {
  const user = getUserFromContext(c);
  if (user) {
    return c.html(html`<!DOCTYPE html>${< Index title='Collaborative EPANET' user={user} />}`)
  }
  return c.html(html`<!DOCTYPE html>${< Index title='Collaborative EPANET' />}`);
})

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
async function serveFile(c: Context, path: string, content_type: BaseMime): Promise<Response> {
  const accept_encoding = c.req.header('Accept-Encoding');
  if (accept_encoding && accept_encoding.includes('gzip')) {
    // Look for a compressed version and try to return it
    try {
      const contents = await readFileArrayBuffer(path + '.gz');
      c.header('Content-Type', content_type);
      c.header('Content-Encoding', 'gzip');
      c.status(200);
      return c.body(contents);
    } catch (e) {
      // Most likely there isn't a gzip'ed file, so fall through to the normal read
    }
  }
  try {
    const contents = await readFileArrayBuffer(path);
    c.header('Content-Type', content_type);
    c.status(200);
    return c.body(contents);
  } catch (e) {
    // If we also couldn't read the normal version, 404
    c.status(404);
    return c.body(null)
  }
}

app.get('/static/client.js', async (c) => {
  return await serveFile(c, 'build-client/client.js', 'text/javascript');
});

app.get('/static/create_project.js', async (c) => {
  return await serveFile(c, 'build-client/create_project.js', 'text/javascript');
})

app.get('/static/client.css', async (c) => {
  return await serveFile(c, 'build-client/client.css', 'text/css');
})

app.get('/static/create_project.css', async (c) => {
  return await serveFile(c, 'build-client/create_project.css', 'text/css');
})

app.get('/font/:fontstack/:range_pbf', async (c) => {
  return await serveFile(c, 'static/demotiles/font/' + c.req.param().fontstack + '/' + c.req.param().range_pbf, 'font/woff2');
})

// Caching layer for satellite tiles. Reduces API key use substantially when
// constantly refreshing a project page in development.
app.get('/tiles/satellite/:z/:x/:y_jpg', async (c) => {
  const numberParse = z.coerce.number().min(0).max(18);
  const zoomString = c.req.param().z;
  const x = c.req.param().x;
  const y_jpg = c.req.param().y_jpg;
  // make sure zoom is in range [0, 18]
  // On parse failure, the catch block will return 404 to the client
  numberParse.parse(zoomString);
  try {
    const contents = await readFile(`static/tiles/satellite/${zoomString}/${x}/${y_jpg}`);
    c.header('Content-Type', 'image/jpeg');
    return c.body(await new Blob([contents]).arrayBuffer());
  } catch (err) {
    // readFile failed, so fetch from origin
    try {
      const response = await fetch(`https://api.maptiler.com/tiles/satellite-v2/${zoomString}/${x}/${y_jpg}?key=${process.env.MAPTILER_API_KEY}`);
      const data = await response.bytes();
      await mkdir(`static/tiles/satellite/${zoomString}/${x}`, { recursive: true });
      await writeFile(`static/tiles/satellite/${zoomString}/${x}/${y_jpg}`, data);
      c.header('Content-Type', 'image/jpeg');
      return c.body(await new Blob([data]).arrayBuffer());
    } catch (err) {
      c.status(404);
      return c.body(null);
    }
  }
})

// Finally, attach any routes that always need authentication to the root app.
const authed = createAuthed(upgradeWebSocket);
app.route('/', authed);

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

const server = serve({
  fetch: app.fetch,
  port,
});
injectWebSocket(server);
