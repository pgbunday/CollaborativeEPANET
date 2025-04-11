// ProjectNew.ts: my actually thought out ideas for refactoring Project handling

import { randomUUID } from "node:crypto";
import {
	Project as EpanetProject,
	FlowUnits,
	HeadLossType,
	Workspace,
} from "epanet-js";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { z } from "zod";
import { getUtmZone } from "../coords";
import { EpanetWrapper } from "../epanet/EpanetWrapper";
import EditTree from "../epanet/EditTree";
import {
	type ClientboundPacket,
	EpanetEdit,
	type LoginSuccessCb,
	type RegisterSuccessCb,
	type TrackEditCb,
} from "../packets/clientbound";
import { ServerboundPacket } from "../packets/serverbound";
import { DbUserSchema, getUserByUsernamePassword, insertUser } from "./auth";
import {
	type DbProject,
	type DbProjectEdit,
	type DbUser,
	type ProjectSnapshotsTable,
	db,
} from "./db";
import {
	type DbProjectRoleSchema,
	type DbProjectSnapshotSchema,
	getUserProjects,
} from "./db_project";

type WsUnauthenticated = {
	state: "unauthenticated";
};

type WsAuthenticated = {
	state: "authenticated";
	user: DbUser;
};

type WsProject = {
	state: "project";
	user: DbUser;
	project: DbProject;
};

type WsState = WsUnauthenticated | WsAuthenticated | WsProject;

const wsStates = new Map<WSContext<WebSocket>, WsState>();

export function handleClientWebSocketOpen(ws: WSContext<WebSocket>) {
	wsStates.set(ws, {
		state: "unauthenticated",
	});
}

// TODO: verify that this actually works with the refactor idea
export function handleClientWebSocketClose(ws: WSContext<WebSocket>) {
	const connectionState = wsStates.get(ws);
	if (connectionState) {
		wsStates.delete(ws);
		if (connectionState.state === "project") {
			// Project states may have multiple clients, so do an extra check to only remove
			// a project state if no other clients are connected
			const projectState = openProjects.get(connectionState.project.uuid);
			if (projectState) {
				projectState.connectedClients.delete(ws);
				if (projectState.connectedClients.size === 0) {
					openProjects.delete(connectionState.project.uuid);
				}
			}
		}
	}
}

export function setWsAuthenticated(ws: WSContext<WebSocket>, user: DbUser) {
	const previous = wsStates.get(ws);
	if (previous && previous.state === "unauthenticated") {
		wsStates.set(ws, {
			state: "authenticated",
			user,
		});
	}
}

export function handleClientWebSocketError(ws: WSContext<WebSocket>) {
	// TODO: do we need custom error handling for close vs error? For now, just
	// call into close, because the previous code was just copy-pasted.
	handleClientWebSocketClose(ws);
}

export class Project {
	public dbProject: DbProject;
	public connectedClients: Set<WSContext<WebSocket>>;
	public editTree: EditTree;
	public epanet: EpanetWrapper;

	// TODO: verify that this works as intended with the refactor idea
	private constructor(
		dbProject: DbProject,
		firstClient: WSContext<WebSocket>,
		snapshot: ProjectSnapshotsTable,
		edits: DbProjectEdit[],
	) {
		// Keep an object with DbProject shape around, which can be refreshed to
		// get the latest data
		this.dbProject = dbProject;
		// Store that first client right away, ensuring that there is always at least
		// one client connected. Otherwise, handleClientWebSocket{Close,Error} take
		// care of cleanup, so there isn't dangling EPANET state
		this.connectedClients = new Set();
		this.connectedClients.add(firstClient);

		// Set up EPANET and edit tree
		this.editTree = new EditTree();
		this.epanet = EpanetWrapper.fromInp(
			snapshot.snapshot_inp,
			dbProject.utm_zone,
		);
		for (const edit of edits) {
			const epanetEditObject = JSON.parse(edit.edit_data);
			const epanetEdit = EpanetEdit.parse(epanetEditObject);
			this.editTree.addNode(epanetEdit);
		}
		const chronologicalEdits = this.editTree.getChronologicalWithLastChild(
			dbProject.current_edit_id,
		);
		for (const edit of chronologicalEdits) {
			this.epanet.applyAction(edit.action);
		}
	}

