import { useEffect, useRef, useState } from 'react';
import { connectWebSocket } from '@/lib/api';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setStatus('connecting');
    
    // Connect
    const ws = connectWebSocket(endpoint, (message) => {
      setData(message);
    });

    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    ws.onerror = () => setStatus('error');

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [endpoint]);

  return { data, status };
}
