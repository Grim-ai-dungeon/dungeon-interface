// ─── RoomPanel.tsx — Floating draggable room panel ────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { AgentInfo, ActivityEntry } from '../types';
import type { GatewayMessage, TreasuryData } from '../hooks/useGateway';
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
  dueDate?: string; // ISO date string YYYY-MM-DD
}

interface Props {
  agent: AgentInfo;
  onClose: () => void;
  onBringToFront?: () => void;
  zIndex?: number;
  /** Stagger offset for initial position (0-based index of open order) */
  stackOffset?: number;
  /** Whether this is the frontmost window */
  isTopmost?: boolean;
  /** Gateway integration props */
  gatewaySendMessage?: (agentId: string, text: string) => Promise<void>;
  gatewayGetHistory?: (agentId: string) => Promise<void>;
  gatewayMessages?: GatewayMessage[];
  gatewayConnected?: boolean;
  gatewayGenerating?: boolean;
  onOpenGatewayConfig?: () => void;
  /** Treasury data (Stuart only) */
  treasury?: TreasuryData | null;
  onFetchTreasury?: () => Promise<void>;
  /** Custom agent management */
  onDeleteAgent?: (agentId: string) => void;
  isCustomAgent?: boolean;
}

type TabId = 'chat' | 'activity' | 'tasks' | 'treasury';

let taskCounter = 2000;

// ─── RoomPanel ────────────────────────────────────────────────────────────────