	public static async getUserRole(
		projectUuid: string,
		user: DbUser,
	): Promise<DbProjectRoleSchema | null> {
		const result = await db
			.selectFrom("project_user")
			.select("role")
			.where("project_uuid", "=", projectUuid)
			.where("user_uuid", "=", user.uuid)
			.executeTakeFirst();
		if (result) {
			return result.role;
		}
		return null;
	}

	public broadcast(cb: ClientboundPacket) {
		const str = JSON.stringify(cb);
		for (const client of this.connectedClients) {
			client.send(str);
		}
	}

	public async addDbEdit(edit: EpanetEdit): Promise<boolean> {
		const now = new Date();
		await db
			.insertInto("project_edits")
			.values({
				created_at: now.toISOString(),
				edit_data: JSON.stringify(edit),
				edit_id: edit.edit_id,
				has_snapshot_file: 0 as unknown as boolean,
				project_uuid: this.dbProject.uuid,
				snapshot_id: edit.snapshot_id,
				user_uuid: edit.user_uuid,
			})
			.execute();
		await db
			.updateTable("projects")
			.where("uuid", "=", this.dbProject.uuid)
			.set({ current_edit_id: edit.edit_id })
			.execute();
		this.dbProject.current_edit_id = edit.edit_id;
		return true;
	}

	public async incrementEditCount() {
		await db
			.updateTable("projects")
			.set({ edit_count: this.dbProject.edit_count + 1 })
			.where("uuid", "=", this.dbProject.uuid)
			.execute();
		this.dbProject.edit_count += 1;
	}

	public static async getDb(projectUuid: string): Promise<DbProject> {
		return await db
			.selectFrom("projects")
			.selectAll()
			.where("uuid", "=", projectUuid)
			.executeTakeFirstOrThrow();
	}

	public static async addUser(
		projectUuid: string,
		user: DbUser,
		role: DbProjectRoleSchema,
	): Promise<boolean> {
		await db
			.insertInto("project_user")
			.values({
				project_uuid: projectUuid,
				role,
				user_uuid: user.uuid,
			})
			.execute();
		return true;
	}

	public static async create(
		name: string,
		owner: DbUser,
		longitude: number,
		latitude: number,
		zoom: number,
	): Promise<DbProject> {
		const now = new Date();
		const uuid = randomUUID();
		let inp_file = "";
		{
			// Blank EPANET project
			const ws = new Workspace();
			const project = new EpanetProject(ws);
			project.init("report.txt", "out.txt", FlowUnits.GPM, HeadLossType.HW);
			project.saveInpFile("empty.inp");
			inp_file = ws.readFile("empty.inp", "utf8");
			project.close();
			await db
				.insertInto("project_snapshots")
				.values({
					project_uuid: uuid,
					edit_id: 0,
					snapshot_inp: inp_file,
				})
				.execute();
			await db
				.insertInto("project_edits")
				.values({
					project_uuid: uuid,
					edit_id: 0,
					snapshot_id: 0,
					created_at: now.toISOString(),
					user_uuid: owner.uuid,
					edit_data: "",
					has_snapshot_file: 0 as unknown as boolean,
				})
				.execute();
			const utm_zone = getUtmZone(longitude, latitude);
			await db
				.insertInto("projects")
				.values({
					uuid,
					name,
					created_at: now.toISOString(),
					modified_at: now.toISOString(),
					current_edit_id: 0,
					current_snapshot_id: 0,
					edit_count: 1,
					latitude,
					longitude,
					owner_uuid: owner.uuid,
					utm_zone,
					zoom,
				})
				.execute();
			await db
				.insertInto("project_user")
				.values({
					project_uuid: uuid,
					user_uuid: owner.uuid,
					role: "owner",
				})
				.execute();
			return await Project.getDb(uuid);
		}
	}

