'use client';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalEvents: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function PlaybackControls({
  isPlaying,
  currentIndex,
  totalEvents,
  onPlay,
  onPause,
  onReset,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-900 rounded-lg">
      <button
        onClick={onReset}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        disabled={totalEvents === 0}
      >
        Reset
      </button>

      {isPlaying ? (
        <button
          onClick={onPause}
          className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded transition-colors"
        >
          Pause
        </button>
      ) : (
        <button
          onClick={onPlay}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors"
          disabled={totalEvents === 0 || currentIndex >= totalEvents - 1}
        >
          Play
        </button>
      )}

      <div className="text-sm text-gray-400">
        Step {currentIndex + 1} / {totalEvents}
      </div>
    </div>
  );
}
