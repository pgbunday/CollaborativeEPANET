import { longLatToUtm } from "../../coords.js";
import type { EpanetWrapper } from "../../epanet/EpanetWrapper.js";
import type { AddPipeAction } from "../../packets/common.js";

export default class AddPipeState {
    start_id: string
    end_id: string
    intermediate_coordinates: {
        longitude: number,
        latitude: number,
    }[]
    constructor(start_id: string) {
        this.start_id = start_id;
        this.end_id = '';
        this.intermediate_coordinates = [];
    }
    start(start_id: string) {
        this.start_id = start_id;
    }
    addPoint(longitude: number, latitude: number) {
        this.intermediate_coordinates.push({ longitude, latitude });
    }
    finish(end_id: string) {
        this.end_id = end_id;
    }
    toAddPipeData(utm_zone: string, epanet: EpanetWrapper, id: string): AddPipeAction {
        const vertices = [];
        for (const lngLat of this.intermediate_coordinates) {
            const utmCoords = longLatToUtm([lngLat.longitude, lngLat.latitude], utm_zone);
            vertices.push({ x: utmCoords[0], y: utmCoords[1] });
        }
        // Auto length algorithm: either find the distance between start and finish,
        // or start and first intermediate, plus last intermediate and finish, plus
        // all the intermediate lengths
        let length = 0;
        const startCoords = epanet.getNodeCoords(this.start_id);
        const endCoords = epanet.getNodeCoords(this.end_id);
        if (vertices.length == 0) {
            const xDiff = startCoords.x - endCoords.x;
            const yDiff = startCoords.y - endCoords.y;
            length += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
        } else {
            // Calculate the length of the first segment, from the start
            // node to the first intermediate vertex
            const startXDiff = startCoords.x - vertices[0].x;
            const startYDiff = startCoords.y - vertices[0].y;
            length += Math.sqrt(startXDiff * startXDiff + startYDiff * startYDiff);
            // Calculate the length of the last segment, from the last node
            // to the last intermediate vertex
            const endXDiff = endCoords.x - vertices[vertices.length - 1].x;
            const endYDiff = endCoords.y - vertices[vertices.length - 1].y;
            length += Math.sqrt(endXDiff * endXDiff + endYDiff * endYDiff);
            // Also add the lengths of all intermediate segments
            for (let i = 0; i < vertices.length - 1; ++i) {
                const p1 = vertices[i];
                const p2 = vertices[i + 1];
                const xDiff = p1.x - p2.x;
                const yDiff = p1.y - p2.y;
                length += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            }
        }
        return {
            type: "add_pipe_action",
            end_node: this.end_id,
            id,
            length,
            start_node: this.start_id,
            vertices,
        }
    }
    reset() {
        this.start_id = '';
        this.end_id = '';
        this.intermediate_coordinates = [];
    }
}
