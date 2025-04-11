import {
	ActionCodeType,
	CountType,
	FlowUnits,
	HeadLossType,
	InitHydOption,
	LinkProperty,
	LinkStatusType,
	LinkType,
	NodeProperty,
	NodeType,
	Project,
	TimeParameter,
	Workspace,
} from "epanet-js";
import type {
	Feature,
	FeatureCollection,
	GeoJSON,
	GeoJsonProperties,
	Geometry,
} from "geojson";
import { utmToLongLat } from "../coords.js";
import type {
	AddJunctionAction,
	AddPipeAction,
	AddReservoirAction,
	AddTankAction,
	EpanetAction,
	LinkStatus,
	SetJunctionPropertiesAction,
	SetPipePropertiesAction,
	SetReservoirPropertiesAction,
} from "../packets/common.js";
import {
	type Flow,
	type Length,
	type Pressure,
	type Velocity,
	afd,
	cfs,
	cmd,
	cmh,
	foot,
	fps,
	gpm,
	imgd,
	inch,
	lpm,
	lps,
	meter,
	meter_pressure_head,
	mgd,
	millimeter,
	mld,
	mps,
	psi,
} from "../units.js";

const INP_FILENAME = "project.inp";
const REPORT_FILENAME = "report.rpt";
const OUTPUT_FILENAME = "out.bin";

type NodeGeoJSON = FeatureCollection<Geometry, { id: string }>;

export type SimulationStatus = {
	hydraulicTime: number;
	nodes: Map<string, { pressure: Pressure; demand: Flow }>;
	links: Map<
		string,
		{ flow: Flow; diameter: Length; length: Length; velocity: Velocity }
	>;
};

function defaultSimulationStatus(): SimulationStatus {
	return {
		hydraulicTime: -1,
		nodes: new Map(),
		links: new Map(),
	};
}

export class EpanetWrapper {
	public readonly workspace: Workspace;
	public readonly project: Project;
	private utm_zone: string;
	private numEditsSinceInp_: number;

	get numEditsSinceInp() {
		return this.numEditsSinceInp_;
	}

	/**
	 * Sets up classes used by the netework, without actually initializing
	 * anything. Generally, {@link fromInp} should be used, but in cases
	 * where initialization doesn't have to be immediate, it can be done
	 * later with {@link openInp}
	 */
	constructor(utm_zone: string) {
		this.workspace = new Workspace();
		this.project = new Project(this.workspace);
		this.project.init(
			REPORT_FILENAME,
			OUTPUT_FILENAME,
			FlowUnits.GPM,
			HeadLossType.HW,
		);
		this.utm_zone = utm_zone;
		this.numEditsSinceInp_ = 0;
	}

	public openH() {
		this.project.openH();
	}

	public initH() {
		this.project.initH(InitHydOption.NoSave);
	}

	public runH(): number {
		return this.project.runH();
	}

	public nextH(): number {
		return this.project.nextH();
	}

	public closeH() {
		this.project.closeH();
	}

	public solveH() {
		this.project.solveH();
	}

	public getFlowUnits(): {
		value: FlowUnits;
		flow_fn: (x: number) => Flow;
		metric: boolean;
	} {
		const f = this.project.getFlowUnits();
		if (f === FlowUnits.CFS) {
			return {
				value: f,
				metric: false,
				flow_fn: cfs,
			};
		}
		if (f === FlowUnits.GPM) {
			return { value: f, metric: false, flow_fn: gpm };
		}
		if (f === FlowUnits.MGD) {
			return { value: f, metric: false, flow_fn: mgd };
		}
		if (f === FlowUnits.IMGD) {
			return { value: f, metric: false, flow_fn: imgd };
		}
		if (f === FlowUnits.AFD) {
			return { value: f, metric: false, flow_fn: afd };
		}
		if (f === FlowUnits.LPS) {
			return { value: f, metric: true, flow_fn: lps };
		}
		if (f === FlowUnits.LPM) {
			return { value: f, metric: true, flow_fn: lpm };
		}
		if (f === FlowUnits.MLD) {
			return { value: f, metric: true, flow_fn: mld };
		}
		if (f === FlowUnits.CMH) {
			return { value: f, metric: true, flow_fn: cmh };
		}
		if (f === FlowUnits.CMD) {
			return { value: f, metric: true, flow_fn: cmd };
		}
		throw new Error("Unrecognized FlowUnits from epanet:", f);
	}

