import vm from 'vm';
export class CodeExecutor {
    timeout;
    constructor(options = {}) {
        this.timeout = options.timeout ?? 5000; // 5 seconds default
    }
    /**
     * Execute instrumented code and collect trace events
     */
    execute(instrumentedCode) {
        const startTime = Date.now();
        try {
            // Create sandbox context
            const sandbox = this.createSandbox();
            // Execute code with timeout
            vm.runInNewContext(instrumentedCode, sandbox, {
                timeout: this.timeout,
                displayErrors: true,
            });
            // Collect trace from sandbox
            const trace = sandbox.__trace.getTrace();
            const duration = Date.now() - startTime;
            return {
                success: true,
                trace,
                duration,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            // Try to get partial trace
            let partialTrace = [];
            let eventIndex = 0;
            try {
                // If the sandbox was created, try to get the trace
                // This might not work in all error cases
                partialTrace = [];
                eventIndex = partialTrace.length;
            }
            catch {
                // Ignore errors when trying to get partial trace
            }
            return {
                success: false,
                trace: partialTrace,
                duration,
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    eventIndex,
                },
            };
        }
    }
    /**
     * Create sandbox context with available globals
     */
    createSandbox() {
        const sandbox = {
            console,
            Math,
            Date,
            JSON,
            Array,
            Object,
            String,
            Number,
            Boolean,
            // Define __trace object for instrumented code to use
            __trace: {
                eventId: 0,
                startTime: Date.now(),
                events: [],
                emit(type, data) {
                    this.events.push({
                        id: this.eventId++,
                        timestamp: Date.now() - this.startTime,
                        type,
                        data,
                    });
                },
                declare(name, value) {
                    this.emit('variable:declare', { name, value: JSON.parse(JSON.stringify(value)) });
                },
                assign(name, value) {
                    this.emit('variable:assign', { name, value: JSON.parse(JSON.stringify(value)) });
                },
                arrayWrite(name, index, value) {
                    this.emit('array:write', { name, index, value });
                },
                getTrace() {
                    return this.events;
                },
            },
        };
        return vm.createContext(sandbox);
    }
}
export function execute(instrumentedCode, options) {
    const executor = new CodeExecutor(options);
    return executor.execute(instrumentedCode);
}
//# sourceMappingURL=index.js.map