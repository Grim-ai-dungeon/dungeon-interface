import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'system' | 'minion' | 'overlord' | 'event';
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 1,
    timestamp: '2026-05-15 08:00:01',
    type: 'system',
    message: 'Grim awakened. The Dungeon stirs to life.',
  },
  {
    id: 2,
    timestamp: '2026-05-15 08:00:03',
    type: 'minion',
    message: 'Bob reporting for duty! Bello! 🔍',
  },
  {
    id: 3,
    timestamp: '2026-05-15 08:00:05',
    type: 'minion',
    message: 'Kevin online. Tools sharpened. Banana? 🔧',
  },
  {
    id: 4,
    timestamp: '2026-05-15 09:14:22',
    type: 'event',
    message: 'Minions renamed: Scout → Bob, Wrench → Kevin',
  },
  {
    id: 5,
    timestamp: '2026-05-15 11:42:17',
    type: 'overlord',
    message: 'Overlord installed OpenClaw locally. The dungeon expands!',
  },
  {
    id: 6,
    timestamp: '2026-05-15 23:10:00',
    type: 'system',
    message: 'Dungeon Interface v2 deployed. All systems nominal.',
  },
];

function getTypeColor(type: LogEntry['type']): string {
  switch (type) {
    case 'system': return 'var(--cyan)';
    case 'minion': return 'var(--green)';
    case 'overlord': return 'var(--gold)';
    case 'event': return 'var(--purple)';
    default: return 'var(--cyan)';
  }
}

function getTypeLabel(type: LogEntry['type']): string {
  switch (type) {
    case 'system': return 'SYS';
    case 'minion': return 'MIN';
    case 'overlord': return 'OVL';
    case 'event': return 'EVT';
    default: return '---';
  }
}

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Animate logs appearing one by one
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    INITIAL_LOGS.forEach((log, idx) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, log]);
        setVisibleCount((c) => c + 1);
      }, 400 + idx * 250);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div className="dungeon-panel activity-log-panel" style={{ animation: 'slide-in-up 0.6s ease 0.4s both' }}>
      <div className="corner-br" />

      <div className="log-header">
        <div className="log-title">
          <span className="log-icon">▶</span>
          ACTIVITY LOG
        </div>
        <div className="log-count">{logs.length} ENTRIES</div>
      </div>

      <div ref={scrollRef} className="log-entries">
        {logs.map((entry, idx) => (
          <div
            key={entry.id}
            className="log-entry"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <span className="log-timestamp">{entry.timestamp}</span>
            <span
              className="log-type"
              style={{ color: getTypeColor(entry.type), borderColor: getTypeColor(entry.type) }}
            >
              {getTypeLabel(entry.type)}
            </span>
            <span className="log-message" style={{ color: getTypeColor(entry.type) }}>
              {entry.message}
            </span>
          </div>
        ))}
        {logs.length > 0 && (
          <div className="log-cursor">▮</div>
        )}
      </div>

      <style>{`
        .activity-log-panel {
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(0, 245, 255, 0.15);
          flex-shrink: 0;
        }

        .log-title {
          font-family: var(--font-title);
          font-size: 12px;
          font-weight: 700;
          color: var(--cyan);
          letter-spacing: 0.15em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-icon {
          color: var(--gold);
          font-size: 10px;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }

        .log-count {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.4);
          letter-spacing: 0.1em;
        }

        .log-entries {
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-right: 4px;
        }

        .log-entry {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          animation: fade-in 0.3s ease both;
          line-height: 1.4;
        }

        .log-timestamp {
          color: rgba(0, 245, 255, 0.35);
          font-size: 10px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .log-type {
          font-size: 9px;
          padding: 1px 4px;
          border: 1px solid;
          border-radius: 2px;
          flex-shrink: 0;
          opacity: 0.8;
          letter-spacing: 0.05em;
        }

        .log-message {
          flex: 1;
          word-break: break-word;
        }

        .log-cursor {
          font-family: var(--font-mono);
          color: var(--cyan);
          font-size: 12px;
          animation: blink-cursor 1s step-end infinite;
          margin-top: 4px;
        }

        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