export function RoomPanel({
  agent,
  onClose,
  onBringToFront,
  zIndex = 500,
  stackOffset = 0,
  isTopmost = true,
  gatewaySendMessage,
  gatewayGetHistory,
  gatewayMessages,
  gatewayConnected = false,
  gatewayGenerating = false,
  onOpenGatewayConfig,
  treasury,
  onFetchTreasury,
  onDeleteAgent,
  isCustomAgent = false,
}: Props) {
  const color = AGENT_COLORS[agent.id] ?? '#FF9933';
  const glow = color + '26'; // ~15% alpha for box-shadow

  // ── Drag state ──────────────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origLeft: number; origTop: number }>({
    dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0,
  });
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Initialise position to screen center on first render (staggered by stackOffset)
  useEffect(() => {
    const el = panelRef.current;
    if (!el || position) return;
    const rect = el.getBoundingClientRect();
    const stagger = stackOffset * 28; // shift each subsequent window 28px
    setPosition({
      left: (window.innerWidth - rect.width) / 2 + stagger,
      top:  (window.innerHeight - rect.height) / 2 + stagger,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Stop propagation so the PixiJS canvas mousedown handler doesn't also fire
    // (which would cause the map to start panning while dragging the panel)
    e.stopPropagation();
    if (onBringToFront) onBringToFront();
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
  // For Stuart, default to treasury tab; all others default to chat
  const [activeTab, setActiveTab] = useState<TabId>(agent.id === 'stuart' ? 'treasury' : 'chat');

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
  // We maintain a local vote overlay on top of history-derived entries
  const [activityVotes, setActivityVotes] = useState<Record<number, 'approved' | 'disapproved' | undefined>>({});

  // Convert gateway messages to activity entries (live)
  const gatewayActivityEntries: ActivityEntryState[] = useMemo(() => {
    const msgs = gatewayMessages ?? [];
    return msgs.map((m, idx): ActivityEntryState => {
      // Determine type from role
      const type: ActivityEntry['type'] =
        m.role === 'user'   ? 'info' :
        m.role === 'agent'  ? 'success' :
        'error';
      // Map streaming/tool-call markers
      const msgType: ActivityEntry['type'] =
        m.text.startsWith('Failed to send:') ? 'error' :
        m.role === 'user' ? 'info' :
        type;
      const fakeId = -1000 - idx; // negative IDs to distinguish from local entries
      const ts = new Date(m.timestamp);
      const time = `${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;
      const prefix =
        m.role === 'user'  ? '▶ You: ' :
        m.role === 'agent' ? '🤖 ' :
        '⚙ ';
      return {
        id: fakeId,
        time,
        agentId: agent.id,
        msg: prefix + (m.text.length > 120 ? m.text.slice(0, 120) + '…' : m.text),
        type: msgType,
        vote: activityVotes[fakeId],
      };
    }).reverse();
  }, [gatewayMessages, agent.id, activityVotes]);

  // Fall back to local activityLog entries if no gateway history
  const [localActivityEntries, setLocalActivityEntries] = useState<ActivityEntryState[]>(() =>
    [...agent.activityLog].reverse()
  );

  // Keep local activity updated when agent.activityLog changes
  useEffect(() => {
    setLocalActivityEntries(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const newEntries = agent.activityLog
        .filter(e => !existingIds.has(e.id))
        .map(e => ({ ...e, vote: undefined as undefined }));
      if (newEntries.length === 0) return prev;
      return [...newEntries.reverse(), ...prev];
    });
  }, [agent.activityLog]);

  // If gateway is connected and has messages, show gateway history; else local
  const activityEntries = (gatewayConnected && gatewayMessages && gatewayMessages.length > 0)
    ? gatewayActivityEntries
    : localActivityEntries.map(e => ({ ...e, vote: activityVotes[e.id] ?? e.vote }));

  // Load history when activity tab becomes active and gateway is connected
  useEffect(() => {
    if (activeTab === 'activity' && gatewayConnected && gatewayGetHistory) {
      void gatewayGetHistory(agent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gatewayConnected]);

  const handleVote = useCallback((entryId: number, vote: 'approved' | 'disapproved') => {
    setActivityVotes(prev => ({
      ...prev,
      [entryId]: prev[entryId] === vote ? undefined : vote,
    }));
  }, []);

  // ── Task state ─────────────────────────────────────────────────────────────
  const taskStorageKey = `dungeon-tasks-${agent.id}`;

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(`dungeon-tasks-${agent.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return (DEFAULT_TASKS[agent.id] ?? []).map(t => ({
      id: ++taskCounter,
      text: t.text,
      done: false,
      priority: t.priority,
      dueDate: undefined,
    }));
  });

  // Persist tasks to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
    } catch { /* ignore */ }
  }, [tasks, taskStorageKey]);

  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'med' | 'low'>('med');
  const [taskDueDate, setTaskDueDate] = useState('');

  const handleTaskAdd = useCallback(() => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks(prev => [...prev, {
      id: ++taskCounter,
      text,
      done: false,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
    }]);
    setTaskInput('');
    setTaskDueDate('');
  }, [taskInput, taskPriority, taskDueDate]);

  const handleTaskKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTaskAdd();
  }, [handleTaskAdd]);

  const handleTaskToggle = useCallback((id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const handleTaskDelete = useCallback((id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleTaskMoveUp = useCallback((id: number) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleTaskMoveDown = useCallback((id: number) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleClearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => !t.done));
  }, []);

  // ── Panel style ────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    ['--rp-color' as string]: color,
    ['--rp-glow' as string]: glow,
    zIndex,
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
      className={`room-panel${isTopmost ? ' room-panel--topmost' : ''}`}
      style={panelStyle}
      onMouseDown={() => { if (onBringToFront) onBringToFront(); }}
    >
      {/* ── Sci-fi corner brackets (TR and BL; TL and BR handled by ::before/::after) ── */}
      <span className="rp-corner rp-corner--tr" aria-hidden="true" />
      <span className="rp-corner rp-corner--bl" aria-hidden="true" />

      {/* ── Title bar ── */}
      <div className="rp-titlebar" onMouseDown={handleTitleMouseDown}>
        <div className="rp-titlebar-left">
          <span className="rp-emoji" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
            {agent.emoji}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="rp-title">{agent.name}’s {agent.role}</span>
            <span className="rp-node-id">NODE::{agent.id.toUpperCase()}</span>
          </div>
        </div>
        <div className="rp-titlebar-right">
          <span className={`rp-status-dot ${statusDotClass}`} title={agent.status} />
          {isCustomAgent && onDeleteAgent && (
            <button
              className="rp-delete-btn"
              onClick={() => onDeleteAgent(agent.id)}
              title="Remove this minion from the dungeon"
              onMouseDown={e => e.stopPropagation()}
            >
              🗑️
            </button>
          )}
          <button className="rp-close-btn" onClick={onClose} title="Close panel">✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="rp-body">
        {/* Left vertical tabs */}
        <div className="rp-tabs">
          {([
            { id: 'chat',     icon: '💬', label: 'Chat' },
            agent.id === 'stuart'
              ? { id: 'treasury', icon: '📊', label: 'Treasury' }
              : { id: 'activity', icon: '📋', label: 'Log' },
            { id: 'tasks',    icon: '📝', label: `Tasks (${tasks.filter(t => !t.done).length})` },
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
          {activeTab === 'activity' && agent.id !== 'stuart' && (
            <ActivityTab
              entries={activityEntries}
              onVote={handleVote}
              isLive={gatewayConnected && !!gatewayMessages && gatewayMessages.length > 0}
            />
          )}
          {activeTab === 'treasury' && agent.id === 'stuart' && (
            <TreasuryTab
              treasury={treasury ?? null}
              connected={gatewayConnected}
              onFetch={onFetchTreasury}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              taskInput={taskInput}
              setTaskInput={setTaskInput}
              taskPriority={taskPriority}
              setTaskPriority={setTaskPriority}
              taskDueDate={taskDueDate}
              setTaskDueDate={setTaskDueDate}
              onAdd={handleTaskAdd}
              onToggle={handleTaskToggle}
              onDelete={handleTaskDelete}
              onMoveUp={handleTaskMoveUp}
              onMoveDown={handleTaskMoveDown}
              onClearCompleted={handleClearCompleted}
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
  isLive?: boolean;
}

function ActivityTab({ entries, onVote, isLive }: ActivityTabProps) {
  return (
    <div className="rp-activity">
      {isLive && (
        <div className="rp-activity-banner rp-activity-banner--live">
          🟢 Live session history
        </div>
      )}
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
  taskDueDate: string;
  setTaskDueDate: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onClearCompleted: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

function TasksTab({
  tasks, taskInput, setTaskInput, taskPriority, setTaskPriority,
  taskDueDate, setTaskDueDate,
  onAdd, onToggle, onDelete, onMoveUp, onMoveDown, onClearCompleted, onKeyDown,
}: TasksTabProps) {
  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const orderedTasks = [...pendingTasks, ...doneTasks];
  const hasDone = doneTasks.length > 0;

  return (
    <div className="rp-tasks">
      <div className="rp-task-list">
        {tasks.length === 0 ? (
          <div className="rp-task-empty">No tasks assigned — add one below.</div>
        ) : (
          orderedTasks.map((task, idx) => {
            const overdue = isOverdue(task.dueDate) && !task.done;
            const isPending = !task.done;
            const isFirstDone = task.done && idx > 0 && !orderedTasks[idx - 1]?.done;
            return (
              <React.Fragment key={task.id}>
                {isFirstDone && hasDone && (
                  <div className="rp-task-separator">✓ Completed</div>
                )}
                <div
                  className={[
                    'rp-task-item',
                    task.done ? 'rp-task-item--done' : '',
                    overdue ? 'rp-task-item--overdue' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <input
                    type="checkbox"
                    className="rp-task-checkbox"
                    checked={task.done}
                    onChange={() => onToggle(task.id)}
                  />
                  <div className="rp-task-info">
                    <span className={`rp-task-text${task.done ? ' rp-task-text--done' : ''}`}>
                      {task.text}
                    </span>
                    {task.dueDate && (
                      <span className={`rp-task-due${overdue ? ' rp-task-due--overdue' : ''}`}>
                        {overdue ? '⚠ ' : '📅 '}{task.dueDate}
                      </span>
                    )}
                  </div>
                  <span className={`rp-task-priority rp-task-priority--${task.priority}`}>
                    {task.priority}
                  </span>
                  {isPending && (
                    <div className="rp-task-order-btns">
                      <button
                        className="rp-task-order-btn"
                        onClick={() => onMoveUp(task.id)}
                        title="Move up"
                        disabled={pendingTasks[0]?.id === task.id}
                      >▲</button>
                      <button
                        className="rp-task-order-btn"
                        onClick={() => onMoveDown(task.id)}
                        title="Move down"
                        disabled={pendingTasks[pendingTasks.length - 1]?.id === task.id}
                      >▼</button>
                    </div>
                  )}
                  <button
                    className="rp-task-delete-btn"
                    onClick={() => onDelete(task.id)}
                    title="Remove task"
                  >
                    ×
                  </button>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
      {hasDone && (
        <div className="rp-task-clear-row">
          <button className="rp-task-clear-btn" onClick={onClearCompleted}>
            🗑 Clear completed ({doneTasks.length})
          </button>
        </div>
      )}
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
        <input
          type="date"
          className="rp-task-date-input"
          value={taskDueDate}
          onChange={e => setTaskDueDate(e.target.value)}
          title="Due date (optional)"
        />
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

// ─── TreasuryTab ─────────────────────────────────────────────────────────────────────────────

interface TreasuryTabProps {
  treasury: TreasuryData | null;
  connected: boolean;
  onFetch?: () => Promise<void>;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModelName(model: string): string {
  // Strip provider prefix (e.g. "anthropic/claude-3-5-sonnet" → "claude-3-5-sonnet")
  const parts = model.split('/');
  return parts[parts.length - 1];
}

function TreasuryTab({ treasury, connected, onFetch }: TreasuryTabProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onFetch || loading) return;
    setLoading(true);
    try {
      await onFetch();
    } finally {
      setLoading(false);
    }
  }, [onFetch, loading]);

  // Auto-fetch on mount if connected
  useEffect(() => {
    if (connected && onFetch && !treasury) {
      void handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!connected) {
    return (
      <div className="rp-treasury rp-treasury--disconnected">
        <div className="rp-treasury-icon">🔒</div>
        <div className="rp-treasury-msg">Connect to gateway to view treasury</div>
      </div>
    );
  }

  const maxCost = treasury?.byModel.length
    ? Math.max(...treasury.byModel.map(m => m.costUsd), 0.000001)
    : 1;

  const fetchedTime = treasury?.fetchedAt
    ? new Date(treasury.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="rp-treasury">
      {/* Header bar */}
      <div className="rp-treasury-header">
        <span className="rp-treasury-title">💰 ROYAL TREASURY</span>
        <button
          className={`rp-treasury-refresh${loading ? ' rp-treasury-refresh--spinning' : ''}`}
          onClick={() => { void handleRefresh(); }}
          title="Refresh treasury data"
          disabled={loading}
        >
          ↻
        </button>
      </div>

      {treasury?.error && !treasury.totalCostUsd && (
        <div className="rp-treasury-error">
          ⚠️ {treasury.error}
        </div>
      )}

      {!treasury && (
        <div className="rp-treasury-loading">
          {loading ? '🔄 Counting coins…' : 'No data yet. Hit refresh.'}
        </div>
      )}

      {treasury && (
        <>
          {/* Total spend */}
          <div className="rp-treasury-total-row">
            <div className="rp-treasury-coin-stack">
              <span className="rp-treasury-coin">🪙</span>
              <span className="rp-treasury-coin-label">TOTAL SPEND</span>
            </div>
            <div className="rp-treasury-total-cost">
              {formatCost(treasury.totalCostUsd)}
            </div>
          </div>

          {/* Token totals */}
          <div className="rp-treasury-tokens-row">
            <div className="rp-treasury-token-stat">
              <span className="rp-treasury-token-icon">↗️</span>
              <span className="rp-treasury-token-label">IN</span>
              <span className="rp-treasury-token-val">{formatTokens(treasury.totalInputTokens)}</span>
            </div>
            <div className="rp-treasury-token-divider" />
            <div className="rp-treasury-token-stat">
              <span className="rp-treasury-token-icon">↘️</span>
              <span className="rp-treasury-token-label">OUT</span>
              <span className="rp-treasury-token-val">{formatTokens(treasury.totalOutputTokens)}</span>
            </div>
            <div className="rp-treasury-token-divider" />
            <div className="rp-treasury-token-stat">
              <span className="rp-treasury-token-icon">∑</span>
              <span className="rp-treasury-token-label">TOTAL</span>
              <span className="rp-treasury-token-val">{formatTokens(treasury.totalInputTokens + treasury.totalOutputTokens)}</span>
            </div>
          </div>

          {/* Model breakdown */}
          {treasury.byModel.length > 0 && (
            <div className="rp-treasury-breakdown">
              <div className="rp-treasury-breakdown-title">⚔️ EXPENDITURE BY MODEL</div>
              <div className="rp-treasury-model-list">
                {treasury.byModel
                  .slice()
                  .sort((a, b) => b.costUsd - a.costUsd)
                  .map((m, i) => {
                    const barPct = maxCost > 0 ? Math.max(2, (m.costUsd / maxCost) * 100) : 2;
                    return (
                      <div key={i} className="rp-treasury-model-entry">
                        <div className="rp-treasury-model-name" title={m.model}>
                          {shortModelName(m.model)}
                        </div>
                        <div className="rp-treasury-model-bar-wrap">
                          <div
                            className="rp-treasury-model-bar"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="rp-treasury-model-cost">
                          {formatCost(m.costUsd)}
                        </div>
                        <div className="rp-treasury-model-tokens">
                          {formatTokens(m.inputTokens + m.outputTokens)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {fetchedTime && (
            <div className="rp-treasury-footer">
              Last fetched: {fetchedTime}
            </div>
          )}
        </>
      )}
    </div>
  );
}
