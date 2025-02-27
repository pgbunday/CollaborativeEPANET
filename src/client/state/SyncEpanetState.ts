import { z } from "zod";
import { ClientboundPacket } from "../../packets/clientbound.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";
import { EpanetWrapper } from "../../epanet/EpanetWrapper.js";

export default class SyncEpanetState {
    private localEpanet: EpanetWrapper
    private syncedEpanet: EpanetWrapper

    private readonly ws: WebSocket
    private readonly utm_zone: string

    private listeners: { (msg: ClientboundPacket): void }[]
    // Although this class handles messages immediately, it may be possible for
    // a project init packet to be received before any listeners are subscribed.
    // To fix this, a small backlog is used to buffer messages until at least
    // one listener has subscribed.
    private listenerBacklog: ClientboundPacket[]

    constructor(ws: WebSocket, utm_zone: string) {
        this.ws = ws;
        this.utm_zone = utm_zone;
        this.localEpanet = new EpanetWrapper(utm_zone);
        this.syncedEpanet = new EpanetWrapper(utm_zone);
        this.listeners = [];
        this.listenerBacklog = [];
        this.ws.addEventListener('message', (e) => this.handleServerMessage(e));
    }

    get local(): EpanetWrapper {
        return this.localEpanet
    }

    get synced(): EpanetWrapper {
        return this.syncedEpanet
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
        } else {
            return false;
        }
    }

    /**
     * Interface for applying changes that the server has sent out for EPANET.
     * @param packet 
     */
    public applySynced(packet: ClientboundPacket): boolean {
        // resetLocal is true by default to avoid desynchronization. For example,
        // if user A renames junction J1 to J2, and at the same time user B sets
        // junction properties on J1, the server may receive user A's request
        // first. It will do the rename and broadcast the change to clients.
        // Although user B's change would have worked locally, the server no
        // longer knows what junction J1 is so setting the properties would fail.
        // Performing this reset keeps any "user B" from getting too far behind
        // actual edits, and makes sure everyone is as close to on the same page
        // as possible. As implemented, the syncedEpanet.clone() call is not
        // very cheap (saving an INP file and loading it again, every time state
        // is modified). But, without modifying epanet-js or rewriting the C
        // library in JS, I think this is the best option for safety.
        //
        // For any packets that don't modify state, like cursor movement,
        // resetLocal is set to false to avoid the clone() call and keep the UI
        // fluid.
        try {
            let resetLocal = true;
            if (packet.type == "add_junction_cb") {
                this.syncedEpanet.addJunction(packet.data);
            } else if (packet.type == "add_pipe_cb") {
                this.syncedEpanet.addPipe(packet.data);
            } else if (packet.type == "add_reservoir_cb") {
                this.syncedEpanet.addReservoir(packet.data);
            } else if (packet.type == "add_tank_cb") {
                this.syncedEpanet.addTank(packet.data);
            } else if (packet.type == "delete_junction_cb") {
                this.syncedEpanet.deleteJunction(packet.id);
            } else if (packet.type == "delete_pipe_cb") {
                this.syncedEpanet.deletePipe(packet.id);
            } else if (packet.type == "junction_properties_cb") {
                this.syncedEpanet.junctionProperties(packet.data);
            } else if (packet.type == "pipe_properties_cb") {
                this.syncedEpanet.pipeProperties(packet.data);
            } else if (packet.type == "project_info_cb") {
                this.syncedEpanet.openInp(packet.inp_file);
            } else if (packet.type == "empty_cb" || packet.type == "mouse_move_cb") {
                // Do nothing, these packets have nothing to do with EPANET state.
                // They will still be relayed to listeners as implemented in
                // the ws.onmessage handler, this.handleMessage().
                resetLocal = false;
                return true;
            } else {
                // Log guard to catch possible errors when new packets are added to
                // the code
                resetLocal = false;
                console.warn('Unhandled packet in SyncEpanetState.applySynced:', packet);
                return false;
            }

            if (resetLocal) {
                this.localEpanet = this.syncedEpanet.clone();
            }
            return true;
        }
        catch (e) {
            console.error('Error in SyncEpanetState.applySynced():', e);
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
        if (packet.type == "mouse_move_sb") {
            // skip handling, this has nothing to do with EPANET state
            return true;
        } else {
            const backup = this.localEpanet.clone();
            try {
                if (packet.type == "add_junction_sb") {
                    this.localEpanet.addJunction(packet.data);
                } else if (packet.type == "add_pipe_sb") {
                    this.localEpanet.addPipe(packet.data);
                } else if (packet.type == "add_reservoir_sb") {
                    this.localEpanet.addReservoir(packet.data);
                } else if (packet.type == "add_tank_sb") {
                    this.localEpanet.addTank(packet.data);
                } else if (packet.type == "delete_junction_sb") {
                    this.localEpanet.deleteJunction(packet.id);
                } else if (packet.type == "delete_pipe_sb") {
                    this.localEpanet.deletePipe(packet.id);
                } else if (packet.type == "junction_properties_sb") {
                    this.localEpanet.junctionProperties(packet.data);
                } else if (packet.type == "pipe_properties_sb") {
                    this.localEpanet.pipeProperties(packet.data);
                } else {
                    console.warn('Unhandled packet in SyncEpanetState.applyLocal:', packet);
                    return false;
                }
                // No exception, edit was successful
                return true;
            }
            catch (e) {
                console.error('Error in SyncEpanetState.applyLocal, packet:', packet, ', exception:', e);
                this.localEpanet = backup;
                return false;
            }
        }
    }

    /**
     * Allows other functions to be called when data has been received. If fn
     * is the first listener being added, all messages in the backlog are
     * passed to it before this function returns.
     * @param fn A handler function, called whenever this class receives a new
     * message on its WebSocket
     */
    public subscribe(fn: (packet: ClientboundPacket) => void) {
        if (this.listeners.length === 0) {
            for (const msg of this.listenerBacklog) {
                fn(msg);
            }
            this.listenerBacklog = [];
        }
        this.listeners.push(fn);
    }
}
