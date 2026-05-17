// ─── LeftStatusBar.tsx — Compact agent status sidebar ────────────────────────

import React from 'react';
import type { AgentId, AgentInfo } from '../types';
import type { AgentRunStatus, TreasuryData } from '../hooks/useGateway';
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
  /** Real per-agent status from gateway */
  agentStatuses?: Record<string, AgentRunStatus>;
  /** Treasury data for Stuart's card cost summary */
  treasury?: TreasuryData | null;
}

function statusDotClass(agentStatus: AgentInfo['status'], runStatus?: AgentRunStatus, gatewayConnected?: boolean): string {
  // If gateway is connected, use real run status
  if (gatewayConnected) {
    if (runStatus === 'running') return 'lsb-dot lsb-dot--active';  // pulsing green
    if (runStatus === 'error')   return 'lsb-dot lsb-dot--error';
    return 'lsb-dot lsb-dot--connected'; // solid green, idle
  }
  // Fall back to local simulation status
  switch (agentStatus) {
    case 'active': return 'lsb-dot lsb-dot--active';
    case 'error':  return 'lsb-dot lsb-dot--error';
    default:       return 'lsb-dot lsb-dot--idle';
  }
}

function statusLabel(agentStatus: AgentInfo['status'], runStatus?: AgentRunStatus, gatewayConnected?: boolean): string {
  if (gatewayConnected) {
    if (runStatus === 'running') return 'RUNNING';
    if (runStatus === 'error')   return 'ERROR';
    return 'IDLE';
  }
  switch (agentStatus) {
    case 'active': return 'ACTIVE';
    case 'error':  return 'ERROR';
    default:       return 'IDLE';
  }
}

// Keyboard shortcut room numbers per agent order
const AGENT_ROOM_NUMBERS: Record<AgentId, number> = {
  grim:   1,
  bob:    2,
  kevin:  3,
  stuart: 4,
  agnes:  5,
};

export function LeftStatusBar({ agents, selectedId, onSelectAgent, gatewayStatus, onGatewayConfigOpen, agentStatuses }: Props) {
  const gwConnected = gatewayStatus === 'connected';
  const gwDot = gwConnected ? '🟢' :
                gatewayStatus === 'connecting' ? '🟡' :
                gatewayStatus === 'error' ? '🔴' : '⚫';

  // Compute stats for header row
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => {
    const rs = agentStatuses?.[a.id];
    return gwConnected ? rs === 'running' : a.status === 'active';
  }).length;
  const alertAgents = agents.filter(a => {
    const rs = agentStatuses?.[a.id];
    return gwConnected ? rs === 'error' : a.status === 'error';
  }).length;

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
      <div className="lsb-stats-row">
        <span>{totalAgents} Agents</span>
        <span className="lsb-stats-sep">|</span>
        <span className="lsb-stats-active">{activeAgents} Active</span>
        <span className="lsb-stats-sep">|</span>
        <span className={alertAgents > 0 ? 'lsb-stats-alert' : ''}>{alertAgents} Alerts</span>
      </div>
      <div className="lsb-list">
        {agents.map(agent => {
          const runStatus = agentStatuses?.[agent.id];
          const dotClass = statusDotClass(agent.status, runStatus, gwConnected);
          const label = statusLabel(agent.status, runStatus, gwConnected);
          const roomNum = AGENT_ROOM_NUMBERS[agent.id] ?? '';
          return (
            <button
              key={agent.id}
              className={`lsb-card${selectedId === agent.id ? ' lsb-card--selected' : ''}`}
              onClick={() => onSelectAgent(agent.id)}
              title={`${agent.name} — Idle`}
              style={selectedId === agent.id ? {
                '--agent-color': AGENT_COLORS[agent.id],
                borderColor: AGENT_COLORS[agent.id],
                boxShadow: `0 0 8px ${AGENT_COLORS[agent.id]}44, inset 0 0 12px ${AGENT_COLORS[agent.id]}10`,
              } as React.CSSProperties : undefined}
            >
              {roomNum && <span className="lsb-room-badge">{roomNum}</span>}
              <div className="lsb-card-top">
                <span className="lsb-emoji">{agent.emoji}</span>
                <div className="lsb-name-row">
                  <span className="lsb-name">{agent.name.toUpperCase()}</span>
                  <span className={dotClass} />
                </div>
              </div>
              <div className="lsb-role">{agent.role}</div>
              {agent.model && (
                <div className="lsb-model">{agent.model.replace(/^.*\//,'')}</div>
              )}
              <div className="lsb-status-label" data-status={runStatus ?? agent.status}>
                {label}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
