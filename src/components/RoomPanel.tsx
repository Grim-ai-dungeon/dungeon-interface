// ─── RoomPanel.tsx - Floating draggable room panel ────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react';
import type { AgentInfo, ActivityEntry } from '../types';
import type { GatewayMessage, TreasuryData, ImageAttachment } from '../hooks/useGateway';
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
  /**
   * Image attachments stored separately from text.
   * NEVER merge base64 data into `text` — that would make renderMessageText
   * run regex over multi-MB strings and stack-overflow the render tree.
   */
  attachments?: { dataUrl: string; name: string; mediaType: string }[];
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

// ─── Per-agent atmospheric empty-state flavour text ────────────────────────────

const CHAT_EMPTY_FLAVOR: Record<string, { title: string; lines: string[] }> = {
  grim:   { title: '🐉 AWAITING COMMAND', lines: ['The Dungeon Master watches.', 'Speak, and your will be done.', 'Silence fills the throne room...'] },
  bob:    { title: '📚 ARCHIVES QUIET', lines: ['The library holds its breath.', 'No queries. The tomes rest undisturbed.', 'Ask and the archives shall answer.'] },
  kevin:  { title: '🔧 FORGE COLD', lines: ['Awaiting schematics.', 'The workshop idles — no orders received.', 'Ready to build when you command.'] },
  stuart: { title: '💰 TREASURY SILENT', lines: ['The coins rest in their vault.', 'No transactions pending.', 'Send instructions to the Keeper.'] },
  agnes:  { title: '🎨 CANVAS BARE', lines: ['The studio waits for a muse.', 'No creative briefs received.', 'Agnes sharpens her brushes in silence.'] },
};

const ACTIVITY_EMPTY_FLAVOR: Record<string, { title: string; lines: string[] }> = {
  grim:   { title: '🌑 LOG EMPTY', lines: ['No events recorded in this cycle.', 'The dungeon holds its breath.', 'All is quiet on the ley lines.'] },
  bob:    { title: '📖 NO ENTRIES', lines: ['The quill has not yet moved.', 'Archives show nothing logged today.', 'Awaiting research directives.'] },
  kevin:  { title: '⚙ IDLE LOG', lines: ['No builds dispatched this session.', 'The forge awaits its first order.', 'Workshop logs start when work begins.'] },
  stuart: { title: '📊 LEDGER CLEAR', lines: ['No transactions to record.', 'The books are balanced and bare.', 'Spending begins when work does.'] },
  agnes:  { title: '🖼 STUDIO BARE', lines: ['No creative work logged yet.', 'Agnes waits for a commission.', 'The canvas is clean and ready.'] },
};

const TASKS_EMPTY_FLAVOR: Record<string, { title: string; lines: string[] }> = {
  grim:   { title: '📋 TASK QUEUE EMPTY', lines: ['No orders queued. The dungeon rests.', 'Dispatch a command to begin.'] },
  bob:    { title: '📋 NO RESEARCH TASKS', lines: ['No queries in the research queue.', 'Add a task to start the hunt.'] },
  kevin:  { title: '📋 BUILD QUEUE CLEAR', lines: ['Nothing on the forge schedule.', 'Add a task to fire the workshop.'] },
  stuart: { title: '📋 ACCOUNTS CLEAR', lines: ['No financial tasks queued.', 'Add an audit item to begin.'] },
  agnes:  { title: '📋 COMMISSIONS EMPTY', lines: ['No art commissions pending.', 'Add a task to start creating.'] },
};

