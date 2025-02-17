import { z } from "zod";
import { DbUserSchema, getUserByAuthToken, getUserByUsername } from "./auth.js";
import { addUserToProject, DbProjectSchema, getProjectByUuid, getUserProjectRole, getUserProjects, insertProject } from "./db_project.js";
import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";
import type { UpgradeWebSocket } from "hono/ws";
import Projects from "./server_components/Projects.js";
import { html } from "hono/html";
import Client from "./server_components/Client.js";
import CreateProject from "./server_components/CreateProject.js";
import { handleClientWebSocketClose, handleClientWebSocketError, handleClientWebSocketMessage, handleClientWebSocketOpen } from "./projects.js";

export function getUserFromContext(c: Context): DbUserSchema | null {
    const auth_token = getCookie(c, 'auth_token');
    if (auth_token) {
        const user = getUserByAuthToken(auth_token);
        if (user) {
            return user;
        }
    }
    return null;
}

export default function createAuthed(upgradeWebSocket: UpgradeWebSocket<WebSocket>) {
    const authed = new Hono<{
        Variables: {
            user: DbUserSchema,
        }
    }>();

    // Every authed route must have a user attached. If not, pages that are user
    // navigation are redirected to /login. API calls are just responded to with
    // 401 Unauthorized.
    authed.use('/*', async (c, next) => {
        const user = getUserFromContext(c);
        if (user) {
            c.set('user', user);
            await next();
        } else {
            if (c.req.method == 'POST') {
                switch (c.req.path) {
                    case '/create_project':
                        return c.redirect('/login');
                    default:
                        c.status(401);
                        return c.body(null);
                }
            } else {
                return c.redirect('/login');
            }
        }
    })

    authed.get('/create_project', (c) => {
        return c.html(html`<!DOCTYPE html>${CreateProject()}`);
    })

    authed.post('/create_project', async (c) => {
        const user = c.get('user');
        const formData = await c.req.formData();
        let name = formData.get('name');
        let longitude = formData.get('longitude');
        let latitude = formData.get('latitude');
        let zoom = formData.get('zoom');
        let project: DbProjectSchema | null;
        if (name && longitude && latitude && zoom) {
            name = name.toString();
            project = insertProject(name, user, Number(longitude), Number(latitude), Number(zoom));
        } else {
            project = null;
        }
        if (project) {
            return c.redirect('/projects/' + project.uuid);
        } else {
            return c.redirect('/projects');
        }
    })

    authed.get('/projects', (c) => {
        const user = c.get('user');
        const projects = getUserProjects(user);
        return c.html(html`<!DOCTYPE html>${Projects({ projects })}`);
    });

    authed.get('/projects/:project_uuid', (c) => {
        const user = c.get('user');
        const { project_uuid } = c.req.param();
        const project = getProjectByUuid(project_uuid);
        if (!project) {
            return c.redirect('/projects');
        }
        const role = getUserProjectRole(user, project);
        if (!role) {
            return c.redirect('/projects');
        }
        return c.html(html`<!DOCTYPE html>${Client({ project_name: project.name, lng: project.longitude, lat: project.latitude, zoom: project.zoom, utm_zone: project.utm_zone })}`)
    });

    authed.post('/projects/:project_uuid/add_user', async (c) => {
        const user = c.get('user');
        const { project_uuid } = c.req.param();
        const project = getProjectByUuid(project_uuid);
        if (!project) {
            c.status(401);
            return c.body(null);
        }
        const role = getUserProjectRole(user, project);
        if (!role) {
            c.status(401);
            return c.body(null);
        }
        // User has access: try to find the other user
        const { username } = z.object({ username: z.string() }).parse(await c.req.json());
        const otherUser = getUserByUsername(username);
        if (!otherUser) {
            c.status(500);
            return c.body(null);
        }
        if (addUserToProject(otherUser, project, "editor")) {
            c.status(200);
            return c.body(null);
        } else {
            c.status(500);
            return c.body(null);
        }
    })

    authed.get('/projects/:project_uuid/ws', upgradeWebSocket((c) => {
        // TODO: is there a way to tell the client they're not authorized?
        // Right now the WS upgrade always succeeds. Maybe add onOpen where I currently
        // just have {}, send a message, then close the WS right away.
        const user = c.get('user');
        const { project_uuid } = c.req.param();
        const project = getProjectByUuid(project_uuid);
        if (!project) {
            return {};
        }
        const role = getUserProjectRole(user, project);
        if (!role) {
            return {};
        }
        return {
            onOpen: (open, ws) => {
                handleClientWebSocketOpen(ws, user, project);
            },
            onClose: (close, ws) => {
                handleClientWebSocketClose(ws, user, project);
            },
            onError: (error, ws) => {
                handleClientWebSocketError(ws, user, project);
            },
            onMessage: (msg, ws) => {
                handleClientWebSocketMessage(ws, user, project, msg);
            },
        };
    }))
    return authed;
}