// ─── DungeonHUD.tsx — Top bar stats ──────────────────────────────────────────

import { useState, useEffect } from 'react';
import type { AgentInfo } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
  agents: AgentInfo[];
  ocStatus: 'checking' | 'online' | 'offline';
  dataGeneratedAt?: number | null;
  onScryClick?: () => void;
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

function Uptime() {
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const totalSec = Math.floor(elapsed / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return <>{str}</>;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n > 0 ? String(n) : '—';
}

function fmtSyncAge(ts: number): string {
  const diffMs = Date.now() - ts;
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function DungeonHUD({ agents, ocStatus, dataGeneratedAt, onScryClick }: Props) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const errorCount = agents.filter(a => a.status === 'error').length;
  const totalTokens = agents.reduce((sum, a) => sum + (a.totalTokens ?? 0), 0);
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
          <span className="hud-stat-label">ALERTS</span>
        </div>
        <div className="hud-stat-sep">|</div>
        <div className="hud-stat" title={totalTokens > 0 ? `${totalTokens.toLocaleString()} total tokens across all agents` : 'No token data yet'}>
          <span className="hud-stat-val" style={{ color: totalTokens > 0 ? '#FFD700' : '#555' }}>
            {fmtTokens(totalTokens)}
          </span>
          <span className="hud-stat-label">TOKENS</span>
        </div>
        <div className="hud-stat-sep">|</div>
        <div className="hud-stat">
          <span className="hud-stat-val hud-uptime"><Uptime /></span>
          <span className="hud-stat-label">UPTIME</span>
        </div>
      </div>

      {/* Right: Sync indicator + Theme picker + Scry button + Connection + Clock */}
      <div className="hud-right">
        {dataGeneratedAt && (
          <div className="hud-sync-badge" title={`Data synced from dungeon-state.json at ${new Date(dataGeneratedAt).toLocaleTimeString()}`}>
            <span className="hud-sync-dot" />
            <span className="hud-sync-label">LIVE · {fmtSyncAge(dataGeneratedAt)}</span>
          </div>
        )}
        <ThemeSwitcher />
        {onScryClick && (
          <button
            className="hud-scry-btn"
            onClick={onScryClick}
            title="Open Scrying Portal — Screen Watch"
          >
            🔮 SCRY
          </button>
        )}
        <div className="hud-oc-status" style={{ borderColor: ocColor + '44' }}>
          <span className="hud-status-dot" style={{ background: ocColor, boxShadow: `0 0 6px ${ocColor}` }} />
          <span style={{ color: ocColor, fontSize: 11, letterSpacing: '0.06em', fontWeight: 'bold' }}>OPENCLAW {ocStatus.toUpperCase()}</span>
        </div>
        <div className="hud-clock"><LiveClock /></div>
      </div>

      {/* Bottom glow line */}
      <div className="hud-glow-line" />
    </header>
  );
}