function getFlavorBlock(map: Record<string, { title: string; lines: string[] }>, agentId: string) {
  return map[agentId] ?? { title: '📋 EMPTY', lines: ['Nothing here yet.'] };
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
  gatewaySendMessage?: (agentId: string, text: string, images?: ImageAttachment[]) => Promise<void>;
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
  /** When set, switch to chat tab. Pass a monotonically-incrementing counter to re-trigger. */
  requestChatFocusSeq?: number;
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
  requestChatFocusSeq,
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

  // When a command is sent externally, switch to chat tab so the response is visible
  useEffect(() => {
    if (requestChatFocusSeq && requestChatFocusSeq > 0) {
      setActiveTab('chat');
    }
  }, [requestChatFocusSeq]);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Convert gateway messages to local ChatMessage format
  const messages: ChatMessage[] = (gatewayMessages ?? []).map(m => ({
    id: m.id,
    sender: m.role === 'user' ? 'user' : m.role === 'agent' ? 'agent' : 'system',
    text: m.text,
    streaming: m.streaming,
    // Carry attachments as-is — they are rendered as <img> tags, not through renderMessageText
    attachments: m.attachments,
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
    // Allow sending with images even when text is empty
    if (!text && pendingImages.length === 0) return;
    setChatInput('');
    // Snapshot and clear pending images BEFORE the async send,
    // so a re-render mid-send doesn't cause double-submission.
    const imagesToSend = pendingImages.slice();
    setPendingImages([]);

    if (gatewaySendMessage && gatewayConnected) {
      await gatewaySendMessage(agent.id, text, imagesToSend.length > 0 ? imagesToSend : undefined);
    } else {
      // Fallback: show disconnected notice
    }
  }, [chatInput, pendingImages, agent.id, gatewaySendMessage, gatewayConnected]);

  const handleChatKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { void handleChatSend(); }
    if (e.key === 'Escape') onClose();
  }, [handleChatSend, onClose]);

  // ── Image attachment handlers ─────────────────────────────────────────────

  /** Read a File and return an ImageAttachment without storing base64 in any text field */
  const readImageFile = useCallback((file: File): Promise<ImageAttachment | null> => {
    if (!file.type.startsWith('image/')) return Promise.resolve(null);
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Extract base64 payload — strip the "data:<mime>;base64," prefix
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx === -1) { resolve(null); return; }
        const base64 = dataUrl.slice(commaIdx + 1);
        resolve({
          dataUrl,   // kept for display only, never passed to renderMessageText
          mediaType: file.type,
          base64,
          name: file.name,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
    const results = await Promise.all(files.map(readImageFile));
    const valid = results.filter((r): r is ImageAttachment => r !== null);
    if (valid.length > 0) {
      setPendingImages(prev => [...prev, ...valid]);
    }
  }, [readImageFile]);

  /** Handle paste events on the chat input — intercept pasted images */
  const handleChatPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));
    if (imageItems.length === 0) return; // let normal paste proceed

    // Images were pasted — prevent the default paste (which would insert binary garbage into the text input)
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null);
    const results = await Promise.all(files.map(readImageFile));
    const valid = results.filter((r): r is ImageAttachment => r !== null);
    if (valid.length > 0) {
      setPendingImages(prev => [...prev, ...valid]);
    }
  }, [readImageFile]);

  const handleRemoveImage = useCallback((idx: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

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
        msg: prefix + (m.text.length > 120 ? m.text.slice(0, 120) + '...' : m.text),
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

  // ── Resize state ──────────────────────────────────────────────────────────
  const [panelSize, setPanelSize] = useState<{ width: number; height: number } | null>(null);
  const resizeState = useRef<{ resizing: boolean; startX: number; startY: number; startW: number; startH: number }>(
    { resizing: false, startX: 0, startY: 0, startW: 580, startH: 400 }
  );

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBringToFront) onBringToFront();
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeState.current = {
      resizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };

    const onMove = (me: MouseEvent) => {
      if (!resizeState.current.resizing) return;
      const dx = me.clientX - resizeState.current.startX;
      const dy = me.clientY - resizeState.current.startY;
      setPanelSize({
        width:  Math.max(400, resizeState.current.startW + dx),
        height: Math.max(320, resizeState.current.startH + dy),
      });
    };

    const onUp = () => {
      resizeState.current.resizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onBringToFront]);

  // ── Close animation state ──────────────────────────────────────────────────
  const [isClosing, setIsClosing] = useState(false);
  const [, startTransition] = useTransition();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      startTransition(() => onClose());
    }, 280);
  }, [onClose, startTransition]);

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

  if (panelSize) {
    panelStyle.width  = panelSize.width;
    panelStyle.height = panelSize.height;
  }

  const statusDotClass =
    agent.status === 'active' ? '' :
    agent.status === 'error'  ? 'rp-status-dot--error' :
    'rp-status-dot--idle';

  return (
    <div
      ref={panelRef}
      className={`room-panel${isTopmost ? ' room-panel--topmost' : ''}${isClosing ? ' room-panel--closing' : ''}`}
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
          <div className="rp-terminal-badge">
            <span className="rp-title">{agent.name}'s {agent.role}</span>
            <span className="rp-node-id">TERMINAL·{agent.id.toUpperCase()}·{agent.status.toUpperCase()}</span>
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
          <button className="rp-close-btn" onClick={handleClose} title="Close panel">✕</button>
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
        <div className="rp-content" onClick={() => { if (onBringToFront) onBringToFront(); }}>
          {activeTab === 'chat' && (
            <ChatTab
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              pendingImages={pendingImages}
              onRemoveImage={handleRemoveImage}
              onAttachClick={() => fileInputRef.current?.click()}
              onPaste={handleChatPaste}
              onSend={() => { void handleChatSend(); }}
              onKeyDown={handleChatKey}
              chatInputRef={chatInputRef}
              chatEndRef={chatEndRef}
              agentName={agent.name}
              agentId={agent.id}
              connected={gatewayConnected}
              generating={gatewayGenerating}
              onOpenConfig={onOpenGatewayConfig}
            />
          )}
          {/* Hidden file input for image selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {activeTab === 'activity' && agent.id !== 'stuart' && (
            <ActivityTab
              entries={activityEntries}
              onVote={handleVote}
              isLive={gatewayConnected && !!gatewayMessages && gatewayMessages.length > 0}
              agentId={agent.id}
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
              agentId={agent.id}
            />
          )}
        </div>
      </div>

      {/* ── Resize handle (bottom-right) ── */}
      <div
        className="rp-resize-handle"
        onMouseDown={handleResizeMouseDown}
        aria-hidden="true"
        title="Drag to resize"
      />

      {/* ── Status footer bar ── */}
      <div className="rp-status-footer">
        <span className="rp-footer-item">{agent.model ? agent.model.replace(/^.*\//, '') : 'no-model'}</span>
        <span className="rp-footer-sep">/</span>
        <span className="rp-footer-item rp-footer-item--role">{agent.role}</span>
        <span className="rp-footer-flex" />
        <span className={`rp-footer-status rp-footer-status--${agent.status === 'active' ? 'active' : agent.status === 'error' ? 'error' : 'idle'}`}>
          {agent.status === 'active' ? '● RUNNING' : agent.status === 'error' ? '⚠ ERROR' : '○ IDLE'}
        </span>
      </div>
    </div>
  );
}

// ─── ChatTab ──────────────────────────────────────────────────────────────────

// ─── Inline text renderer: newlines, `code`, **bold** ──────────────────────────────────

// ─── Inline text renderer: newlines, `code`, **bold** ──────────────────────────────────
// SAFETY: Never call this with raw base64 or data-URL strings.
// Image content must be stored in ChatMessage.attachments and rendered as <img> tags.
// Passing a multi-MB base64 string here would cause catastrophic regex backtracking
// and/or a stack overflow in React's reconciler.

const BASE64_GUARD_RE = /^data:[a-z/]+;base64,/;
const MAX_SAFE_TEXT_LEN = 50_000; // chars — anything longer is almost certainly binary/base64

function renderMessageText(text: string): React.ReactNode[] {
  // Guard: if the text looks like a raw base64 data URL or is suspiciously huge,
  // show a safe truncated placeholder instead of feeding it to the regex engine.
  if (BASE64_GUARD_RE.test(text)) {
    return [<span key="b64" className="rp-msg-binary">[image data]</span>];
  }
  if (text.length > MAX_SAFE_TEXT_LEN) {
    return [
      <React.Fragment key="trunc">
        {text.slice(0, MAX_SAFE_TEXT_LEN)}
        <span className="rp-msg-truncated"> …(truncated)</span>
      </React.Fragment>,
    ];
  }

  // Split into paragraphs on double-newline, then handle single newlines and inline marks
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push(<br key={`br-${lineIdx}`} />);
    // Inline: **bold** and `code`
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
    parts.forEach((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        result.push(<strong key={`s-${lineIdx}-${i}`}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        result.push(<code key={`c-${lineIdx}-${i}`} className="rp-inline-code">{part.slice(1, -1)}</code>);
      } else {
        result.push(<React.Fragment key={`t-${lineIdx}-${i}`}>{part}</React.Fragment>);
      }
    });
  });
  return result;
}

