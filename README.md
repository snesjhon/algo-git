# algo-jit

A live code visualization service that watches your code and visualizes algorithm behavior in real-time.

## Vision

Run a service alongside your IDE that automatically visualizes what your code is doing as you write it. Switch between visualization modes (arrays, graphs, trees, nodes) on the fly. Zero configuration required - just point it at a file and see your algorithm come to life.

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Your IDE  │ ──► │  Watcher Service │ ──► │  Visualizer UI │
│  (code.ts)  │     │  (instruments &  │     │   (browser)    │
└─────────────┘     │   executes code) │     └────────────────┘
                    └──────────────────┘
                           │
                    ┌──────┴──────┐
                    │  WebSocket  │
                    │   Server    │
                    └─────────────┘
```

---

## Design Decisions

These decisions guide the architecture and implementation.

### Core Philosophy

| Decision             | Choice                     | Rationale                                                    |
| -------------------- | -------------------------- | ------------------------------------------------------------ |
| **Capture scope**    | Auto-capture all           | Zero config experience; no annotations needed to get started |
| **Language support** | TypeScript/JavaScript only | Focus on one ecosystem first; can add plugin system later    |
| **UI platform**      | Browser-based              | Works everywhere, easy to develop, no installation friction  |
| **Input method**     | Inline in code             | User defines inputs in their file (`const arr = [3,1,4]`)    |

### Behavior

| Decision                    | Choice                    | Rationale                                                        |
| --------------------------- | ------------------------- | ---------------------------------------------------------------- |
| **File targeting**          | CLI arg + config file     | Quick CLI for one-off use, config for project setup              |
| **Visualization selection** | Auto-detect + UI override | Smart defaults (array → bars, nested → tree) with manual control |
| **Playback style**          | Auto-play + step controls | Animated by default with pause, step, and speed slider           |
| **Reload behavior**         | Auto on save (pauseable)  | Live feedback loop; can pause in UI when needed                  |

### Safety & Errors

| Decision             | Choice                     | Rationale                                                  |
| -------------------- | -------------------------- | ---------------------------------------------------------- |
| **Timeout handling** | Hard timeout (5 seconds)   | Prevents infinite loops from freezing; shows partial trace |
| **Error handling**   | Show partial trace + error | Visualize what ran, then display error in UI               |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         algo-jit                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────────┐    ┌───────────┐              │
│  │ Watcher │───►│ Instrumenter │───►│ Executor  │              │
│  └─────────┘    └──────────────┘    └─────┬─────┘              │
│       │                                    │                    │
│       │ file change                        │ trace events       │
│       ▼                                    ▼                    │
│  ┌─────────┐                        ┌───────────┐              │
│  │   CLI   │                        │ WebSocket │              │
│  └─────────┘                        │  Server   │              │
│                                     └─────┬─────┘              │
│                                           │                    │
└───────────────────────────────────────────┼────────────────────┘
                                            │
                                            ▼
                                     ┌─────────────┐
                                     │  Browser UI │
                                     │ (Visualizer)│
                                     └─────────────┘
```

### Components

#### 1. CLI (`packages/cli`)

Entry point for the tool.

**Responsibilities:**

- Parse command line arguments
- Load config file if present
- Start watcher and server
- Open browser automatically

**Commands:**

```bash
algo-jit watch <file>        # Watch a single file
algo-jit watch --config      # Use .algojitrc config
algo-jit --port 3001         # Custom port
```

#### 2. File Watcher (`packages/watcher`)

Monitors target files for changes.

**Responsibilities:**

- Watch specified file(s) using `chokidar`
- Debounce rapid saves (300ms default)
- Trigger instrumentation pipeline on change
- Support glob patterns for multiple files

**Events emitted:**

- `file:changed` - File was modified
- `file:error` - File read error

#### 3. Code Instrumenter (`packages/instrumenter`)

Transforms source code to capture execution state.

**Responsibilities:**

- Parse TypeScript/JavaScript into AST
- Identify trackable constructs:
  - Variable declarations and assignments
  - Array/object literals and mutations
  - Loop constructs (for, while, for...of)
  - Function declarations and calls
  - Conditionals (if/else, ternary)
- Inject tracing calls that emit events
- Generate executable instrumented code

**Transformation example:**

```typescript
// Original
function bubbleSort(arr: number[]) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// Instrumented (conceptual)
function bubbleSort(arr: number[]) {
  __trace.declare('arr', arr);
  for (let i = 0; __trace.loop('outer', i), i < arr.length; i++) {
    for (let j = 0; __trace.loop('inner', j), j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        __trace.compare('arr', j, j + 1);
        __trace.swap('arr', j, j + 1);
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
```

#### 4. Sandboxed Executor (`packages/executor`)

Runs instrumented code safely.

**Responsibilities:**

