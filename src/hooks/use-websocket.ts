import { useEffect, useRef, useState } from 'react';
import { connectWebSocket } from '@/lib/api';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    
    // Defer setting status to avoid cascading render warning
    Promise.resolve().then(() => setStatus('connecting'));

    const connect = () => {
        ws = connectWebSocket(endpoint, (message) => {
          setData(message as T);
        });

        ws.onopen = () => setStatus('connected');
        ws.onclose = () => setStatus('disconnected');
        ws.onerror = () => setStatus('error');

        wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [endpoint]);

  return { data, status };
}
