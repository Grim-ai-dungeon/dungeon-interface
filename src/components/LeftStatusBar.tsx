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

export function LeftStatusBar({ agents, selectedId, onSelectAgent, gatewayStatus, onGatewayConfigOpen, agentStatuses, treasury }: Props) {
  const gwConnected = gatewayStatus === 'connected';
  const gwDot = gwConnected ? '🟢' :
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
        {agents.map(agent => {
          const runStatus = agentStatuses?.[agent.id];
          const dotClass = statusDotClass(agent.status, runStatus, gwConnected);
          const label = statusLabel(agent.status, runStatus, gwConnected);
          return (
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
              {/* Stuart: show live treasury cost instead of generic task */}
              {agent.id === 'stuart' && gwConnected && treasury ? (
                <div className="lsb-treasury-cost">
                  💰 {treasury.totalCostUsd > 0
                    ? `$${treasury.totalCostUsd.toFixed(4)}`
                    : 'fetching…'}
                </div>
              ) : (
                agent.currentTask && (
                  <div className="lsb-task">{agent.currentTask}</div>
                )
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
