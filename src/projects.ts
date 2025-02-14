import type { WSContext, WSMessageReceive } from "hono/ws";
import { updateProjectInp, type DbProjectSchema } from "./db_project.js";
import type { DbUserSchema } from "./auth.js";
import { LinkProperty, LinkType, NodeProperty, NodeType, Project, Workspace } from "epanet-js";
import { z } from "zod";
import { AddJunctionSchema, AddReservoirSchema, AddTankSchema, ClientActionsSchema, EpanetChangeSchema, ProjectInitSchema, AddPipeSchema } from "./epanet_types.js";
import { getDb } from "./db.js";
import { EpanetState } from "./epanet/epanet_state.js";

// projects.ts: for keeping track of all projects that users may be editing
class ProjectState {
    db: DbProjectSchema
    // clients keeps track of all open websockets, for broadcasting data
    clients: Set<WSContext<WebSocket>>
    epanet: EpanetState
    constructor(db: DbProjectSchema, firstClient: WSContext<WebSocket>) {
        this.db = db;
        this.clients = new Set();
        this.clients.add(firstClient);
        this.epanet = EpanetState.fromInp(this.db.inp_file);
    }
    broadcast(message: EpanetChangeSchema) {
        const serialized = JSON.stringify(message);
        for (const client of this.clients) {
            client.send(serialized);
        }
    }
}

const activeProjects = new Map<string, ProjectState>();

export function handleClientWebSocketOpen(ws: WSContext<WebSocket>, user: DbUserSchema, project: DbProjectSchema) {
    const existing = activeProjects.get(project.uuid);
    if (existing) {
        // Project already exists: get the latest INP file. Don't read from the db record,
        // since it may not be fully synced
        const latestInp = existing.epanet.saveInp();
        const initData: ProjectInitSchema = {
            inp_file: latestInp,
            type: 'project_init',
        };
        const initChangeSchema: EpanetChangeSchema = {
            change: initData,
            modified_at: new Date(),
            user_id: user.uuid,
        };
        const serialized = JSON.stringify(initChangeSchema);
        ws.send(serialized);
        existing.clients.add(ws);
    } else {
        // No project, so create one based on the database

        // Things useful for this server side code
        const state = new ProjectState(project, ws);
        state.clients.add(ws);
        activeProjects.set(project.uuid, state);
        // Tell the client how to replicate our state
        const initData: ProjectInitSchema = {
            inp_file: project.inp_file,
            type: 'project_init',
        };
        const initChangeSchema: EpanetChangeSchema = {
            change: initData,
            modified_at: new Date(),
            user_id: user.uuid,
        }
        const serialized = JSON.stringify(initChangeSchema);
        ws.send(serialized);
    }
}

export function handleClientWebSocketClose(ws: WSContext<WebSocket>, user: DbUserSchema, project: DbProjectSchema) {
    const state = activeProjects.get(project.uuid);
    if (state) {
        state.clients.delete(ws);
        if (state.clients.size == 0) {
            // TODO: although it's good to do an immediate update here, I should also
            // have a queue of edits that runs every second, wrapped with a transaction.
            const db = getDb();
            const inp_file = state.epanet.saveInp();
            db.prepare('UPDATE projects SET inp_file = @inp_file WHERE uuid = @project_uuid')
                .run({ inp_file, project_uuid: project.uuid });
            activeProjects.delete(project.uuid);
        }
    }
}

export function handleClientWebSocketError(ws: WSContext<WebSocket>, user: DbUserSchema, project: DbProjectSchema) {
    const state = activeProjects.get(project.uuid);
    if (state) {
        state.clients.delete(ws);
        if (state.clients.size == 0) {
            activeProjects.delete(project.uuid);
        }
    }
}

export function handleClientWebSocketMessage(ws: WSContext<WebSocket>, user: DbUserSchema, project: DbProjectSchema, message: MessageEvent<WSMessageReceive>) {
    const state = activeProjects.get(project.uuid);
    if (state) {
        const backup = state.epanet.clone();
        // state.project.saveInpFile('project.inp');
        // const currentInp = state.workspace.readFile('project.inp', 'utf8');
        try {
            const str = z.string().parse(message.data);
            const obj = JSON.parse(str);
            const action = ClientActionsSchema.parse(obj);
            console.log('received:', action);
            switch (action.type) {
                case 'add_junction':
                    state.epanet.addJunction(action);
                    break;
                case 'add_pump':
                    break;
                case 'add_reservoir':
                    state.epanet.addReservoir(action);
                    break;
                case 'add_tank':
                    state.epanet.addTank(action);
                    break;
                case 'add_valve':
                    break;
                case 'add_pipe':
                    state.epanet.addPipe(action);
                    break;
            }
            // notify all clients of the change
            const response: EpanetChangeSchema = {
                change: action,
                modified_at: new Date(),
                user_id: user.uuid,
            };
            state.broadcast(response);
            const latest_inp = state.epanet.saveInp();
            updateProjectInp(project, latest_inp);
        } catch (err) {
            // On any error, reset state from the backup
            // TODO: send the client a message saying their edit failed
            console.log(err);
            console.log(JSON.stringify(err));
            state.epanet = backup;
        }
    }
}