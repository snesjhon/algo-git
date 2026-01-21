'use client';

import { useEffect, useState, useRef } from 'react';

export interface TraceEvent {
  id: number;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
}

export interface ServerMessage {
  type: 'trace:start' | 'trace:event' | 'trace:complete' | 'trace:error';
  timestamp?: number;
  event?: TraceEvent;
  events?: TraceEvent[];
  summary?: {
    totalEvents: number;
    duration: number;
  };
  error?: string;
  partialTrace?: TraceEvent[];
}

export interface UseWebSocketReturn {
  connected: boolean;
  events: TraceEvent[];
  error: string | null;
  isPlaying: boolean;
  currentEventIndex: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setError('Connection error');
      setConnected(false);
    };

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);

      if (message.type === 'trace:start') {
        setEvents([]);
        setCurrentEventIndex(0);
        setError(null);
      } else if (message.type === 'trace:complete') {
        setEvents(message.events || []);
        setCurrentEventIndex(0);
      } else if (message.type === 'trace:error') {
        setError(message.error || 'Unknown error');
        setEvents(message.partialTrace || []);
      }
    };

    return () => {
      ws.close();
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [url]);

  const play = () => {
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current);
          }
          return prev;
        }
        return prev + 1;
      });
    }, 200); // 200ms per step
  };

  const pause = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const reset = () => {
    pause();
    setCurrentEventIndex(0);
  };

  return {
    connected,
    events,
    error,
    isPlaying,
    currentEventIndex,
    play,
    pause,
    reset,
  };
}
