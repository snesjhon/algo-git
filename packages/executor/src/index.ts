import vm from 'vm';

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
  timeout?: number; // in milliseconds
}

export class CodeExecutor {
  private timeout: number;

  constructor(options: ExecutorOptions = {}) {
    this.timeout = options.timeout ?? 5000; // 5 seconds default
  }

  /**
   * Execute instrumented code and collect trace events
   */
  execute(instrumentedCode: string): ExecutionResult {
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
    } catch (error) {
      const duration = Date.now() - startTime;

      // Try to get partial trace
      let partialTrace: TraceEvent[] = [];
      let eventIndex = 0;

      try {
        // If the sandbox was created, try to get the trace
        // This might not work in all error cases
        partialTrace = [];
        eventIndex = partialTrace.length;
      } catch {
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
  private createSandbox(): vm.Context {
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
        events: [] as TraceEvent[],
        emit(type: string, data: Record<string, unknown>) {
          this.events.push({
            id: this.eventId++,
            timestamp: Date.now() - this.startTime,
            type,
            data,
          });
        },
        declare(name: string, value: unknown) {
          this.emit('variable:declare', { name, value: JSON.parse(JSON.stringify(value)) });
        },
        assign(name: string, value: unknown) {
          this.emit('variable:assign', { name, value: JSON.parse(JSON.stringify(value)) });
        },
        arrayWrite(name: string, index: number, value: unknown) {
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

export function execute(instrumentedCode: string, options?: ExecutorOptions): ExecutionResult {
  const executor = new CodeExecutor(options);
  return executor.execute(instrumentedCode);
}
