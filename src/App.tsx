// ─── App.tsx — Dungeon Interface v2 ──────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { DungeonMap } from './components/DungeonMap';
import type { PulseHandle } from './components/DungeonMap';
import { SidePanel } from './components/SidePanel';
import { DungeonHUD } from './components/DungeonHUD';
import { ActivityLog } from './components/ActivityLog';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ToastStack } from './components/ToastStack';
import type { ToastItem } from './components/ToastStack';
import type { AgentId, AgentInfo, ActivityEntry } from './types';

// ─── Dungeon ambient events — atmospheric flavor, fired periodically ──────────

const DUNGEON_AMBIENT_EVENTS: { agentId: AgentId; msg: string; type: ActivityEntry['type'] }[] = [
  { agentId: 'grim',   msg: '🌑 Shadows stir along the corridor walls...',                         type: 'info' },
  { agentId: 'grim',   msg: '⚡ An arcane surge crackles through the dungeon ley lines.',          type: 'warn' },
  { agentId: 'grim',   msg: '🔮 The scrying orb pulses crimson — something approaches.',          type: 'warn' },
  { agentId: 'grim',   msg: '🐉 A low rumble echoes from deep within the dungeon.',               type: 'info' },
  { agentId: 'grim',   msg: '🌀 The Dungeon Master senses a shift in the arcane weave.',          type: 'info' },
  { agentId: 'kevin',  msg: '🔥 The forge blazes hotter — metal screams in the workshop!',       type: 'warn' },
  { agentId: 'kevin',  msg: '⚙️ The gears spin faster... something stirs the mechanisms.',       type: 'info' },
  { agentId: 'kevin',  msg: '💥 A shower of sparks erupts from the workshop anvil.',             type: 'warn' },
  { agentId: 'kevin',  msg: '🔩 Strange vibrations rattle the bolts in Kevin\'s wall rack.',    type: 'info' },
  { agentId: 'bob',    msg: '📖 A page turns on its own in the archive...',                      type: 'info' },
  { agentId: 'bob',    msg: '🕯️ The library candle flickers — something passes unseen.',         type: 'info' },
  { agentId: 'bob',    msg: '📜 An ancient scroll unrolls itself across Bob\'s desk.',           type: 'warn' },
  { agentId: 'bob',    msg: '🔍 A tome falls from the shelf — bookmarked at a cryptic passage.', type: 'info' },
  { agentId: 'stuart', msg: '💰 Coins rattle mysteriously inside the sealed vault.',             type: 'info' },
  { agentId: 'stuart', msg: '✨ A stray gold coin rolls from the pile and vanishes...',           type: 'warn' },
  { agentId: 'stuart', msg: '🔒 The treasury locks engage unexpectedly. The vault is restless.', type: 'warn' },
  { agentId: 'stuart', msg: '👁️ Stuart eyes a suspicious ledger entry. Investigating.',          type: 'info' },
];

// ─── Task pools for simulation engine ────────────────────────────────────────

