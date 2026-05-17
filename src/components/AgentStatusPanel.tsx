// ─── AgentStatusPanel.tsx — Always-visible agent status grid + activity log ──
//
// Replaces the old ActivityLog-only right panel.
// Shows 4 compact agent rows (click → SidePanel), plus the scrolling log below.

import { useState, useRef, useEffect } from 'react';
import type { AgentInfo, AgentId, ActivityEntry } from '../types';

interface Props {
  agents: AgentInfo[];
  entries: ActivityEntry[];
  selectedId: AgentId | null;
  onSelectAgent: (id: AgentId) => void;
  onSendCommand: (agentId: AgentId, cmd: string) => void;
}

const AGENT_COLORS: Record<AgentId, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
  agnes:  '#FF66AA',
};

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
};

function statusColor(status: string): string {
  if (status === 'active') return '#44ff88';
  if (status === 'error')  return '#CC3333';
  return '#888888';
}

function statusLabel(status: string): string {
  if (status === 'active') return 'ACTIVE';
  if (status === 'error')  return 'ERROR';
  return 'IDLE';
}

// ── Inline command row (shown when ⌘ is clicked on an agent row) ─────────────
interface InlineCmdProps {
  agentId: AgentId;
  color: string;
  onSend: (agentId: AgentId, cmd: string) => void;
  onClose: () => void;
}

function InlineCmd({ agentId, color, onSend, onClose }: InlineCmdProps) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const send = () => {
    if (!val.trim()) return;
    onSend(agentId, val.trim());
    setVal('');
    onClose();
  };

  const PRESETS = ['status', 'report', 'pause', 'resume'];

  return (
    <div className="asp-inline-cmd">
      <div className="asp-inline-presets">
        {PRESETS.map(p => (
          <button
            key={p}
            className="asp-preset-btn"
            style={{ borderColor: color + '44', color: color + 'cc' }}
            onClick={() => { onSend(agentId, p); onClose(); }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="asp-inline-input-row">
        <input
          ref={ref}
          type="text"
          className="asp-inline-input"
          placeholder="custom command..."
          value={val}
          style={{ borderColor: color + '44' }}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send();
            if (e.key === 'Escape') onClose();
          }}
        />
        <button
          className="asp-inline-send"
          style={{ background: color + '22', borderColor: color + '55', color }}
          onClick={send}
          disabled={!val.trim()}
        >
          ▶
        </button>
        <button className="asp-inline-cancel" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// ── Single agent row ──────────────────────────────────────────────────────────
interface AgentRowProps {
  agent: AgentInfo;
  isSelected: boolean;
  onSelect: () => void;
  onSendCommand: (agentId: AgentId, cmd: string) => void;
}

function AgentRow({ agent, isSelected, onSelect, onSendCommand }: AgentRowProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const color = AGENT_COLORS[agent.id];
  const sc = statusColor(agent.status);

  return (
    <div
      className={`asp-agent-row${isSelected ? ' asp-agent-row--selected' : ''}`}
      style={{
        borderColor: isSelected ? color + '66' : 'rgb(var(--torch-rgb) / 0.12)',
        background: isSelected ? color + '0a' : undefined,
      }}
    >
      {/* Main row — click anywhere on the body to open SidePanel */}
      <div
        className="asp-row-main"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      >
        {/* Emoji + status dot */}
        <div className="asp-row-left">
          <span
            className="asp-emoji"
            style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
          >
            {agent.emoji}
          </span>
          <span
            className="asp-status-dot"
            style={{ background: sc, boxShadow: `0 0 5px ${sc}` }}
          />
        </div>

        {/* Identity + task + model */}
        <div className="asp-row-center">
          <div className="asp-row-name" style={{ color }}>
            {agent.name.toUpperCase()}
            <span className="asp-row-status-badge" style={{ color: sc }}>
              {statusLabel(agent.status)}
            </span>
          </div>
          <div className="asp-row-task" title={agent.currentTask ?? ''}>
            {agent.currentTask ?? 'Awaiting orders...'}
          </div>
          {agent.model && (
            <div className="asp-row-model" title={`Running on ${agent.model}`}>
              {agent.model}
            </div>
          )}
        </div>

        {/* Buttons — stopPropagation so row click doesn't open SidePanel */}
        <div className="asp-row-right" onClick={e => e.stopPropagation()}>
          <button
            className="asp-cmd-btn"
            title={cmdOpen ? 'Close command bar' : 'Send command'}
            style={{ borderColor: color + '44', color: color + 'cc' }}
            onClick={() => setCmdOpen(v => !v)}
          >
            {cmdOpen ? '✕' : '⌘'}
          </button>
          <button
            className="asp-detail-btn"
            title="Open detail panel"
            style={{ borderColor: color + '44', color: color + 'cc' }}
            onClick={onSelect}
          >
            ▸
          </button>
        </div>
      </div>

      {/* Inline command bar — slides in when ⌘ is clicked */}
      {cmdOpen && (
        <InlineCmd
          agentId={agent.id}
          color={color}
          onSend={onSendCommand}
          onClose={() => setCmdOpen(false)}
        />
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function AgentStatusPanel({
  agents,
  entries,
  selectedId,
  onSelectAgent,
  onSendCommand,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <aside className="asp-panel">
      {/* ── Agent Status Grid ───────────────────────────────────────────── */}
      <div className="asp-grid-header">
        <span className="asp-grid-icon">⚔</span>
        <span className="asp-grid-title">MINION STATUS</span>
        <span className="asp-agent-count">{activeCount}/{agents.length} ACTIVE</span>
      </div>

      <div className="asp-agent-list">
        {agents.map(agent => (
          <AgentRow
            key={agent.id}
            agent={agent}
            isSelected={selectedId === agent.id}
            onSelect={() => onSelectAgent(agent.id)}
            onSendCommand={onSendCommand}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="asp-separator" />

      {/* ── Activity Log ─────────────────────────────────────────────────── */}
      <div className="asp-log-header">
        <span className="asp-log-icon">📜</span>
        <span className="asp-log-title">ACTIVITY LOG</span>
        <span className="asp-log-count">{entries.length}</span>
      </div>

      <div className="asp-log-scroll">
        {entries.map((entry) => {
          const msgColor = TYPE_COLORS[entry.type] ?? '#F5E6D3';
          const roomColor = ROOM_COLORS[entry.agentId] ?? '#aaaaaa';
          return (
            <div key={entry.id} className="asp-log-entry">
              <span className="asp-log-time">{entry.time}</span>
              <span className="asp-log-room" style={{ color: roomColor }}>
                [{entry.agentId.toUpperCase()}]
              </span>
              <span className="asp-log-msg" style={{ color: msgColor }}>
                {entry.msg}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