interface ChatTabProps {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  pendingImages: ImageAttachment[];
  onRemoveImage: (idx: number) => void;
  onAttachClick: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  chatInputRef: React.RefObject<HTMLInputElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  agentName: string;
  agentId: string;
  connected: boolean;
  generating?: boolean;
  onOpenConfig?: () => void;
}

function ChatTab({
  messages, chatInput, setChatInput, pendingImages, onRemoveImage, onAttachClick, onPaste,
  onSend, onKeyDown, chatInputRef, chatEndRef, agentName, agentId,
  connected, generating, onOpenConfig,
}: ChatTabProps) {
  const emptyFlavor = getFlavorBlock(CHAT_EMPTY_FLAVOR, agentId);
  const canSend = !!(chatInput.trim() || pendingImages.length > 0);
  return (
    <div className="rp-chat">
      {/* Tab sub-header */}
      <div className="rp-tab-header">
        <span className="rp-tab-header-label">💬 Chat Interface</span>
        <span className="rp-tab-header-sep" />
        <span style={{ fontSize: '8px', letterSpacing: '1px', color: connected ? '#44ff88' : '#cc3333', opacity: 0.7 }}>
          {connected ? '● LIVE' : '○ OFFLINE'}
        </span>
      </div>
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
          <div className="rp-flavor-empty">
            <div className="rp-flavor-empty-title">{emptyFlavor.title}</div>
            {emptyFlavor.lines.map((l, i) => (
              <div key={i} className="rp-flavor-empty-line">{l}</div>
            ))}
            {!connected && (
              <div className="rp-flavor-empty-hint">— connect gateway to chat —</div>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`rp-msg rp-msg--${msg.sender}`}>
              <span className="rp-msg-sender">
                {msg.sender === 'user' ? 'You' : msg.sender === 'agent' ? agentName : '⚙'}
              </span>
              <span className={`rp-msg-text${msg.streaming ? ' rp-msg-text--streaming' : ''}`}>
                {/* Render attachments BEFORE text, as <img> tags — never as text */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <span className="rp-msg-attachments">
                    {msg.attachments.map((att, i) => (
                      <img
                        key={i}
                        src={att.dataUrl}
                        alt={att.name}
                        className="rp-msg-attachment-img"
                        title={att.name}
                      />
                    ))}
                  </span>
                )}
                {/* Pass text through renderMessageText — never pass base64 here */}
                {msg.text && (msg.streaming ? msg.text : renderMessageText(msg.text))}
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

      {/* Pending image thumbnails strip */}
      {pendingImages.length > 0 && (
        <div className="rp-chat-attachments-strip">
          {pendingImages.map((img, idx) => (
            <div key={idx} className="rp-chat-attachment-thumb">
              <img src={img.dataUrl} alt={img.name} className="rp-chat-attachment-preview" />
              <button
                className="rp-chat-attachment-remove"
                onClick={() => onRemoveImage(idx)}
                title={`Remove ${img.name}`}
                aria-label={`Remove image ${img.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rp-chat-input-row">
        {/* Attach button */}
        <button
          className="rp-chat-attach-btn"
          onClick={onAttachClick}
          disabled={!connected}
          title="Attach images (or paste from clipboard)"
          aria-label="Attach images"
        >
          📎
        </button>
        <input
          ref={chatInputRef}
          type="text"
          className="rp-chat-input"
          placeholder={connected ? 'Send a command… (paste images with Ctrl+V)' : 'Gateway not connected'}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={!connected}
          autoFocus
        />
        <button
          className="rp-chat-send-btn"
          onClick={onSend}
          disabled={!canSend || !connected || generating}
        >
          {generating ? '...' : '▶'}
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
  agentId: string;
}

function ActivityTab({ entries, onVote, isLive, agentId }: ActivityTabProps) {
  const emptyFlavor = getFlavorBlock(ACTIVITY_EMPTY_FLAVOR, agentId);
  return (
    <div className="rp-activity">
      {/* Tab sub-header */}
      <div className="rp-tab-header">
        <span className="rp-tab-header-label">📋 Activity Log</span>
        <span className="rp-tab-header-sep" />
        {isLive && <span style={{ fontSize: '8px', letterSpacing: '1px', color: '#44ff88', opacity: 0.7 }}>● LIVE</span>}
      </div>
      <div className="rp-activity-list">
        {entries.length === 0 ? (
          <div className="rp-flavor-empty">
            <div className="rp-flavor-empty-title">{emptyFlavor.title}</div>
            {emptyFlavor.lines.map((l, i) => (
              <div key={i} className="rp-flavor-empty-line">{l}</div>
            ))}
          </div>
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
  agentId: string;
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

function TasksTab({
  tasks, taskInput, setTaskInput, taskPriority, setTaskPriority,
  taskDueDate, setTaskDueDate,
  onAdd, onToggle, onDelete, onMoveUp, onMoveDown, onClearCompleted, onKeyDown, agentId,
}: TasksTabProps) {
  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const orderedTasks = [...pendingTasks, ...doneTasks];
  const hasDone = doneTasks.length > 0;
  const emptyFlavor = getFlavorBlock(TASKS_EMPTY_FLAVOR, agentId);

  return (
    <div className="rp-tasks">
      {/* Tab sub-header */}
      <div className="rp-tab-header">
        <span className="rp-tab-header-label">📝 Task Queue</span>
        <span className="rp-tab-header-sep" />
        <span style={{ fontSize: '8px', letterSpacing: '1px', color: pendingTasks.length > 0 ? '#ccaa22' : '#44aa66', opacity: 0.7 }}>
          {pendingTasks.length} PENDING
        </span>
      </div>
      <div className="rp-task-list">
        {tasks.length === 0 ? (
          <div className="rp-flavor-empty">
            <div className="rp-flavor-empty-title">{emptyFlavor.title}</div>
            {emptyFlavor.lines.map((l, i) => (
              <div key={i} className="rp-flavor-empty-line">{l}</div>
            ))}
            <div className="rp-flavor-empty-hint">— use the form below —</div>
          </div>
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
          placeholder="New task..."
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
      {/* Tab sub-header */}
      <div className="rp-tab-header" style={{ margin: '-10px -12px 0', borderBottom: '1px solid rgba(255,215,0,0.12)', background: 'rgba(0,0,0,0.35)' }}>
        <span className="rp-tab-header-label" style={{ color: '#FFD700', opacity: 0.55 }}>💰 Royal Treasury</span>
        <span className="rp-tab-header-sep" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.15), transparent)' }} />
      </div>
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
          {loading ? '🔄 Counting coins...' : 'No data yet. Hit refresh.'}
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
