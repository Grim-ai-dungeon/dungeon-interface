// ─── RoomPanel.tsx — Floating draggable room panel ────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentInfo, ActivityEntry } from '../types';
import type { GatewayMessage } from '../hooks/useGateway';
import './RoomPanel.css';

// ─── Agent color map ──────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
  agnes:  '#CC88FF',
};

// ─── Default tasks per agent ──────────────────────────────────────────────────

const DEFAULT_TASKS: Record<string, { text: string; priority: 'high' | 'med' | 'low' }[]> = {
  grim: [
    { text: 'Review daily minion performance reports', priority: 'high' },
    { text: 'Update dungeon threat assessment', priority: 'med' },
    { text: 'Plan next dungeon expansion phase', priority: 'low' },
  ],
  bob: [
    { text: 'Index new intelligence sources', priority: 'high' },
    { text: 'Compile weekly research summary', priority: 'med' },
    { text: 'Organize archive cross-references', priority: 'low' },
  ],
  kevin: [
    { text: 'Fix rendering pipeline bottleneck', priority: 'high' },
    { text: 'Implement new particle system tweaks', priority: 'med' },
    { text: 'Clean up deprecated build scripts', priority: 'low' },
  ],
  stuart: [
    { text: 'Reconcile monthly gold ledger', priority: 'high' },
    { text: 'Review API cost anomalies', priority: 'med' },
    { text: 'Project next cycle budget forecast', priority: 'low' },
  ],
  agnes: [
    { text: 'Finish dungeon backdrop layer 4', priority: 'high' },
    { text: 'Refine minion sprite idle animation', priority: 'med' },
    { text: 'Export new icon pack for Grim review', priority: 'low' },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string | number;
  sender: 'user' | 'agent' | 'system';
  text: string;
  streaming?: boolean;
}

interface ActivityEntryState extends ActivityEntry {
  vote?: 'approved' | 'disapproved';
}

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: 'high' | 'med' | 'low';
}

interface Props {
  agent: AgentInfo;
  onClose: () => void;
  /** Gateway integration props */
  gatewaySendMessage?: (agentId: string, text: string) => Promise<void>;
  gatewayGetHistory?: (agentId: string) => Promise<void>;
  gatewayMessages?: GatewayMessage[];
  gatewayConnected?: boolean;
  gatewayGenerating?: boolean;
  onOpenGatewayConfig?: () => void;
}

type TabId = 'chat' | 'activity' | 'tasks';

let taskCounter = 2000;

// ─── RoomPanel ────────────────────────────────────────────────────────────────

