// ─── LeftStatusBar.tsx — Compact agent status sidebar ────────────────────────

import type { AgentId, AgentInfo } from '../types';
import './LeftStatusBar.css';

interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onSelectAgent: (id: AgentId) => void;
}

function statusDotClass(status: AgentInfo['status']): string {
  switch (status) {
    case 'active': return 'lsb-dot lsb-dot--active';
    case 'error':  return 'lsb-dot lsb-dot--error';
    default:       return 'lsb-dot lsb-dot--idle';
  }
}

function statusLabel(status: AgentInfo['status']): string {
  switch (status) {
    case 'active': return 'ACTIVE';
    case 'error':  return 'ERROR';
    default:       return 'IDLE';
  }
}

export function LeftStatusBar({ agents, selectedId, onSelectAgent }: Props) {
  return (
    <aside className="lsb-root">
      <div className="lsb-header">
        <span className="lsb-header-icon">⚔</span>
        <span className="lsb-header-text">MINIONS</span>
      </div>
      <div className="lsb-list">
        {agents.map(agent => (
          <button
            key={agent.id}
            className={`lsb-card${selectedId === agent.id ? ' lsb-card--selected' : ''}`}
            onClick={() => onSelectAgent(agent.id)}
            title={`${agent.name} — ${agent.currentTask ?? 'Idle'}`}
          >
            <div className="lsb-card-top">
              <span className="lsb-emoji">{agent.emoji}</span>
              <div className="lsb-name-row">
                <span className="lsb-name">{agent.name.toUpperCase()}</span>
                <span className={statusDotClass(agent.status)} />
              </div>
            </div>
            <div className="lsb-role">{agent.role}</div>
            <div className="lsb-status-label" data-status={agent.status}>
              {statusLabel(agent.status)}
            </div>
            {agent.currentTask && (
              <div className="lsb-task">{agent.currentTask}</div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
