import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

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
  active = false
) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  const alpha = active ? 0.95 : 0.75;

  // Top face (diamond)
  gfx.moveTo(x, y - hh);
  gfx.lineTo(x + hw, y);
  gfx.lineTo(x, y + hh);
  gfx.lineTo(x - hw, y);
  gfx.closePath();
  gfx.fill({ color: fillColor, alpha });
  gfx.stroke({ color: borderColor, width: 1.5, alpha: 0.9 });

  // Left face
  gfx.moveTo(x - hw, y);
  gfx.lineTo(x - hw, y + height);
  gfx.lineTo(x, y + hh + height);
  gfx.lineTo(x, y + hh);
  gfx.closePath();
  gfx.fill({ color: scaleColor(fillColor, 0.4), alpha });
  gfx.stroke({ color: borderColor, width: 1, alpha: 0.7 });

  // Right face
  gfx.moveTo(x + hw, y);
  gfx.lineTo(x + hw, y + height);
  gfx.lineTo(x, y + hh + height);
  gfx.lineTo(x, y + hh);
  gfx.closePath();
  gfx.fill({ color: scaleColor(fillColor, 0.55), alpha });
  gfx.stroke({ color: borderColor, width: 1, alpha: 0.7 });
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

// ─── Component ────────────────────────────────────────────────────────────────