	public runSimulation(): SimulationStatus[] {
		this.openH();
		this.initH();
		const output: SimulationStatus[] = [];
		let currentStatus = defaultSimulationStatus();
		const lastRunH = this.project.getTimeParameter(TimeParameter.StartTime);
		currentStatus.hydraulicTime = lastRunH;
		const totalNodes = this.project.getCount(CountType.NodeCount);
		const totalLinks = this.project.getCount(CountType.LinkCount);
		const flowUnits = this.getFlowUnits();
		while (true) {
			const currentRunH = this.runH();
			if (currentRunH !== lastRunH) {
				output.push(currentStatus);
				currentStatus = defaultSimulationStatus();
				currentStatus.hydraulicTime = currentRunH;
			}

			// gather data, store in currentStatus
			for (let i = 1; i <= totalNodes; ++i) {
				const id = this.project.getNodeId(i);
				const nodePressure = this.project.getNodeValue(
					i,
					NodeProperty.Pressure,
				);
				const nodeDemand = this.project.getNodeValue(i, NodeProperty.Demand);
				if (flowUnits.metric) {
					currentStatus.nodes.set(id, {
						pressure: meter_pressure_head(nodePressure),
						demand: flowUnits.flow_fn(nodeDemand),
					});
				} else {
					currentStatus.nodes.set(id, {
						pressure: psi(nodePressure),
						demand: flowUnits.flow_fn(nodeDemand),
					});
				}
			}
			for (let i = 1; i <= totalLinks; ++i) {
				const id = this.project.getLinkId(i);
				// flow, diameter, length, velocity
				const linkFlow = this.project.getLinkValue(i, LinkProperty.Flow);
				const linkDiameter = this.project.getLinkValue(
					i,
					LinkProperty.Diameter,
				);
				const linkLength = this.project.getLinkValue(i, LinkProperty.Length);
				const linkVelocity = this.project.getLinkValue(
					i,
					LinkProperty.Velocity,
				);
				if (flowUnits.metric) {
					currentStatus.links.set(id, {
						diameter: millimeter(linkDiameter),
						flow: flowUnits.flow_fn(linkFlow),
						length: meter(linkLength),
						velocity: mps(linkVelocity),
					});
				} else {
					currentStatus.links.set(id, {
						diameter: inch(linkDiameter),
						flow: flowUnits.flow_fn(linkFlow),
						length: foot(linkLength),
						velocity: fps(linkVelocity),
					});
				}
			}

			if (this.nextH() === 0) {
				// at the end of regular simulation, so push the data and break
				output.push(currentStatus);
				break;
			}
		}
		return output;
	}

	public getNodePressures(): { id: string; pressure: Pressure }[] {
		const modelFlowUnits = this.getFlowUnits();
		const totalCount = this.project.getCount(CountType.NodeCount);
		const pressures = [];
		for (let i = 1; i <= totalCount; ++i) {
			const nodeId = this.project.getNodeId(i);
			const nodePressure = this.project.getNodeValue(i, NodeProperty.Pressure);
			if (modelFlowUnits.metric) {
				// EPANET measures metric pressure in meters (pressure head)
				pressures.push({
					id: nodeId,
					pressure: meter_pressure_head(nodePressure),
				});
			} else {
				// Imperial pressure is PSI
				pressures.push({ id: nodeId, pressure: psi(nodePressure) });
			}
		}
		return pressures;
	}

