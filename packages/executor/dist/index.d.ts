export interface ExecutionResult {
    success: boolean;
    trace: TraceEvent[];
    duration: number;
    error?: {
        message: string;
        stack?: string;
        eventIndex: number;
    };
}
export interface TraceEvent {
    id: number;
    timestamp: number;
    type: string;
    data: Record<string, unknown>;
}
export interface ExecutorOptions {
    timeout?: number;
}
export declare class CodeExecutor {
    private timeout;
    constructor(options?: ExecutorOptions);
    /**
     * Execute instrumented code and collect trace events
     */
    execute(instrumentedCode: string): ExecutionResult;
    /**
     * Create sandbox context with available globals
     */
    private createSandbox;
}
export declare function execute(instrumentedCode: string, options?: ExecutorOptions): ExecutionResult;
//# sourceMappingURL=index.d.ts.map