	public static async connectWsAndSendInit(
		projectUuid: string,
		ws: WSContext<WebSocket>,
	): Promise<boolean> {
		// First, verify that the ws has only a user attached:
		const wsState = wsStates.get(ws);
		if (!wsState || wsState.state !== "authenticated") {
			return false;
		}
		// Next, check that the user can access the project
		if (!Project.getUserRole(projectUuid, wsState.user)) {
			return false;
		}

		// Above checks passed: either add the WS to a Project, or create a new Project
		const maybeExisting = openProjects.get(projectUuid);
		if (maybeExisting) {
			maybeExisting.connectedClients.add(ws);
		} else {
			const dbProject = await Project.getDb(projectUuid);
			const { snapshot, edits } = await getSnapshotEditArrays(
				dbProject,
				dbProject.current_snapshot_id,
			);
			const project = new Project(dbProject, ws, snapshot, edits);
			openProjects.set(projectUuid, project);
		}
		// project was either already there, or just inserted with the else clause, so this is safe
		const project = openProjects.get(projectUuid)!;
		// Associate the user with this project
		wsStates.set(ws, {
			state: "project",
			user: wsState.user,
			project: project.dbProject,
		});

		// Send init packet
		const { snapshot, edits } = await getSnapshotEditArrays(
			project.dbProject,
			project.dbProject.current_snapshot_id,
		);
		const snapshotChildren = [];
		for (const edit of edits) {
			const editObject = JSON.parse(edit.edit_data);
			snapshotChildren.push(EpanetEdit.parse(editObject));
		}
		const initData: TrackEditCb = {
			type: "track_edit_cb",
			edit_id: project.dbProject.current_edit_id,
			snapshot_id: project.dbProject.current_snapshot_id,
			snapshot_data: {
				snapshot_children: snapshotChildren,
				snapshot_inp: snapshot.snapshot_inp,
			},
		};
		const serialized = JSON.stringify(initData);
		ws.send(serialized);
		return true;
	}
}

async function getSnapshotEditArrays(
	dbProject: DbProject,
	snapshotId: number,
): Promise<{ snapshot: ProjectSnapshotsTable; edits: DbProjectEdit[] }> {
	const snapshot = await db
		.selectFrom("project_snapshots")
		.where("project_uuid", "=", dbProject.uuid)
		.where("edit_id", "=", snapshotId)
		.selectAll()
		.executeTakeFirstOrThrow();
	const edits = await db
		.selectFrom("project_edits")
		.where("project_uuid", "=", dbProject.uuid)
		.where("snapshot_id", "=", snapshotId)
		.where("edit_id", "<>", snapshotId)
		.selectAll()
		.execute();
	return { snapshot, edits };
}

async function getLatestInp(project: DbProject): Promise<string> {
	const { snapshot_inp } = await db
		.selectFrom("project_snapshots")
		.select("snapshot_inp")
		.where("project_uuid", "=", project.uuid)
		.where("edit_id", "=", project.current_snapshot_id)
		.executeTakeFirstOrThrow();
	return snapshot_inp;
}

async function getEditSnapshotId(
	dbProject: DbProject,
	editId: number,
): Promise<number> {
	const { snapshot_id } = await db
		.selectFrom("project_edits")
		.where("project_uuid", "=", dbProject.uuid)
		.where("edit_id", "=", editId)
		.select("snapshot_id")
		.executeTakeFirstOrThrow();
	return snapshot_id;
}

async function setEditAndSnapshot(
	dbProject: DbProject,
	args: { edit_id: number; snapshot_id: number },
) {
	await db
		.updateTable("projects")
		.set({
			current_edit_id: args.edit_id,
			current_snapshot_id: args.snapshot_id,
		})
		.where("uuid", "=", dbProject.uuid)
		.execute();
	dbProject.current_edit_id = args.edit_id;
	dbProject.current_snapshot_id = args.snapshot_id;
}

// Map from project UUID to in-memory Project
const openProjects = new Map<string, Project>();

