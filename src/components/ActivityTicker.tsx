// ─── ActivityTicker.tsx — Bottom-of-screen dungeon chronicle feed ─────────────
// Displays a real-time scrolling activity ticker at the bottom of the viewport.
// Recent entries scroll horizontally (marquee); click the expander for vertical log view.

import { useState, useRef, useEffect } from 'react';
import type { ActivityEntry } from '../types';

const AGENT_COLORS: Record<string, string> = {
  grim:   '#FFA700',
  bob:    '#6699CC',
  kevin:  '#FF5522',
  stuart: '#FFD700',
  agnes:  '#FF66AA',
};

const TYPE_COLORS: Record<string, string> = {
  success: '#44ff88',
  warn:    '#FFD700',
  error:   '#FF4444',
  info:    '#99CCFF',
};

const TYPE_ICONS: Record<string, string> = {
  success: '✓',
  warn:    '⚡',
  error:   '✗',
  info:    '·',
};

interface Props {
  entries: ActivityEntry[];
}

export function ActivityTicker({ entries }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused]     = useState(false);
  const scrollRef                = useRef<HTMLDivElement>(null);
  const expandedListRef          = useRef<HTMLDivElement>(null);

  // When expanded panel opens, scroll to bottom
  useEffect(() => {
    if (expanded && expandedListRef.current) {
      expandedListRef.current.scrollTop = expandedListRef.current.scrollHeight;
    }
  }, [expanded, entries.length]);

  // Ticker shows last 40 entries, newest appended to the right
  const tickerEntries = entries.slice(-40);

  return (
    <div className={`activity-ticker${expanded ? ' activity-ticker--expanded' : ''}`}>
      {/* ── Top border glow line ── */}
      <div className="ticker-glow-line" />

      {/* ── Ticker bar ── */}
      <div className="ticker-bar">
        {/* Left label */}
        <div className="ticker-label">
          <span className="ticker-label-icon">📜</span>
          <span className="ticker-label-text">CHRONICLE</span>
        </div>

        {/* Scrolling marquee zone */}
        <div
          className="ticker-scroll-mask"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={scrollRef}
            className={`ticker-scroll-track${paused ? ' ticker-scroll-track--paused' : ''}`}
          >
            {/* Duplicate entries for seamless loop */}
            {[...tickerEntries, ...tickerEntries].map((entry, i) => {
              const agentColor = AGENT_COLORS[entry.agentId] ?? '#aaaaaa';
              const typeColor  = TYPE_COLORS[entry.type]     ?? '#cccccc';
              const typeIcon   = TYPE_ICONS[entry.type]      ?? '·';
              return (
                <span key={`${entry.id}-${i}`} className="ticker-entry">
                  <span className="ticker-entry-time">{entry.time}</span>
                  <span className="ticker-entry-agent" style={{ color: agentColor }}>
                    [{entry.agentId.toUpperCase()}]
                  </span>
                  <span className="ticker-entry-icon" style={{ color: typeColor }}>
                    {typeIcon}
                  </span>
                  <span className="ticker-entry-msg" style={{ color: typeColor }}>
                    {entry.msg}
                  </span>
                  <span className="ticker-entry-sep" aria-hidden="true">◆</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Right controls */}
        <div className="ticker-controls">
          <span className="ticker-count">{entries.length} entries</span>
          <button
            className={`ticker-expand-btn${expanded ? ' ticker-expand-btn--active' : ''}`}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse log' : 'Expand chronicle log'}
            aria-label="Toggle activity log"
          >
            {expanded ? '▼ CLOSE' : '▲ LOG'}
          </button>
        </div>
      </div>

      {/* ── Expanded vertical log panel ── */}
      {expanded && (
        <div className="ticker-expanded-panel">
          <div className="ticker-expanded-header">
            <span className="ticker-expanded-title">⚔ DUNGEON CHRONICLE — ALL ACTIVITY</span>
            <span className="ticker-expanded-count">{entries.length} entries</span>
          </div>
          <div className="ticker-expanded-list" ref={expandedListRef}>
            {entries.slice().reverse().map(entry => {
              const agentColor = AGENT_COLORS[entry.agentId] ?? '#aaaaaa';
              const typeColor  = TYPE_COLORS[entry.type]     ?? '#cccccc';
              const typeIcon   = TYPE_ICONS[entry.type]      ?? '·';
              return (
                <div key={entry.id} className={`ticker-log-row ticker-log-row--${entry.type}`}>
                  <span className="ticker-log-time">{entry.time}</span>
                  <span className="ticker-log-agent" style={{ color: agentColor }}>
                    [{entry.agentId.toUpperCase()}]
                  </span>
                  <span className="ticker-log-icon" style={{ color: typeColor }}>
                    {typeIcon}
                  </span>
                  <span className="ticker-log-msg" style={{ color: typeColor }}>
                    {entry.msg}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
