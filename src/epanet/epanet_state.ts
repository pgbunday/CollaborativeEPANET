import { ActionCodeType, CountType, FlowUnits, HeadLossType, LinkProperty, LinkStatusType, LinkType, NodeProperty, NodeType, Project, Workspace } from "epanet-js";
import type { Feature, FeatureCollection, GeoJSON, GeoJsonProperties, Geometry } from "geojson";
import { utmToLongLat } from "../coords.js";
import type { AddJunctionData, AddPipeData, AddReservoirData, AddTankData, LinkStatus, PipePropertiesData } from "../packets/common.js";

const INP_FILENAME = 'project.inp';
const REPORT_FILENAME = 'report.rpt';
const OUTPUT_FILENAME = 'out.bin';

type NodeGeoJSON = FeatureCollection<Geometry, GeoJsonProperties>;

export class EpanetState {
    private workspace: Workspace
    private project: Project
    private utm_zone: string

    /**
     * Sets up classes used by the netework, without actually initializing
     * anything. Generally, {@link fromInp} should be used, but in cases
     * where initialization doesn't have to be immediate, it can be done
     * later with {@link openInp}
     */
    constructor(utm_zone: string) {
        this.workspace = new Workspace();
        this.project = new Project(this.workspace);
        this.project.init(REPORT_FILENAME, OUTPUT_FILENAME, FlowUnits.GPM, HeadLossType.HW);
        this.utm_zone = utm_zone;
    }

    openInp(inp_file: string) {
        this.workspace.writeFile(INP_FILENAME, inp_file);
        this.project.open(INP_FILENAME, REPORT_FILENAME, OUTPUT_FILENAME)
    }

    /**
     * 
     * @param inp_file An INP file built with EPANET
     * @returns A new object built with the INP file
     */
    static fromInp(inp_file: string, utm_zone: string): EpanetState {
        const state = new EpanetState(utm_zone);
        state.workspace.writeFile(INP_FILENAME, inp_file);
        state.project.open(INP_FILENAME, REPORT_FILENAME, OUTPUT_FILENAME);
        return state;
    }

    /**
     * @returns A textual representation of the network, an INP file
     */
    saveInp(): string {
        this.project.saveInpFile(INP_FILENAME);
        return this.workspace.readFile(INP_FILENAME, 'utf8');
    }

    /**
     * @returns A network identical to the current one, but with different
     * objects and memory
     */
    clone(): EpanetState {
        const inp_file = this.saveInp();
        const backup = EpanetState.fromInp(inp_file, this.utm_zone);
        return backup;
    }

