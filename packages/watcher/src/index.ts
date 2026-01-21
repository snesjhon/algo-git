import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import { readFile } from 'fs/promises';

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

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceMs: number;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: WatcherOptions = {}) {
    super();
    this.debounceMs = options.debounceMs ?? 300;
  }

  /**
   * Start watching the specified file(s)
   * @param pattern - File path or glob pattern to watch
   */
  watch(pattern: string | string[]): void {
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
  async stop(): Promise<void> {
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
  private handleFileChange(filePath: string): void {
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
  private async readAndEmitFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const event: FileChangedEvent = { filePath, content };
      this.emit('file:changed', event);
    } catch (error) {
      this.handleFileError(filePath, error);
    }
  }

  /**
   * Handle file read errors
   */
  private handleFileError(filePath: string, error: unknown): void {
    const fileError: FileErrorEvent = {
      filePath,
      error: error instanceof Error ? error : new Error(String(error)),
    };
    this.emit('file:error', fileError);
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    this.emit('error', error);
  }
}
