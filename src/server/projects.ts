import { WSContext, type WSMessageReceive } from "hono/ws";
import { DbProject, getUserProjects, type DbProjectSchema } from "./db_project.js";
import { getUserByUsernamePassword, insertUser, type DbUserSchema } from "./auth.js";
import { z } from "zod";
import { getDb } from "./db.js";
import { EpanetWrapper } from "../epanet/EpanetWrapper.js";
import { ServerboundPacket } from "../packets/serverbound.js";
import { EpanetEdit, LoginSuccessCb, RegisterSuccessCb, TrackEditCb, type ClientboundPacket } from "../packets/clientbound.js";
import { EditTree } from "../epanet/edits.js";
import { EpanetAction } from "../packets/common.js";

type Unauthenticated = {
    state: "unauthenticated";
}

type Authenticated = {
    state: "authenticated",
    user: DbUserSchema,
}

type Project = {
    state: "project",
    user: DbUserSchema,
    project: DbProject,
}

type ConnectionState = Unauthenticated | Authenticated | Project;

// Module level variable so that exported functions can always access state info
const connectionStates = new Map<WSContext<WebSocket>, ConnectionState>();

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

const projectStates = new Map<string, ProjectState>();

export function setWsAuthenticated(ws: WSContext<WebSocket>, user: DbUserSchema) {
    const previous = connectionStates.get(ws);
    if (previous && previous.state == "unauthenticated") {
        connectionStates.set(ws, {
            state: "authenticated",
            user,
        })
    }
}

export function setWsProjectAndSendInit(ws: WSContext<WebSocket>, project: DbProject) {
    const previous = connectionStates.get(ws);
    // TODO: handle cleanup if previous.state == "project"
    if (previous && previous.state == "authenticated") {
        connectionStates.set(ws, {
            state: "project",
            user: previous.user,
            project,
        });
        const existingProjectState = projectStates.get(project.uuid);
        if (existingProjectState) {
            existingProjectState.clients.add(ws);
        } else {
            const state = new ProjectState(new DbProject(project.uuid), ws);
            projectStates.set(project.uuid, state);
        }

        const state = projectStates.get(project.uuid)!;
        const editArrays = state.db.getSnapshotEditArrays(state.db.currentSnapshotId);
        if (editArrays == null) {
            throw new Error('setWsProjectAndSendInit: editArrays cannot be null');
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
                snapshot_inp: snapshot.snapshot_inp,
            }
        };
        const serialized = JSON.stringify(initData);
        ws.send(serialized);
    }
}


export function handleClientWebSocketOpen(ws: WSContext<WebSocket>) {
    connectionStates.set(ws, {
        state: "unauthenticated",
    });
}

export function handleClientWebSocketClose(ws: WSContext<WebSocket>) {
    const connectionState = connectionStates.get(ws);
    if (connectionState) {
        connectionStates.delete(ws);
        if (connectionState.state == "project") {
            // Project states may have multiple clients, so do an extra check to only remove
            // a project state if no other clients are connected
            const projectState = projectStates.get(connectionState.project.uuid);
            if (projectState) {
                projectState.clients.delete(ws);
                if (projectState.clients.size == 0) {
                    projectStates.delete(connectionState.project.uuid);
                }
            }
        }
    }
}

export function handleClientWebSocketError(ws: WSContext<WebSocket>) {
    // TODO: do we need custom error handling for close vs error? For now, just
    // call into close, because the previous code was just copy-pasted.
    handleClientWebSocketClose(ws);
}

// TODO: heavily refactor this to even more of a state machine.
export function handleClientWebSocketMessage(ws: WSContext<WebSocket>, message: MessageEvent<WSMessageReceive>) {
    const str = z.string().parse(message.data);
    const obj = JSON.parse(str);
    const packet = ServerboundPacket.parse(obj);
    const connectionState = connectionStates.get(ws);
    if (connectionState && connectionState.state == "unauthenticated") {
        if (packet.type == "login_request_sb") {
            const { username, password } = packet;
            getUserByUsernamePassword(username, password).then((user) => {
                if (user != null) {
                    setWsAuthenticated(ws, user);
                    const projects = getUserProjects(user).map(proj => proj.uuid);
                    const loginSuccess: LoginSuccessCb = {
                        type: "login_success_cb",
                        projects,
                    }
                    ws.send(JSON.stringify(loginSuccess));
                }
            })
        } else if (packet.type == "register_request_sb") {
            const { username, password } = packet;
            insertUser(username, password).then(user => {
                if (user != null) {
                    setWsAuthenticated(ws, user);
                    const projects = getUserProjects(user).map(proj => proj.uuid);
                    const registerSuccess: RegisterSuccessCb = {
                        type: "register_success_cb",
                        projects,
                    }
                    ws.send(JSON.stringify(registerSuccess));
                }
            })
        }
    } else if (connectionState && connectionState.state == "authenticated") {
        if (packet.type == "set_current_project_sb") {
            const project = new DbProject(packet.project_uuid);
            if (project.getUserRole(connectionState.user) != null) {
                setWsProjectAndSendInit(ws, project);
            }
        }
    } else if (connectionState && connectionState.state == "project") {
        const { user, project } = connectionState;
        const state = projectStates.get(project.uuid);
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
}
