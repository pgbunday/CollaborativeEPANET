import Project from '../Project';
import { FlowUnits, Option, QualityType, TimeParameter } from '../../index';
declare class AnalysisOptionsFunctions {
    getFlowUnits(this: Project): FlowUnits;
    getOption(this: Project, option: Option): number;
    getQualityInfo(this: Project): {
        qualType: QualityType;
        chemName: string;
        chemUnits: string;
        traceNode: number;
    };
    getQualityType(this: Project): {
        qualType: QualityType;
        traceNode: number;
    };
    getTimeParameter(this: Project, param: TimeParameter): number;
    setFlowUnits(this: Project, units: FlowUnits): void;
    setOption(this: Project, option: Option, value: number): void;
    setQualityType(this: Project, qualType: QualityType, chemName: string, chemUnits: string, traceNode: string): void;
    setTimeParameter(this: Project, param: TimeParameter, value: number): void;
}
export default AnalysisOptionsFunctions;
//# sourceMappingURL=AnalysisOptions.d.ts.map