	public openInp(inp_file: string) {
		this.workspace.writeFile(INP_FILENAME, inp_file);
		this.project.open(INP_FILENAME, REPORT_FILENAME, OUTPUT_FILENAME);
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
	public saveInp(): string {
		this.project.saveInpFile(INP_FILENAME);
		return this.workspace.readFile(INP_FILENAME, "utf8");
	}

	/**
	 * @returns A network identical to the current one, but with different
	 * objects and memory
	 */
	public clone(): EpanetWrapper {
		const inp_file = this.saveInp();
		const backup = EpanetWrapper.fromInp(inp_file, this.utm_zone);
		backup.numEditsSinceInp_ = this.numEditsSinceInp_;
		return backup;
	}

	public applyAction(action: EpanetAction) {
		if (action.type === "add_junction_action") {
			this.addJunction(action);
		} else if (action.type === "add_pipe_action") {
			this.addPipe(action);
		} else if (action.type === "add_reservoir_action") {
			this.addReservoir(action);
		} else if (action.type === "add_tank_action") {
			this.addTank(action);
		} else if (action.type === "delete_junction_action") {
			this.deleteJunction(action.id);
		} else if (action.type === "delete_pipe_action") {
			this.deletePipe(action.id);
		} else if (action.type === "set_junction_properties_action") {
			this.junctionProperties(action);
		} else if (action.type === "set_pipe_properties_action") {
			this.pipeProperties(action);
		} else if (action.type === "set_reservoir_properties_action") {
			this.reservoirProperties(action);
		} else {
			console.warn("Unknown action in EpanetWrapper.applyAction:", action);
			return;
		}
		this.numEditsSinceInp_ += 1;
	}

	/**
	 * Attempts to add a junction to the network with the attached data. Errors
	 * from epanet-js will be thrown as exceptions, so callers should use
	 * `try { } catch(e) { }` blocks.
	 * @param data The parameters for the junction
	 */
	private addJunction(data: AddJunctionAction) {
		const nodeIndex = this.project.addNode(data.id, NodeType.Junction);
		this.project.setNodeValue(
			nodeIndex,
			NodeProperty.Elevation,
			data.elevation,
		);
		this.project.setCoordinates(nodeIndex, data.x, data.y);
	}

	/**
	 * Attempts to add a reservoir to the network with the attached data. Errors
	 * from epanet-js will be thrown as exceptions, so callers should use
	 * `try { } catch(e) { }` blocks.
	 * @param data The parameters for the reservoir
	 */
	private addReservoir(data: AddReservoirAction) {
		const nodeIndex = this.project.addNode(data.id, NodeType.Reservoir);
		this.project.setCoordinates(nodeIndex, data.x, data.y);
	}

	/**
	 * Attempts to add a tank to the network with the attached data. Errors
	 * from epanet-js will be thrown as exceptions, so callers should use
	 * `try { } catch(e) { }` blocks.
	 * @param data The parameters for the tank
	 */
	private addTank(data: AddTankAction) {
		const nodeIndex = this.project.addNode(data.id, NodeType.Tank);
		this.project.setNodeValue(
			nodeIndex,
			NodeProperty.Elevation,
			data.elevation,
		);
		this.project.setCoordinates(nodeIndex, data.x, data.y);
	}

	/**
	 * Attempts to add a pipe to the network with the attached data. Errors
	 * from epanet-js will be thrown as exceptions, so callers should use
	 * `try { } catch(e) { }` blocks.
	 * @param data The parameters for the pipe
	 */
	private addPipe(data: AddPipeAction) {
		const pipeIdx = this.project.addLink(
			data.id,
			LinkType.Pipe,
			data.start_node,
			data.end_node,
		);
		this.project.setLinkValue(pipeIdx, LinkProperty.Length, data.length);
		if (data.vertices.length !== 0) {
			const xs = [];
			const ys = [];
			for (const point of data.vertices) {
				xs.push(point.x);
				ys.push(point.y);
			}
			this.project.setVertices(pipeIdx, xs, ys);
		}
	}

	private pipeProperties(data: SetPipePropertiesAction) {
		const pipeIdx = this.project.getLinkIndex(data.old_id);
		this.project.setLinkValue(pipeIdx, LinkProperty.Diameter, data.diameter);
		this.project.setLinkValue(pipeIdx, LinkProperty.Length, data.length);
		if (data.initial_status === "open") {
			this.project.setLinkValue(
				pipeIdx,
				LinkProperty.InitStatus,
				LinkStatusType.Open,
			);
		} else if (data.initial_status === "closed") {
			this.project.setLinkValue(
				pipeIdx,
				LinkProperty.InitStatus,
				LinkStatusType.Closed,
			);
		}
		this.project.setLinkValue(pipeIdx, LinkProperty.Roughness, data.roughness);
		this.project.setLinkValue(
			pipeIdx,
			LinkProperty.MinorLoss,
			data.loss_coefficient,
		);
	}

	private junctionProperties(data: SetJunctionPropertiesAction) {
		const junctionIdx = this.project.getNodeIndex(data.old_id);
		this.project.setNodeValue(
			junctionIdx,
			NodeProperty.Elevation,
			data.elevation,
		);
	}

	private reservoirProperties(data: SetReservoirPropertiesAction) {
		const reservoirIdx = this.project.getNodeIndex(data.old_id);
		this.project.setNodeValue(
			reservoirIdx,
			NodeProperty.Elevation,
			data.total_head,
		);
	}

	public getAllNodesGeoJSON(): {
		junctions: NodeGeoJSON;
		tanks: NodeGeoJSON;
		reservoirs: NodeGeoJSON;
	} {
		const junctions: NodeGeoJSON = {
			type: "FeatureCollection",
			features: [],
		};
		const tanks: NodeGeoJSON = {
			type: "FeatureCollection",
			features: [],
		};
		const reservoirs: NodeGeoJSON = {
			type: "FeatureCollection",
			features: [],
		};

		const nNodes = this.project.getCount(CountType.NodeCount);
		// NOTE: nodes are 1-indexed. 0 will never be valid. This may also apply
		// to most or all other data structures in EPANET.
		for (let i = 1; i <= nNodes; ++i) {
			// All nodes should have coordinates attached, guaranteed by the API.
			// If not, there's a logic error somewhere
			const coords = this.project.getCoordinates(i);
			const jsonCoordsXY = [coords.x, coords.y];
			const jsonCoords = utmToLongLat(jsonCoordsXY, this.utm_zone);

			const nodeType = this.project.getNodeType(i);
			const feature: Feature<Geometry, { id: string }> = {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: jsonCoords,
				},
				properties: {
					id: this.project.getNodeId(i),
				},
			};
			if (nodeType === NodeType.Junction) {
				junctions.features.push(feature);
			} else if (nodeType === NodeType.Reservoir) {
				reservoirs.features.push(feature);
			} else if (nodeType === NodeType.Tank) {
				tanks.features.push(feature);
			}
		}
		return {
			junctions,
			reservoirs,
			tanks,
		};
	}