- Execute instrumented code in isolated context
- Enforce 5-second timeout
- Collect trace events from `__trace` calls
- Catch and report runtime errors
- Return execution trace or partial trace + error

**Execution context provides:**

- `__trace` object with tracing methods
- Standard JS globals (Math, console, etc.)
- No file system or network access

#### 5. WebSocket Server (`packages/server`)

Real-time communication with browser UI.

**Responsibilities:**

- Serve WebSocket connections on configured port
- Broadcast trace events to all connected clients
- Handle multiple simultaneous viewers
- Send full trace on new client connection

**Message types:**

```typescript
// Server → Client
{ type: 'trace:start', timestamp: number }
{ type: 'trace:event', event: TraceEvent }
{ type: 'trace:complete', summary: TraceSummary }
{ type: 'trace:error', error: string, partialTrace: TraceEvent[] }

// Client → Server
{ type: 'playback:pause' }
{ type: 'playback:resume' }
{ type: 'playback:step' }
{ type: 'playback:speed', speed: number }
```

#### 6. Visualizer UI (`packages/visualizer`)

Browser-based visualization frontend.

**Responsibilities:**

- Connect to WebSocket server
- Render visualizations based on trace events
- Provide playback controls
- Allow switching visualization modes
- Display errors when they occur

**UI Sections:**

```
┌─────────────────────────────────────────────────────────┐
│  algo-jit                              [Auto-reload ●]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   VISUALIZATION AREA                    │
│                                                         │
│         (arrays as bars, trees, graphs, etc.)          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [|◄] [◄] [▶] [►|]     ═══════●═══════     Speed: 1x   │
├─────────────────────────────────────────────────────────┤
│  Variables    │  Step 42/156  │  Viz: Array Bars ▼     │
│  ─────────────┼───────────────┼─────────────────────── │
│  arr: [1,2,3] │  Comparing    │  Loop i=3, j=5         │
│  i: 3         │  indices 5,6  │                        │
│  j: 5         │               │                        │
└─────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Trace Event

Each state change captured during execution.

```typescript
type TraceEvent = {
  id: number; // Sequential event ID
  timestamp: number; // ms since execution start
  type: TraceEventType;
  data: TraceEventData;
};

type TraceEventType =
  | 'variable:declare' // New variable declared
  | 'variable:assign' // Variable value changed
  | 'array:create' // Array literal created
  | 'array:read' // Array index accessed
  | 'array:write' // Array index mutated
  | 'array:method' // push, pop, splice, etc.
  | 'loop:enter' // Entered loop
  | 'loop:iteration' // Loop iteration
  | 'loop:exit' // Exited loop
  | 'function:call' // Function invoked
  | 'function:return' // Function returned
  | 'compare' // Comparison operation
  | 'swap' // Swap operation (semantic)
  | 'error'; // Runtime error

type TraceEventData = {
  name?: string; // Variable/function name
  value?: any; // Current value (serialized)
  index?: number; // Array index
  indices?: [number, number]; // For swaps/compares
  args?: any[]; // Function arguments
  loopId?: string; // Loop identifier
  iteration?: number; // Loop iteration count
  error?: string; // Error message
};
```

### Execution Trace

Complete trace from one execution run.

```typescript
type ExecutionTrace = {
  id: string; // Unique trace ID
  sourceFile: string; // Original file path
  startTime: number; // Unix timestamp
  duration: number; // Total execution time (ms)
  events: TraceEvent[]; // All trace events
  error?: {
    // If execution failed
    message: string;
    stack?: string;
    eventIndex: number; // Where error occurred
  };
  variables: Map<string, any>; // Final variable states
};
```

### Visualization State

UI state for rendering.

```typescript
type VisualizationState = {
  trace: ExecutionTrace | null;
  currentEventIndex: number;
  playbackSpeed: number; // 0.25x to 4x
  isPlaying: boolean;
  visualizationMode: VisualizationMode;
  selectedVariable: string | null;
};

type VisualizationMode =
  | 'array-bars' // Vertical bars for arrays
  | 'array-boxes' // Horizontal boxes
  | 'linked-list' // Nodes with pointers
  | 'binary-tree' // Tree structure
  | 'graph' // Nodes and edges
  | 'call-stack' // Function call visualization
  | 'table'; // Simple variable table
