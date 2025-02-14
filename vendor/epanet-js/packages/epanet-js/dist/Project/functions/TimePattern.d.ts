import Project from '../Project';
declare class TimePatternFunctions {
    addPattern(this: Project, id: string): void;
    deletePattern(this: Project, index: number): void;
    getPatternIndex(this: Project, id: string): number;
    getPatternId(this: Project, index: number): string;
    setPatternId(this: Project, index: number, id: string): void;
    getPatternLength(this: Project, index: number): number;
    getPatternValue(this: Project, index: number, period: number): number;
    setPatternValue(this: Project, index: number, period: number, value: number): void;
    getAveragePatternValue(this: Project, index: number): number;
    setPattern(this: Project, index: number, values: number[]): void;
}
export default TimePatternFunctions;
//# sourceMappingURL=TimePattern.d.ts.map