const AGENT_TASKS: Record<AgentId, { task: string; log: string; type: ActivityEntry['type'] }[]> = {
  grim: [
    { task: 'Overseeing dungeon operations',  log: 'All chambers scanning nominal. No anomalies detected.',               type: 'info' },
    { task: 'Reviewing minion performance',   log: 'Performance report compiled. Kevin leads efficiency metrics.',        type: 'success' },
    { task: 'Dispatching new orders',         log: 'Orders dispatched to all active minions. Awaiting confirmation.',     type: 'warn' },
    { task: 'Monitoring threat levels',       log: 'Dungeon perimeter check complete. Wards holding strong.',             type: 'info' },
    { task: 'Consulting the arcane archives', log: 'Arcane archives consulted. Three new directives recorded.',           type: 'success' },
    { task: 'Calibrating staff orb',          log: 'Staff orb recalibrated. Power output at 94%.',                       type: 'info' },
    { task: 'Allocating minion resources',    log: 'Resource allocation updated. Efficiency target: 98% this cycle.',    type: 'success' },
    { task: 'Reviewing dungeon schematics',   log: 'Schematics reviewed. Three chamber upgrades approved.',              type: 'success' },
  ],
  bob: [
    { task: 'Researching market intelligence',  log: 'Market data indexed. 47 new sources catalogued successfully.',      type: 'success' },
    { task: 'Summarizing web findings',         log: 'Web scan complete. Briefing ready for Grim review.',               type: 'info' },
    { task: 'Cross-referencing archives',       log: 'Cross-reference pass done. 3 conflicts flagged for review.',       type: 'warn' },
    { task: 'Compiling intelligence report',    log: 'Research report v2.4 compiled. 12 pages, 5 charts included.',      type: 'success' },
    { task: 'Scanning knowledge sources',       log: 'Scanning 128 sources. Indexing 89% complete.',                     type: 'info' },
    { task: 'Analyzing competitor intel',       log: 'Competitor analysis: 2 threats, 4 opportunities identified.',      type: 'warn' },
    { task: 'Organizing library archives',      log: 'Library reorganized. 340 entries re-tagged and sorted.',           type: 'success' },
    { task: 'Fetching external data feeds',     log: 'Data feeds synchronized. 14 new entries queued for processing.',   type: 'info' },
    { task: 'Verifying source credibility',     log: 'Source verification complete. 92% credibility score.',             type: 'success' },
  ],
  kevin: [
    { task: 'Building dungeon interface v2',  log: 'Component build: 94% complete. Rendering pipeline hot.',            type: 'success' },
    { task: 'Running TypeScript checks',      log: 'TypeScript check passed. 0 errors, 0 warnings.',                   type: 'success' },
    { task: 'Optimizing render pipeline',     log: 'Canvas renderer optimized. 18% frame rate improvement.',            type: 'success' },
    { task: 'Installing build dependencies',  log: 'Dependencies updated. 3 packages patched to latest stable.',        type: 'info' },
    { task: 'Patching animation engine',      log: 'Animation patch v1.3 applied. Sparks and auras improved.',         type: 'success' },
    { task: 'Debugging particle system',      log: 'Particle system: 2 edge cases fixed. Emission stable.',            type: 'warn' },
    { task: 'Deploying to production',        log: 'Deploy initiated. Build artifacts compressed to 2.1MB.',           type: 'info' },
    { task: 'Refactoring sprite engine',      log: 'Sprite engine refactor complete. 200 lines removed cleanly.',      type: 'success' },
    { task: 'Bundling assets for release',    log: 'Asset bundle complete. All sprites and tiles validated.',          type: 'success' },
  ],
  stuart: [
    { task: 'Auditing gold reserves',         log: 'Gold audit complete. Treasury: 14,820 coins. Fully secure.',        type: 'success' },
    { task: 'Tracking API spending',          log: 'API spend this week: $2.40. Well under $5 hard threshold.',         type: 'info' },
    { task: 'Forecasting dungeon budget',     log: 'Budget forecast updated. Q2 surplus of 340 gold projected.',        type: 'success' },
    { task: 'Reconciling expense ledger',     log: 'Ledger reconciled. 2 minor discrepancies resolved and closed.',     type: 'warn' },
    { task: 'Monitoring token consumption',   log: 'Token usage: 84K tokens today. Nominal burn rate maintained.',      type: 'info' },
    { task: 'Locking treasury vault',         log: 'Vault sealed. Triple-lock engaged. No unauthorized access.',        type: 'success' },
    { task: 'Calculating efficiency ROI',     log: 'ROI analysis: minion efficiency up 12% this operational cycle.',    type: 'success' },
    { task: 'Balancing dungeon ledger',       log: 'Weekly balance sheet filed. Surplus carried forward.',              type: 'info' },
  ],
};

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
      { id: 2, time: '00:48', agentId: 'grim', msg: 'All chambers online. Dungeon operational.', type: 'info' },
      { id: 3, time: '00:49', agentId: 'grim', msg: 'Wards activated. Threat level: minimal.', type: 'success' },
    ],
  },
  {
    id: 'bob',
    name: 'Bob',
    role: 'Librarian & Researcher',
    emoji: '📚',
    status: 'active',
    currentTask: 'Researching market intelligence',
    activityLog: [
      { id: 4, time: '00:47', agentId: 'bob', msg: 'Library systems online. Archives loaded.', type: 'info' },
      { id: 5, time: '00:48', agentId: 'bob', msg: 'Research queue: 6 tasks. Beginning first pass.', type: 'success' },
      { id: 6, time: '00:49', agentId: 'bob', msg: 'Scanning external sources. 47 documents indexed.', type: 'info' },
    ],
  },
  {
    id: 'kevin',
    name: 'Kevin',
    role: 'Workshop Foreman',
    emoji: '🔧',
    status: 'active',
    currentTask: 'Building dungeon interface v2',
    activityLog: [
      { id: 7, time: '00:48', agentId: 'kevin', msg: 'Workshop online. Build systems initialized.', type: 'info' },
      { id: 8, time: '00:49', agentId: 'kevin', msg: 'Active: dungeon-interface build in progress.', type: 'success' },
      { id: 9, time: '00:50', agentId: 'kevin', msg: 'TypeScript check passed. 0 errors.', type: 'success' },
    ],
  },
  {
    id: 'stuart',
    name: 'Stuart',
    role: 'Treasury Keeper',
    emoji: '💰',
    status: 'active',
    currentTask: 'Auditing gold reserves',
    activityLog: [
      { id: 10, time: '00:47', agentId: 'stuart', msg: 'Treasury sealed. Initializing audit protocol.', type: 'info' },
      { id: 11, time: '00:48', agentId: 'stuart', msg: 'Ledger loaded. 14,820 gold coins verified.', type: 'success' },
      { id: 12, time: '00:49', agentId: 'stuart', msg: 'API spend tracking active. Current: $2.40.', type: 'info' },
    ],
  },
];

