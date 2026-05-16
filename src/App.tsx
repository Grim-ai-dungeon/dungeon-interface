import { useState, useEffect, useRef } from 'react';
import './App.css';
import { IsoDungeonMap } from './components/IsoDungeonMap';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useTheme } from './ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  time: string;
  room: string;
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  currentTask?: string;
  lastActivity?: string;
}

// ─── Mock fallback activity log ───────────────────────────────────────────────

const INITIAL_LOG: LogEntry[] = [
  { id: 1, time: '00:47', room: 'GRIM', msg: 'Dungeon Interface initialized. All systems nominal.', type: 'success' },
  { id: 2, time: '00:48', room: 'KEVIN', msg: 'Workshop online. Build systems ready.', type: 'info' },
  { id: 3, time: '00:49', room: 'GRIM', msg: 'Isometric render complete. Map loaded.', type: 'success' },
  { id: 4, time: '00:50', room: 'BOB', msg: 'Research Lab standing by. Awaiting orders.', type: 'info' },
  { id: 5, time: '00:50', room: 'SYSTEM', msg: 'OpenClaw connection target: localhost:18789', type: 'warn' },
];

// ─── Room data ────────────────────────────────────────────────────────────────

const ROOM_INFO: Record<string, {
  emoji: string;
  title: string;
  agent: string;
  model: string;
  color: string;
  stats: { label: string; value: number; color: string }[];
  abilities: string[];
  status: string;
  active: boolean;
  agentKey?: string; // maps to OpenClaw agent id
}> = {
  grim: {
    emoji: '🐉',
    title: 'COMMAND CENTER',
    agent: 'GRIM',
    model: 'claude-sonnet-4.6',
    color: '#ffd700',
    stats: [
      { label: 'CMD', value: 98, color: 'gold' },
      { label: 'INF', value: 92, color: 'purple' },
      { label: 'AUT', value: 88, color: 'cyan' },
    ],
    abilities: ['ORCHESTRATE', 'MEMORY', 'SPAWN', 'EXEC', 'ALL TOOLS'],
    status: 'ACTIVE — OVERSEEING DUNGEON',
    active: true,
    agentKey: 'main',
  },
  bob: {
    emoji: '🔍',
    title: 'RESEARCH LAB',
    agent: 'BOB',
    model: 'gemini-2.5-pro',
    color: '#00f5ff',
    stats: [
      { label: 'INT', value: 90, color: 'blue' },
      { label: 'SPD', value: 75, color: 'cyan' },
      { label: 'STL', value: 60, color: 'purple' },
    ],
    abilities: ['WEB SEARCH', 'WEB FETCH', 'READ', 'WRITE', 'MEMORY'],
    status: 'IDLE — AWAITING ORDERS',
    active: false,
    agentKey: 'bob',
  },
  kevin: {
    emoji: '🔧',
    title: 'WORKSHOP',
    agent: 'KEVIN',
    model: 'claude-sonnet-4.6',
    color: '#00ff88',
    stats: [
      { label: 'STR', value: 95, color: 'red' },
      { label: 'DEX', value: 80, color: 'green' },
      { label: 'END', value: 85, color: 'gold' },
    ],
    abilities: ['EXEC', 'BROWSER', 'READ', 'WRITE', 'EDIT', 'WEB'],
    status: 'ACTIVE — BUILDING UI',
    active: true,
    agentKey: 'kevin',
  },
  screen: {
    emoji: '📺',
    title: 'OBSERVATION DECK',
    agent: 'SCREEN WATCH',
    model: 'node-capture',
    color: '#ff6600',
    stats: [
      { label: 'RES', value: 100, color: 'red' },
      { label: 'FPS', value: 30, color: 'gold' },
      { label: 'LAG', value: 12, color: 'green' },
    ],
    abilities: ['SCREEN CAPTURE', 'NODE FEED', 'RECORD'],
    status: 'OFFLINE — CONNECT NODE',
    active: false,
  },
};

// ─── StatBar ──────────────────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.width = `${value}%`;
    });
  }, [value]);

  return (
    <div className="stat-bar-container">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="stat-bar-track">
        <div ref={fillRef} className={`stat-bar-fill ${color}`} />
      </div>
    </div>
  );
}

// ─── Clock (live) ─────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

// ─── Agent status panel ───────────────────────────────────────────────────────

