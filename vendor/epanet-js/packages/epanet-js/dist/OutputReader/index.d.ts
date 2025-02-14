import { LinkType, NodeType } from '../index';
export interface LinkResults {
    id: string;
    type: LinkType;
    flow: number[];
    velocity: number[];
    headloss: number[];
    avgWaterQuality: number[];
    status: number[];
    setting: number[];
    reactionRate: number[];
    friction: number[];
}
export interface NodeResults {
    id: string;
    type: NodeType;
    demand: number[];
    head: number[];
    pressure: number[];
    waterQuality: number[];
}
export interface EpanetProlog {
    nodeCount: number;
    resAndTankCount: number;
    linkCount: number;
    pumpCount: number;
    valveCount: number;
    reportingPeriods: number;
}
export interface EpanetResults {
    prolog: EpanetProlog;
    results: {
        nodes: NodeResults[];
        links: LinkResults[];
    };
}
export declare function readBinary(results: Uint8Array): EpanetResults;
//# sourceMappingURL=index.d.ts.map