// ─── LeftStatusBar.tsx — Compact agent status sidebar ────────────────────────

import React, { useEffect, useRef } from 'react';
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
  /** IDs of all currently open windows (for multi-selection highlight) */
  openWindowIds?: AgentId[];
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

// ─── ActivityBar — animated progress strip for active agents ────────────────

function ActivityBar({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let cancelled = false;
    function draw() {
      if (cancelled || !ctx || !canvas) return;
      offsetRef.current = (offsetRef.current + 0.8) % (canvas.width * 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base fill
      ctx.fillStyle = 'rgba(0,255,136,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Moving bright pulse
      const grad = ctx.createLinearGradient(offsetRef.current - canvas.width, 0, offsetRef.current, 0);
      grad.addColorStop(0, 'rgba(0,255,136,0)');
      grad.addColorStop(0.45, 'rgba(0,255,136,0)');
      grad.addColorStop(0.6, 'rgba(0,255,136,0.55)');
      grad.addColorStop(0.75, 'rgba(180,255,220,0.85)');
      grad.addColorStop(0.85, 'rgba(0,255,136,0.55)');
      grad.addColorStop(1, 'rgba(0,255,136,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="lsb-activity-bar"
      width={190}
      height={3}
    />
  );
}

export function LeftStatusBar({ agents, selectedId, openWindowIds, onSelectAgent, gatewayStatus, onGatewayConfigOpen, agentStatuses, treasury }: Props) {
  const gwConnected = gatewayStatus === 'connected';
  const gwDot = gwConnected ? '🟢' :
                gatewayStatus === 'connecting' ? '🟡' :
                gatewayStatus === 'error' ? '🔴' : '⚫';
  // An agent card is "selected" if it's either the topmost active window OR any open window
  const isWindowOpen = (id: AgentId) => openWindowIds ? openWindowIds.includes(id) : selectedId === id;

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
          const isActive = gwConnected ? runStatus === 'running' : agent.status === 'active';
          const isError = gwConnected ? runStatus === 'error' : agent.status === 'error';
          const agentColor = AGENT_COLORS[agent.id] ?? '#ffa700';

          // Truncate currentTask for card preview
          const taskPreview = agent.currentTask
            ? (agent.currentTask.length > 28 ? agent.currentTask.slice(0, 28) + '…' : agent.currentTask)
            : null;

          // For Stuart: show cost if connected
          const stuartCost = agent.id === 'stuart' && gwConnected && treasury
            ? `$${treasury.totalCostUsd.toFixed(4)}`
            : null;

          return (
            <button
              key={agent.id}
              className={[
                'lsb-card',
                isWindowOpen(agent.id) ? 'lsb-card--selected' : '',
                isActive ? 'lsb-card--active' : '',
                isError ? 'lsb-card--error' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectAgent(agent.id)}
              title={`${agent.name} — ${agent.currentTask ?? label}`}
              style={{
                '--agent-color': agentColor,
              } as React.CSSProperties}
            >
              {/* Keyboard shortcut badge */}
              {roomNum && <span className="lsb-room-badge">{roomNum}</span>}

              {/* Top row: emoji + name + dot */}
              <div className="lsb-card-top">
                <span className="lsb-emoji">{agent.emoji}</span>
                <div className="lsb-name-col">
                  <div className="lsb-name-row">
                    <span className="lsb-name">{agent.name.toUpperCase()}</span>
                    <span className={dotClass} />
                  </div>
                  <div className="lsb-role">{agent.role}</div>
                </div>
              </div>

              {/* Current task preview */}
              {taskPreview && (
                <div className="lsb-task-preview">
                  <span className="lsb-task-arrow">▸</span>
                  <span className="lsb-task-text">{taskPreview}</span>
                </div>
              )}

              {/* Stuart special: treasury cost */}
              {stuartCost && (
                <div className="lsb-cost-chip">
                  <span className="lsb-cost-icon">🪙</span>
                  <span className="lsb-cost-val">{stuartCost}</span>
                </div>
              )}

              {/* Model tag */}
              {agent.model && (
                <div className="lsb-model">{agent.model.replace(/^.*\//, '')}</div>
              )}

              {/* Status label + activity bar */}
              <div className="lsb-footer-row">
                <div className="lsb-status-label" data-status={runStatus ?? agent.status}>
                  {label}
                </div>
                {isActive && <ActivityBar active={isActive} />}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
