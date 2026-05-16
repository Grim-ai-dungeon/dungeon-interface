// ─── SidePanel.tsx — Agent detail slide-out panel ────────────────────────────

import { useState, useEffect, useRef } from 'react';
import type { AgentInfo, AgentId } from '../types';

interface Props {
  agent: AgentInfo | null;
  onClose: () => void;
  onSendCommand: (agentId: AgentId, command: string) => void;
}

const AGENT_COLORS: Record<string, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
};

const AGENT_EMOJIS: Record<string, string> = {
  grim:   '🐉',
  bob:    '📚',
  kevin:  '🔧',
  stuart: '💰',
};

const AGENT_ROLES: Record<string, string> = {
  grim:   'Dungeon Master',
  bob:    'Librarian & Researcher',
  kevin:  'Workshop Foreman',
  stuart: 'Treasury Keeper',
};

function StatusBadge({ status }: { status: string }) {
  const color = status === 'active' ? '#44ff88' : status === 'error' ? '#CC3333' : '#888888';
  const label = status.toUpperCase();
  return (
    <span className="sp-status-badge" style={{ color, borderColor: color + '55', background: color + '11' }}>
      <span className="sp-status-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  );
}

export function SidePanel({ agent, onClose, onSendCommand }: Props) {
  const [inputVal, setInputVal] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Slide in/out animation
  useEffect(() => {
    if (agent) {
      setVisible(false);
      requestAnimationFrame(() => setVisible(true));
      setInputVal('');
    } else {
      setVisible(false);
    }
  }, [agent?.id]);

  const handleSend = () => {
    if (!agent || !inputVal.trim()) return;
    onSendCommand(agent.id, inputVal.trim());
    setInputVal('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
    if (e.key === 'Escape') onClose();
  };

  if (!agent && !visible) return null;

  const color = AGENT_COLORS[agent?.id ?? ''] ?? '#FF9933';
  const emoji = AGENT_EMOJIS[agent?.id ?? ''] ?? '🐉';
  const role = AGENT_ROLES[agent?.id ?? ''] ?? 'Agent';

  return (
    <div
      className={`side-panel ${visible && agent ? 'side-panel--open' : 'side-panel--closed'}`}
      style={{ borderColor: color + '55' }}
    >
      {/* Header */}
      <div className="sp-header" style={{ borderBottomColor: color + '33' }}>
        <div className="sp-agent-info">
          <span className="sp-emoji" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>{emoji}</span>
          <div>
            <div className="sp-name" style={{ color }}>{agent?.name.toUpperCase() ?? ''}</div>
            <div className="sp-role">{role}</div>
          </div>
        </div>
        <div className="sp-header-right">
          {agent && <StatusBadge status={agent.status} />}
          <button className="sp-close-btn" onClick={onClose} title="Close" style={{ color: color + 'aa' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Current Task */}
      {agent && (
        <div className="sp-section">
          <div className="sp-section-label">CURRENT TASK</div>
          <div className="sp-task-box" style={{ borderColor: color + '33' }}>
            {agent.currentTask
              ? <span style={{ color: '#F5E6D3' }}>{agent.currentTask}</span>
              : <span style={{ color: '#555' }}>No active task — awaiting orders...</span>
            }
          </div>
        </div>
      )}

      {/* Activity Log */}
      {agent && (
        <div className="sp-section sp-section--grow">
          <div className="sp-section-label">RECENT ACTIVITY</div>
          <div className="sp-activity-log">
            {agent.activityLog.length === 0 ? (
              <div className="sp-log-empty">No recent activity.</div>
            ) : (
              [...agent.activityLog].reverse().slice(0, 8).map((entry) => (
                <div key={entry.id} className={`sp-log-entry sp-log-${entry.type}`}>
                  <span className="sp-log-time">{entry.time}</span>
                  <span className="sp-log-msg">{entry.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {agent && (
        <div className="sp-section">
          <div className="sp-section-label">QUICK ACTIONS</div>
          <div className="sp-actions">
            {['Status', 'View Output', 'Assign Task'].map((label) => (
              <button
                key={label}
                className="sp-action-btn"
                style={{ borderColor: color + '44', color: color + 'cc' }}
                onClick={() => onSendCommand(agent.id, label.toLowerCase())}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Command Input */}
      {agent && (
        <div className="sp-command-area" style={{ borderTopColor: color + '33' }}>
          <div className="sp-section-label" style={{ marginBottom: 8 }}>SEND COMMAND</div>
          <div className="sp-input-row">
            <input
              ref={inputRef}
              type="text"
              className="sp-input"
              placeholder="Type a command..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ borderColor: color + '44', color: '#F5E6D3' }}
            />
            <button
              className="sp-send-btn"
              onClick={handleSend}
              disabled={!inputVal.trim()}
              style={{ background: color + '22', borderColor: color + '55', color }}
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
