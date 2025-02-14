import Project from '../Project';
import { CurveType } from '../../index';
declare class DataCurveFunctions {
    addCurve(this: Project, id: string): void;
    deleteCurve(this: Project, index: number): void;
    getCurveIndex(this: Project, id: string): number;
    getCurveId(this: Project, index: number): string;
    setCurveId(this: Project, index: number, id: string): void;
    getCurveLenth(this: Project, index: number): number;
    getCurveType(this: Project, index: number): CurveType;
    getCurveValue(this: Project, curveIndex: number, pointIndex: number): {
        x: number;
        y: number;
    };
    setCurveValue(this: Project, curveIndex: number, pointIndex: number, x: number, y: number): void;
    setCurve(this: Project, index: number, xValues: number[], yValues: number[]): void;
}
export default DataCurveFunctions;
//# sourceMappingURL=DataCurve.d.ts.map