declare class Workspace {
    _instance: EmscriptenModule;
    _FS: EmscriptenFileSysten;
    constructor();
    get version(): number;
    getError(code: number): string;
    writeFile(path: string, data: string | ArrayBufferView): void;
    readFile(file: string): string;
    readFile(file: string, encoding: 'utf8'): string;
    readFile(file: string, encoding: 'binary'): Uint8Array;
}
export default Workspace;
//# sourceMappingURL=Workspace.d.ts.map