function AgentStatusPanel({ agents }: { agents: AgentInfo[] }) {
  const { theme } = useTheme();
  if (!agents.length) return null;
  return (
    <div className="agent-live-panel">
      <div className="panel-label">⬡ LIVE AGENTS</div>
      {agents.map((a) => (
        <div key={a.id} className="agent-live-row">
          <span
            className="status-dot"
            style={{
              background: a.status === 'active' ? theme.colors.statusGreen : theme.colors.secondary,
              boxShadow: `0 0 5px ${a.status === 'active' ? theme.colors.statusGreen : theme.colors.secondary}`,
            }}
          />
          <div className="agent-live-info">
            <span className="agent-live-name">{a.name.toUpperCase()}</span>
            {a.currentTask && (
              <span className="agent-live-task">{a.currentTask.slice(0, 38)}{a.currentTask.length > 38 ? '…' : ''}</span>
            )}
            {a.lastActivity && (
              <span className="agent-live-activity">{a.lastActivity}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const { theme } = useTheme();
  const [selectedRoom, setSelectedRoom] = useState('grim');
  const [log, setLog] = useState<LogEntry[]>(INITIAL_LOG);
  const [logId, setLogId] = useState(100);
  const [ocStatus, setOcStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [liveAgents, setLiveAgents] = useState<AgentInfo[]>([]);
  const [agentActiveMap, setAgentActiveMap] = useState<Record<string, boolean>>({});
  const room = ROOM_INFO[selectedRoom] ?? ROOM_INFO.grim;

  // Map agent keys to room IDs for glow/pulse
  function buildActiveMap(agents: AgentInfo[]): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    for (const [roomId, info] of Object.entries(ROOM_INFO)) {
      if (info.agentKey) {
        const agent = agents.find((a) => a.id === info.agentKey || a.name.toLowerCase() === info.agentKey);
        map[roomId] = agent ? agent.status === 'active' : info.active;
      } else {
        map[roomId] = info.active;
      }
    }
    return map;
  }

  // ── OpenClaw status + agent polling ────────────────────────────────────────
  useEffect(() => {
    const addLog = (room: string, msg: string, type: LogEntry['type']) => {
      setLogId((prev) => {
        const newId = prev + 1;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLog((prevLog) => [
          ...prevLog.slice(-24),
          { id: newId, time, room, msg, type },
        ]);
        return newId;
      });
    };

    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:18789/api/v1/status', {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          setOcStatus('online');
        } else {
          setOcStatus('offline');
        }
      } catch {
        setOcStatus('offline');
      }
    };

    const fetchAgents = async () => {
      try {
        // Try to get sessions/agents list
        const res = await fetch('http://localhost:18789/api/v1/sessions', {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          // Normalize response — OpenClaw may return array or object with sessions key
          const sessions: any[] = Array.isArray(data) ? data : (data.sessions ?? data.agents ?? []);
          const agents: AgentInfo[] = sessions.map((s: any) => ({
            id: s.id ?? s.name ?? 'unknown',
            name: s.agent ?? s.name ?? s.id ?? 'agent',
            status: s.status ?? s.state ?? 'idle',
            currentTask: s.task ?? s.currentTask ?? s.description,
            lastActivity: s.lastActivity ?? s.updatedAt
              ? new Date(s.lastActivity ?? s.updatedAt).toLocaleTimeString('en-US', { hour12: false })
              : undefined,
          }));
          if (agents.length) {
            setLiveAgents(agents);
            const newMap = buildActiveMap(agents);
            setAgentActiveMap(newMap);

            // Log any newly active agents
            agents.forEach((a) => {
              if (a.status === 'active' && a.currentTask) {
                addLog(a.name.toUpperCase(), `Active: ${a.currentTask.slice(0, 60)}`, 'info');
              }
            });
          }
        }
      } catch {
        // Silently ignore — fallback to static data
      }
    };

    checkStatus();
    fetchAgents();

    const statusInterval = setInterval(checkStatus, 10_000);
    const agentInterval = setInterval(fetchAgents, 8_000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(agentInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log on room selection change
  useEffect(() => {
    const msgs: Record<string, string> = {
      grim: 'Command Center selected. All channels open.',
      bob: 'Research Lab accessed. Data archives ready.',
      kevin: 'Workshop selected. Build tools loaded.',
      screen: 'Observation Deck selected. Awaiting node stream.',
    };
    setLogId((prev) => {
      const newId = prev + 1;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setLog((prevLog) => [
        ...prevLog.slice(-24),
        {
          id: newId,
          time,
          room: selectedRoom.toUpperCase(),
          msg: msgs[selectedRoom] ?? 'Room accessed.',
          type: 'info',
        },
      ]);
      return newId;
    });
  }, [selectedRoom]);

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const ocColor = ocStatus === 'online' ? theme.colors.statusGreen : ocStatus === 'offline' ? theme.colors.statusRed : theme.colors.secondary;

  // Compute effective active state (from live data or static)
  const isRoomActive = agentActiveMap[selectedRoom] ?? room.active;

  return (
    <div className="dungeon-root">
      {/* Scan line */}
      {theme.scanLineStyle !== 'none' && <div className={`scan-line scan-line--${theme.scanLineStyle}`} />}
      {/* Grid background */}
      <div className="dungeon-bg-grid" />
      <div className="dungeon-bg-vignette" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="dungeon-header">
        <div className="header-left">
          <span className="header-dragon">🐉</span>
          <div>
            <div className="header-title">DUNGEON INTERFACE</div>
            <div className="header-sub">GRIM — DUNGEON MASTER COMMAND CONSOLE v2.0</div>
          </div>
        </div>
        <div className="header-right">
          <ThemeSwitcher />
          <div className="oc-status">
            <span
              className="status-dot"
              style={{ background: ocColor, boxShadow: `0 0 6px ${ocColor}` }}
            />
            <span style={{ color: ocColor, fontSize: 9, letterSpacing: '0.08em' }}>
              OPENCLAW {ocStatus.toUpperCase()}
            </span>
          </div>
          <div className="header-time"><LiveClock /></div>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="dungeon-main">
        {/* Left: Agent panel */}
        <aside className="dungeon-sidebar">
          <div className="agent-card" style={{ '--accent': room.color } as React.CSSProperties}>
            <div className="agent-card-top">
              <div className="agent-emoji">{room.emoji}</div>
              <div>
                <div className="agent-name" style={{ color: room.color }}>{room.agent}</div>
                <div className="agent-title">{room.title}</div>
                <div className="agent-model">⚙ {room.model}</div>
              </div>
            </div>

            <div className="agent-status">
              <span
                className="status-dot"
                style={{
                  background: isRoomActive ? theme.colors.statusGreen : theme.colors.secondary,
                  boxShadow: `0 0 6px ${isRoomActive ? theme.colors.statusGreen : theme.colors.secondary}`,
                }}
              />
              <span style={{ fontSize: 9, color: isRoomActive ? theme.colors.statusGreen : theme.colors.secondary, letterSpacing: '0.06em' }}>
                {room.status}
              </span>
            </div>

            <div className="agent-stats">
              {room.stats.map((s) => (
                <StatBar key={s.label} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>

            <div className="agent-abilities">
              {room.abilities.map((ab) => (
                <span
                  key={ab}
                  className="ability-tag"
                  style={{
                    borderColor: `rgba(${hexToRgbStr(room.color)}, 0.5)`,
                    color: room.color,
                  }}
                >
                  {ab}
                </span>
              ))}
            </div>
          </div>

          {/* Live agents from OpenClaw API */}
          {liveAgents.length > 0 && <AgentStatusPanel agents={liveAgents} />}

          {/* Screen watch panel when screen room selected */}
          {selectedRoom === 'screen' && (
            <div className="screen-watch-panel">
              <div className="sw-title">📺 NODE SCREEN FEED</div>
              <div className="sw-display">
                <div className="sw-placeholder">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                  <div style={{ fontSize: 10, color: theme.colors.statusOrange, letterSpacing: '0.08em' }}>FEED OFFLINE</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,102,0,0.5)', marginTop: 4 }}>
                    Connect a node with screen capture to stream here
                  </div>
                </div>
                {/* Scanlines */}
                <div className="sw-scanlines" />
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,102,0,0.5)', textAlign: 'center', marginTop: 6, letterSpacing: '0.06em' }}>
                TARGET: OPENCLAW NODE → SCREEN CAPTURE
              </div>
            </div>
          )}
        </aside>

        {/* Center: Isometric dungeon map */}
        <main className="dungeon-center">
          <div className="map-label">◈ DUNGEON MAP — ISOMETRIC VIEW</div>
          <div className="iso-map-container">
            <IsoDungeonMap
              onRoomSelect={setSelectedRoom}
              agentActiveMap={agentActiveMap}
              theme={theme}
            />
          </div>
        </main>

        {/* Right: Activity log */}
        <aside className="dungeon-log-panel">
          <div className="log-title">⬡ ACTIVITY LOG</div>
          <div className="log-entries">
            {log.map((entry) => (
              <div key={entry.id} className={`log-entry log-${entry.type}`}>
                <span className="log-time">{entry.time}</span>
                <span className="log-room">[{entry.room}]</span>
                <span className="log-msg">{entry.msg}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="log-footer">
            <span style={{ color: 'rgba(0,245,255,0.4)', fontSize: 8 }}>
              {log.length} ENTRIES — LIVE FEED
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function hexToRgbStr(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,245,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

export default App;
