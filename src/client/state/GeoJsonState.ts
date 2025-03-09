import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { ClientboundPacket, MouseMoveCb } from "../../packets/clientbound.js";
import type { EpanetWrapper } from "../../epanet/EpanetWrapper.js";
import clone from "@turf/clone";
import { utmToLongLat } from "../../coords.js";
import type { AddJunctionAction, AddPipeAction, AddReservoirAction, AddTankAction } from "../../packets/common.js";

type Collection = FeatureCollection<Geometry, { id: string }>;

export default class GeoJsonState {
    public junctions: Collection
    public tanks: Collection
    public reservoirs: Collection
    public pipes: Collection
    public cursors: FeatureCollection<Geometry, { user_id: string, username: string }>
    private utmZone: string

    constructor(utmZone: string) {
        this.utmZone = utmZone;

        this.junctions = {
            type: "FeatureCollection",
            crs: {
                type: 'name',
                properties: {
                    name: 'EPSG:4326',
                }
            },
            features: [],
        }
        this.tanks = {
            type: "FeatureCollection",
            features: [],
        }
        this.reservoirs = {
            type: "FeatureCollection",
            features: [],
        }
        this.pipes = {
            type: "FeatureCollection",
            features: [],
        }
        this.cursors = {
            type: "FeatureCollection",
            features: [],
        }
    }

    public loadFromEpanet(epanet: EpanetWrapper) {
        const { junctions, tanks, reservoirs } = epanet.getAllNodesGeoJSON();
        const pipes = epanet.getPipesGeoJSON(this.utmZone);
        this.junctions = junctions;
        this.tanks = tanks;
        this.reservoirs = reservoirs;
        this.pipes = pipes;
    }

    public clone(): GeoJsonState {
        const ret = new GeoJsonState(this.utmZone);
        ret.junctions = clone(this.junctions);
        ret.tanks = clone(this.tanks);
        ret.reservoirs = clone(this.reservoirs);
        ret.pipes = clone(this.pipes);
        ret.cursors = clone(this.cursors);
        return ret;
    }

    public addJunction(data: AddJunctionAction) {
        const [longitude, latitude] = utmToLongLat([data.x, data.y], this.utmZone);
        this.junctions.features.push({
            type: "Feature",
            properties: {
                id: data.id,
            },
            geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
            }
        });
    }

    public deleteJunction(id: string) {
        const features = this.junctions.features;
        for (let i = 0; i < features.length; ++i) {
            if (features[i].properties.id == id) {
                // Index i is the one to be deleted
                // Efficient delete: swap with last element and pop. Unreachable
                // for features.length === 0, and safe when i === features.length - 1
                [features[i], features[features.length - 1]] = [features[features.length - 1], features[i]];
                features.pop();
                return;
            }
        }
    }

    public addReservoir(data: AddReservoirAction) {
        const [longitude, latitude] = utmToLongLat([data.x, data.y], this.utmZone);
        this.reservoirs.features.push({
            type: "Feature",
            properties: {
                id: data.id,
            },
            geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
            }
        })
    }

    public deleteReservoir(id: string) {
        const features = this.reservoirs.features;
        for (let i = 0; i < features.length; ++i) {
            if (features[i].properties.id == id) {
                [features[i], features[features.length - 1]] = [features[features.length - 1], features[i]];
                features.pop();
                return;
            }
        }
    }

    public addTank(data: AddTankAction) {
        const [longitude, latitude] = utmToLongLat([data.x, data.y], this.utmZone);
        this.tanks.features.push({
            type: "Feature",
            properties: {
                id: data.id,
            },
            geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
            }
        })
    }

    public deleteTank(id: string) {
        const features = this.tanks.features;
        for (let i = 0; i < features.length; ++i) {
            if (features[i].properties.id == id) {
                [features[i], features[features.length - 1]] = [features[features.length - 1], features[i]];
                features.pop();
                return;
            }
        }
    }

    // TODO: reduce code duplication here and in EpanetWrapper.getPipesGeoJSON()?
    public addPipe(data: AddPipeAction, epanet: EpanetWrapper) {
        const startCoordsXY = epanet.getNodeCoords(data.start_node);
        const finishCoordsXY = epanet.getNodeCoords(data.end_node);
        const startCoords = utmToLongLat([startCoordsXY.x, startCoordsXY.y], this.utmZone);
        const finishCoords = utmToLongLat([finishCoordsXY.x, finishCoordsXY.y], this.utmZone);
        const allCoords = [startCoords];
        for (const v of data.vertices) {
            const longLat = utmToLongLat([v.x, v.y], this.utmZone);
            allCoords.push(longLat);
        }
        allCoords.push(finishCoords);
        this.pipes.features.push({
            type: "Feature",
            properties: {
                id: data.id,
            },
            geometry: {
                type: "LineString",
                coordinates: allCoords,
            }
        })
    }

    public deletePipe(id: string) {
        const features = this.pipes.features;
        for (let i = 0; i < features.length; ++i) {
            if (features[i].properties.id == id) {
                [features[i], features[features.length - 1]] = [features[features.length - 1], features[i]];
                features.pop();
                return;
            }
        }
    }

    public doMouseMoveCb(p: MouseMoveCb) {
        for (const cursor of this.cursors.features) {
            if (cursor.properties.user_id == p.user_id && cursor.geometry.type == "Point") {
                cursor.geometry.coordinates = [p.longitude, p.latitude];
                return;
            }
        }
        // Nobody with that ID has moved their cursor before: add another
        this.cursors.features.push({
            type: "Feature",
            properties: {
                user_id: p.user_id,
                username: p.username,
            },
            geometry: {
                type: "Point",
                coordinates: [p.longitude, p.latitude],
            }
        })
    }
}
