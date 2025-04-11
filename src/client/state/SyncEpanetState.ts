import { z } from "zod";
import { EpanetWrapper } from "../../epanet/EpanetWrapper.js";
import EditTree from "../../epanet/EditTree.js";
import { ClientboundPacket, EpanetEdit } from "../../packets/clientbound.js";
import type {
	ServerboundPacket,
	TrackEditSb,
} from "../../packets/serverbound.js";

export default class SyncEpanetState {
	private localEpanet: EpanetWrapper;
	private syncedEpanet: EpanetWrapper;

	private readonly ws: WebSocket;
	private readonly utm_zone: string;

	// For versioning, these help keep tree operations to a minimum
	private currentSnapshotId: number;
	private currentEditId: number;
	private currentSnapshotInp: string;

	private listeners: ((msg: ClientboundPacket) => void)[];
	// Although this class handles messages immediately, it may be possible for
	// a project init packet to be received before any listeners are subscribed.
	// To fix this, a small backlog is used to buffer messages until at least
	// one listener has subscribed.
	private listenerBacklog: ClientboundPacket[];

	public readonly editTree: EditTree;

	constructor(ws: WebSocket, utm_zone: string) {
		this.ws = ws;
		this.utm_zone = utm_zone;
		this.localEpanet = new EpanetWrapper(utm_zone);
		this.syncedEpanet = new EpanetWrapper(utm_zone);
		this.listeners = [];
		this.listenerBacklog = [];
		this.currentSnapshotId = -1;
		this.currentEditId = -1;
		this.currentSnapshotInp = "";
		this.editTree = new EditTree();
		this.ws.addEventListener("message", (e) => this.handleServerMessage(e));
	}

	get local(): EpanetWrapper {
		return this.localEpanet;
	}

	get synced(): EpanetWrapper {
		return this.syncedEpanet;
	}

	private handleServerMessage(e: MessageEvent<any>) {
		const data = e.data;
		const dataString = z.string().parse(data);
		const dataObject = JSON.parse(dataString);
		const clientbound = ClientboundPacket.parse(dataObject);
		this.applySynced(clientbound);

		// Relay the message to all listeners
		if (this.listeners.length === 0) {
			this.listenerBacklog.push(clientbound);
		} else {
			for (const listener of this.listeners) {
				listener(clientbound);
			}
		}
	}

	/**
	 * Interface to optimistically apply local edits and send them to the server
	 * @param packet Data that will be sent to the server
	 * @returns True if the change was successfully applied, false for any errors
	 */
	public applyLocalAndSend(packet: ServerboundPacket): boolean {
		if (this.applyLocal(packet)) {
			this.ws.send(JSON.stringify(packet));
			return true;
		}
		return false;
	}

	public send(packet: ServerboundPacket) {
		this.ws.send(JSON.stringify(packet));
	}

	/**
	 * Interface for applying changes that the server has sent out for EPANET.
	 * @param packet
	 */
	public applySynced(packet: ClientboundPacket): boolean {
		if (packet.type === "mouse_move_cb" || packet.type === "empty_cb") {
			return true;
		}
		try {
			if (packet.type === "epanet_edit_cb") {
				this.syncedEpanet.applyAction(packet.data.action);
				if (
					this.localEpanet.numEditsSinceInp ===
					this.syncedEpanet.numEditsSinceInp - 1
				) {
					this.localEpanet.applyAction(packet.data.action);
				} else {
					this.localEpanet = this.syncedEpanet.clone();
				}
			} else if (packet.type === "track_edit_cb") {
				const { edit_id, snapshot_id, snapshot_data } = packet;
				if (snapshot_id !== this.currentSnapshotId && snapshot_data) {
					this.currentSnapshotInp = snapshot_data.snapshot_inp;
					for (const edit of snapshot_data.snapshot_children) {
						this.editTree.addNode(edit);
					}
					const chronologicalEdits =
						this.editTree.getChronologicalWithLastChild(edit_id);
					this.syncedEpanet = new EpanetWrapper(this.utm_zone);
					this.syncedEpanet.openInp(snapshot_data.snapshot_inp);
					for (const edit of chronologicalEdits) {
						this.syncedEpanet.applyAction(edit.action);
					}
					this.currentEditId = edit_id;
				} else {
					// we should already have the edit, just need to traverse the tree
					const chronologicalEdits =
						this.editTree.getChronologicalWithLastChild(edit_id);
					this.syncedEpanet = new EpanetWrapper(this.utm_zone);
					this.syncedEpanet.openInp(this.currentSnapshotInp);
					for (const edit of chronologicalEdits) {
						this.syncedEpanet.applyAction(edit.action);
						console.log("applied edit", edit);
					}
					this.currentEditId = edit_id;
				}
				// regardless of whether this was a new INP or not, just reset the local state
				this.localEpanet = this.syncedEpanet.clone();
			}
			return true;
		} catch (e) {
			console.error("Error in SyncEpanetState.applySynced():", e);
			return false;
		}
	}

	/**
	 * Interface for optimistically applying changes to EPANET locally. No
	 * guarantees are made about whether they will persist.
	 * @param packet Data that could be sent to the server
	 * @returns True if modifying state was successful, false if some error
	 * occurred
	 */
	private applyLocal(packet: ServerboundPacket): boolean {
		if (packet.type === "mouse_move_sb") {
			// skip handling, this has nothing to do with EPANET state
			return true;
		}
		if (packet.type === "epanet_action_sb") {
			const backup = this.localEpanet.clone();
			const action = packet.data;
			try {
				this.localEpanet.applyAction(action);
				// No exception, edit was successful
				return true;
			} catch (e) {
				console.error(
					"Error in SyncEpanetState.applyLocal, packet:",
					packet,
					", exception:",
					e,
				);
				this.localEpanet = backup;
				return false;
			}
		} else if (packet.type === "track_edit_sb") {
			console.error("Not handling track_edit_sb yet");
			// return false;
			// just to see if rollback works
			return true;
		} else {
			console.warn("Unhandled packet in applyLocal:", packet);
			return false;
		}
	}

	/**
	 * Allows other functions to be called when data has been received. If fn
	 * is the first listener being added, all messages in the backlog are
	 * passed to it before this function returns.
	 * @param fn A handler function, called whenever this class receives a new
	 * message on its WebSocket
	 */
	public subscribe(fns: ((packet: ClientboundPacket) => void)[]) {
		if (this.listeners.length === 0) {
			for (const msg of this.listenerBacklog) {
				for (const fn of fns) {
					fn(msg);
				}
			}
			this.listenerBacklog = [];
			this.listeners = fns;
		} else {
			for (const fn of fns) {
				this.listeners.push(fn);
			}
		}
	}
}
