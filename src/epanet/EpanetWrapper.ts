import { ActionCodeType, CountType, FlowUnits, HeadLossType, LinkProperty, LinkStatusType, LinkType, NodeProperty, NodeType, Project, Workspace } from "epanet-js";
import type { Feature, FeatureCollection, GeoJSON, GeoJsonProperties, Geometry } from "geojson";
import { utmToLongLat } from "../coords.js";
import type { LinkStatus, EpanetAction, AddJunctionAction, AddReservoirAction, AddTankAction, AddPipeAction, SetPipePropertiesAction, SetJunctionPropertiesAction } from "../packets/common.js";
import type { EpanetEdit } from "../packets/clientbound.js";

const INP_FILENAME = 'project.inp';
const REPORT_FILENAME = 'report.rpt';
const OUTPUT_FILENAME = 'out.bin';

type NodeGeoJSON = FeatureCollection<Geometry, { id: string }>;

export class EpanetWrapper {
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
    static fromInp(inp_file: string, utm_zone: string): EpanetWrapper {
        const state = new EpanetWrapper(utm_zone);
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
    clone(): EpanetWrapper {
        const inp_file = this.saveInp();
        const backup = EpanetWrapper.fromInp(inp_file, this.utm_zone);
        return backup;
    }

    applyAction(action: EpanetAction) {
        if (action.type == "add_junction_action") {
            this.addJunction(action);
        } else if (action.type == "add_pipe_action") {
            this.addPipe(action);
        } else if (action.type == "add_reservoir_action") {
            this.addReservoir(action);
        } else if (action.type == "add_tank_action") {
            this.addTank(action);
        } else if (action.type == "delete_junction_action") {
            this.deleteJunction(action.id);
        } else if (action.type == "delete_pipe_action") {
            this.deletePipe(action.id);
        } else if (action.type == "set_junction_properties_action") {
            this.junctionProperties(action);
        } else if (action.type == "set_pipe_properties_action") {
            this.pipeProperties(action);
        } else {
            console.warn('Unknown action in EpanetWrapper.applyAction:', action);
        }
    }

    /**
     * Attempts to add a junction to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the junction
     */
    addJunction(data: AddJunctionAction) {
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
    addReservoir(data: AddReservoirAction) {
        const nodeIndex = this.project.addNode(data.id, NodeType.Reservoir);
        this.project.setCoordinates(nodeIndex, data.x, data.y);
    }

    /**
     * Attempts to add a tank to the network with the attached data. Errors
     * from epanet-js will be thrown as exceptions, so callers should use
     * `try { } catch(e) { }` blocks.
     * @param data The parameters for the tank
     */
    addTank(data: AddTankAction) {
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
    addPipe(data: AddPipeAction) {
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

    pipeProperties(data: SetPipePropertiesAction) {
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

    junctionProperties(data: SetJunctionPropertiesAction) {
        const junctionIdx = this.project.getNodeIndex(data.old_id);
        this.project.setNodeValue(junctionIdx, NodeProperty.Elevation, data.elevation);
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
            const feature: Feature<Geometry, { id: string }> = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: jsonCoords,
                },
                properties: {
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
    getPipesGeoJSON(utm_zone: string): FeatureCollection<Geometry, { id: string }> {
        const pipesGeoJSON: GeoJSON<Geometry, { id: string }> = {
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

    // TODO: dont return an action, instead define a new type in common.ts for
    // pipe properties. Use that for both get and set.
    getPipeProperties(id: string): SetPipePropertiesAction {
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
            type: "set_pipe_properties_action",
            diameter,
            old_id: id,
            new_id: id,
            initial_status,
            length,
            loss_coefficient,
            roughness,
        }
    }
    /**
     * removes the given pipes from the network
     * @param id the unique identifier of the pipe to delete
     */
    

    deletePipe(id: string) {
        const pipeIdx = this.project.getLinkIndex(id);
        this.project.deleteLink(pipeIdx, ActionCodeType.Conditional);
    }

    getJunctionProperties(id: string): SetJunctionPropertiesAction {
        const junctionIdx = this.project.getNodeIndex(id);
        const elevation = this.project.getNodeValue(junctionIdx, NodeProperty.Elevation);
        return {
            type: "set_junction_properties_action",
            elevation,
            new_id: id,
            old_id: id,
        }
    }

    deleteJunction(id: string) {
        const junctionIdx = this.project.getNodeIndex(id);
        this.project.deleteNode(junctionIdx, ActionCodeType.Conditional);
    }
}