// ─── DungeonHUD.tsx — Top bar stats ──────────────────────────────────────────

import { useState, useEffect } from 'react';
import type { AgentInfo } from '../types';

interface Props {
  agents: AgentInfo[];
  ocStatus: 'checking' | 'online' | 'offline';
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

export function DungeonHUD({ agents, ocStatus }: Props) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const errorCount = agents.filter(a => a.status === 'error').length;
  const ocColor = ocStatus === 'online' ? '#44ff88' : ocStatus === 'offline' ? '#CC3333' : '#FF9933';

  return (
    <header className="dungeon-hud">
      {/* Left: Title */}
      <div className="hud-left">
        <span className="hud-dragon">🐉</span>
        <div className="hud-title-block">
          <div className="hud-title">THE OVERLORD'S DUNGEON</div>
          <div className="hud-sub">GRIM — DUNGEON MASTER COMMAND v2</div>
        </div>
      </div>

      {/* Center: Stats */}
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-stat-val">{agents.length}</span>
          <span className="hud-stat-label">AGENTS</span>
        </div>
        <div className="hud-stat-sep">|</div>
        <div className="hud-stat">
          <span className="hud-stat-val" style={{ color: activeCount > 0 ? '#44ff88' : '#888' }}>
            {activeCount}
          </span>
          <span className="hud-stat-label">ACTIVE</span>
        </div>
        <div className="hud-stat-sep">|</div>
        <div className="hud-stat">
          <span className="hud-stat-val" style={{ color: errorCount > 0 ? '#CC3333' : '#888' }}>
            {errorCount}
          </span>
          <span className="hud-stat-label">ERRORS</span>
        </div>
      </div>

      {/* Right: Connection + Clock */}
      <div className="hud-right">
        <div className="hud-oc-status" style={{ borderColor: ocColor + '44' }}>
          <span className="hud-status-dot" style={{ background: ocColor, boxShadow: `0 0 6px ${ocColor}` }} />
          <span style={{ color: ocColor, fontSize: 9 }}>OPENCLAW {ocStatus.toUpperCase()}</span>
        </div>
        <div className="hud-clock"><LiveClock /></div>
      </div>

      {/* Bottom glow line */}
      <div className="hud-glow-line" />
    </header>
  );
}