export async function handleClientWebSocketMessage(
	ws: WSContext<WebSocket>,
	message: MessageEvent<WSMessageReceive>,
) {
	const str = z.string().parse(message.data);
	const obj = JSON.parse(str);
	const packet = ServerboundPacket.parse(obj);
	const wsState = wsStates.get(ws);
	if (wsState && wsState.state === "unauthenticated") {
		if (packet.type === "login_request_sb") {
			const { username, password } = packet;
			const user = await getUserByUsernamePassword(username, password);
			if (user != null) {
				setWsAuthenticated(ws, user);
				const projects = (await getUserProjects(user)).map((proj) => proj.uuid);
				const loginSuccess: LoginSuccessCb = {
					type: "login_success_cb",
					projects,
				};
				ws.send(JSON.stringify(loginSuccess));
			}
		} else if (packet.type === "register_request_sb") {
			const { username, password } = packet;
			const user = await insertUser(username, password);
			if (user != null) {
				setWsAuthenticated(ws, user);
				const projects = (await getUserProjects(user)).map((proj) => proj.uuid);
				const registerSuccess: RegisterSuccessCb = {
					type: "register_success_cb",
					projects,
				};
				ws.send(JSON.stringify(registerSuccess));
			}
		}
	} else if (wsState && wsState.state === "authenticated") {
		if (packet.type === "set_current_project_sb") {
			await Project.connectWsAndSendInit(packet.project_uuid, ws);
		}
	} else if (wsState && wsState.state === "project") {
		// const { user, project } = wsState;
		const { user } = wsState;
		const project = openProjects.get(wsState.project.uuid);
		if (project) {
			// TODO: no duplicate parsing
			try {
				const str = z.string().parse(message.data);
				const obj = JSON.parse(str);
				const packet = ServerboundPacket.parse(obj);
				if (packet.type === "mouse_move_sb") {
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
					for (const other of project.connectedClients) {
						if (other !== ws) {
							other.send(response_str);
						}
					}
					return;
				}
				if (packet.type === "epanet_action_sb") {
					try {
						let resp: ClientboundPacket = { type: "empty_cb" };
						project.epanet.applyAction(packet.data);
						const created_at = new Date();
						resp = {
							type: "epanet_edit_cb",
							data: {
								action: packet.data,
								created_at,
								edit_id: project.dbProject.edit_count,
								parent_id: project.dbProject.current_edit_id,
								snapshot_id: project.dbProject.current_snapshot_id,
								user_username: user.username,
								user_uuid: user.uuid,
							},
						};
						project.addDbEdit({
							user_username: user.username,
							user_uuid: user.uuid,
							created_at,
							action: packet.data,
							edit_id: project.dbProject.edit_count,
							parent_id: project.dbProject.current_edit_id,
							snapshot_id: project.dbProject.current_snapshot_id,
						});
						project.incrementEditCount();
						// notify all clients of the change
						project.broadcast(resp);
					} catch (err) {
						// On any error, reset state from the backup
						// TODO: send the client a message saying their edit failed? They
						// should already know that because they also have an EPANET model,
						// but just in case we could report it back
						// console.log(JSON.stringify(err));
						// TODO: optimized error handling. Specifically, remove the clone()
						// call above the try block, and instead effectively do project
						// initialization again. Cost should be about the same or cheaper,
						// since clone() is implemented using saveInp() then fromInp().
						// Project init would just be fromInp() then a handful of dirt
						// cheap applyAction() calls. Even a thousand edit long tree would
						// likely be faster than one clone() call.
						const latestEditId = project.dbProject.current_edit_id;
						const currentSnapshotId = project.dbProject.current_snapshot_id;
						// TODO: get INP, apply edits?
						const chronoEdits = project.editTree.getChronologicalWithLastChild(
							project.dbProject.current_edit_id,
						);
						const latest_inp = await getLatestInp(project.dbProject);
						if (latest_inp == null) {
							throw new Error(
								"Fatal error: when trying to restore a backup, no INP file could be loaded",
							);
						}
						project.epanet = EpanetWrapper.fromInp(
							latest_inp,
							project.dbProject.utm_zone,
						);
						for (const edit of chronoEdits) {
							project.epanet.applyAction(edit.action);
						}
					}
				} else if (packet.type === "track_edit_sb") {
					// TODO: rebuild tree, tell clients the new state
					// get snapshot id for the given edit. If it matches current, good,
					// clients should already have edits. If not, get that snapshot
					// subtree and do some parsing.
					const snapshotId = await getEditSnapshotId(
						project.dbProject,
						packet.edit_id,
					);
					if (snapshotId == null) {
						// TODO: notify client that there is no snapshot associated with
						// that edit. they're doing something funky
						return;
					}
					if (packet.edit_id === project.dbProject.current_edit_id) {
						// no op for switching to the same edit
						return;
					}
					if (snapshotId === project.dbProject.current_snapshot_id) {
						await setEditAndSnapshot(project.dbProject, {
							edit_id: packet.edit_id,
							snapshot_id: snapshotId,
						});
						const resp: TrackEditCb = {
							edit_id: packet.edit_id,
							snapshot_id: snapshotId,
							type: "track_edit_cb",
						};
						project.broadcast(resp);
					} else {
						// TODO: also roll back on the server side. Doesn't seem like anything
						// happens right now.
						const editArrays = await getSnapshotEditArrays(
							project.dbProject,
							snapshotId,
						);
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
						project.broadcast(response);
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
