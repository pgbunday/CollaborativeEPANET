import Project from '../Project';
import { InitHydOption } from '../../index';
declare class WaterQualityAnalysisFunctions {
    solveQ(this: Project): void;
    openQ(this: Project): void;
    initQ(this: Project, initFlag: InitHydOption.Save | InitHydOption.NoSave): void;
    runQ(this: Project): number;
    nextQ(this: Project): number;
    stepQ(this: Project): number;
    closeQ(this: Project): void;
}
export default WaterQualityAnalysisFunctions;
//# sourceMappingURL=WaterQualityAnalysis.d.ts.map