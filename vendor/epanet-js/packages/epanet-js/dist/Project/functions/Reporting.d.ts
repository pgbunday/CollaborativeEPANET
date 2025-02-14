import Project from '../Project';
import { ObjectType, AnalysisStatistic, StatusReport } from '../../index';
declare class ReportingFunctions {
    writeLine(this: Project, line: string): void;
    report(this: Project): void;
    copyReport(this: Project, filename: string): void;
    clearReport(this: Project): void;
    resetReport(this: Project): void;
    setReport(this: Project, format: string): void;
    setStatusReport(this: Project, level: StatusReport): void;
    getStatistic(this: Project, type: AnalysisStatistic): number;
    getResultIndex(this: Project, type: ObjectType.Node | ObjectType.Link, index: number): number;
}
export default ReportingFunctions;
//# sourceMappingURL=Reporting.d.ts.map