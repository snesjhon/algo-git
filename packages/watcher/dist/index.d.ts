import { EventEmitter } from 'events';
export interface WatcherOptions {
    debounceMs?: number;
}
export interface FileChangedEvent {
    filePath: string;
    content: string;
}
export interface FileErrorEvent {
    filePath: string;
    error: Error;
}
export declare class FileWatcher extends EventEmitter {
    private watcher;
    private debounceMs;
    private debounceTimers;
    constructor(options?: WatcherOptions);
    /**
     * Start watching the specified file(s)
     * @param pattern - File path or glob pattern to watch
     */
    watch(pattern: string | string[]): void;
    /**
     * Stop watching files
     */
    stop(): Promise<void>;
    /**
     * Handle file change with debouncing
     */
    private handleFileChange;
    /**
     * Read file content and emit file:changed event
     */
    private readAndEmitFile;
    /**
     * Handle file read errors
     */
    private handleFileError;
    /**
     * Handle watcher errors
     */
    private handleError;
}
//# sourceMappingURL=index.d.ts.map