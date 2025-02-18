// sync.ts: abstractions to allow seamless local-first editing, which is
// eventually synced with the server.
//
// The edit model is basically last write wins, so if users A and B are
// editing, A may make a local change before B, but if B's request reaches
// the server first, B's edit will be applied first.
//
// For consistency, we keep track of two sets of state. One is the "synced
// state", which only applies edits as they come in from the server. Another
// is the "local state", which is used only until the synced state is updated.
// Both sets of state carry certain variables: a few GeoJSON objects, which
// are used to actually render data on the map, and an instance of EpanetState,
// for interacting with the EPANET API.
//
// When editing, the user will generally click something to bring up a menu,
// or finish linking pipes, in which case a ClientActionsSchema is created.
// This local object is used to try updating the local state, during which
// the edit will first be applied to the EpanetState, and on success, it will
// be added to the GeoJSON and the respective layer will be re-rendered. On
// any failure, the user should be alerted somehow. If everything was
// successful, the ClientActionsSchema is passed to JSON.stringify() and then
// sent over the WebSocket to sync with the server. Any time the client receives
// a message from the server, a very similar process occurs, but through the
// synced state instead, and the synced GeoJSON is rendered.
//
// This whole process is encapsulated by two classes: ModelState and SyncState.
// ModelState contains an instance of EpanetState and a few GeoJSON objects for
// rendering, and is used for both local and synced state. Finally, the
// SyncState class actually differentiates between the two sets of state when
// applying updates and handles errors. When an update is successfully applied,
// whether local or synced from the server, the map is re rendered with that
// set of state.

import type { Geometry, GeoJsonProperties, FeatureCollection } from "geojson";
import { EpanetState } from "../epanet/epanet_state.js";
import type { ClientActionsSchema, PipePropertiesSchema } from "../epanet_types.js";
import { utmToLongLat } from "../coords.js";

class ModelState {
    junctions: FeatureCollection<Geometry, GeoJsonProperties>
    tanks: FeatureCollection<Geometry, GeoJsonProperties>
    reservoirs: FeatureCollection<Geometry, GeoJsonProperties>
    pipes: FeatureCollection<Geometry, GeoJsonProperties>
    epanet_state: EpanetState
    utm_zone: string
    constructor(epanet_state: EpanetState, utm_zone: string) {
        const { junctions, tanks, reservoirs } = epanet_state.getAllNodesGeoJSON();
        const pipes = epanet_state.getPipesGeoJSON(utm_zone);
        this.junctions = junctions;
        this.tanks = tanks;
        this.reservoirs = reservoirs;
        this.pipes = pipes;
        this.epanet_state = epanet_state;
        this.utm_zone = utm_zone;
    }
    clone() {
        return new ModelState(this.epanet_state.clone(), this.utm_zone);
    }
}

export class SyncState {
    local: ModelState
    synced: ModelState
    utm_zone: string
    constructor(utm_zone: string) {
        this.local = new ModelState(new EpanetState(utm_zone), utm_zone);
        this.synced = new ModelState(new EpanetState(utm_zone), utm_zone);
        // no rendering, no point for an empty network
        this.utm_zone = utm_zone;
    }
    applyLocal(action: ClientActionsSchema, map: maplibregl.Map) {
        this.apply("local", action, map);
    }
    applySynced(action: ClientActionsSchema, map: maplibregl.Map) {
        this.apply("synced", action, map);
        this.local = this.synced.clone();
    }
    getNodeCoords(id: string): { x: number, y: number } {
        return this.local.epanet_state.getNodeCoords(id);
    }
    getPipeProperties(id: string): PipePropertiesSchema {
        return this.synced.epanet_state.getPipeProperties(id);
    }
    private apply(model: "local" | "synced", action: ClientActionsSchema, map: maplibregl.Map) {
        // Although inefficient, cloning all state for a backup is the easiest
        // thing I can think of to have consistent state.
        let model_state = model == "local" ? this.local : this.synced;
        const backup = model_state.clone();
        try {
            if (action.type == "add_junction") {
                model_state.epanet_state.addJunction(action);
                model_state.junctions.features.push({
                    type: "Feature",
                    properties: {
                        id: action.id,
                    },
                    geometry: {
                        type: "Point",
                        coordinates: utmToLongLat([action.x, action.y], this.utm_zone),
                    }
                });
            } else if (action.type == "add_pipe") {
                model_state.epanet_state.addPipe(action);
                // TODO: a little more efficient, just push instead of recalculate
                model_state.pipes = model_state.epanet_state.getPipesGeoJSON(this.utm_zone);
                // model_state.pipes.features.push({
                //     type: "Feature",
                //     properties: {
                //         id: action.id,
                //     },
                //     geometry: {
                //         type: "LineString",
                //         coordinates: [
                //             // TODO: get start and end coords, vertices in between
                //         ]
                //     }
                // })
            } else if (action.type == "add_pump") {
                // TODO
            } else if (action.type == "add_reservoir") {
                model_state.epanet_state.addReservoir(action);
                model_state.reservoirs.features.push({
                    type: "Feature",
                    properties: {
                        id: action.id,
                    },
                    geometry: {
                        type: "Point",
                        coordinates: utmToLongLat([action.x, action.y], this.utm_zone),
                    }
                });
            } else if (action.type == "add_tank") {
                model_state.epanet_state.addTank(action);
                model_state.tanks.features.push({
                    type: "Feature",
                    properties: {
                        id: action.id,
                    },
                    geometry: {
                        type: "Point",
                        coordinates: utmToLongLat([action.x, action.y], this.utm_zone),
                    }
                });
            } else if (action.type == "add_valve") {
                // TODO
            } else if (action.type == "project_init") {
                // When project_init is received, everything gets thrown out and
                // new objects are created.
                console.log(action.inp_file);
                const new_local_epanet_state = EpanetState.fromInp(action.inp_file, this.utm_zone);
                const new_synced_epanet_state = EpanetState.fromInp(action.inp_file, this.utm_zone);
                const new_local_state = new ModelState(new_local_epanet_state, this.utm_zone);
                const new_synced_state = new ModelState(new_synced_epanet_state, this.utm_zone);
                model_state = new_synced_state;
                this.local = new_local_state;
                this.synced = new_synced_state;
            } else if (action.type == "pipe_properties") {
                // TODO: if storing properties in GeoJSON, also update those
                model_state.epanet_state.pipeProperties(action);
            }
            this.render(model_state, map);
        } catch (e) {
            // any error: restore the backup and render from it
            console.log(e);
            if (model == "local") {
                this.local = backup;
                this.render(this.local, map);
            } else if (model == "synced") {
                this.synced = backup;
                this.render(this.synced, map);
            }
        }
    }
    private render(model_state: ModelState, map: maplibregl.Map) {
        const junctionsSource = map.getSource('junctions-source');
        if (junctionsSource) {
            // @ts-ignore
            junctionsSource.setData(model_state.junctions);
        }
        const tanksSource = map.getSource('tanks-source');
        if (tanksSource) {
            // @ts-ignore
            tanksSource.setData(model_state.tanks);
        }
        const reservoirsSource = map.getSource('reservoirs-source');
        if (reservoirsSource) {
            // @ts-ignore
            reservoirsSource.setData(model_state.reservoirs);
        }

        // TODO: instead of just pipes, also handle other LinkType values
        const pipesSource = map.getSource('pipes-source');
        if (pipesSource) {
            // @ts-ignore
            pipesSource.setData(model_state.pipes);
        }
    }
}