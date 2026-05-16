// ─── ActivityLog.tsx — Dungeon-styled activity feed ──────────────────────────

import { useRef, useEffect } from 'react';
import type { ActivityEntry } from '../types';

interface Props {
  entries: ActivityEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  success: '#44ff88',
  warn:    '#FFD700',
  error:   '#CC3333',
  info:    '#99CCFF',
};

const ROOM_COLORS: Record<string, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
  system: '#aaaaaa',
};

export function ActivityLog({ entries }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <aside className="activity-log-panel">
      <div className="log-header">
        <span className="log-header-icon">⚔</span>
        <span className="log-header-text">ACTIVITY LOG</span>
        <span className="log-entry-count">{entries.length} ENTRIES</span>
      </div>
      <div className="log-entries-scroll">
        {entries.map((entry) => {
          const msgColor = TYPE_COLORS[entry.type] ?? '#F5E6D3';
          const roomColor = ROOM_COLORS[entry.agentId] ?? '#aaaaaa';
          return (
            <div key={entry.id} className="log-entry">
              <span className="log-time">{entry.time}</span>
              <span className="log-room" style={{ color: roomColor }}>[{entry.agentId.toUpperCase()}]</span>
              <span className="log-msg" style={{ color: msgColor }}>{entry.msg}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