const INITIAL_LOG: ActivityEntry[] = [
  { id: 1,  time: '00:47', agentId: 'grim',   msg: 'Dungeon Interface v2 initialized. All systems nominal.',     type: 'success' },
  { id: 2,  time: '00:47', agentId: 'bob',    msg: 'Library online. Research queue activated. 6 tasks queued.',  type: 'info' },
  { id: 3,  time: '00:47', agentId: 'stuart', msg: 'Treasury audit initiated. Ledger loading.',                   type: 'info' },
  { id: 4,  time: '00:48', agentId: 'kevin',  msg: 'Workshop online. Build pipeline hot and ready.',             type: 'info' },
  { id: 5,  time: '00:48', agentId: 'grim',   msg: '2D dungeon map rendered. All chambers loaded.',              type: 'success' },
  { id: 6,  time: '00:49', agentId: 'bob',    msg: 'External data scan: 47 sources indexed successfully.',       type: 'success' },
  { id: 7,  time: '00:49', agentId: 'kevin',  msg: 'TypeScript check passed. 0 errors, 0 warnings.',            type: 'success' },
  { id: 8,  time: '00:49', agentId: 'stuart', msg: 'Gold reserves confirmed: 14,820 coins. Secure.',             type: 'success' },
  { id: 9,  time: '00:50', agentId: 'grim',   msg: 'All 4 minions reporting ACTIVE. Dungeon is alive.',          type: 'success' },
  { id: 10, time: '00:50', agentId: 'grim',   msg: 'OpenClaw connection target: localhost:18789',                type: 'warn' },
];