export function RoomPanel({
  agent,
  onClose,
  gatewaySendMessage,
  gatewayGetHistory,
  gatewayMessages,
  gatewayConnected = false,
  gatewayGenerating = false,
  onOpenGatewayConfig,
}: Props) {
  const color = AGENT_COLORS[agent.id] ?? '#FF9933';
  const glow = color + '26'; // ~15% alpha for box-shadow

  // ── Drag state ──────────────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origLeft: number; origTop: number }>({
    dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0,
  });
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Initialise position to screen center on first render
  useEffect(() => {
    const el = panelRef.current;
    if (!el || position) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: (window.innerWidth - rect.width) / 2,
      top:  (window.innerHeight - rect.height) / 2,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop:  rect.top,
    };

    const onMove = (me: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const dx = me.clientX - dragState.current.startX;
      const dy = me.clientY - dragState.current.startY;
      setPosition({
        left: dragState.current.origLeft + dx,
        top:  dragState.current.origTop  + dy,
      });
    };

    const onUp = () => {
      dragState.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Convert gateway messages to local ChatMessage format
  const messages: ChatMessage[] = (gatewayMessages ?? []).map(m => ({
    id: m.id,
    sender: m.role === 'user' ? 'user' : m.role === 'agent' ? 'agent' : 'system',
    text: m.text,
    streaming: m.streaming,
  }));

  const scrollChatToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages.length, scrollChatToBottom]);

  // Load history when the chat tab becomes active and we're connected
  useEffect(() => {
    if (activeTab === 'chat' && gatewayConnected && gatewayGetHistory) {
      gatewayGetHistory(agent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gatewayConnected]);

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');

    if (gatewaySendMessage && gatewayConnected) {
      await gatewaySendMessage(agent.id, text);
    } else {
      // Fallback: show disconnected notice
    }
  }, [chatInput, agent.id, gatewaySendMessage, gatewayConnected]);

  const handleChatKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { void handleChatSend(); }
    if (e.key === 'Escape') onClose();
  }, [handleChatSend, onClose]);

  // ── Activity state ─────────────────────────────────────────────────────────
  const [activityEntries, setActivityEntries] = useState<ActivityEntryState[]>(() =>
    [...agent.activityLog].reverse()
  );

  // Keep activity updated when agent.activityLog changes
  useEffect(() => {
    setActivityEntries(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const newEntries = agent.activityLog
        .filter(e => !existingIds.has(e.id))
        .map(e => ({ ...e, vote: undefined as undefined }));
      if (newEntries.length === 0) return prev;
      return [...newEntries.reverse(), ...prev];
    });
  }, [agent.activityLog]);

  const handleVote = useCallback((entryId: number, vote: 'approved' | 'disapproved') => {
    setActivityEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      return { ...e, vote: e.vote === vote ? undefined : vote };
    }));
  }, []);

  // ── Task state ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>(() =>
    (DEFAULT_TASKS[agent.id] ?? []).map(t => ({
      id: ++taskCounter,
      text: t.text,
      done: false,
      priority: t.priority,
    }))
  );
  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'med' | 'low'>('med');

  const handleTaskAdd = useCallback(() => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks(prev => [...prev, { id: ++taskCounter, text, done: false, priority: taskPriority }]);
    setTaskInput('');
  }, [taskInput, taskPriority]);

  const handleTaskKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTaskAdd();
  }, [handleTaskAdd]);

  const handleTaskToggle = useCallback((id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const handleTaskDelete = useCallback((id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Panel style ────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    ['--rp-color' as string]: color,
    ['--rp-glow' as string]: glow,
  };

  if (position) {
    panelStyle.left = position.left;
    panelStyle.top  = position.top;
    panelStyle.transform = 'none';
  }

  const statusDotClass =
    agent.status === 'active' ? '' :
    agent.status === 'error'  ? 'rp-status-dot--error' :
    'rp-status-dot--idle';

  return (
    <div
      ref={panelRef}
      className="room-panel"
      style={panelStyle}
    >
      {/* ── Title bar ── */}
      <div className="rp-titlebar" onMouseDown={handleTitleMouseDown}>
        <div className="rp-titlebar-left">
          <span className="rp-emoji" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
            {agent.emoji}
          </span>
          <span className="rp-title">{agent.name}'s {agent.role}</span>
        </div>
        <div className="rp-titlebar-right">
          <span className={`rp-status-dot ${statusDotClass}`} title={agent.status} />
          <button className="rp-close-btn" onClick={onClose} title="Close panel">✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="rp-body">
        {/* Left vertical tabs */}
        <div className="rp-tabs">
          {([
            { id: 'chat',     icon: '💬', label: 'Chat' },
            { id: 'activity', icon: '📋', label: 'Log' },
            { id: 'tasks',    icon: '📝', label: 'Tasks' },
          ] as { id: TabId; icon: string; label: string }[]).map(tab => (
            <button
              key={tab.id}
              className={`rp-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="rp-tab-icon">{tab.icon}</span>
              <span className="rp-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rp-content">
          {activeTab === 'chat' && (
            <ChatTab
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSend={() => { void handleChatSend(); }}
              onKeyDown={handleChatKey}
              chatInputRef={chatInputRef}
              chatEndRef={chatEndRef}
              agentName={agent.name}
              connected={gatewayConnected}
              generating={gatewayGenerating}
              onOpenConfig={onOpenGatewayConfig}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              entries={activityEntries}
              onVote={handleVote}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              taskInput={taskInput}
              setTaskInput={setTaskInput}
              taskPriority={taskPriority}
              setTaskPriority={setTaskPriority}
              onAdd={handleTaskAdd}
              onToggle={handleTaskToggle}
              onDelete={handleTaskDelete}
              onKeyDown={handleTaskKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ChatTab ──────────────────────────────────────────────────────────────────

interface ChatTabProps {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  chatInputRef: React.RefObject<HTMLInputElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  agentName: string;
  connected: boolean;
  generating?: boolean;
  onOpenConfig?: () => void;
}

function ChatTab({
  messages, chatInput, setChatInput, onSend, onKeyDown, chatInputRef, chatEndRef, agentName,
  connected, generating, onOpenConfig,
}: ChatTabProps) {
  return (
    <div className="rp-chat">
      {/* Not-connected banner */}
      {!connected && (
        <div className="rp-chat-disconnected">
          <span>⚡ Gateway not connected</span>
          {onOpenConfig && (
            <button className="rp-chat-connect-btn" onClick={onOpenConfig}>
              Configure
            </button>
          )}
        </div>
      )}
      <div className="rp-chat-messages">
        {messages.length === 0 ? (
          <div className="rp-chat-empty">
            {connected ? 'Speak, and the agent shall respond…' : 'Connect to the gateway to start chatting.'}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`rp-msg rp-msg--${msg.sender}`}>
              <span className="rp-msg-sender">
                {msg.sender === 'user' ? 'You' : msg.sender === 'agent' ? agentName : '⚙'}
              </span>
              <span className={`rp-msg-text${msg.streaming ? ' rp-msg-text--streaming' : ''}`}>
                {msg.text}
                {msg.streaming && <span className="rp-msg-cursor">▌</span>}
              </span>
            </div>
          ))
        )}
        {generating && !messages.some(m => m.streaming) && (
          <div className="rp-msg rp-msg--agent">
            <span className="rp-msg-sender">{agentName}</span>
            <span className="rp-msg-text rp-msg-text--thinking">Thinking<span className="rp-msg-cursor">▌</span></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="rp-chat-input-row">
        <input
          ref={chatInputRef}
          type="text"
          className="rp-chat-input"
          placeholder={connected ? 'Send a command…' : 'Gateway not connected'}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!connected}
          autoFocus
        />
        <button
          className="rp-chat-send-btn"
          onClick={onSend}
          disabled={!chatInput.trim() || !connected || generating}
        >
          {generating ? '…' : '▶'}
        </button>
      </div>
    </div>
  );
}

// ─── ActivityTab ──────────────────────────────────────────────────────────────

interface ActivityTabProps {
  entries: ActivityEntryState[];
  onVote: (id: number, vote: 'approved' | 'disapproved') => void;
}

function ActivityTab({ entries, onVote }: ActivityTabProps) {
  return (
    <div className="rp-activity">
      <div className="rp-activity-list">
        {entries.length === 0 ? (
          <div className="rp-activity-empty">No activity logged yet.</div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className={[
                'rp-activity-entry',
                `rp-act-${entry.type}`,
                entry.vote === 'approved'    ? 'rp-activity-entry--approved'    : '',
                entry.vote === 'disapproved' ? 'rp-activity-entry--disapproved' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className={`rp-act-meta rp-act-type-${entry.type}`}>
                <span className="rp-act-time">{entry.time}</span>
                <span className="rp-act-msg">{entry.msg}</span>
              </div>
              <div className="rp-act-actions">
                <button
                  className={`rp-act-vote-btn rp-act-vote-btn--approve${entry.vote === 'approved' ? ' rp-act-vote-btn--active' : ''}`}
                  onClick={() => onVote(entry.id, 'approved')}
                  title="Approve"
                >
                  ✅
                </button>
                <button
                  className={`rp-act-vote-btn rp-act-vote-btn--disapprove${entry.vote === 'disapproved' ? ' rp-act-vote-btn--active' : ''}`}
                  onClick={() => onVote(entry.id, 'disapproved')}
                  title="Disapprove"
                >
                  ❌
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── TasksTab ─────────────────────────────────────────────────────────────────

interface TasksTabProps {
  tasks: Task[];
  taskInput: string;
  setTaskInput: (v: string) => void;
  taskPriority: 'high' | 'med' | 'low';
  setTaskPriority: (v: 'high' | 'med' | 'low') => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function TasksTab({
  tasks, taskInput, setTaskInput, taskPriority, setTaskPriority,
  onAdd, onToggle, onDelete, onKeyDown,
}: TasksTabProps) {
  return (
    <div className="rp-tasks">
      <div className="rp-task-list">
        {tasks.length === 0 ? (
          <div className="rp-task-empty">No tasks assigned — add one below.</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="rp-task-item">
              <input
                type="checkbox"
                className="rp-task-checkbox"
                checked={task.done}
                onChange={() => onToggle(task.id)}
              />
              <span className={`rp-task-text${task.done ? ' rp-task-text--done' : ''}`}>
                {task.text}
              </span>
              <span className={`rp-task-priority rp-task-priority--${task.priority}`}>
                {task.priority}
              </span>
              <button
                className="rp-task-delete-btn"
                onClick={() => onDelete(task.id)}
                title="Remove task"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <div className="rp-task-add-row">
        <input
          type="text"
          className="rp-task-input"
          placeholder="New task…"
          value={taskInput}
          onChange={e => setTaskInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <select
          className="rp-task-priority-select"
          value={taskPriority}
          onChange={e => setTaskPriority(e.target.value as 'high' | 'med' | 'low')}
        >
          <option value="high">High</option>
          <option value="med">Med</option>
          <option value="low">Low</option>
        </select>
        <button
          className="rp-task-add-btn"
          onClick={onAdd}
          disabled={!taskInput.trim()}
        >
          +
        </button>
      </div>
    </div>
  );
}
