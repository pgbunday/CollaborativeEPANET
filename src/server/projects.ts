import type { WSContext, WSMessageReceive } from "hono/ws";
import { DbProject, type DbProjectSchema } from "./db_project.js";
import type { DbUserSchema } from "./auth.js";
import { z } from "zod";
import { getDb } from "./db.js";
import { EpanetWrapper } from "../epanet/EpanetWrapper.js";
import { ServerboundPacket } from "../packets/serverbound.js";
import { EpanetEdit, TrackEditCb, type ClientboundPacket } from "../packets/clientbound.js";
import { EditTree } from "../epanet/edits.js";
import { EpanetAction } from "../packets/common.js";

// projects.ts: for keeping track of all projects that users may be editing
class ProjectState {
    db: DbProject
    // clients keeps track of all open websockets, for broadcasting data
    clients: Set<WSContext<WebSocket>>
    epanet: EpanetWrapper
    editTree: EditTree

    constructor(db: DbProject, firstClient: WSContext<WebSocket>) {
        this.db = new DbProject(db.uuid);
        this.clients = new Set();
        this.clients.add(firstClient);
        this.editTree = new EditTree();
        const editArrays = this.db.getSnapshotEditArrays(this.db.currentSnapshotId);
        if (editArrays == null) {
            throw new Error('To construct ProjectState, edits cannot be null');
        }
        const { snapshot, edits } = editArrays;
        this.epanet = EpanetWrapper.fromInp(snapshot.snapshot_inp, db.utmZone);
        for (const edit of edits) {
            const epanetEditObject = JSON.parse(edit.edit_data);
            const epanetEdit = EpanetEdit.parse(epanetEditObject);
            this.editTree.addNode(epanetEdit);
        }
        const chronologicalEdits = this.editTree.getChronologicalWithLastChild(db.currentEditId);
        for (const edit of chronologicalEdits) {
            this.epanet.applyAction(edit.action);
        }
    }
    broadcast(message: ClientboundPacket) {
        const serialized = JSON.stringify(message);
        for (const client of this.clients) {
            client.send(serialized);
        }
    }
}

const activeProjects = new Map<string, ProjectState>();

export function handleClientWebSocketOpen(ws: WSContext<WebSocket>, user: DbUserSchema, projectUuid: string) {
    const existing = activeProjects.get(projectUuid);
    if (existing) {
        // Project already exists: get the latest INP file. Don't read from the db record,
        // since it may not be fully synced
        // const latestInp = existing.epanet.saveInp();
        const editArrays = existing.db.getSnapshotEditArrays(existing.db.currentSnapshotId);
        if (editArrays == null) {
            throw new Error('handleClientWebSocketOpen: editArrays cannot be null');
        }
        const { snapshot, edits } = editArrays;
        const snapshot_children = [];
        for (const edit of edits) {
            const editObject = JSON.parse(edit.edit_data);
            snapshot_children.push(EpanetEdit.parse(editObject));
        }
        const initData: TrackEditCb = {
            type: "track_edit_cb",
            edit_id: existing.db.currentEditId,
            snapshot_id: existing.db.currentSnapshotId,
            snapshot_data: {
                snapshot_children,
                snapshot_inp: snapshot.snapshot_inp,
            }
        };
        const serialized = JSON.stringify(initData);
        ws.send(serialized);
        existing.clients.add(ws);
    } else {
        // No project, so create one based on the database

        // Things useful for this server side code
        const state = new ProjectState(new DbProject(projectUuid), ws);
        state.clients.add(ws);
        activeProjects.set(projectUuid, state);

        // Tell the client how to replicate our state
        const editArrays = state.db.getSnapshotEditArrays(state.db.currentSnapshotId);
        if (editArrays == null) {
            throw new Error('handleClientWebSocketOpen: editArrays cannot be null');
        }
        const { snapshot, edits } = editArrays;
        const snapshot_children = [];
        for (const edit of edits) {
            const editObject = JSON.parse(edit.edit_data);
            snapshot_children.push(EpanetEdit.parse(editObject));
        }
        const initData: TrackEditCb = {
            type: "track_edit_cb",
            edit_id: state.db.currentEditId,
            snapshot_id: state.db.currentSnapshotId,
            snapshot_data: {
                snapshot_children,
                snapshot_inp: snapshot.snapshot_inp
            }
        };
        const serialized = JSON.stringify(initData);
        ws.send(serialized);
    }
}

