// ─── LeftStatusBar.tsx — Compact agent status sidebar ────────────────────────

import React from 'react';
import type { AgentId, AgentInfo } from '../types';
import './LeftStatusBar.css';

// Room accent colors mirroring the dungeon map palette
const AGENT_COLORS: Record<AgentId, string> = {
  grim:   '#FFA700',
  bob:    '#6699CC',
  kevin:  '#FF5522',
  stuart: '#FFD700',
  agnes:  '#FF66AA',
};

interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onSelectAgent: (id: AgentId) => void;
  /** Gateway connection status for the sidebar indicator */
  gatewayStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
  onGatewayConfigOpen?: () => void;
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

export function LeftStatusBar({ agents, selectedId, onSelectAgent, gatewayStatus, onGatewayConfigOpen }: Props) {
  const gwDot = gatewayStatus === 'connected' ? '🟢' :
                gatewayStatus === 'connecting' ? '🟡' :
                gatewayStatus === 'error' ? '🔴' : '⚫';

  return (
    <aside className="lsb-root">
      <div className="lsb-header">
        <span className="lsb-header-icon">⚔</span>
        <span className="lsb-header-text">AGENTS</span>
        <button
          className="lsb-gateway-btn"
          onClick={onGatewayConfigOpen}
          title={`Gateway: ${gatewayStatus ?? 'disconnected'}`}
        >
          <span className="lsb-gateway-dot">{gwDot}</span>
          <span className="lsb-gateway-gear">⚙</span>
        </button>
      </div>
      <div className="lsb-list">
        {agents.map(agent => (
          <button
            key={agent.id}
            className={`lsb-card${selectedId === agent.id ? ' lsb-card--selected' : ''}`}
            onClick={() => onSelectAgent(agent.id)}
            title={`${agent.name} — ${agent.currentTask ?? 'Idle'}`}
            style={selectedId === agent.id ? {
              '--agent-color': AGENT_COLORS[agent.id],
              borderColor: AGENT_COLORS[agent.id],
              boxShadow: `0 0 8px ${AGENT_COLORS[agent.id]}44, inset 0 0 12px ${AGENT_COLORS[agent.id]}10`,
            } as React.CSSProperties : undefined}
          >
            <div className="lsb-card-top">
              <span className="lsb-emoji">{agent.emoji}</span>
              <div className="lsb-name-row">
                <span className="lsb-name">{agent.name.toUpperCase()}</span>
                <span className={statusDotClass(agent.status)} />
              </div>
            </div>
            <div className="lsb-role">{agent.role}</div>
            {agent.model && (
              <div className="lsb-model">{agent.model.replace(/^.*\//,'')}</div>
            )}
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
