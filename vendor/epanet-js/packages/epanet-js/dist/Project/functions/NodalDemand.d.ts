import Project from '../Project';
import { DemandModel } from '../../index';
declare class NodalDemandFunctions {
    addDemand(this: Project, nodeIndex: number, baseDemand: number, demandPattern: string, demandName: string): void;
    deleteDemand(this: Project, nodeIndex: number, demandIndex: number): void;
    getBaseDemand(this: Project, nodeIndex: number, demandIndex: number): number;
    getDemandIndex(this: Project, nodeIndex: number, demandName: string): number;
    getDemandModel(this: Project): {
        type: DemandModel;
        pmin: number;
        preq: number;
        pexp: number;
    };
    getDemandName(this: Project, nodeIndex: number, demandIndex: number): string;
    getDemandPattern(this: Project, nodeIndex: number, demandIndex: number): number;
    getNumberOfDemands(this: Project, nodeIndex: number): number;
    setBaseDemand(this: Project, nodeIndex: number, demandIndex: number, baseDemand: number): void;
    setDemandModel(this: Project, type: DemandModel, pmin: number, preq: number, pexp: number): void;
    setDemandName(this: Project, nodeIndex: number, demandIdx: number, demandName: string): void;
    setDemandPattern(this: Project, nodeIndex: number, demandIndex: number, patIndex: number): void;
}
export default NodalDemandFunctions;
//# sourceMappingURL=NodalDemand.d.ts.map