export function handleClientWebSocketClose(ws: WSContext<WebSocket>, user: DbUserSchema, projectUuid: string) {
    const state = activeProjects.get(projectUuid);
    if (state) {
        state.clients.delete(ws);
        if (state.clients.size == 0) {
            // TODO: although it's good to do an immediate update here, I should also
            // have a queue of edits that runs every second, wrapped with a transaction.
            const db = getDb();
            // TODO: is there a way to do project-specific write/update flushing?
            // const inp_file = state.epanet.saveInp();
            // db.prepare('UPDATE projects SET inp_file = @inp_file WHERE uuid = @project_uuid')
            //     .run({ inp_file, project_uuid: project.uuid });
            activeProjects.delete(projectUuid);
        }
    }
}

export function handleClientWebSocketError(ws: WSContext<WebSocket>, user: DbUserSchema, projectUuid: string) {
    const state = activeProjects.get(projectUuid);
    if (state) {
        state.clients.delete(ws);
        if (state.clients.size == 0) {
            // TODO: although it's good to do an immediate update here, I should also
            // have a queue of edits that runs every second, wrapped with a transaction.
            const db = getDb();
            // const inp_file = state.epanet.saveInp();
            // db.prepare('UPDATE projects SET inp_file = @inp_file WHERE uuid = @project_uuid')
            //     .run({ inp_file, project_uuid: project.uuid });
            activeProjects.delete(projectUuid);
        }
    }
}

export function handleClientWebSocketMessage(ws: WSContext<WebSocket>, user: DbUserSchema, projectUuid: string, message: MessageEvent<WSMessageReceive>) {
    const state = activeProjects.get(projectUuid);
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
            } else if (packet.type == "epanet_action_sb") {
                const backup = state.epanet.clone();
                try {
                    let resp: ClientboundPacket = { type: "empty_cb" };
                    state.epanet.applyAction(packet.data);
                    const created_at = new Date();
                    resp = {
                        type: "epanet_edit_cb",
                        data: {
                            action: packet.data,
                            created_at,
                            edit_id: state.db.editCount,
                            parent_id: state.db.currentEditId,
                            snapshot_id: state.db.currentSnapshotId,
                            user_username: user.username,
                            user_uuid: user.uuid,
                        }
                    }
                    state.db.addEdit({
                        user_username: user.username,
                        user_uuid: user.uuid,
                        created_at,
                        action: packet.data,
                        edit_id: state.db.editCount,
                        parent_id: state.db.currentEditId,
                        snapshot_id: state.db.currentSnapshotId,
                    });
                    state.db.incrementEditCount();
                    // notify all clients of the change
                    state.broadcast(resp);
                } catch (err) {
                    // On any error, reset state from the backup
                    // TODO: send the client a message saying their edit failed? They
                    // should already know that because they also have an EPANET model,
                    // but just in case we could report it back
                    // console.log(JSON.stringify(err));
                    state.epanet = backup;
                }
            } else if (packet.type == "track_edit_sb") {
                // TODO: rebuild tree, tell clients the new state
                // get snapshot id for the given edit. If it matches current, good,
                // clients should already have edits. If not, get that snapshot
                // subtree and do some parsing.
                const snapshotId = state.db.getEditSnapshotId(packet.edit_id);
                if (snapshotId == null) {
                    // TODO: notify client that there is no snapshot associated with
                    // that edit. they're doing something funky
                    return;
                } else if (packet.edit_id == state.db.currentEditId) {
                    // no op for switching to the same edit
                    return;
                }
                if (snapshotId == state.db.currentSnapshotId) {
                    state.db.setEditAndSnapshot({ edit_id: packet.edit_id, snapshot_id: snapshotId });
                    let resp: TrackEditCb = {
                        edit_id: packet.edit_id,
                        snapshot_id: snapshotId,
                        type: "track_edit_cb",
                    };
                    state.broadcast(resp);
                } else {
                    const editArrays = state.db.getSnapshotEditArrays(snapshotId);
                    if (editArrays == null) {
                        // TODO: inform clients of the error
                        return;
                    }
                    const { snapshot, edits } = editArrays;
                    const snapshot_children = [];
                    for (const edit of edits) {
                        const editObject = JSON.parse(edit.edit_data);
                        snapshot_children.push(EpanetEdit.parse(editObject));
                    }
                    const response: TrackEditCb = {
                        edit_id: packet.edit_id,
                        snapshot_id: snapshotId,
                        snapshot_data: {
                            snapshot_children,
                            snapshot_inp: snapshot.snapshot_inp,
                        },
                        type: "track_edit_cb",
                    };
                    state.broadcast(response);
                }
            }
        } catch (err) {
            // parsing error
            console.log(err);
            return;
        }
    }
}
