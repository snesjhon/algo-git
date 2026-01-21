import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import type { WebSocket } from 'ws';

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

export class VisualizationServer {
  private fastify: ReturnType<typeof Fastify>;
  private clients: Set<WebSocket> = new Set();
  private currentTrace: TraceEvent[] = [];

  constructor(private port: number = 3000) {
    this.fastify = Fastify({ logger: false });
  }

  async start(): Promise<void> {
    // Register WebSocket plugin
    await this.fastify.register(fastifyWebsocket);

    // WebSocket route
    this.fastify.register(async (fastify: typeof this.fastify) => {
      fastify.get('/ws', { websocket: true }, (socket: WebSocket) => {
        this.handleConnection(socket);
      });
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // Static HTML page for visualization
    this.fastify.get('/', async () => {
      return {
        type: 'text/html',
        content: this.getVisualizerHTML(),
      };
    });

    await this.fastify.listen({ port: this.port, host: '0.0.0.0' });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket);

    // Send current trace to new client if available
    if (this.currentTrace.length > 0) {
      this.sendToClient(socket, {
        type: 'trace:complete',
        events: this.currentTrace,
        summary: {
          totalEvents: this.currentTrace.length,
          duration: 0,
        },
      });
    }

    socket.on('close', () => {
      this.clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(socket);
    });
  }

  /**
   * Broadcast trace start to all clients
   */
  broadcastTraceStart(): void {
    this.currentTrace = [];
    const message: ServerMessage = {
      type: 'trace:start',
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  /**
   * Broadcast trace events to all clients
   */
  broadcastTrace(events: TraceEvent[], duration: number): void {
    this.currentTrace = events;
    const message: ServerMessage = {
      type: 'trace:complete',
      events,
      summary: {
        totalEvents: events.length,
        duration,
      },
    };
    this.broadcast(message);
  }

  /**
   * Broadcast error to all clients
   */
  broadcastError(error: string, partialTrace: TraceEvent[] = []): void {
    const message: ServerMessage = {
      type: 'trace:error',
      error,
      partialTrace,
    };
    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: WebSocket, message: ServerMessage): void {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Get simple HTML page for visualization
   */
  private getVisualizerHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>algo-jit Visualizer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #1e1e1e;
      color: #ffffff;
    }
    h1 { color: #61dafb; }
    #status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      background: #2d2d2d;
    }
    #status.connected { background: #1a4d2e; }
    #status.disconnected { background: #4d1a1a; }
    #events {
      background: #2d2d2d;
      padding: 15px;
      border-radius: 4px;
      max-height: 500px;
      overflow-y: auto;
    }
    .event {
      margin: 5px 0;
      padding: 8px;
      background: #3d3d3d;
      border-radius: 3px;
      font-family: 'Monaco', monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>algo-jit Visualizer</h1>
  <div id="status" class="disconnected">Connecting to server...</div>
  <div id="events"></div>

  <script>
    const ws = new WebSocket('ws://' + location.host + '/ws');
    const statusEl = document.getElementById('status');
    const eventsEl = document.getElementById('events');

    ws.onopen = () => {
      statusEl.textContent = 'Connected - Waiting for code changes...';
      statusEl.className = 'connected';
    };

    ws.onclose = () => {
      statusEl.textContent = 'Disconnected from server';
      statusEl.className = 'disconnected';
    };

    ws.onerror = (error) => {
      statusEl.textContent = 'Connection error';
      statusEl.className = 'disconnected';
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'trace:start') {
        eventsEl.innerHTML = '<div class="event">Trace started...</div>';
      } else if (message.type === 'trace:complete') {
        eventsEl.innerHTML = '<div class="event"><strong>Trace Complete</strong> (' +
          message.summary.totalEvents + ' events, ' +
          message.summary.duration + 'ms)</div>';

        message.events.forEach(evt => {
          const div = document.createElement('div');
          div.className = 'event';
          div.textContent = evt.type + ': ' + JSON.stringify(evt.data);
          eventsEl.appendChild(div);
        });
      } else if (message.type === 'trace:error') {
        eventsEl.innerHTML = '<div class="event" style="background: #4d1a1a;"><strong>Error:</strong> ' +
          message.error + '</div>';
      }
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.fastify.close();
  }

  /**
   * Get the Fastify instance (for testing or advanced usage)
   */
  getFastify() {
    return this.fastify;
  }
}

export async function startServer(port: number = 3000): Promise<VisualizationServer> {
  const server = new VisualizationServer(port);
  await server.start();
  return server;
}
