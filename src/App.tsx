// ─── App.tsx — Dungeon Interface v2 ──────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { DungeonMap } from './components/DungeonMap';
import { SidePanel } from './components/SidePanel';
import { DungeonHUD } from './components/DungeonHUD';
import { ActivityLog } from './components/ActivityLog';
import { LoadingOverlay } from './components/LoadingOverlay';
import type { AgentId, AgentInfo, ActivityEntry } from './types';

// ─── Initial static agent data ────────────────────────────────────────────────

const INITIAL_AGENTS: AgentInfo[] = [
  {
    id: 'grim',
    name: 'Grim',
    role: 'Dungeon Master',
    emoji: '🐉',
    status: 'active',
    currentTask: 'Overseeing dungeon operations',
    activityLog: [
      { id: 1, time: '00:47', agentId: 'grim', msg: 'Dungeon Interface v2 initialized.', type: 'success' },
      { id: 2, time: '00:48', agentId: 'grim', msg: 'All chambers online.', type: 'info' },
    ],
  },
  {
    id: 'bob',
    name: 'Bob',
    role: 'Librarian & Researcher',
    emoji: '📚',
    status: 'idle',
    currentTask: undefined,
    activityLog: [
      { id: 3, time: '00:47', agentId: 'bob', msg: 'Library standing by. Awaiting research orders.', type: 'info' },
    ],
  },
  {
    id: 'kevin',
    name: 'Kevin',
    role: 'Workshop Foreman',
    emoji: '🔧',
    status: 'active',
    currentTask: 'Building dungeon interface',
    activityLog: [
      { id: 4, time: '00:48', agentId: 'kevin', msg: 'Workshop online. Build systems ready.', type: 'info' },
      { id: 5, time: '00:49', agentId: 'kevin', msg: 'Active: Building dungeon interface v2', type: 'success' },
    ],
  },
  {
    id: 'stuart',
    name: 'Stuart',
    role: 'Treasury Keeper',
    emoji: '💰',
    status: 'idle',
    currentTask: undefined,
    activityLog: [
      { id: 6, time: '00:47', agentId: 'stuart', msg: 'Treasury sealed. Gold reserves intact.', type: 'info' },
    ],
  },
];

const INITIAL_LOG: ActivityEntry[] = [
  { id: 1, time: '00:47', agentId: 'grim', msg: 'Dungeon Interface v2 initialized. All systems nominal.', type: 'success' },
  { id: 2, time: '00:48', agentId: 'kevin', msg: 'Workshop online. Build systems ready.', type: 'info' },
  { id: 3, time: '00:49', agentId: 'grim', msg: '2D dungeon map rendered. Chambers loaded.', type: 'success' },
  { id: 4, time: '00:50', agentId: 'bob', msg: 'Research Lab standing by. Awaiting orders.', type: 'info' },
  { id: 5, time: '00:50', agentId: 'grim', msg: 'OpenClaw connection target: localhost:18789', type: 'warn' },
];

let logIdCounter = 100;
function nextLogId() { return ++logIdCounter; }
function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [globalLog, setGlobalLog] = useState<ActivityEntry[]>(INITIAL_LOG);
  const [selectedId, setSelectedId] = useState<AgentId | null>(null);
  const [ocStatus, setOcStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const addLog = useCallback((agentId: AgentId, msg: string, type: ActivityEntry['type']) => {
    setGlobalLog(prev => [
      ...prev.slice(-49),
      { id: nextLogId(), time: nowTime(), agentId, msg, type },
    ]);
  }, []);

  // ── OpenClaw polling ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:18789/api/v1/status', {
          signal: AbortSignal.timeout(2000),
        });
        setOcStatus(res.ok ? 'online' : 'offline');
      } catch {
        setOcStatus('offline');
      }
    };

    const fetchSessions = async () => {
      try {
        const res = await fetch('http://localhost:18789/api/v1/sessions', {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const sessions: unknown[] = Array.isArray(data) ? data : (data as { sessions?: unknown[] }).sessions ?? [];

        setAgents(prev => {
          const updated = prev.map(agent => {
            const session = sessions.find((s: unknown) => {
              const ss = s as Record<string, unknown>;
              return ss['id'] === agent.id || ss['agent'] === agent.id || (ss['name'] as string)?.toLowerCase().includes(agent.id);
            }) as Record<string, unknown> | undefined;
            if (!session) return agent;

            const status = (session['status'] ?? session['state'] ?? 'idle') as AgentInfo['status'];
            const task = (session['task'] ?? session['currentTask'] ?? session['description']) as string | undefined;
            return { ...agent, status, currentTask: task };
          });
          return updated;
        });
      } catch {
        // silently ignore
      }
    };

    checkStatus();
    fetchSessions();
    const t1 = setInterval(checkStatus, 10_000);
    const t2 = setInterval(fetchSessions, 8_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  // ── Room click handler ──────────────────────────────────────────────────────
  const handleRoomClick = useCallback((id: AgentId) => {
    setSelectedId(prev => (prev === id ? null : id));
    addLog(id, `Chamber accessed by the Overlord.`, 'info');
  }, [addLog]);

  // ── Command send ────────────────────────────────────────────────────────────
  const handleSendCommand = useCallback((agentId: AgentId, cmd: string) => {
    addLog(agentId, `Command received: "${cmd}"`, 'warn');
    // Update the agent's log too
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const newEntry: ActivityEntry = {
        id: nextLogId(),
        time: nowTime(),
        agentId,
        msg: `Command: "${cmd}"`,
        type: 'warn',
      };
      return { ...a, activityLog: [...a.activityLog.slice(-19), newEntry] };
    }));
  }, [addLog]);

  // ── Close panel ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => setSelectedId(null), []);
  const handleHover = useCallback((_id: AgentId | null) => { /* no-op, handled in canvas */ }, []);

  // ── Selected agent ──────────────────────────────────────────────────────────
  const selectedAgent = selectedId ? (agents.find(a => a.id === selectedId) ?? null) : null;

  return (
    <>
      {isLoading && <LoadingOverlay onComplete={() => setIsLoading(false)} />}
      <div className={`dungeon-root${isLoading ? ' dungeon-root--hidden' : ''}`}>
        {/* HUD */}
        <DungeonHUD agents={agents} ocStatus={ocStatus} />

        {/* Main area: map + side panel + log */}
        <div className="dungeon-body">
          {/* Map container */}
          <div className="dungeon-map-wrap">
            <div className="dungeon-map-label">⚔ DUNGEON MAP — 2D TOP-DOWN VIEW</div>
            <div className="dungeon-map-canvas-wrap">
              <DungeonMap
                agents={agents}
                selectedId={selectedId}
                onRoomClick={handleRoomClick}
                onRoomHover={handleHover}
              />
            </div>
          </div>

          {/* Activity log */}
          <ActivityLog entries={globalLog} />
        </div>

        {/* Side panel overlay */}
        <SidePanel
          agent={selectedAgent}
          onClose={handleClose}
          onSendCommand={handleSendCommand}
        />

        {/* Backdrop click to close panel */}
        {selectedId && (
          <div className="dungeon-backdrop" onClick={handleClose} />
        )}
      </div>
    </>
  );
}

export default App;
