import Project from '../Project';
import { InitHydOption } from '../../index';
declare class HydraulicAnalysisFunctions {
    solveH(this: Project): void;
    useHydFile(this: Project, filename: string): void;
    openH(this: Project): void;
    initH(this: Project, initFlag: InitHydOption): void;
    runH(this: Project): number;
    nextH(this: Project): number;
    saveH(this: Project): void;
    saveHydFile(this: Project, filename: string): void;
    closeH(this: Project): void;
}
export default HydraulicAnalysisFunctions;
//# sourceMappingURL=HydraulicAnalysis.d.ts.map