```

---

## Tech Stack

| Component      | Technology                 | Why                                     |
| -------------- | -------------------------- | --------------------------------------- |
| Monorepo       | `pnpm` workspaces          | Fast, efficient, good for multi-package |
| File Watcher   | `chokidar`                 | Reliable cross-platform file watching   |
| AST Parsing    | TypeScript Compiler API    | Native TS support, accurate parsing     |
| Code Transform | `ts-morph`                 | High-level API over TS compiler         |
| Sandbox        | `isolated-vm` or Node `vm` | Secure code execution                   |
| WebSocket      | `ws`                       | Lightweight, fast WebSocket server      |
| HTTP Server    | `fastify`                  | Serves UI, minimal overhead             |
| Visualizer     | Next.js 14 + React         | Fast development, good DX               |
| Visualization  | Canvas API + Framer Motion | Performant rendering, smooth animations |
| State          | Zustand                    | Simple, no boilerplate                  |
| Styling        | Tailwind CSS               | Rapid UI development                    |

---

## Milestones

### Milestone 1: Proof of Concept

**Goal:** End-to-end flow working with array bars visualization.

#### 1.1 Project Setup

- [ ] Initialize pnpm monorepo
- [ ] Set up `packages/` structure
- [ ] Configure TypeScript, ESLint, shared configs
- [ ] Create basic `package.json` scripts

#### 1.2 File Watcher

- [ ] Implement file watcher with chokidar
- [ ] Add debouncing (300ms)
- [ ] CLI argument parsing for file path
- [ ] Emit events on file change

#### 1.3 Basic Instrumenter

- [ ] Parse TS/JS file with TypeScript Compiler API
- [ ] Identify array declarations
- [ ] Identify array index assignments
- [ ] Inject basic `__trace` calls
- [ ] Output transformed code as string

#### 1.4 Basic Executor

- [ ] Create sandboxed execution context
- [ ] Implement `__trace` runtime object
- [ ] Collect events into array
- [ ] Add 5-second timeout
- [ ] Return trace or error

#### 1.5 WebSocket Server

- [ ] Set up `ws` server
- [ ] Broadcast trace events on execution
- [ ] Handle client connections
- [ ] Send full trace on new connection

#### 1.6 Visualizer MVP

- [ ] Create Next.js app
- [ ] Connect to WebSocket
- [ ] Render array as vertical bars
- [ ] Highlight current operation (compare/swap)
- [ ] Basic play/pause button

#### 1.7 Demo

- [ ] Create `examples/bubble-sort.ts`
- [ ] Verify end-to-end flow works
- [ ] Document how to run locally

---

### Milestone 2: Core Instrumentation

**Goal:** Capture comprehensive execution state.

#### 2.1 Variable Tracking

- [ ] Track all variable declarations (let, const, var)
- [ ] Track primitive assignments
- [ ] Track object/array assignments
- [ ] Serialize values safely (handle circular refs)

#### 2.2 Array Operations

- [ ] Track index reads (`arr[i]`)
- [ ] Track index writes (`arr[i] = x`)
- [ ] Track method calls (push, pop, shift, unshift, splice, sort, reverse)
- [ ] Track spread operations
- [ ] Track destructuring

#### 2.3 Loop Tracking

- [ ] Track `for` loops (init, condition, update)
- [ ] Track `while` loops
- [ ] Track `for...of` loops
- [ ] Track `for...in` loops
- [ ] Track loop entry/exit
- [ ] Track iteration count

#### 2.4 Function Tracking

- [ ] Track function declarations
- [ ] Track function calls with arguments
- [ ] Track return values
- [ ] Track recursion depth
- [ ] Build call stack

#### 2.5 Playback Controls

- [ ] Step forward one event
- [ ] Step backward one event
- [ ] Jump to start/end
- [ ] Speed control (0.25x, 0.5x, 1x, 2x, 4x)
- [ ] Scrubber/timeline slider

---

### Milestone 3: Visualization Modes

**Goal:** Multiple ways to visualize data structures.

#### 3.1 Array Visualizations

- [ ] Vertical bars (default for number arrays)
- [ ] Horizontal boxes with values
- [ ] Color coding (comparing, swapping, sorted)
- [ ] Index labels

#### 3.2 Tree Visualization

- [ ] Binary tree layout algorithm
- [ ] Node rendering with values
- [ ] Edge connections
- [ ] Highlight current node
- [ ] Support for BST, heap visualizations

#### 3.3 Graph Visualization

- [ ] Force-directed layout
- [ ] Node and edge rendering
- [ ] Directed vs undirected
- [ ] Weighted edges
- [ ] Highlight traversal path

#### 3.4 Linked List Visualization

- [ ] Horizontal node chain
- [ ] Pointer arrows
- [ ] Support doubly-linked
- [ ] Highlight current/next pointers

#### 3.5 Call Stack Visualization

- [ ] Stack frames as boxes
- [ ] Show function name and args
- [ ] Push/pop animations
- [ ] Recursion depth indicator

#### 3.6 Auto-Detection

- [ ] Detect flat number array → bars
- [ ] Detect nested arrays → matrix
- [ ] Detect objects with left/right → binary tree
- [ ] Detect objects with next → linked list
- [ ] Detect adjacency list → graph
- [ ] Allow manual override in UI

---

### Milestone 4: Developer Experience

**Goal:** Polish for real-world usage.

#### 4.1 CLI Improvements

- [ ] `algo-jit init` - Create config file
- [ ] `algo-jit watch <glob>` - Watch multiple files
- [ ] Auto-open browser on start
- [ ] Colored terminal output
- [ ] `--port`, `--no-open` flags

#### 4.2 Config File

- [ ] `.algojitrc.json` support
- [ ] Configure timeout, port, debounce
- [ ] Specify default visualization modes
- [ ] Exclude files/patterns

#### 4.3 Error Experience

- [ ] Syntax error highlighting in UI
- [ ] Runtime error with stack trace
- [ ] Show line number in original file
- [ ] "Fix and save to retry" message

#### 4.4 UI Polish

- [ ] Dark/light mode
- [ ] Responsive layout
- [ ] Keyboard shortcuts (space=play/pause, arrows=step)
- [ ] Variable inspector panel
- [ ] Code preview panel (optional)

#### 4.5 Multiple Files

- [ ] Support imports between files
- [ ] Bundle before instrumentation
- [ ] Show file name in trace events

---

### Milestone 5: Advanced Features

**Goal:** Power-user features and sharing.

#### 5.1 Recursion Visualization

- [ ] Call tree view
- [ ] Animate call stack growth
- [ ] Show parameters at each level
- [ ] Visualize divide-and-conquer patterns

#### 5.2 Comparison Mode

- [ ] Side-by-side algorithm comparison
- [ ] Sync playback
- [ ] Show operation counts
- [ ] Time complexity comparison

#### 5.3 Export

- [ ] Export as GIF
- [ ] Export as MP4
- [ ] Export as PNG sequence
- [ ] Configurable resolution/speed

#### 5.4 Sharing

- [ ] Generate shareable link
- [ ] Embed code in shared visualization
- [ ] Optional: hosted service for sharing

#### 5.5 Plugin System

- [ ] Custom visualization plugins
- [ ] Custom trace event types
- [ ] Theme plugins

---

## Example Usage

### Basic Sorting Visualization

```bash
# Terminal 1: Start watching
algo-jit watch ./examples/bubble-sort.ts