	// TODO: also handle other link types, not just LinkType.Pipe
	public getPipesGeoJSON(
		utm_zone: string,
	): FeatureCollection<Geometry, { id: string }> {
		const pipesGeoJSON: GeoJSON<Geometry, { id: string }> = {
			type: "FeatureCollection",
			features: [],
		};
		const nLinks = this.project.getCount(CountType.LinkCount);
		for (let i = 1; i <= nLinks; ++i) {
			const linkType = this.project.getLinkType(i);
			if (linkType === LinkType.Pipe) {
				const { node1, node2 } = this.project.getLinkNodes(i);
				const startCoordsXY = this.project.getCoordinates(node1);
				const finishCoordsXY = this.project.getCoordinates(node2);
				const startCoords = utmToLongLat(
					[startCoordsXY.x, startCoordsXY.y],
					utm_zone,
				);
				const finishCoords = utmToLongLat(
					[finishCoordsXY.x, finishCoordsXY.y],
					utm_zone,
				);
				const allCoords = [startCoords];
				const nVertex = this.project.getVertexCount(i);
				if (nVertex !== 0) {
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
					},
				});
			}
		}
		return pipesGeoJSON;
	}

	public getNodeCoords(nodeId: string): { x: number; y: number } {
		const nodeIdx = this.project.getNodeIndex(nodeId);
		const coords = this.project.getCoordinates(nodeIdx);
		return coords;
	}

	// TODO: dont return an action, instead define a new type in common.ts for
	// pipe properties. Use that for both get and set.
	public getPipeProperties(id: string): SetPipePropertiesAction {
		const pipeIdx = this.project.getLinkIndex(id);
		const diameter = this.project.getLinkValue(pipeIdx, LinkProperty.Diameter);
		const length = this.project.getLinkValue(pipeIdx, LinkProperty.Length);
		const initial_status_num = this.project.getLinkValue(
			pipeIdx,
			LinkProperty.InitStatus,
		);
		let initial_status: LinkStatus = "closed";
		if (initial_status_num === 1) {
			initial_status = "open";
		} else {
			initial_status = "closed";
		}
		const roughness = this.project.getLinkValue(
			pipeIdx,
			LinkProperty.Roughness,
		);
		const loss_coefficient = this.project.getLinkValue(
			pipeIdx,
			LinkProperty.MinorLoss,
		);
		return {
			type: "set_pipe_properties_action",
			diameter,
			old_id: id,
			new_id: id,
			initial_status,
			length,
			loss_coefficient,
			roughness,
		};
	}

	private deletePipe(id: string) {
		const pipeIdx = this.project.getLinkIndex(id);
		this.project.deleteLink(pipeIdx, ActionCodeType.Conditional);
	}

	public getJunctionProperties(id: string): SetJunctionPropertiesAction {
		const junctionIdx = this.project.getNodeIndex(id);
		const elevation = this.project.getNodeValue(
			junctionIdx,
			NodeProperty.Elevation,
		);
		return {
			type: "set_junction_properties_action",
			elevation,
			new_id: id,
			old_id: id,
		};
	}

	public getReservoirProperties(id: string): SetReservoirPropertiesAction {
		const reservoirIdx = this.project.getNodeIndex(id);
		const total_head = this.project.getNodeValue(
			reservoirIdx,
			NodeProperty.Elevation,
		);
		return {
			type: "set_reservoir_properties_action",
			new_id: id,
			old_id: id,
			total_head,
		};
	}

	private deleteJunction(id: string) {
		const junctionIdx = this.project.getNodeIndex(id);
		this.project.deleteNode(junctionIdx, ActionCodeType.Conditional);
	}
}
