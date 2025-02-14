import { CountType, FlowUnits, HeadLossType, LinkProperty, LinkType, NodeProperty, NodeType, Project, Workspace } from "epanet-js";
import type { AddJunctionSchema, AddPipeSchema, AddReservoirSchema, AddTankSchema } from "../epanet_types.js";
import type { Feature, FeatureCollection, GeoJSON, GeoJsonProperties, Geometry } from "geojson";

const INP_FILENAME = 'project.inp';
const REPORT_FILENAME = 'report.rpt';
const OUTPUT_FILENAME = 'out.bin';

type NodeGeoJSON = FeatureCollection<Geometry, GeoJsonProperties>;

export class EpanetState {
    private workspace: Workspace
    private project: Project

    /**
     * Sets up classes used by the netework, without actually initializing
     * anything. Generally, {@link fromInp} should be used, but in cases
     * where initialization doesn't have to be immediate, it can be done
     * later with {@link openInp}
     */
    constructor() {
        this.workspace = new Workspace();
        this.project = new Project(this.workspace);
        this.project.init(REPORT_FILENAME, OUTPUT_FILENAME, FlowUnits.GPM, HeadLossType.HW);
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
    static fromInp(inp_file: string): EpanetState {
        const state = new EpanetState();
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
        const backup = EpanetState.fromInp(inp_file);
        return backup;
    }

    /**
     * Attempts to add a junction to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the junction
     */
    addJunction(data: AddJunctionSchema) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Junction);
        this.project.setNodeValue(nodeIndex, NodeProperty.Elevation, data.elevation);
        this.project.setCoordinates(nodeIndex, data.longitude, data.latitude);
    }

    /**
     * Attempts to add a reservoir to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the reservoir
     */
    addReservoir(data: AddReservoirSchema) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Reservoir);
        this.project.setCoordinates(nodeIndex, data.longitude, data.latitude);
    }

    /**
     * Attempts to add a tank to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the tank
     */
    addTank(data: AddTankSchema) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Tank);
        this.project.setNodeValue(nodeIndex, NodeProperty.Elevation, data.elevation);
        this.project.setCoordinates(nodeIndex, data.longitude, data.latitude);
    }

    /**
     * Attempts to add a pipe to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the pipe
     */
    addPipe(data: AddPipeSchema) {
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
            const jsonCoords = [coords.x, coords.y];

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
    getPipesGeoJSON(): FeatureCollection<Geometry, GeoJsonProperties> {
        const pipesGeoJSON: GeoJSON<Geometry, GeoJsonProperties> = {
            type: "FeatureCollection",
            features: [],
        }
        const nLinks = this.project.getCount(CountType.LinkCount);
        for (let i = 1; i <= nLinks; ++i) {
            const linkType = this.project.getLinkType(i);
            if (linkType == LinkType.Pipe) {
                const { node1, node2 } = this.project.getLinkNodes(i);
                const startCoords = this.project.getCoordinates(node1);
                const finishCoords = this.project.getCoordinates(node2);
                const allCoords = [[startCoords.x, startCoords.y]];
                const nVertex = this.project.getVertexCount(i);
                if (nVertex != 0) {
                    for (let vIdx = 1; vIdx <= nVertex; ++vIdx) {
                        const v = this.project.getVertex(i, vIdx);
                        allCoords.push([v.x, v.y]);
                    }
                }
                allCoords.push([finishCoords.x, finishCoords.y]);
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
}