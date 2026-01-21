export interface TraceEvent {
    id: number;
    timestamp: number;
    type: string;
    data: Record<string, unknown>;
}
export interface ServerMessage {
    type: 'trace:start' | 'trace:event' | 'trace:complete' | 'trace:error';
    timestamp?: number;
    event?: TraceEvent;
    events?: TraceEvent[];
    summary?: {
        totalEvents: number;
        duration: number;
    };
    error?: string;
    partialTrace?: TraceEvent[];
}
export declare class VisualizationServer {
    private port;
    private fastify;
    private clients;
    private currentTrace;
    constructor(port?: number);
    start(): Promise<void>;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Broadcast trace start to all clients
     */
    broadcastTraceStart(): void;
    /**
     * Broadcast trace events to all clients
     */
    broadcastTrace(events: TraceEvent[], duration: number): void;
    /**
     * Broadcast error to all clients
     */
    broadcastError(error: string, partialTrace?: TraceEvent[]): void;
    /**
     * Broadcast message to all connected clients
     */
    private broadcast;
    /**
     * Send message to specific client
     */
    private sendToClient;
    /**
     * Get simple HTML page for visualization
     */
    private getVisualizerHTML;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get the Fastify instance (for testing or advanced usage)
     */
    getFastify(): any;
}
export declare function startServer(port?: number): Promise<VisualizationServer>;
//# sourceMappingURL=index.d.ts.map