# Browser opens automatically at http://localhost:3000
```

```typescript
// examples/bubble-sort.ts
const arr = [64, 34, 25, 12, 22, 11, 90];

for (let i = 0; i < arr.length; i++) {
  for (let j = 0; j < arr.length - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}

console.log(arr); // [11, 12, 22, 25, 34, 64, 90]
```

The visualizer shows:

- Array as colored bars
- Current comparison highlighted in yellow
- Swap animation when elements exchange
- Sorted portion in green
- Loop counters `i` and `j` displayed

---

## Config File Example

```json
// .algojitrc.json
{
  "watch": ["src/**/*.ts", "!src/**/*.test.ts"],
  "port": 3000,
  "timeout": 5000,
  "debounce": 300,
  "autoOpen": true,
  "defaultVisualization": "auto",
  "theme": "dark"
}
```

---

## Directory Structure

```
algo-jit/
├── packages/
│   ├── cli/                  # CLI entry point
│   │   ├── src/
│   │   │   ├── index.ts      # Main CLI logic
│   │   │   └── config.ts     # Config file loading
│   │   └── package.json
│   │
│   ├── watcher/              # File watching
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── instrumenter/         # AST transformation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── parser.ts     # AST parsing
│   │   │   ├── transformer.ts # Code transformation
│   │   │   └── runtime.ts    # __trace implementation
│   │   └── package.json
│   │
│   ├── executor/             # Sandboxed execution
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── sandbox.ts
│   │   └── package.json
│   │
│   ├── server/               # WebSocket + HTTP server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── websocket.ts
│   │   └── package.json
│   │
│   └── visualizer/           # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   │   ├── Visualizer.tsx
│       │   │   ├── ArrayBars.tsx
│       │   │   ├── TreeView.tsx
│       │   │   ├── PlaybackControls.tsx
│       │   │   └── VariableInspector.tsx
│       │   ├── hooks/
│       │   │   └── useWebSocket.ts
│       │   └── store/
│       │       └── visualization.ts
│       └── package.json
│
├── examples/                 # Example algorithms
│   ├── bubble-sort.ts
│   ├── quick-sort.ts
│   ├── binary-search.ts
│   ├── bfs-graph.ts
│   └── binary-tree-traversal.ts
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── README.md
└── .algojitrc.json
```

---

## Future Ideas (Backlog)

- VS Code extension with embedded webview
- Python support via AST transformation
- Collaborative viewing (multiple users watch same trace)
- Algorithm library with pre-built examples
- AI-powered suggestions ("This looks like a sorting algorithm, try array bars")
- Performance profiling mode (show time spent per line)
- Memory visualization (heap allocations)
- Diff mode (show what changed between runs)

---

## License

MIT
