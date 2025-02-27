import type { WSContext, WSMessageReceive } from "hono/ws";
import { updateProjectInp, type DbProjectSchema } from "./db_project.js";
import type { DbUserSchema } from "./auth.js";
import { z } from "zod";
import { getDb } from "./db.js";
import { EpanetWrapper } from "../epanet/EpanetWrapper.js";
import { ServerboundPacket } from "../packets/serverbound.js";
import type { ClientboundPacket } from "../packets/clientbound.js";

// projects.ts: for keeping track of all projects that users may be editing
class ProjectState {
    db: DbProjectSchema
    // clients keeps track of all open websockets, for broadcasting data
    clients: Set<WSContext<WebSocket>>
    epanet: EpanetWrapper
    constructor(db: DbProjectSchema, firstClient: WSContext<WebSocket>) {
        this.db = db;
        this.clients = new Set();
        this.clients.add(firstClient);
        this.epanet = EpanetWrapper.fromInp(this.db.inp_file, db.utm_zone);
    }
    broadcast(message: ClientboundPacket) {
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
        const initData: ClientboundPacket = {
            type: "project_info_cb",
            inp_file: latestInp,
            user_id: user.uuid,
            username: user.username,
        };
        const serialized = JSON.stringify(initData);
        ws.send(serialized);
        existing.clients.add(ws);
    } else {
        // No project, so create one based on the database

        // Things useful for this server side code
        const state = new ProjectState(project, ws);
        state.clients.add(ws);
        activeProjects.set(project.uuid, state);
        // Tell the client how to replicate our state
        const initData: ClientboundPacket = {
            type: "project_info_cb",
            inp_file: project.inp_file,
            user_id: user.uuid,
            username: user.username,
        };
        const serialized = JSON.stringify(initData);
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

export function handleClientWebSocketMessage(ws: WSContext<WebSocket>, user: DbUserSchema, project: DbProjectSchema, message: MessageEvent<WSMessageReceive>) {
    const state = activeProjects.get(project.uuid);
    if (state) {
        // TODO: no duplicate parsing
        try {
            const str = z.string().parse(message.data);
            const obj = JSON.parse(str);
            const packet = ServerboundPacket.parse(obj);
            if (packet.type == "mouse_move_sb") {
                // special handling for mouse move, it's not a direct broadcast.
                // Don't send users their own move events, and don't touch EPANET
                const response: ClientboundPacket = {
                    type: "mouse_move_cb",
                    longitude: packet.longitude,
                    latitude: packet.latitude,
                    user_id: user.uuid,
                    username: user.username,
                };
                const response_str = JSON.stringify(response);
                for (const other of state.clients) {
                    if (other != ws) {
                        other.send(response_str);
                    }
                }
                return;
            } else {
                const backup = state.epanet.clone();
                try {
                    let resp: ClientboundPacket = { type: "empty_cb" };
                    if (packet.type == "add_junction_sb") {
                        state.epanet.addJunction(packet.data);
                        resp = {
                            type: "add_junction_cb",
                            data: packet.data,
                        };
                    } else if (packet.type == "add_reservoir_sb") {
                        state.epanet.addReservoir(packet.data);
                        resp = {
                            type: "add_reservoir_cb",
                            data: packet.data,
                        }
                    } else if (packet.type == "add_tank_sb") {
                        state.epanet.addTank(packet.data);
                        resp = {
                            type: "add_tank_cb",
                            data: packet.data,
                        }
                    } else if (packet.type == "add_pipe_sb") {
                        state.epanet.addPipe(packet.data);
                        resp = {
                            type: "add_pipe_cb",
                            data: packet.data,
                        }
                    } else if (packet.type == "pipe_properties_sb") {
                        state.epanet.pipeProperties(packet.data);
                        resp = {
                            type: "pipe_properties_cb",
                            data: packet.data,
                        }
                    } else if (packet.type == "delete_pipe_sb") {
                        state.epanet.deletePipe(packet.id);
                        resp = {
                            type: "delete_pipe_cb",
                            id: packet.id,
                        }
                    } else if (packet.type == "junction_properties_sb") {
                        state.epanet.junctionProperties(packet.data);
                        resp = {
                            type: 'junction_properties_cb',
                            data: packet.data,
                        };
                    } else if(packet.type == 'delete_junction_sb') {
                        state.epanet.deleteJunction(packet.id);
                        resp = {
                            type: 'delete_junction_cb',
                            id: packet.id,
                        };
                    }
                    // notify all clients of the change
                    state.broadcast(resp);
                    const latest_inp = state.epanet.saveInp();
                    updateProjectInp(project, latest_inp);
                } catch (err) {
                    // On any error, reset state from the backup
                    // TODO: send the client a message saying their edit failed? They
                    // should already know that because they also have an EPANET model,
                    // but just in case we could report it back
                    console.log(err);
                    console.log(JSON.stringify(err));
                    state.epanet = backup;
                }
            }
        } catch (err) {
            // parsing error
            console.log(err);
            return;
        }
    }
}