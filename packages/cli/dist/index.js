#!/usr/bin/env node
import { Command } from 'commander';
import { FileWatcher } from '@algo-jit/watcher';
import { startServer } from '@algo-jit/server';
import { instrument } from '@algo-jit/instrumenter';
import { execute } from '@algo-jit/executor';
import open from 'open';
const program = new Command();
program
    .name('algo-jit')
    .description('Live code visualization for algorithms')
    .version('0.1.0');
program
    .command('watch')
    .description('Watch a file or glob pattern and visualize algorithm execution')
    .argument('[file]', 'File path or glob pattern to watch')
    .option('-p, --port <number>', 'Server port', '3000')
    .option('--no-open', 'Do not automatically open browser')
    .option('--config', 'Use .algojitrc config file')
    .action(async (file, options) => {
    const port = parseInt(options.port, 10);
    const shouldOpen = options.open;
    if (!file && !options.config) {
        console.error('Error: Please specify a file to watch or use --config');
        process.exit(1);
    }
    console.log('🚀 Starting algo-jit...\n');
    try {
        // Start WebSocket server
        const server = await startServer(port);
        console.log(`✓ Server running on http://localhost:${port}`);
        // Start file watcher
        const watcher = new FileWatcher();
        watcher.on('file:changed', ({ filePath, content }) => {
            console.log(`📝 File changed: ${filePath}`);
            // Instrument the code
            const instrumentResult = instrument(content, { filePath });
            if (!instrumentResult.success) {
                console.error(`❌ Instrumentation failed: ${instrumentResult.error}`);
                server.broadcastError(instrumentResult.error || 'Instrumentation failed');
                return;
            }
            console.log('✓ Code instrumented');
            // Execute the instrumented code
            server.broadcastTraceStart();
            const executionResult = execute(instrumentResult.code);
            if (!executionResult.success) {
                console.error(`❌ Execution failed: ${executionResult.error?.message}`);
                server.broadcastError(executionResult.error?.message || 'Execution failed', executionResult.trace);
                return;
            }
            console.log(`✓ Execution complete (${executionResult.duration}ms, ${executionResult.trace.length} events)`);
            // Broadcast trace to visualizer
            server.broadcastTrace(executionResult.trace, executionResult.duration);
        });
        watcher.on('file:error', ({ filePath, error }) => {
            console.error(`❌ Error reading file ${filePath}:`, error.message);
        });
        if (file) {
            watcher.watch(file);
            console.log(`👀 Watching: ${file}\n`);
        }
        // Open browser
        if (shouldOpen) {
            const url = `http://localhost:${port}`;
            console.log(`🌐 Opening browser at ${url}\n`);
            await open(url);
        }
        console.log('Ready! Save your file to see visualizations.\n');
        // Keep process alive
        process.on('SIGINT', async () => {
            console.log('\n\n👋 Shutting down...');
            await watcher.stop();
            await server.stop();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start algo-jit:', error);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map