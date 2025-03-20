import { z } from "zod";
import SyncEpanetState from "./client/state/SyncEpanetState";
import { ClientboundPacket, EpanetEditCb } from "./packets/clientbound";
import type { EpanetActionSb, LoginRequestSb, SetCurrentProjectSb } from "./packets/serverbound";
import { waitForDebugger } from "inspector";
import { debug } from "util";

waitForDebugger();

const connectStart = Date.now();
const ws = new WebSocket('http://localhost:3000/ws');
const syncState = new SyncEpanetState(ws, 'utm15n');
// TODO: send loginrequest, receive loginsuccess, send set current project,
// then set up SyncEpanetState to receive init

const JUNCTION_COUNT = 100;

function runBenchmark() {
    let receivedCount = 0;
    const benchStart = Date.now();
    syncState.subscribe([packet => {
        if (packet.type == "epanet_edit_cb" && packet.data.action.type == "add_junction_action") {
            receivedCount += 1;
            if (receivedCount == JUNCTION_COUNT) {
                const benchEnd = Date.now();
                const benchMs = benchEnd - benchStart;
                console.log(`Added ${JUNCTION_COUNT} junctions in ${benchMs}ms (${JUNCTION_COUNT / benchMs * 1000}/s)`);
            }
        }
    }]);
    for (let i = 0; i < JUNCTION_COUNT; ++i) {
        const toSend: EpanetActionSb = {
            type: "epanet_action_sb",
            data: {
                type: "add_junction_action",
                elevation: Math.random(),
                id: 'J' + Math.random(),
                x: Math.random(),
                y: Math.random(),
            }
        }
        syncState.send(toSend);
    }
}

function handleLoginMessages(msg: MessageEvent<any>) {
    const msg_str = z.string().parse(msg.data);
    const msg_obj = JSON.parse(msg_str);
    const packet = ClientboundPacket.parse(msg_obj);
    if (packet.type == "login_success_cb") {
        const setProject: SetCurrentProjectSb = {
            type: "set_current_project_sb",
            project_uuid: packet.projects[0],
        };
        ws.send(JSON.stringify(setProject));
    } else if (packet.type == "track_edit_cb") {
        const connectEnd = Date.now();
        const connectMs = connectEnd - connectStart;
        console.log(`Project connection took ${connectMs}ms, including password hashing for login`);
        ws.removeEventListener('message', handleLoginMessages);
        runBenchmark();
    }
}

ws.addEventListener('open', () => {
    ws.addEventListener('message', handleLoginMessages);
    const loginRequest: LoginRequestSb = {
        type: "login_request_sb",
        username: 'asdf',
        password: 'jkl',
    };
    ws.send(JSON.stringify(loginRequest));
})