import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
export class VisualizationServer {
    port;
    fastify;
    clients = new Set();
    currentTrace = [];
    constructor(port = 3000) {
        this.port = port;
        this.fastify = Fastify({ logger: false });
    }
    async start() {
        // Register WebSocket plugin
        await this.fastify.register(fastifyWebsocket);
        // WebSocket route
        this.fastify.register(async (fastify) => {
            fastify.get('/ws', { websocket: true }, (socket) => {
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
    handleConnection(socket) {
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
    broadcastTraceStart() {
        this.currentTrace = [];
        const message = {
            type: 'trace:start',
            timestamp: Date.now(),
        };
        this.broadcast(message);
    }
    /**
     * Broadcast trace events to all clients
     */
    broadcastTrace(events, duration) {
        this.currentTrace = events;
        const message = {
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
    broadcastError(error, partialTrace = []) {
        const message = {
            type: 'trace:error',
            error,
            partialTrace,
        };
        this.broadcast(message);
    }
    /**
     * Broadcast message to all connected clients
     */
    broadcast(message) {
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
    sendToClient(client, message) {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(message));
        }
    }
    /**
     * Get simple HTML page for visualization
     */
    getVisualizerHTML() {
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
    async stop() {
        await this.fastify.close();
    }
    /**
     * Get the Fastify instance (for testing or advanced usage)
     */
    getFastify() {
        return this.fastify;
    }
}
export async function startServer(port = 3000) {
    const server = new VisualizationServer(port);
    await server.start();
    return server;
}
//# sourceMappingURL=index.js.map