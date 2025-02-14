import Project from '../Project';
import { ControlType } from '../../index';
declare class SimpleControlFunctions {
    addControl(this: Project, type: ControlType, linkIndex: number, setting: number, nodeIndex: number, level: number): number;
    deleteControl(this: Project, index: number): void;
    getControl(this: Project, index: number): {
        type: ControlType;
        linkIndex: number;
        setting: number;
        nodeIndex: number;
        level: number;
    };
    setControl(this: Project, index: number, type: ControlType, linkIndex: number, setting: number, nodeIndex: number, level: number): void;
}
export default SimpleControlFunctions;
//# sourceMappingURL=SimpleControl.d.ts.map