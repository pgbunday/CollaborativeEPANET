import Project from '../Project';
import { NodeType, NodeProperty, ActionCodeType } from '../../index';
declare class NetworkNodeFunctions {
    addNode(this: Project, id: string, nodeType: NodeType): number;
    deleteNode(this: Project, index: number, actionCode: ActionCodeType): void;
    getNodeIndex(this: Project, id: string): number;
    getNodeId(this: Project, index: number): string;
    setNodeId(this: Project, index: number, newid: string): void;
    getNodeType(this: Project, index: number): NodeType;
    getNodeValue(this: Project, index: number, property: NodeProperty): number;
    setNodeValue(this: Project, index: number, property: NodeProperty, value: number): void;
    setJunctionData(this: Project, index: number, elev: number, dmnd: number, dmndpat: string): void;
    setTankData(this: Project, index: number, elev: number, initlvl: number, minlvl: number, maxlvl: number, diam: number, minvol: number, volcurve: string): void;
    getCoordinates(this: Project, index: number): {
        x: number;
        y: number;
    };
    setCoordinates(this: Project, index: number, x: number, y: number): void;
}
export default NetworkNodeFunctions;
//# sourceMappingURL=NetworkNode.d.ts.map