    /**
     * Attempts to add a junction to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the junction
     */
    addJunction(data: AddJunctionData) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Junction);
        this.project.setNodeValue(nodeIndex, NodeProperty.Elevation, data.elevation);
        this.project.setCoordinates(nodeIndex, data.x, data.y);
    }

    /**
     * Attempts to add a reservoir to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the reservoir
     */
    addReservoir(data: AddReservoirData) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Reservoir);
        this.project.setCoordinates(nodeIndex, data.x, data.y);
    }

    /**
     * Attempts to add a tank to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the tank
     */
    addTank(data: AddTankData) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Tank);
        this.project.setNodeValue(nodeIndex, NodeProperty.Elevation, data.elevation);
        this.project.setCoordinates(nodeIndex, data.x, data.y);
    }

    /**
     * Attempts to add a pipe to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the pipe
     */
    addPipe(data: AddPipeData) {
        const pipeIdx = this.project.addLink(data.id, LinkType.Pipe, data.start_node, data.end_node);
        this.project.setLinkValue(pipeIdx, LinkProperty.Length, data.length);
        if (data.vertices.length != 0) {
            const xs = [];
            const ys = [];
            for (const point of data.vertices) {
                xs.push(point.x);
                ys.push(point.y);
            }
            this.project.setVertices(pipeIdx, xs, ys)
        }
    }

    pipeProperties(data: PipePropertiesData) {
        const pipeIdx = this.project.getLinkIndex(data.old_id);
        this.project.setLinkValue(pipeIdx, LinkProperty.Diameter, data.diameter);
        this.project.setLinkValue(pipeIdx, LinkProperty.Length, data.length);
        if (data.initial_status == "open") {
            this.project.setLinkValue(pipeIdx, LinkProperty.InitStatus, LinkStatusType.Open)
        } else if (data.initial_status == "closed") {
            this.project.setLinkValue(pipeIdx, LinkProperty.InitStatus, LinkStatusType.Closed);
        }
        this.project.setLinkValue(pipeIdx, LinkProperty.Roughness, data.roughness);
        this.project.setLinkValue(pipeIdx, LinkProperty.MinorLoss, data.loss_coefficient);
    }

    getAllNodesGeoJSON(): {
        junctions: NodeGeoJSON,
        tanks: NodeGeoJSON,
        reservoirs: NodeGeoJSON,
    } {
        const junctions: NodeGeoJSON = {
            type: "FeatureCollection",
            features: [],
        }
        const tanks: NodeGeoJSON = {
            type: "FeatureCollection",
            features: [],
        }
        const reservoirs: NodeGeoJSON = {
            type: "FeatureCollection",
            features: [],
        }

        const nNodes = this.project.getCount(CountType.NodeCount);
        // NOTE: nodes are 1-indexed. 0 will never be valid. This may also apply
        // to most or all other data structures in EPANET.
        for (let i = 1; i <= nNodes; ++i) {
            // All nodes should have coordinates attached, guaranteed by the API.
            // If not, there's a logic error somewhere
            const coords = this.project.getCoordinates(i);
            const jsonCoordsXY = [coords.x, coords.y];
            const jsonCoords = utmToLongLat(jsonCoordsXY, this.utm_zone)

            const nodeType = this.project.getNodeType(i);
            const feature: Feature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: jsonCoords,
                },
                properties: {
                    nodeIndex: i,
                    id: this.project.getNodeId(i),
                }
            };
            if (nodeType == NodeType.Junction) {
                junctions.features.push(feature);
            } else if (nodeType == NodeType.Reservoir) {
                reservoirs.features.push(feature)
            } else if (nodeType == NodeType.Tank) {
                tanks.features.push(feature);
            }
        }
        return {
            junctions,
            reservoirs,
            tanks,
        }
    }

    // TODO: also handle other link types, not just LinkType.Pipe
    getPipesGeoJSON(utm_zone: string): FeatureCollection<Geometry, GeoJsonProperties> {
        const pipesGeoJSON: GeoJSON<Geometry, GeoJsonProperties> = {
            type: "FeatureCollection",
            features: [],
        }
        const nLinks = this.project.getCount(CountType.LinkCount);
        for (let i = 1; i <= nLinks; ++i) {
            const linkType = this.project.getLinkType(i);
            if (linkType == LinkType.Pipe) {
                const { node1, node2 } = this.project.getLinkNodes(i);
                const startCoordsXY = this.project.getCoordinates(node1);
                const finishCoordsXY = this.project.getCoordinates(node2);
                const startCoords = utmToLongLat([startCoordsXY.x, startCoordsXY.y], utm_zone);
                const finishCoords = utmToLongLat([finishCoordsXY.x, finishCoordsXY.y], utm_zone);
                const allCoords = [startCoords];
                const nVertex = this.project.getVertexCount(i);
                if (nVertex != 0) {
                    for (let vIdx = 1; vIdx <= nVertex; ++vIdx) {
                        const v = this.project.getVertex(i, vIdx);
                        const longLat = utmToLongLat([v.x, v.y], utm_zone);
                        allCoords.push(longLat);
                    }
                }
                allCoords.push(finishCoords);
                pipesGeoJSON.features.push({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: allCoords,
                    },
                    properties: {
                        id: this.project.getLinkId(i),
                    }
                })
            }
        }
        return pipesGeoJSON;
    }

    getNodeCoords(nodeId: string): { x: number, y: number } {
        const nodeIdx = this.project.getNodeIndex(nodeId);
        const coords = this.project.getCoordinates(nodeIdx);
        return coords;
    }

    getPipeProperties(id: string): PipePropertiesData {
        const pipeIdx = this.project.getLinkIndex(id);
        const diameter = this.project.getLinkValue(pipeIdx, LinkProperty.Diameter);
        const length = this.project.getLinkValue(pipeIdx, LinkProperty.Length);
        const initial_status_num = this.project.getLinkValue(pipeIdx, LinkProperty.InitStatus);
        let initial_status: LinkStatus = "closed";
        if (initial_status_num == 1) {
            initial_status = "open";
        } else {
            initial_status = "closed";
        }
        const roughness = this.project.getLinkValue(pipeIdx, LinkProperty.Roughness);
        const loss_coefficient = this.project.getLinkValue(pipeIdx, LinkProperty.MinorLoss);
        return {
            diameter,
            old_id: id,
            new_id: id,
            initial_status,
            length,
            loss_coefficient,
            roughness,
        }
    }

    deletePipe(id: string) {
        const pipeIdx = this.project.getLinkIndex(id);
        this.project.deleteLink(pipeIdx, ActionCodeType.Conditional);
    }
}