export function IsoDungeonMap({
  onRoomSelect,
  agentActiveMap,
}: {
  onRoomSelect?: (id: string) => void;
  agentActiveMap?: Record<string, boolean>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const animFrameRef = useRef<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<string>('grim');
  const tickRef = useRef(0);
  const selectedRoomRef = useRef('grim');
  const agentActiveRef = useRef<Record<string, boolean>>({});

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
    if (!containerRef.current) return;

    const container = containerRef.current;
    const W = container.clientWidth || 800;
    const H = container.clientHeight || 520;

    const app = new PIXI.Application();

    (async () => {
      await app.init({
        width: W,
        height: H,
        background: 0x080810,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      appRef.current = app;
      container.appendChild(app.canvas as HTMLCanvasElement);

      // ── Background scanline grid layer ────────────────────────────────────
      const bgLayer = new PIXI.Container();
      app.stage.addChild(bgLayer);

      // Pulsing background grid using PixiJS graphics
      const bgGrid = new PIXI.Graphics();
      bgLayer.addChild(bgGrid);
      const scanLine = new PIXI.Graphics();
      bgLayer.addChild(scanLine);

      // ── Floor grid layer ──────────────────────────────────────────────────
      const gridLayer = new PIXI.Container();
      app.stage.addChild(gridLayer);

      // ── Connection layer ──────────────────────────────────────────────────
      const connLayer = new PIXI.Container();
      app.stage.addChild(connLayer);

      // ── Room layer ────────────────────────────────────────────────────────
      const roomLayer = new PIXI.Container();
      app.stage.addChild(roomLayer);

      // ── Glow layer ────────────────────────────────────────────────────────
      const glowLayer = new PIXI.Container();
      app.stage.addChildAt(glowLayer, app.stage.children.indexOf(roomLayer));

      // ── Label layer ───────────────────────────────────────────────────────
      const labelLayer = new PIXI.Container();
      app.stage.addChild(labelLayer);

      // ── Packet layer (above connections, below rooms) ──────────────────────
      const packetLayer = new PIXI.Container();
      app.stage.addChildAt(packetLayer, app.stage.children.indexOf(glowLayer));

      // ── Screen watch overlay layer (top) ──────────────────────────────────
      const overlayLayer = new PIXI.Container();
      app.stage.addChild(overlayLayer);

      // Centre offset
      const offsetX = W / 2;
      const offsetY = H * 0.28;

      // ── Draw static background grid ───────────────────────────────────────
      const gridSpacing = 40;
      for (let gx = 0; gx <= W; gx += gridSpacing) {
        bgGrid.moveTo(gx, 0);
        bgGrid.lineTo(gx, H);
        bgGrid.stroke({ color: 0x00f5ff, width: 0.5, alpha: 0.04 });
      }
      for (let gy = 0; gy <= H; gy += gridSpacing) {
        bgGrid.moveTo(0, gy);
        bgGrid.lineTo(W, gy);
        bgGrid.stroke({ color: 0x00f5ff, width: 0.5, alpha: 0.04 });
      }

      // ── Draw isometric floor grid ─────────────────────────────────────────
      const gridGfx = new PIXI.Graphics();
      gridLayer.addChild(gridGfx);

      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 3; r++) {
          const { x, y } = isoToScreen(c, r);
          gridGfx.moveTo(offsetX + x, offsetY + y - ISO_H / 2);
          gridGfx.lineTo(offsetX + x + ISO_W / 2, offsetY + y);
          gridGfx.lineTo(offsetX + x, offsetY + y + ISO_H / 2);
          gridGfx.lineTo(offsetX + x - ISO_W / 2, offsetY + y);
          gridGfx.closePath();
          gridGfx.fill({ color: 0x0c0c18, alpha: 0.9 });
          gridGfx.stroke({ color: 0x00f5ff, width: 0.4, alpha: 0.15 });
        }
      }

      // ── Build room positions map ───────────────────────────────────────────
      const roomPositions: Record<string, { x: number; y: number }> = {};
      ROOMS.forEach((room) => {
        const { x, y } = isoToScreen(room.col, room.row);
        roomPositions[room.id] = { x: offsetX + x, y: offsetY + y };
      });

      // ── Connection paths (precomputed) ─────────────────────────────────────
      const connPaths: Array<{
        from: { x: number; y: number };
        midX: number;
        midY: number;
        to: { x: number; y: number };
      }> = [];

      // ── Draw connections (circuit lines) ──────────────────────────────────
      const connGraphics: PIXI.Graphics[] = [];
      CONNECTIONS.forEach((conn) => {
        const from = roomPositions[conn.from];
        const to = roomPositions[conn.to];
        if (!from || !to) return;

        const midX = (from.x + to.x) / 2;
        const midY = from.y;

        connPaths.push({ from, midX, midY, to });

        // Glow outer line
        const gfx = new PIXI.Graphics();
        connLayer.addChild(gfx);
        gfx.moveTo(from.x, from.y);
        gfx.lineTo(midX, midY);
        gfx.lineTo(to.x, to.y);
        gfx.stroke({ color: 0x00f5ff, width: 2.5, alpha: 0.3 });
        connGraphics.push(gfx);

        // Bright core
        const core = new PIXI.Graphics();
        connLayer.addChild(core);
        core.moveTo(from.x, from.y);
        core.lineTo(midX, midY);
        core.lineTo(to.x, to.y);
        core.stroke({ color: 0x00ffff, width: 0.8, alpha: 0.6 });
      });

      // ── Create data packets ────────────────────────────────────────────────
      const packets: DataPacket[] = [];
      const packetColors = [0x00ffff, 0x00ff88, 0xffd700, 0xff6600, 0xaa44ff];

      for (let i = 0; i < CONNECTIONS.length; i++) {
        // 2 packets per connection, staggered
        for (let j = 0; j < 2; j++) {
          const gfx = new PIXI.Graphics();
          packetLayer.addChild(gfx);
          packets.push({
            connIndex: i,
            t: j * 0.5,
            speed: 0.003 + Math.random() * 0.002,
            color: packetColors[i % packetColors.length],
            gfx,
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

        drawRoomBlock(blockGfx, x, y, room.color, room.glowColor, 28, room.active);

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

        // Room name label
        const nameText = new PIXI.Text({
          text: room.label,
          style: {
            fontSize: 8,
            fill: room.glowColor,
            fontFamily: 'Share Tech Mono, monospace',
            letterSpacing: 1,
            align: 'center',
          },
        });
        nameText.anchor.set(0.5, 0);
        nameText.position.set(x, y + ISO_H / 2 + 32);
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

        blockGfx.on('pointerdown', () => {
          setSelectedRoom(room.id);
          onRoomSelect?.(room.id);
        });

        roomGraphics[room.id] = { block: blockGfx, glow: glowGfx, container: labelContainer, room };
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
        scanY = (scanY + 1.2) % H;
        scanLine.clear();
        scanLine.rect(0, scanY - 1, W, 2);
        scanLine.fill({ color: 0x00f5ff, alpha: 0.06 });
        scanLine.rect(0, scanY - 8, W, 16);
        scanLine.fill({ color: 0x00f5ff, alpha: 0.015 });

        // Animate rooms
        ROOMS.forEach((room) => {
          const entry = roomGraphics[room.id];
          if (!entry) return;
          const { glow } = entry;
          const { x, y } = roomPositions[room.id];
          const isSelected = selectedRoomRef.current === room.id;

          // Check if agent is marked active from external data
          const isActive = agentActiveRef.current[room.id] ?? room.active;

          // Reactive pulse: active agents pulse faster and brighter
          const pulseSpeed = isActive ? 2.2 : 0.8;
          const pulse = Math.sin(t * pulseSpeed + room.col * 0.7) * 0.5 + 0.5;
          const glowAlpha = isActive ? 0.20 + pulse * 0.28 : 0.05 + pulse * 0.08;
          const glowRadius = isActive ? 62 + pulse * 20 : 46 + pulse * 10;

          glow.clear();

          // Multiple glow passes for soft bloom
          for (let i = 3; i >= 1; i--) {
            const r = glowRadius * i * 0.55;
            const a = (glowAlpha / i) * (isSelected ? 2.0 : 1.0);
            glow.ellipse(x, y + 8, r, r * 0.42);
            glow.fill({ color: room.glowColor, alpha: Math.min(a, 0.65) });
          }

          // Selected room highlight ring
          if (isSelected) {
            const ringPulse = Math.sin(t * 3) * 0.5 + 0.5;
            glow.moveTo(x, y - ISO_H / 2 - 3);
            glow.lineTo(x + ISO_W / 2 + 3, y + 3);
            glow.lineTo(x, y + ISO_H / 2 + 3);
            glow.lineTo(x - ISO_W / 2 - 3, y + 3);
            glow.closePath();
            glow.stroke({ color: room.glowColor, width: 2, alpha: 0.6 + ringPulse * 0.4 });
          }

          // Extra "burst" effect when active
          if (isActive) {
            const burstAlpha = pulse * 0.12;
            glow.ellipse(x, y, glowRadius * 0.3, glowRadius * 0.14);
            glow.fill({ color: 0xffffff, alpha: burstAlpha });
          }
        });

        // Animate circuit lines
        connGraphics.forEach((g, i) => {
          const pulse = Math.sin(t * 1.5 + i * 0.9) * 0.5 + 0.5;
          g.alpha = 0.18 + pulse * 0.45;
        });

        // Animate data packets
        packets.forEach((pkt) => {
          pkt.t += pkt.speed;
          if (pkt.t > 1) pkt.t -= 1;

          const path = connPaths[pkt.connIndex];
          if (!path) return;

          const pos = lerpPos(path.from, path.midX, path.midY, path.to, pkt.t);

          pkt.gfx.clear();
          // Outer glow
          pkt.gfx.circle(pos.x, pos.y, 4.5);
          pkt.gfx.fill({ color: pkt.color, alpha: 0.25 });
          // Core dot
          pkt.gfx.circle(pos.x, pos.y, 2.2);
          pkt.gfx.fill({ color: pkt.color, alpha: 0.9 });
          // Bright center
          pkt.gfx.circle(pos.x, pos.y, 1);
          pkt.gfx.fill({ color: 0xffffff, alpha: 0.8 });
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* PixiJS canvas mount */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
                ? `0 0 12px rgba(${hexToRgb(room.glowColor)}, 0.3)`
                : 'none',
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
            background: 'rgba(8,8,16,0.9)',
            border: `1px solid rgba(${hexToRgb(activeRoom.glowColor)}, 0.5)`,
            borderRadius: 4,
            padding: '10px 14px',
            fontFamily: "'Share Tech Mono', monospace",
            minWidth: 180,
            boxShadow: `0 0 20px rgba(${hexToRgb(activeRoom.glowColor)}, 0.2)`,
          }}
        >
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
