export type TraceEventType =
  | 'variable:declare'
  | 'variable:assign'
  | 'array:create'
  | 'array:read'
  | 'array:write'
  | 'array:method'
  | 'loop:enter'
  | 'loop:iteration'
  | 'loop:exit'
  | 'function:call'
  | 'function:return'
  | 'compare'
  | 'swap'
  | 'error';

export interface TraceEventData {
  name?: string;
  value?: unknown;
  index?: number;
  indices?: [number, number];
  args?: unknown[];
  loopId?: string;
  iteration?: number;
  error?: string;
}

export interface TraceEvent {
  id: number;
  timestamp: number;
  type: TraceEventType;
  data: TraceEventData;
}

export interface ExecutionTrace {
  id: string;
  sourceFile: string;
  startTime: number;
  duration: number;
  events: TraceEvent[];
  error?: {
    message: string;
    stack?: string;
    eventIndex: number;
  };
  variables: Map<string, unknown>;
}
