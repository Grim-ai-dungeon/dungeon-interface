import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { Theme } from '../themes';

// ─── Ambient Effects Canvas ─────────────────────────────────────────────────────────────────────────────
// Renders per-theme particle effects as a transparent overlay canvas.
// Separate from PixiJS to avoid layer management complexity.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  life: number;  // 0..1
  phase: number; // random offset for twinkling
}

function AmbientCanvas({ themeId, width, height }: { themeId: string; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset particles when theme changes
    particlesRef.current = [];

    const W = width;
    const H = height;

    function spawnParticle(): Particle {
      switch (themeId) {
        case 'hellfire': {
          // Embers: rise from bottom, random x, orange/red
          return {
            x: Math.random() * W,
            y: H + 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.5 + Math.random() * 1.2),
            alpha: 0.6 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 2,
            life: 0,
            phase: Math.random() * Math.PI * 2,
          };
        }
        case 'arctic': {
          // Snowflakes: drift from top
          return {
            x: Math.random() * W,
            y: -4,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 0.4 + Math.random() * 0.8,
            alpha: 0.5 + Math.random() * 0.5,
            size: 1 + Math.random() * 2.5,
            life: 0,
            phase: Math.random() * Math.PI * 2,
          };
        }
        case 'deepspace': {
          // Stars: fixed positions that twinkle (use x/y as fixed, life as brightness)
          return {
            x: Math.random() * W,
            y: Math.random() * H,
            vx: 0,
            vy: 0,
            alpha: Math.random(),
            size: 0.5 + Math.random() * 1.5,
            life: Math.random(),
            phase: Math.random() * Math.PI * 2,
          };
        }
        default:
          return { x: 0, y: 0, vx: 0, vy: 0, alpha: 0, size: 0, life: 0, phase: 0 };
      }
    }

    // Pre-populate static stars for deepspace
    if (themeId === 'deepspace') {
      for (let i = 0; i < 120; i++) {
        particlesRef.current.push(spawnParticle());
      }
    }

    // Toxic wave state
    let toxicWaves: Array<{ r: number; alpha: number; maxR: number }> = [];
    let nextWaveAt = 0;

    function frame(ts: number) {
      ctx.clearRect(0, 0, W, H);
      tickRef.current = ts * 0.001;
      const t = tickRef.current;

      if (themeId === 'cyberpunk') {
        // CRT scanlines: horizontal lines sweeping
        const lineCount = Math.floor(H / 4);
        for (let i = 0; i < lineCount; i++) {
          const y = i * 4;
          ctx.fillStyle = 'rgba(0,245,255,0.018)';
          ctx.fillRect(0, y, W, 1);
        }
        // Sweeping bright scanline
        const sweepY = ((t * 80) % (H + 40)) - 20;
        const grad = ctx.createLinearGradient(0, sweepY - 12, 0, sweepY + 12);
        grad.addColorStop(0, 'rgba(0,245,255,0)');
        grad.addColorStop(0.5, 'rgba(0,245,255,0.07)');
        grad.addColorStop(1, 'rgba(0,245,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - 12, W, 24);

      } else if (themeId === 'hellfire') {
        // Spawn embers
        if (Math.random() < 0.35) {
          particlesRef.current.push(spawnParticle());
        }
        // Cap
        if (particlesRef.current.length > 90) {
          particlesRef.current = particlesRef.current.slice(-90);
        }
        // Update + draw
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx + Math.sin(t * 2 + p.phase) * 0.3;
          p.y += p.vy;
          p.life += 0.008;
          // Fade out as particle rises
          const fade = 1 - p.life;
          if (fade <= 0 || p.y < -8) return false;
          const a = p.alpha * fade;
          // Orange ember glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,120,0,${a * 0.25})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,60,${a})`;
          ctx.fill();
          return true;
        });

      } else if (themeId === 'arctic') {
        // Spawn snowflakes
        if (Math.random() < 0.30) {
          particlesRef.current.push(spawnParticle());
        }
        if (particlesRef.current.length > 80) {
          particlesRef.current = particlesRef.current.slice(-80);
        }
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx + Math.sin(t * 0.8 + p.phase) * 0.25;
          p.y += p.vy;
          p.life += 0.005;
          if (p.y > H + 8) return false;
          const a = p.alpha * Math.min(1, (1 - p.life) * 3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,230,255,${a})`;
          ctx.fill();
          return true;
        });

      } else if (themeId === 'deepspace') {
        // Twinkling stars — fixed positions, vary brightness
        particlesRef.current.forEach((p) => {
          p.phase += 0.012 + p.size * 0.008;
          const brightness = 0.3 + Math.abs(Math.sin(p.phase)) * 0.7;
          const a = brightness * 0.85;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,220,255,${a})`;
          ctx.fill();
          // Occasional bright star gets a small cross-gleam
          if (p.size > 1.2 && brightness > 0.8) {
            ctx.strokeStyle = `rgba(180,200,255,${a * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - p.size * 3, p.y);
            ctx.lineTo(p.x + p.size * 3, p.y);
            ctx.moveTo(p.x, p.y - p.size * 3);
            ctx.lineTo(p.x, p.y + p.size * 3);
            ctx.stroke();
          }
        });

      } else if (themeId === 'toxic') {
        // Radioactive pulse waves from center
        const cx = W / 2;
        const cy = H / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;

        if (ts > nextWaveAt) {
          toxicWaves.push({ r: 0, alpha: 0.55, maxR });
          nextWaveAt = ts + 1400 + Math.random() * 600;
        }

        toxicWaves = toxicWaves.filter((w) => {
          w.r += 1.6;
          w.alpha = 0.55 * (1 - w.r / w.maxR);
          if (w.r >= w.maxR || w.alpha <= 0) return false;

          // Draw triple rings for each wave
          for (let ring = 0; ring < 3; ring++) {
            const ringR = w.r - ring * 10;
            if (ringR <= 0) continue;
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(140,255,0,${w.alpha * (1 - ring * 0.3)})`;
            ctx.lineWidth = 2 - ring * 0.5;
            ctx.stroke();
          }
          return true;
        });

        // Faint radioactive glow at center
        const pulseBrightness = 0.04 + Math.abs(Math.sin(t * 1.5)) * 0.06;
        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
        radGrad.addColorStop(0, `rgba(140,255,0,${pulseBrightness})`);
        radGrad.addColorStop(1, 'rgba(140,255,0,0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, W, H);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, width, height]);

  if (!themeId || themeId === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  label: string;
  emoji: string;
  subtitle: string;
  col: number;
  row: number;
  color: number;
  glowColor: number;
  active: boolean;
}

interface Connection {
  from: string;
  to: string;
}

interface DataPacket {
  connIndex: number;
  t: number;        // 0..1 along the connection path
  speed: number;
  color: number;
  gfx: PIXI.Graphics;
  trailGfx: PIXI.Graphics;
  trail: Array<{ x: number; y: number }>;
}

interface TooltipInfo {
  roomId: string;
  screenX: number;
  screenY: number;
  name: string;
  status: string;
  task: string;
  glowColor: number;
}

// ─── Isometric helpers ────────────────────────────────────────────────────────

const ISO_W = 120;
const ISO_H = 60;

function isoToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (ISO_W / 2),
    y: (col + row) * (ISO_H / 2),
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoomBlock(
  gfx: PIXI.Graphics,
  x: number,
  y: number,
  fillColor: number,
  borderColor: number,
  height = 28,
  active = false,
  hoverLift = 0
) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  const alpha = active ? 0.95 : 0.75;
  const ly = y - hoverLift;

  // Top face (diamond)
  gfx.moveTo(x, ly - hh);
  gfx.lineTo(x + hw, ly);
  gfx.lineTo(x, ly + hh);
  gfx.lineTo(x - hw, ly);
  gfx.closePath();
  gfx.fill({ color: fillColor, alpha });
  gfx.stroke({ color: borderColor, width: 1.5, alpha: 0.9 });

  // Left face
  gfx.moveTo(x - hw, ly);
  gfx.lineTo(x - hw, ly + height);
  gfx.lineTo(x, ly + hh + height);
  gfx.lineTo(x, ly + hh);
  gfx.closePath();
  gfx.fill({ color: scaleColor(fillColor, 0.4), alpha });
  gfx.stroke({ color: borderColor, width: 1, alpha: 0.7 });

  // Right face
  gfx.moveTo(x + hw, ly);
  gfx.lineTo(x + hw, ly + height);
  gfx.lineTo(x, ly + hh + height);
  gfx.lineTo(x, ly + hh);
  gfx.closePath();
  gfx.fill({ color: scaleColor(fillColor, 0.55), alpha });
  gfx.stroke({ color: borderColor, width: 1, alpha: 0.7 });
}

function brightenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function scaleColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function lerpPos(
  from: { x: number; y: number },
  midX: number,
  midY: number,
  to: { x: number; y: number },
  t: number
): { x: number; y: number } {
  // Two-segment path: from -> mid -> to
  if (t < 0.5) {
    const tt = t * 2;
    return {
      x: from.x + (midX - from.x) * tt,
      y: from.y + (midY - from.y) * tt,
    };
  } else {
    const tt = (t - 0.5) * 2;
    return {
      x: midX + (to.x - midX) * tt,
      y: midY + (to.y - midY) * tt,
    };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: 'grim',
    label: 'COMMAND CENTER',
    emoji: '🐉',
    subtitle: 'GRIM — DUNGEON MASTER',
    col: 2,
    row: 0,
    color: 0x1a0a2e,
    glowColor: 0xffd700,
    active: true,
  },
  {
    id: 'bob',
    label: 'RESEARCH LAB',
    emoji: '🔍',
    subtitle: 'BOB — RESEARCH MINION',
    col: 0,
    row: 1,
    color: 0x0a1a2e,
    glowColor: 0x00f5ff,
    active: false,
  },
  {
    id: 'kevin',
    label: 'WORKSHOP',
    emoji: '🔧',
    subtitle: 'KEVIN — SYSTEM MINION',
    col: 4,
    row: 1,
    color: 0x0a2e0a,
    glowColor: 0x00ff88,
    active: true,
  },
  {
    id: 'screen',
    label: 'OBSERVATION DECK',
    emoji: '📺',
    subtitle: 'SCREEN WATCH ROOM',
    col: 2,
    row: 2,
    color: 0x1a1a0a,
    glowColor: 0xff6600,
    active: false,
  },
];

const CONNECTIONS: Connection[] = [
  { from: 'grim', to: 'bob' },
  { from: 'grim', to: 'kevin' },
  { from: 'grim', to: 'screen' },
  { from: 'bob', to: 'screen' },
  { from: 'kevin', to: 'screen' },
];

