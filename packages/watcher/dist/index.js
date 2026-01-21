import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { readFile } from 'fs/promises';
export class FileWatcher extends EventEmitter {
    watcher = null;
    debounceMs;
    debounceTimers = new Map();
    constructor(options = {}) {
        super();
        this.debounceMs = options.debounceMs ?? 300;
    }
    /**
     * Start watching the specified file(s)
     * @param pattern - File path or glob pattern to watch
     */
    watch(pattern) {
        if (this.watcher) {
            throw new Error('Watcher is already running. Call stop() first.');
        }
        this.watcher = chokidar.watch(pattern, {
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
        });
        this.watcher.on('add', (path) => this.handleFileChange(path));
        this.watcher.on('change', (path) => this.handleFileChange(path));
        this.watcher.on('error', (error) => this.handleError(error));
    }
    /**
     * Stop watching files
     */
    async stop() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        // Clear any pending debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    }
    /**
     * Handle file change with debouncing
     */
    handleFileChange(filePath) {
        // Clear existing timer for this file
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new debounced timer
        const timer = setTimeout(() => {
            this.debounceTimers.delete(filePath);
            this.readAndEmitFile(filePath);
        }, this.debounceMs);
        this.debounceTimers.set(filePath, timer);
    }
    /**
     * Read file content and emit file:changed event
     */
    async readAndEmitFile(filePath) {
        try {
            const content = await readFile(filePath, 'utf-8');
            const event = { filePath, content };
            this.emit('file:changed', event);
        }
        catch (error) {
            this.handleFileError(filePath, error);
        }
    }
    /**
     * Handle file read errors
     */
    handleFileError(filePath, error) {
        const fileError = {
            filePath,
            error: error instanceof Error ? error : new Error(String(error)),
        };
        this.emit('file:error', fileError);
    }
    /**
     * Handle watcher errors
     */
    handleError(error) {
        this.emit('error', error);
    }
}
//# sourceMappingURL=index.js.map