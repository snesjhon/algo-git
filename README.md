# algo-jit

A live code visualization service that watches your code and visualizes algorithm behavior in real-time.

## Vision

Run a service alongside your IDE that automatically visualizes what your code is doing as you write it. Switch between visualization modes (arrays, graphs, trees, nodes) on the fly.

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Your IDE  │ ──► │  Watcher Service │ ──► │  Visualizer UI │
│  (code.ts)  │     │  (instruments &  │     │  (browser/app) │
└─────────────┘     │   executes code) │     └────────────────┘
                    └──────────────────┘
```

---

## Architecture

### Components

#### 1. File Watcher Service
- Watches target file(s) for changes
- Debounces rapid changes
- Triggers the instrumentation pipeline on save

#### 2. Code Instrumenter
- Parses source code into AST
- Injects probes to capture:
  - Variable assignments
  - Array/object mutations
  - Loop iterations
  - Function calls and returns
  - Recursion depth
- Outputs instrumented code ready for execution

#### 3. Sandboxed Executor
- Runs instrumented code in isolated environment
- Captures execution trace (sequence of state changes)
- Handles infinite loops / timeouts gracefully
- Emits events for each captured state change

#### 4. WebSocket Server
- Bridges executor and visualization UI
- Streams execution events in real-time
- Handles multiple connected clients

#### 5. Visualizer UI (Browser)
- Connects to WebSocket server
- Renders visualizations based on execution trace
- Supports multiple visualization modes:
  - Array bars (like sorting visualizers)
  - Linked list / nodes
  - Tree structures
  - Graph networks
  - Call stack
  - Variable timeline
- Playback controls (pause, step, speed)

---

## Technical Approach Options

### Option A: AST Instrumentation (Recommended for v1)
Transform the code at build time to emit state changes.

```typescript
// Original
let arr = [3, 1, 4];
arr[0] = 5;

// Instrumented
let arr = __trace('arr', [3, 1, 4]);
__mutate('arr', 0, 5); arr[0] = 5;
```

**Pros:** Full control, works offline, no debugger dependency
**Cons:** Complex transforms, may affect behavior edge cases

### Option B: V8 Debugger Protocol
Use Chrome DevTools Protocol / Node Inspector to step through code.

**Pros:** Uses battle-tested tooling, accurate state
**Cons:** Slower, requires breakpoint management, complex setup

### Option C: Proxy-Based Tracing
Wrap data structures in Proxies to intercept mutations.

**Pros:** Clean, non-invasive to source
**Cons:** Only captures object/array mutations, misses primitives

### Option D: Explicit Annotations
User marks what to visualize with comments/decorators.

```typescript
// @visualize
let arr = [3, 1, 4];
```

**Pros:** Simple, user controls scope
**Cons:** Requires manual annotation, not truly automatic

### Hybrid Approach (Recommended)
- Use **AST instrumentation** for capturing state
- Support **annotations** for user hints (visualization type, focus areas)
- Use **Proxies** as runtime enhancement for deep object tracking

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| File Watcher | `chokidar` |
| AST Parsing | `@babel/parser` + `@babel/traverse` or TypeScript Compiler API |
| Code Transform | `@babel/generator` or `ts-morph` |
| Sandbox Execution | `vm2` or isolated `Worker` threads |
| WebSocket Server | `ws` or `socket.io` |
| Visualizer UI | Next.js + React + Canvas/D3/Framer Motion |
| State Management | Zustand or simple React state |

---

## Milestones

### Milestone 1: Proof of Concept
Basic end-to-end flow with hardcoded visualization.

- [ ] Set up monorepo structure (server + client)
- [ ] File watcher that detects changes to a target file
- [ ] Simple AST parser that identifies array declarations
- [ ] Basic instrumentation that logs array operations
- [ ] WebSocket server that broadcasts events
- [ ] React UI that displays array as bars
- [ ] Demo with bubble sort

### Milestone 2: Core Instrumentation
Expand what can be captured and visualized.

- [ ] Track variable assignments (primitives)
- [ ] Track array mutations (push, pop, splice, index assignment)
- [ ] Track loop iterations with indices
- [ ] Track function calls and returns
- [ ] Execution timeline/trace data structure
- [ ] Playback controls (pause, step forward/back, speed)

### Milestone 3: Multiple Visualization Modes
Let users choose how to visualize their data.

- [ ] Array bars visualization
- [ ] Linked list / pointer visualization
- [ ] Binary tree visualization
- [ ] Graph (nodes + edges) visualization
- [ ] Call stack visualization
- [ ] Auto-detect appropriate visualization from data shape

### Milestone 4: Developer Experience
Make it easy to use in real workflows.

- [ ] CLI tool (`algo-jit watch ./myfile.ts`)
- [ ] Config file support (`.algojitrc`)
- [ ] Annotation syntax for hints (`// @jit:visualize as tree`)
- [ ] VS Code extension (optional)
- [ ] Error handling and meaningful error messages
- [ ] Support for multiple files / imports

### Milestone 5: Advanced Features
Polish and power-user features.

- [ ] Recursion visualization (call tree)
- [ ] Memory/space visualization
- [ ] Comparison mode (side-by-side algorithms)
- [ ] Export visualization as GIF/video
- [ ] Shareable links
- [ ] Custom visualization plugins

---

## Open Questions

1. **Scope of instrumentation** - Instrument everything vs. only annotated sections?
2. **Language support** - TypeScript/JavaScript only, or extensible to Python, etc.?
3. **Input handling** - How does user provide input to their algorithm?
4. **Performance** - How to handle large datasets or long-running algorithms?
5. **UI architecture** - Separate Electron app vs. browser-based vs. VS Code webview?

---

## Getting Started (Coming Soon)

```bash
# Install
npm install -g algo-jit

# Watch a file
algo-jit watch ./sorting.ts

# Open visualizer
# Browser opens automatically at http://localhost:3000
```

---

## Directory Structure (Planned)

```
algo-jit/
├── packages/
│   ├── cli/              # CLI entry point
│   ├── watcher/          # File watching logic
│   ├── instrumenter/     # AST parsing and code transformation
│   ├── executor/         # Sandboxed code execution
│   ├── server/           # WebSocket server
│   └── visualizer/       # Next.js frontend
├── examples/             # Example algorithms to visualize
├── README.md
└── package.json
```

---

## License

MIT
