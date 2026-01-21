export interface InstrumentOptions {
    filePath?: string;
}
export interface InstrumentResult {
    code: string;
    success: boolean;
    error?: string;
}
export declare class CodeInstrumenter {
    private project;
    constructor();
    /**
     * Instrument source code to add tracing
     */
    instrument(sourceCode: string, options?: InstrumentOptions): InstrumentResult;
    /**
     * Transform source file by adding trace calls
     * Note: __trace object is provided by the executor sandbox
     */
    private transformSourceFile;
    /**
     * Collect array declaration transformations
     */
    private collectArrayDeclarations;
    /**
     * Collect array swap transformations using destructuring: [arr[i], arr[j]] = [arr[j], arr[i]]
     */
    private collectArraySwaps;
    /**
     * Collect array element assignment transformations (arr[i] = value)
     */
    private collectArrayAssignments;
}
export declare function instrument(sourceCode: string, options?: InstrumentOptions): InstrumentResult;
//# sourceMappingURL=index.d.ts.map