'use client';

import { useWebSocket } from '../hooks/useWebSocket';
import { ArrayBars } from '../components/ArrayBars';
import { PlaybackControls } from '../components/PlaybackControls';

export default function Home() {
  const {
    connected,
    events,
    error,
    isPlaying,
    currentEventIndex,
    play,
    pause,
    reset,
  } = useWebSocket('ws://localhost:3001/ws');

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">algo-jit</h1>
        <div
          className={`inline-block px-3 py-1 rounded text-sm ${
            connected
              ? 'bg-green-900 text-green-300'
              : 'bg-red-900 text-red-300'
          }`}
        >
          {connected ? '● Connected' : '○ Disconnected'}
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-900 text-red-200 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-4">
        <ArrayBars events={events} currentIndex={currentEventIndex} />

        <PlaybackControls
          isPlaying={isPlaying}
          currentIndex={currentEventIndex}
          totalEvents={events.length}
          onPlay={play}
          onPause={pause}
          onReset={reset}
        />

        {events.length > 0 && (
          <div className="p-4 bg-gray-900 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Event</h2>
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(events[currentEventIndex], null, 2)}
            </pre>
          </div>
        )}

        {events.length === 0 && !error && (
          <div className="p-8 text-center text-gray-400 bg-gray-900 rounded-lg">
            <p className="text-lg mb-2">Waiting for code execution...</p>
            <p className="text-sm">Save your file to see the visualization</p>
          </div>
        )}
      </div>
    </div>
  );
}
