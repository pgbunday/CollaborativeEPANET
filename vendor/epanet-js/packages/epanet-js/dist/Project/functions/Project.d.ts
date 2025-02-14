import Project from '../Project';
import { CountType, FlowUnits, HeadLossType } from '../../index';
declare class ProjectFunctions {
    close(this: Project): void;
    getCount(this: Project, obj: CountType): number;
    getTitle(this: Project): {
        line1: string;
        line2: string;
        line3: string;
    };
    init(this: Project, rptFile: string, outFile: string, unitType: FlowUnits, headLosstype: HeadLossType): void;
    open(this: Project, inputFile: string, reportFile: string, outputFile: string): void;
    runProject(this: Project, inputFile: string, reportFile: string, outputFile: string): void;
    saveInpFile(this: Project, filename: string): void;
    setTitle(this: Project, line1: string, line2: string, line3: string): void;
}
export default ProjectFunctions;
//# sourceMappingURL=Project.d.ts.map