// ─── Agent info for hover tooltips ──────────────────────────────────────────

const ROOM_AGENT_INFO: Record<string, { name: string; status: string; task: string }> = {
  grim: { name: 'GRIM', status: 'ACTIVE', task: 'Overseeing dungeon ops' },
  bob: { name: 'BOB', status: 'IDLE', task: 'Awaiting research orders' },
  kevin: { name: 'KEVIN', status: 'ACTIVE', task: 'Visual effects — UI polish' },
  screen: { name: 'SCREEN WATCH', status: 'OFFLINE', task: 'No node stream' },
};

// ─── Tooltip component ────────────────────────────────────────────────────────

function RoomTooltip({ tooltip }: { tooltip: TooltipInfo }) {
  const gc = '#' + tooltip.glowColor.toString(16).padStart(6, '0');
  const statusColor = tooltip.status === 'ACTIVE' ? '#00ff88' : tooltip.status === 'OFFLINE' ? '#ff4444' : '#ffd700';
  return (
    <div style={{
      position: 'absolute',
      left: tooltip.screenX + 18,
      top: Math.max(8, tooltip.screenY - 44),
      background: 'rgba(4,4,12,0.97)',
      border: `1px solid ${gc}88`,
      borderRadius: 4,
      padding: '8px 12px',
      pointerEvents: 'none',
      zIndex: 20,
      minWidth: 165,
      boxShadow: `0 0 20px ${gc}33, 0 4px 20px rgba(0,0,0,0.8)`,
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      {/* HUD corner brackets */}
      <div style={{ position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderTop: `1.5px solid ${gc}`, borderLeft: `1.5px solid ${gc}` }} />
      <div style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderTop: `1.5px solid ${gc}`, borderRight: `1.5px solid ${gc}` }} />
      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 7, height: 7, borderBottom: `1.5px solid ${gc}`, borderLeft: `1.5px solid ${gc}` }} />
      <div style={{ position: 'absolute', bottom: 3, right: 3, width: 7, height: 7, borderBottom: `1.5px solid ${gc}`, borderRight: `1.5px solid ${gc}` }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: gc, letterSpacing: '0.12em', marginBottom: 5 }}>{tooltip.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, boxShadow: `0 0 4px ${statusColor}`, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 8, color: statusColor, letterSpacing: '0.08em' }}>{tooltip.status}</span>
      </div>
      <div style={{ fontSize: 8, color: 'rgba(200,220,255,0.65)', letterSpacing: '0.05em', lineHeight: 1.6 }}>{tooltip.task}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IsoDungeonMap({
  onRoomSelect,
  agentActiveMap,
  theme,
}: {
  onRoomSelect?: (id: string) => void;
  agentActiveMap?: Record<string, boolean>;
  theme?: Theme;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const animFrameRef = useRef<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<string>('grim');
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 800, h: 520 });
  const tickRef = useRef(0);
  const selectedRoomRef = useRef('grim');
  const agentActiveRef = useRef<Record<string, boolean>>({});
  const themeRef = useRef<Theme | undefined>(theme);

  // Hover state for tooltips + lift effect
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const hoveredRoomRef = useRef<string | null>(null);
  const hoverLiftRef = useRef<Record<string, number>>({});

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const zoomRef = useRef(1.0);
  const stageContainerRef = useRef<PIXI.Container | null>(null);
  const roomPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const handleZoomIn = useCallback(() => setZoomLevel((z) => Math.min(2.0, Math.round((z + 0.15) * 100) / 100)), []);
  const handleZoomOut = useCallback(() => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100)), []);
  const handleZoomReset = useCallback(() => setZoomLevel(1.0), []);

  // Keep refs in sync for use inside ticker
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    if (agentActiveMap) {
      agentActiveRef.current = agentActiveMap;
    }
  }, [agentActiveMap]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Apply zoom to PixiJS stage
  useEffect(() => {
    zoomRef.current = zoomLevel;
    if (stageContainerRef.current && appRef.current) {
      const app = appRef.current;
      const W = app.screen.width;
      const H = app.screen.height;
      const sc = stageContainerRef.current;
      sc.scale.set(zoomLevel);
      sc.x = (W - W * zoomLevel) / 2;
      sc.y = (H - H * zoomLevel) / 2;
    }
  }, [zoomLevel]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const W = container.clientWidth || 800;
    const H = container.clientHeight || 520;

    const app = new PIXI.Application();

    (async () => {
      const initTheme = themeRef.current;
      await app.init({
        width: W,
        height: H,
        background: (initTheme?.pixi?.bgColor ?? 0x080810) as number,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      appRef.current = app;
      container.appendChild(app.canvas as HTMLCanvasElement);
      setCanvasSize({ w: W, h: H });

      // ── Zoomable stage container ───────────────────────────────────────────
      const stageContainer = new PIXI.Container();
      app.stage.addChild(stageContainer);
      stageContainerRef.current = stageContainer;

      // ── Background scanline grid layer ────────────────────────────────────
      const bgLayer = new PIXI.Container();
      stageContainer.addChild(bgLayer);

      // Pulsing background grid using PixiJS graphics
      const bgGrid = new PIXI.Graphics();
      bgLayer.addChild(bgGrid);
      const scanLine = new PIXI.Graphics();
      bgLayer.addChild(scanLine);

      // ── Floor grid layer ──────────────────────────────────────────────────
      const gridLayer = new PIXI.Container();
      stageContainer.addChild(gridLayer);

      // ── Connection layer ──────────────────────────────────────────────────
      const connLayer = new PIXI.Container();
      stageContainer.addChild(connLayer);

      // ── Room layer ────────────────────────────────────────────────────────
      const roomLayer = new PIXI.Container();
      stageContainer.addChild(roomLayer);

      // ── Glow layer ────────────────────────────────────────────────────────
      const glowLayer = new PIXI.Container();
      stageContainer.addChildAt(glowLayer, stageContainer.children.indexOf(roomLayer));

      // ── Label layer ───────────────────────────────────────────────────────
      const labelLayer = new PIXI.Container();
      stageContainer.addChild(labelLayer);

      // ── Packet layer (above connections, below rooms) ──────────────────────
      const packetLayer = new PIXI.Container();
      stageContainer.addChildAt(packetLayer, stageContainer.children.indexOf(glowLayer));

      // ── Screen watch overlay layer (top) ──────────────────────────────────
      const overlayLayer = new PIXI.Container();
      stageContainer.addChild(overlayLayer);

      // Centre offset
      const offsetX = W / 2;
      const offsetY = H * 0.28;

      // ── Draw static background grid ───────────────────────────────────────
      const gridSpacing = 40;
      const gridCol = initTheme?.pixi?.gridColor ?? 0x00f5ff;
      const gridAlpha = initTheme?.pixi?.gridAlpha ?? 0.04;
      for (let gx = 0; gx <= W; gx += gridSpacing) {
        bgGrid.moveTo(gx, 0);
        bgGrid.lineTo(gx, H);
        bgGrid.stroke({ color: gridCol, width: 0.5, alpha: gridAlpha });
      }
      for (let gy = 0; gy <= H; gy += gridSpacing) {
        bgGrid.moveTo(0, gy);
        bgGrid.lineTo(W, gy);
        bgGrid.stroke({ color: gridCol, width: 0.5, alpha: gridAlpha });
      }

      // ── Draw isometric floor grid ─────────────────────────────────────────
      const gridGfx = new PIXI.Graphics();
      gridLayer.addChild(gridGfx);

      const floorFill = initTheme?.pixi?.floorFill ?? 0x0c0c18;
      const floorBorder = initTheme?.pixi?.floorBorder ?? 0x00f5ff;
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 3; r++) {
          const { x, y } = isoToScreen(c, r);
          gridGfx.moveTo(offsetX + x, offsetY + y - ISO_H / 2);
          gridGfx.lineTo(offsetX + x + ISO_W / 2, offsetY + y);
          gridGfx.lineTo(offsetX + x, offsetY + y + ISO_H / 2);
          gridGfx.lineTo(offsetX + x - ISO_W / 2, offsetY + y);
          gridGfx.closePath();
          gridGfx.fill({ color: floorFill, alpha: 0.9 });
          gridGfx.stroke({ color: floorBorder, width: 0.4, alpha: 0.15 });
        }
      }

      // ── Build room positions map ───────────────────────────────────────────
      const roomPositions: Record<string, { x: number; y: number }> = {};
      ROOMS.forEach((room) => {
        const { x, y } = isoToScreen(room.col, room.row);
        roomPositions[room.id] = { x: offsetX + x, y: offsetY + y };
      });
      roomPositionsRef.current = roomPositions;

      // ── Connection paths (precomputed) ─────────────────────────────────────
      const connPaths: Array<{
        from: { x: number; y: number };
        midX: number;
        midY: number;
        to: { x: number; y: number };
      }> = [];

      // ── Draw connections (circuit lines) ──────────────────────────────────
      const connGraphics: PIXI.Graphics[] = [];
      const connDashGraphics: PIXI.Graphics[] = [];
      const connColor = initTheme?.pixi?.connColor ?? 0x00f5ff;
      const connCoreColor = initTheme?.pixi?.connCoreColor ?? 0x00ffff;
      CONNECTIONS.forEach((conn) => {
        const from = roomPositions[conn.from];
        const to = roomPositions[conn.to];
        if (!from || !to) return;

        const midX = (from.x + to.x) / 2;
        const midY = from.y;

        connPaths.push({ from, midX, midY, to });

        // Glow base line (static, fades in/out)
        const gfx = new PIXI.Graphics();
        connLayer.addChild(gfx);
        gfx.moveTo(from.x, from.y);
        gfx.lineTo(midX, midY);
        gfx.lineTo(to.x, to.y);
        gfx.stroke({ color: connColor, width: 4, alpha: 0.1 });
        connGraphics.push(gfx);

        // Animated dash line (cleared and redrawn every tick with offset)
        const dashGfx = new PIXI.Graphics();
        connLayer.addChild(dashGfx);
        connDashGraphics.push(dashGfx);

        // Node dots at connection points (from, mid, to)
        const nodeGfx = new PIXI.Graphics();
        connLayer.addChild(nodeGfx);
        [from, { x: midX, y: midY }, to].forEach((pos) => {
          nodeGfx.circle(pos.x, pos.y, 5.5);
          nodeGfx.fill({ color: connColor, alpha: 0.12 });
          nodeGfx.stroke({ color: connColor, width: 1, alpha: 0.55 });
          nodeGfx.circle(pos.x, pos.y, 2.5);
          nodeGfx.fill({ color: connCoreColor, alpha: 0.85 });
        });
      });

      // ── Create data packets ────────────────────────────────────────────────
      const packets: DataPacket[] = [];
      const packetColors = initTheme?.pixi?.packetColors ?? [0x00ffff, 0x00ff88, 0xffd700, 0xff6600, 0xaa44ff];

      for (let i = 0; i < CONNECTIONS.length; i++) {
        // 2 packets per connection, staggered
        for (let j = 0; j < 2; j++) {
          const trailGfx = new PIXI.Graphics();
          packetLayer.addChild(trailGfx);
          const pktGfx = new PIXI.Graphics();
          packetLayer.addChild(pktGfx);
          packets.push({
            connIndex: i,
            t: j * 0.5,
            speed: 0.003 + Math.random() * 0.002,
            color: packetColors[i % packetColors.length],
            gfx: pktGfx,
            trailGfx,
            trail: [],
          });
        }
      }

      // ── Draw rooms + labels ───────────────────────────────────────────────
      const roomGraphics: Record<string, {
        block: PIXI.Graphics;
        glow: PIXI.Graphics;
        container: PIXI.Container;
        room: Room;
      }> = {};

      ROOMS.forEach((room) => {
        const { x, y } = roomPositions[room.id];

        // Glow halo
        const glowGfx = new PIXI.Graphics();
        glowLayer.addChild(glowGfx);

        // Room block
        const blockGfx = new PIXI.Graphics();
        blockGfx.eventMode = 'static';
        blockGfx.cursor = 'pointer';
        roomLayer.addChild(blockGfx);

        const roomThemeData = initTheme?.pixi?.rooms?.[room.id];
        const roomFillColor = roomThemeData?.color ?? room.color;
        const roomGlowColor = roomThemeData?.glowColor ?? room.glowColor;
        drawRoomBlock(blockGfx, x, y, roomFillColor, roomGlowColor, 28, room.active, 0);

        // Labels
        const labelContainer = new PIXI.Container();
        labelLayer.addChild(labelContainer);

        const emojiText = new PIXI.Text({
          text: room.emoji,
          style: { fontSize: 20, align: 'center' },
        });
        emojiText.anchor.set(0.5, 0.5);
        emojiText.position.set(x, y - 8);
        labelContainer.addChild(emojiText);

        // Room name label — styled badge below the block
        const labelY = y + ISO_H / 2 + 40;
        const labelText = room.label;

        // Approximate text width for Share Tech Mono at fontSize 9
        const approxTextW = labelText.length * 6.4;
        const padX = 10;
        const bgW = approxTextW + padX * 2;
        const bgH = 16;

        // Background badge with border and corner ticks
        const labelBg = new PIXI.Graphics();
        // Glow halo
        labelBg.rect(x - bgW / 2 - 2, labelY - bgH / 2 - 2, bgW + 4, bgH + 4);
        labelBg.fill({ color: roomGlowColor, alpha: 0.1 });
        // Dark fill
        labelBg.rect(x - bgW / 2, labelY - bgH / 2, bgW, bgH);
        labelBg.fill({ color: 0x000000, alpha: 0.82 });
        // Border
        labelBg.rect(x - bgW / 2, labelY - bgH / 2, bgW, bgH);
        labelBg.stroke({ color: roomGlowColor, width: 1, alpha: 0.65 });
        // Corner ticks (top-left)
        const tk = 5;
        labelBg.moveTo(x - bgW / 2, labelY - bgH / 2 + tk);
        labelBg.lineTo(x - bgW / 2, labelY - bgH / 2);
        labelBg.lineTo(x - bgW / 2 + tk, labelY - bgH / 2);
        labelBg.stroke({ color: roomGlowColor, width: 1.5, alpha: 0.9 });
        // Corner ticks (top-right)
        labelBg.moveTo(x + bgW / 2 - tk, labelY - bgH / 2);
        labelBg.lineTo(x + bgW / 2, labelY - bgH / 2);
        labelBg.lineTo(x + bgW / 2, labelY - bgH / 2 + tk);
        labelBg.stroke({ color: roomGlowColor, width: 1.5, alpha: 0.9 });
        labelContainer.addChild(labelBg);

        const nameText = new PIXI.Text({
          text: labelText,
          style: {
            fontSize: 9,
            fill: roomGlowColor,
            fontFamily: 'Share Tech Mono, monospace',
            letterSpacing: 1.5,
            align: 'center',
          },
        });
        nameText.anchor.set(0.5, 0.5);
        nameText.position.set(x, labelY);
        labelContainer.addChild(nameText);

        // Invisible click hit area
        const hitArea = new PIXI.Graphics();
        hitArea.eventMode = 'static';
        hitArea.cursor = 'pointer';
        labelLayer.addChild(hitArea);
        hitArea.moveTo(x, y - ISO_H / 2 - 28);
        hitArea.lineTo(x + ISO_W / 2 + 4, y + 4);
        hitArea.lineTo(x, y + ISO_H / 2 + 28);
        hitArea.lineTo(x - ISO_W / 2 - 4, y + 4);
        hitArea.closePath();
        hitArea.fill({ color: 0xffffff, alpha: 0.001 });

        hitArea.on('pointerdown', () => {
          setSelectedRoom(room.id);
          onRoomSelect?.(room.id);
        });

        hitArea.on('pointerover', (e) => {
          hoveredRoomRef.current = room.id;
          const agentInfo = ROOM_AGENT_INFO[room.id] ?? { name: room.id.toUpperCase(), status: 'UNKNOWN', task: '' };
          setTooltip({
            roomId: room.id,
            screenX: e.global.x,
            screenY: e.global.y,
            name: agentInfo.name,
            status: agentInfo.status,
            task: agentInfo.task,
            glowColor: roomGlowColor,
          });
        });

        hitArea.on('pointermove', (e) => {
          setTooltip((prev) => prev ? { ...prev, screenX: e.global.x, screenY: e.global.y } : prev);
        });

        hitArea.on('pointerout', () => {
          if (hoveredRoomRef.current === room.id) {
            hoveredRoomRef.current = null;
          }
          setTooltip(null);
        });

        blockGfx.on('pointerdown', () => {
          setSelectedRoom(room.id);
          onRoomSelect?.(room.id);
        });

        roomGraphics[room.id] = { block: blockGfx, glow: glowGfx, container: labelContainer, room: { ...room, color: roomFillColor, glowColor: roomGlowColor } };
      });

      // ── Screen Watch overlay in Observation Deck room ─────────────────────
      const screenPos = roomPositions['screen'];
      if (screenPos) {
        const sw = new PIXI.Graphics();
        overlayLayer.addChild(sw);
        const swW = 64;
        const swH = 38;
        sw.rect(screenPos.x - swW / 2, screenPos.y - 52, swW, swH);
        sw.fill({ color: 0x000000, alpha: 0.85 });
        sw.rect(screenPos.x - swW / 2, screenPos.y - 52, swW, swH);
        sw.stroke({ color: 0xff6600, width: 1, alpha: 0.7 });

        const feedText = new PIXI.Text({
          text: 'FEED\nOFFLINE',
          style: {
            fontSize: 7,
            fill: 0xff6600,
            fontFamily: 'Share Tech Mono, monospace',
            align: 'center',
            letterSpacing: 1,
          },
        });
        feedText.anchor.set(0.5, 0.5);
        feedText.position.set(screenPos.x, screenPos.y - 52 + swH / 2);
        overlayLayer.addChild(feedText);

        // Scanlines overlay on feed
        for (let sl = 0; sl < swH; sl += 3) {
          const line = new PIXI.Graphics();
          overlayLayer.addChild(line);
          line.rect(screenPos.x - swW / 2, screenPos.y - 52 + sl, swW, 1);
          line.fill({ color: 0x000000, alpha: 0.4 });
        }
      }

      // ── Scanline sweeper (animated) ───────────────────────────────────────
      let scanY = 0;

      // ── Tick ──────────────────────────────────────────────────────────────
      app.ticker.add(() => {
        tickRef.current += 0.025;
        const t = tickRef.current;

        // Animate scan line
        const scanCol = themeRef.current?.pixi?.scanLineColor ?? 0x00f5ff;
        scanY = (scanY + 1.2) % H;
        scanLine.clear();
        scanLine.rect(0, scanY - 1, W, 2);
        scanLine.fill({ color: scanCol, alpha: 0.06 });
        scanLine.rect(0, scanY - 8, W, 16);
        scanLine.fill({ color: scanCol, alpha: 0.015 });

        // Animate rooms — hover lift + glow
        ROOMS.forEach((room) => {
          const entry = roomGraphics[room.id];
          if (!entry) return;
          const { block, glow } = entry;
          const { x, y } = roomPositions[room.id];
          const isSelected = selectedRoomRef.current === room.id;
          const isHovered = hoveredRoomRef.current === room.id;

          // Check if agent is marked active from external data
          const isActive = agentActiveRef.current[room.id] ?? room.active;

          // Hover lift: smoothly animate the lift amount
          const targetLift = isHovered ? 8 : 0;
          const currentLift = hoverLiftRef.current[room.id] ?? 0;
          const newLift = currentLift + (targetLift - currentLift) * 0.18;
          hoverLiftRef.current[room.id] = newLift;

          // Redraw block with hover lift
          if (Math.abs(newLift - currentLift) > 0.05) {
            const roomThemeData = themeRef.current?.pixi?.rooms?.[room.id];
            const roomFillColor = roomThemeData?.color ?? room.color;
            const roomGlowColor = roomThemeData?.glowColor ?? room.glowColor;
            block.clear();
            const hoverBrighten = isHovered ? 1.35 : 1.0;
            drawRoomBlock(block, x, y, brightenColor(roomFillColor, hoverBrighten), brightenColor(roomGlowColor, hoverBrighten), 28, isActive, newLift);
          }

          // Reactive pulse: active agents pulse faster and brighter
          const pulseSpeed = isActive ? 2.2 : 0.8;
          const pulse = Math.sin(t * pulseSpeed + room.col * 0.7) * 0.5 + 0.5;
          const hoverGlowBoost = isHovered ? 1.8 : 1.0;
          const glowAlpha = (isActive ? 0.20 + pulse * 0.28 : 0.05 + pulse * 0.08) * hoverGlowBoost;
          const glowRadius = (isActive ? 62 + pulse * 20 : 46 + pulse * 10) * (isHovered ? 1.25 : 1.0);

          glow.clear();

          // Multiple glow passes for soft bloom
          for (let i = 3; i >= 1; i--) {
            const r = glowRadius * i * 0.55;
            const a = (glowAlpha / i) * (isSelected ? 2.0 : 1.0);
            glow.ellipse(x, y + 8 - newLift * 0.5, r, r * 0.42);
            glow.fill({ color: room.glowColor, alpha: Math.min(a, 0.75) });
          }

          // Selected room highlight ring
          if (isSelected) {
            const ringPulse = Math.sin(t * 3) * 0.5 + 0.5;
            glow.moveTo(x, y - ISO_H / 2 - 3 - newLift);
            glow.lineTo(x + ISO_W / 2 + 3, y + 3 - newLift);
            glow.lineTo(x, y + ISO_H / 2 + 3 - newLift);
            glow.lineTo(x - ISO_W / 2 - 3, y + 3 - newLift);
            glow.closePath();
            glow.stroke({ color: room.glowColor, width: 2, alpha: 0.6 + ringPulse * 0.4 });
          }

          // Hover ring highlight
          if (isHovered && !isSelected) {
            glow.moveTo(x, y - ISO_H / 2 - 2 - newLift);
            glow.lineTo(x + ISO_W / 2 + 2, y + 2 - newLift);
            glow.lineTo(x, y + ISO_H / 2 + 2 - newLift);
            glow.lineTo(x - ISO_W / 2 - 2, y + 2 - newLift);
            glow.closePath();
            glow.stroke({ color: room.glowColor, width: 1.5, alpha: 0.5 });
          }

          // Extra "burst" effect when active
          if (isActive) {
            const burstAlpha = pulse * 0.12;
            glow.ellipse(x, y - newLift, glowRadius * 0.3, glowRadius * 0.14);
            glow.fill({ color: 0xffffff, alpha: burstAlpha });
          }
        });

        // Animate circuit lines (glow pulse)
        connGraphics.forEach((g, i) => {
          const pulse = Math.sin(t * 1.5 + i * 0.9) * 0.5 + 0.5;
          g.alpha = 0.12 + pulse * 0.35;
        });

        // Animate dash lines (march effect)
        connDashGraphics.forEach((dashGfx, i) => {
          const path = connPaths[i];
          if (!path) return;
          dashGfx.clear();

          const pulse = Math.sin(t * 1.5 + i * 0.9) * 0.5 + 0.5;
          const dashAlpha = 0.4 + pulse * 0.5;

          // Draw dashes along each segment of the L-shaped path
          const dashLen = 12;
          const gapLen = 8;
          const totalUnit = dashLen + gapLen;
          const marchOffset = (t * 30) % totalUnit;

          // Segment 1: from -> mid
          const seg1Dx = path.midX - path.from.x;
          const seg1Dy = path.midY - path.from.y;
          const seg1Len = Math.sqrt(seg1Dx * seg1Dx + seg1Dy * seg1Dy);
          if (seg1Len > 0) {
            const ux = seg1Dx / seg1Len; const uy = seg1Dy / seg1Len;
            let d = -marchOffset;
            while (d < seg1Len) {
              const d0 = Math.max(0, d);
              const d1 = Math.min(seg1Len, d + dashLen);
              if (d1 > d0) {
                dashGfx.moveTo(path.from.x + ux * d0, path.from.y + uy * d0);
                dashGfx.lineTo(path.from.x + ux * d1, path.from.y + uy * d1);
                dashGfx.stroke({ color: connCoreColor, width: 1.5, alpha: dashAlpha });
              }
              d += totalUnit;
            }
          }

          // Segment 2: mid -> to
          const seg2Dx = path.to.x - path.midX;
          const seg2Dy = path.to.y - path.midY;
          const seg2Len = Math.sqrt(seg2Dx * seg2Dx + seg2Dy * seg2Dy);
          if (seg2Len > 0) {
            const ux = seg2Dx / seg2Len; const uy = seg2Dy / seg2Len;
            let d = -(marchOffset + (seg1Len % totalUnit));
            while (d < seg2Len) {
              const d0 = Math.max(0, d);
              const d1 = Math.min(seg2Len, d + dashLen);
              if (d1 > d0) {
                dashGfx.moveTo(path.midX + ux * d0, path.midY + uy * d0);
                dashGfx.lineTo(path.midX + ux * d1, path.midY + uy * d1);
                dashGfx.stroke({ color: connCoreColor, width: 1.5, alpha: dashAlpha });
              }
              d += totalUnit;
            }
          }
        });

        // Animate data packets with trails
        packets.forEach((pkt) => {
          pkt.t += pkt.speed;
          if (pkt.t > 1) pkt.t -= 1;

          const path = connPaths[pkt.connIndex];
          if (!path) return;

          const pos = lerpPos(path.from, path.midX, path.midY, path.to, pkt.t);

          // Update trail
          pkt.trail.push({ x: pos.x, y: pos.y });
          if (pkt.trail.length > 14) pkt.trail.shift();

          // Draw trail afterglow
          pkt.trailGfx.clear();
          for (let i = 0; i < pkt.trail.length - 1; i++) {
            const trailAlpha = (i / pkt.trail.length) * 0.55;
            const trailRadius = 1.0 + (i / pkt.trail.length) * 2.5;
            pkt.trailGfx.circle(pkt.trail[i].x, pkt.trail[i].y, trailRadius);
            pkt.trailGfx.fill({ color: pkt.color, alpha: trailAlpha });
          }

          pkt.gfx.clear();
          // Outer glow halo
          pkt.gfx.circle(pos.x, pos.y, 5.5);
          pkt.gfx.fill({ color: pkt.color, alpha: 0.2 });
          // Core dot
          pkt.gfx.circle(pos.x, pos.y, 2.5);
          pkt.gfx.fill({ color: pkt.color, alpha: 0.92 });
          // Bright center
          pkt.gfx.circle(pos.x, pos.y, 1.1);
          pkt.gfx.fill({ color: 0xffffff, alpha: 0.9 });
        });
      });
    })();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  const activeRoom = ROOMS.find((r) => r.id === selectedRoom);

  const gc = activeRoom ? '#' + activeRoom.glowColor.toString(16).padStart(6, '0') : '#00f5ff';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* HUD corner brackets — main container */}
      <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderTop: `1.5px solid ${gc}88`, borderLeft: `1.5px solid ${gc}88`, pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderTop: `1.5px solid ${gc}88`, borderRight: `1.5px solid ${gc}88`, pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 46, left: 6, width: 14, height: 14, borderBottom: `1.5px solid ${gc}88`, borderLeft: `1.5px solid ${gc}88`, pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 46, right: 6, width: 14, height: 14, borderBottom: `1.5px solid ${gc}88`, borderRight: `1.5px solid ${gc}88`, pointerEvents: 'none', zIndex: 10 }} />

      {/* PixiJS canvas mount */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Per-theme ambient particle effects */}
      <AmbientCanvas
        themeId={theme?.id ?? 'cyberpunk'}
        width={canvasSize.w}
        height={canvasSize.h}
      />

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 15,
        }}
      >
        {[
          { label: '+', action: handleZoomIn, title: 'Zoom in' },
          { label: '−', action: handleZoomOut, title: 'Zoom out' },
          { label: '⊙', action: handleZoomReset, title: 'Reset zoom' },
        ].map(({ label, action, title }) => (
          <button
            key={label}
            onClick={action}
            title={title}
            style={{
              width: 24,
              height: 24,
              background: 'rgba(8,8,20,0.88)',
              border: `1px solid ${gc}55`,
              borderRadius: 3,
              color: gc,
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 13,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              boxShadow: `0 0 6px ${gc}22`,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${gc}22`;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${gc}55`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,8,20,0.88)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 6px ${gc}22`;
            }}
          >
            {label}
          </button>
        ))}
        {/* Zoom level display */}
        <div style={{
          fontSize: 7,
          color: `${gc}88`,
          textAlign: 'center',
          letterSpacing: '0.05em',
          fontFamily: "'Share Tech Mono', monospace",
          marginTop: 2,
        }}>
          {Math.round(zoomLevel * 100)}%
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && <RoomTooltip tooltip={tooltip} />}

      {/* Room selector tabs */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 16px',
          background: 'linear-gradient(to top, rgba(8,8,16,0.95) 60%, transparent)',
          pointerEvents: 'none',
        }}
      >
        {ROOMS.map((room) => (
          <button
            key={room.id}
            onClick={() => {
              setSelectedRoom(room.id);
              onRoomSelect?.(room.id);
            }}
            style={{
              pointerEvents: 'all',
              background: selectedRoom === room.id
                ? `rgba(${hexToRgb(room.glowColor)}, 0.18)`
                : 'rgba(12,12,24,0.85)',
              border: `1px solid rgba(${hexToRgb(room.glowColor)}, ${selectedRoom === room.id ? 0.9 : 0.3})`,
              borderRadius: 3,
              color: selectedRoom === room.id ? '#fff' : 'rgba(0,245,255,0.6)',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              padding: '5px 12px',
              cursor: 'pointer',
              textShadow: selectedRoom === room.id
                ? `0 0 8px rgba(${hexToRgb(room.glowColor)}, 0.8)`
                : 'none',
              boxShadow: selectedRoom === room.id
                ? `0 0 12px rgba(${hexToRgb(room.glowColor)}, 0.3), 0 2px 8px rgba(0,0,0,0.6)`
                : '0 2px 6px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {room.emoji} {room.id.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Selected room info overlay */}
      {activeRoom && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(6,6,14,0.94)',
            border: `1px solid rgba(${hexToRgb(activeRoom.glowColor)}, 0.55)`,
            borderRadius: 4,
            padding: '10px 14px',
            fontFamily: "'Share Tech Mono', monospace",
            minWidth: 180,
            boxShadow: `0 0 24px rgba(${hexToRgb(activeRoom.glowColor)}, 0.25), 0 4px 20px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.2)`,
            zIndex: 15,
          }}
        >
          {/* HUD corner brackets on room info card */}
          <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderTop: `1.5px solid ${gc}`, borderLeft: `1.5px solid ${gc}` }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderTop: `1.5px solid ${gc}`, borderRight: `1.5px solid ${gc}` }} />
          <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, borderBottom: `1.5px solid ${gc}`, borderLeft: `1.5px solid ${gc}` }} />
          <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderBottom: `1.5px solid ${gc}`, borderRight: `1.5px solid ${gc}` }} />
          <div style={{ fontSize: 22, marginBottom: 4 }}>{activeRoom.emoji}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', marginBottom: 2 }}>
            {activeRoom.label}
          </div>
          <div style={{ fontSize: 9, color: `rgba(${hexToRgb(activeRoom.glowColor)}, 0.8)`, letterSpacing: '0.06em' }}>
            {activeRoom.subtitle}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: activeRoom.active ? '#00ff88' : '#ffd700' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: activeRoom.active ? '#00ff88' : '#ffd700',
                boxShadow: `0 0 6px ${activeRoom.active ? '#00ff88' : '#ffd700'}`,
                display: 'inline-block',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            {activeRoom.active ? 'ACTIVE' : 'IDLE'}
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `${r},${g},${b}`;
}
