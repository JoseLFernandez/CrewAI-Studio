import React, { useEffect, useRef, useState } from 'react';

interface Props {
  runId: string;
}

const RunConsole: React.FC<Props> = ({ runId }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = () => {
    if (connected) return;
  const base = (process.env.NEXT_PUBLIC_API_URL || window.location.origin).replace(/\/$/, '');
  const wsBase = base.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/ws/flow-runs/${runId}`);
    ws.onmessage = (ev) => setLogs((prev) => [...prev, ev.data]);
    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
    setConnected(true);
  };

  const stop = () => {
    wsRef.current?.close();
    setConnected(false);
  };

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Auto-start on new runId
  useEffect(() => {
    setLogs([]);
    setConnected(false);
    // wait a tick to ensure any prior sockets are closed
    const t = setTimeout(() => start(), 50);
    return () => clearTimeout(t);
  }, [runId]);

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <button onClick={connected ? stop : start}>{connected ? 'Stop' : 'Start'}</button>
        <label htmlFor="autoScroll" style={{ marginLeft: 8 }}>
          <input
            id="autoScroll"
            name="autoScroll"
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      <div
        ref={containerRef}
        style={{
          background: '#000',
          color: '#0f0',
          height: 200,
          overflowY: 'auto',
          fontFamily: 'monospace',
          padding: 4,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#6ee7b7' }}>Waiting for logs…</div>
        ) : (
          logs.map((line, idx) => <div key={idx}>{line}</div>)
        )}
      </div>
    </div>
  );
};

export default RunConsole;
