# Getting Started with algo-jit

This guide will help you get algo-jit running locally on your machine.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd algo-jit
   ```

2. **Enable pnpm (if not already installed)**

   ```bash
   corepack enable
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Build all packages**

   ```bash
   pnpm build
   ```

## Running the Demo

The quickest way to see algo-jit in action is to run the bubble sort example:

1. **Make sure everything is built**

   ```bash
   pnpm build
   ```

2. **Start the visualizer in one terminal**

   ```bash
   pnpm visualizer
   ```

   This will start the Next.js development server on http://localhost:3001

3. **In another terminal, start watching the example file**

   ```bash
   pnpm cli watch examples/bubble-sort.ts --port 3000
   ```

   This will:
   - Start the WebSocket server on port 3000
   - Watch the bubble-sort.ts file
   - Automatically open your browser to http://localhost:3000

3. **See the visualization**

   - The browser will show a basic visualization interface
   - Edit and save `examples/bubble-sort.ts` to see the changes
   - The array will be visualized as vertical bars
   - Changes will be highlighted in real-time

## Development Workflow

### Building Packages

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm --filter @algo-jit/cli build
pnpm --filter @algo-jit/instrumenter build
```

### Development Mode

```bash
# Run all packages in watch mode
pnpm dev

# Run specific package in watch mode
pnpm --filter @algo-jit/cli dev
```

### Running the Visualizer

The visualizer is a Next.js app in `packages/visualizer`:

```bash
# Development mode
pnpm visualizer

# Production build
pnpm --filter @algo-jit/visualizer build
pnpm --filter @algo-jit/visualizer start
```

## Project Structure

```
algo-jit/
├── packages/
│   ├── cli/              # Command-line interface
│   ├── watcher/          # File watcher
│   ├── instrumenter/     # Code instrumentation
│   ├── executor/         # Code execution sandbox
│   ├── server/           # WebSocket server
│   └── visualizer/       # Next.js visualization UI
├── examples/             # Example algorithm files
│   └── bubble-sort.ts
└── README.md
```

## How It Works

1. **Watch**: The CLI watches your code file for changes
2. **Instrument**: When you save, the instrumenter adds tracing calls to your code
3. **Execute**: The executor runs your instrumented code in a sandbox
4. **Broadcast**: Trace events are sent via WebSocket to connected clients
5. **Visualize**: The browser UI displays the algorithm execution in real-time

## Next Steps

- Try modifying `examples/bubble-sort.ts` and watch the changes
- Create your own algorithm file and visualize it
- Explore the codebase and contribute!

## Troubleshooting

### Port already in use

If port 3000 or 3001 is already in use, you can specify different ports:

```bash
# For the CLI server
pnpm cli watch examples/bubble-sort.ts --port 3002

# For the visualizer, edit packages/visualizer/package.json or use PORT env var
PORT=3003 pnpm visualizer
```

### Build errors

If you encounter build errors, try:

```bash
# Clean all build artifacts
pnpm -r run clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

### WebSocket connection issues

Make sure:
- The server port matches the WebSocket URL in the visualizer
- The visualizer's WebSocket connection in `packages/visualizer/src/hooks/useWebSocket.ts` points to the correct port
- Both server and visualizer are running

## Contributing

See the main README.md for development guidelines and the project roadmap.
