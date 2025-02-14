import Project from '../Project';
import { LinkType, ActionCodeType, LinkProperty, PumpType } from '../../index';
declare class NetworkLinkFunctions {
    addLink(this: Project, id: string, linkType: LinkType, fromNode: string, toNode: string): number;
    deleteLink(this: Project, index: number, actionCode: ActionCodeType): void;
    getLinkIndex(this: Project, id: string): number;
    getLinkId(this: Project, index: number): string;
    setLinkId(this: Project, index: number, newid: string): void;
    getLinkType(this: Project, index: number): LinkType;
    setLinkType(this: Project, index: number, linkType: LinkType, actionCode: ActionCodeType): number;
    getLinkNodes(this: Project, index: number): {
        node1: number;
        node2: number;
    };
    setLinkNodes(this: Project, index: number, node1: number, node2: number): void;
    getLinkValue(this: Project, index: number, property: LinkProperty): number;
    setLinkValue(this: Project, index: number, property: number, value: number): void;
    setPipeData(this: Project, index: number, length: number, diam: number, rough: number, mloss: number): void;
    getPumpType(this: Project, index: number): PumpType;
    getHeadCurveIndex(this: Project, linkIndex: number): number;
    setHeadCurveIndex(this: Project, linkIndex: number, curveIndex: number): void;
    getVertexCount(this: Project, index: number): number;
    getVertex(this: Project, index: number, vertex: number): {
        x: number;
        y: number;
    };
    setVertices(this: Project, index: number, x: number[], y: number[]): void;
}
export default NetworkLinkFunctions;
//# sourceMappingURL=NetworkLink.d.ts.map