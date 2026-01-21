'use client';

import { TraceEvent } from '../hooks/useWebSocket';

interface ArrayBarsProps {
  events: TraceEvent[];
  currentIndex: number;
}

export function ArrayBars({ events, currentIndex }: ArrayBarsProps) {
  // Extract array data from events
  const arrayData = getArrayFromEvents(events, currentIndex);

  if (!arrayData || arrayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>No array data to visualize</p>
      </div>
    );
  }

  const maxValue = Math.max(...arrayData);
  const currentEvent = events[currentIndex];
  const maxBarHeight = 300; // pixels

  return (
    <div className="bg-gray-900 rounded-lg p-8" style={{ height: '400px' }}>
      <div className="flex items-end justify-center gap-2 h-full pb-16">
        {arrayData.map((value, index) => {
          const barHeight = (value / maxValue) * maxBarHeight;
          const isActive = isIndexActive(currentEvent, index);

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end gap-2"
            >
              <div
                className={`w-full rounded-t transition-all duration-200 ${
                  isActive ? 'bg-yellow-400' : 'bg-blue-500'
                }`}
                style={{ height: `${barHeight}px`, minHeight: '2px' }}
              />
              <span className="text-xs text-gray-400">{index}</span>
              <span className="text-sm font-mono">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getArrayFromEvents(
  events: TraceEvent[],
  currentIndex: number
): number[] {
  if (events.length === 0) return [];

  // Find the most recent array declaration or assignment
  for (let i = currentIndex; i >= 0; i--) {
    const event = events[i];
    if (
      (event?.type === 'variable:declare' || event?.type === 'variable:assign') &&
      Array.isArray(event.data.value)
    ) {
      return event.data.value as number[];
    }
  }

  return [];
}

function isIndexActive(event: TraceEvent | undefined, index: number): boolean {
  if (!event) return false;

  if (event.type === 'array:write' && event.data.index === index) {
    return true;
  }

  if (event.type === 'compare' && event.data.indices) {
    const indices = event.data.indices as [number, number];
    return indices.includes(index);
  }

  return false;
}