let logIdCounter = 100;
let toastIdCounter = 0;
function nextLogId() { return ++logIdCounter; }
function nextToastId() { return ++toastIdCounter; }
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pulseHandleRef = useRef<PulseHandle | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((agentId: AgentId, message: string, type: ToastItem['type']) => {
    const toast: ToastItem = {
      id: nextToastId(),
      agentId,
      message,
      type,
      ttl: type === 'error' ? 7000 : type === 'warn' ? 5500 : 4000,
    };
    setToasts(prev => [...prev.slice(-4), toast]); // max 5 visible
  }, []);

  const addLog = useCallback((agentId: AgentId, msg: string, type: ActivityEntry['type']) => {
    setGlobalLog(prev => [
      ...prev.slice(-49),
      { id: nextLogId(), time: nowTime(), agentId, msg, type },
    ]);
  }, []);

  // ── Simulation engine — rotating tasks + live activity feed ──────────────
  useEffect(() => {
    let cancelled = false;
    const taskIndices: Record<AgentId, number> = { grim: 0, bob: 0, kevin: 0, stuart: 0 };
    // Only toast for 'success' entries, throttled per agent (not every single tick)
    const lastToastTime: Record<AgentId, number> = { grim: 0, bob: 0, kevin: 0, stuart: 0 };

    function scheduleNextTick(agentId: AgentId, delay: number) {
      setTimeout(() => {
        if (cancelled) return;

        const tasks = AGENT_TASKS[agentId];
        taskIndices[agentId] = (taskIndices[agentId] + 1) % tasks.length;
        const entry = tasks[taskIndices[agentId]];

        setAgents(prev => prev.map(a => {
          if (a.id !== agentId) return a;
          const newLogEntry: ActivityEntry = {
            id: nextLogId(),
            time: nowTime(),
            agentId,
            msg: entry.log,
            type: entry.type,
          };
          return {
            ...a,
            currentTask: entry.task,
            activityLog: [...a.activityLog.slice(-19), newLogEntry],
          };
        }));

        // Fire a Grim→minion dispatch pulse just before task lands
        if (agentId !== 'grim' && pulseHandleRef.current) {
          pulseHandleRef.current.fire('grim', 'dispatch');
        }

        addLog(agentId, entry.log, entry.type);

        // Fire a toast for success/warn entries, but throttle: max 1 per agent per ~20s
        const now = Date.now();
        if ((entry.type === 'success' || entry.type === 'warn') && now - lastToastTime[agentId] > 20000) {
          lastToastTime[agentId] = now;
          addToast(agentId, entry.log, entry.type);
        }

        // Organic random delay: 4–12 seconds per agent
        scheduleNextTick(agentId, 4000 + Math.random() * 8000);
      }, delay);
    }

    // Stagger initial starts so all 4 don't fire simultaneously
    const agentIds: AgentId[] = ['grim', 'bob', 'kevin', 'stuart'];
    agentIds.forEach((id, i) => {
      scheduleNextTick(id, 1500 + i * 1300 + Math.random() * 1500);
    });

    return () => { cancelled = true; };
  }, [addLog, addToast]);

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
    // Flash a dispatch pulse from Grim toward the clicked room
    if (pulseHandleRef.current) {
      pulseHandleRef.current.fire('grim', 'dispatch');
      setTimeout(() => {
        if (pulseHandleRef.current) pulseHandleRef.current.fire(id, 'dispatch');
      }, 180);
    }
  }, [addLog]);

  // ── Command send ────────────────────────────────────────────────────────────
  const handleSendCommand = useCallback((agentId: AgentId, cmd: string) => {
    addLog(agentId, `Command received: "${cmd}"`, 'warn');
    addToast(agentId, `Command dispatched: "${cmd}"`, 'warn');
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
    // Pulse: Grim dispatch → minion
    if (pulseHandleRef.current) {
      pulseHandleRef.current.fire('grim', 'dispatch');
      setTimeout(() => {
        if (pulseHandleRef.current) pulseHandleRef.current.fire(agentId, 'dispatch');
      }, 250);
    }
  }, [addLog, addToast]);

  // ── Close panel ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => setSelectedId(null), []);
  const handleHover = useCallback((_id: AgentId | null) => { /* no-op, handled in canvas */ }, []);

  // ── Keyboard navigation: 1-4 to select rooms, Escape to close ─────────────
  useEffect(() => {
    const roomOrder: AgentId[] = ['grim', 'bob', 'kevin', 'stuart'];
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < roomOrder.length) {
        handleRoomClick(roomOrder[idx]);
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleRoomClick, handleClose]);

  // ── Dungeon ambient events — periodic atmospheric flavor ───────────────────
  useEffect(() => {
    let cancelled = false;
    let evtIdx = Math.floor(Math.random() * DUNGEON_AMBIENT_EVENTS.length);
    let timerId: ReturnType<typeof setTimeout>;

    function scheduleNext(delayMs: number) {
      timerId = setTimeout(() => {
        if (cancelled) return;
        const evt = DUNGEON_AMBIENT_EVENTS[evtIdx % DUNGEON_AMBIENT_EVENTS.length];
        evtIdx = (evtIdx + 1) % DUNGEON_AMBIENT_EVENTS.length;
        addLog(evt.agentId, evt.msg, evt.type);
        addToast(evt.agentId, evt.msg, evt.type);
        if (pulseHandleRef.current) {
          pulseHandleRef.current.fire(evt.agentId, 'dispatch');
        }
        scheduleNext(35_000 + Math.random() * 20_000);
      }, delayMs);
    }

    // First ambient event after 20–30 seconds (let startup settle)
    scheduleNext(20_000 + Math.random() * 10_000);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [addLog, addToast]); // pulseHandleRef is a stable ref — no dep needed

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
            <div className="dungeon-map-label">
            <span>⚔ DUNGEON MAP — 2D TOP-DOWN VIEW</span>
            <span className="dungeon-kbd-hints">
              <kbd>1</kbd>GRIM
              <kbd>2</kbd>BOB
              <kbd>3</kbd>KEVIN
              <kbd>4</kbd>TREASURY
              <kbd>ESC</kbd>CLOSE
            </span>
          </div>
            <div className="dungeon-map-canvas-wrap">
              <DungeonMap
                agents={agents}
                selectedId={selectedId}
                onRoomClick={handleRoomClick}
                onRoomHover={handleHover}
                pulseHandleRef={pulseHandleRef}
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

      {/* Toast notifications */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
