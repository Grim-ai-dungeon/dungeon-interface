// ─── DungeonMap.tsx — Canvas-based 2D top-down dungeon ───────────────────────

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { AgentId, AgentInfo } from '../types';
import { ROOMS, CORRIDORS, CANVAS_W, CANVAS_H, roomCenter, roomPixelBounds, GRID_COLS, GRID_ROWS } from '../dungeon/rooms';
import { TILE_SIZE, drawFloorTile, drawWallTile, drawRoomBorder, drawCorridorFloor } from '../dungeon/tiles';
import { getRoomTorches, getCorridorTorches, drawTorchSprite, applyLighting, generateTorchSparks } from '../dungeon/lighting';
import { ParticleSystem } from '../dungeon/particles';
import { drawAgentSprite } from './AgentSprite';
import { CorridorMessenger } from '../dungeon/corridorMessenger';
import { EventPulseSystem } from '../dungeon/eventPulse';
import type { PulseKind } from '../dungeon/eventPulse';

export interface PulseHandle {
  fire: (agentId: AgentId, kind: PulseKind) => void;
}

interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onRoomClick: (id: AgentId) => void;
  onRoomHover: (id: AgentId | null) => void;
  /** Optional imperative handle — caller can use this to fire pulses directly */
  pulseHandleRef?: React.MutableRefObject<PulseHandle | null>;
}

const ROOM_LABEL_COLORS: Record<string, string> = {
  grim:   '#FFA700',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
};

const ROOM_LABELS: Record<string, string> = {
  grim:   "GRIM'S CHAMBER",
  bob:    "BOB'S LIBRARY",
  kevin:  "KEVIN'S WORKSHOP",
  stuart: "TREASURY",
};

// ─── Zoom/Pan constants ───────────────────────────────────────────────────────
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;
const OVERVIEW_ZOOM_THRESHOLD = 0.8; // below this, show large overview labels
const PAN_DRAG_THRESHOLD = 3; // pixels moved before treating as pan (not click)

export function DungeonMap({ agents, selectedId, onRoomClick, onRoomHover, pulseHandleRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const hoveredIdRef = useRef<AgentId | null>(null);
  const particlesRef = useRef<ParticleSystem>(new ParticleSystem(42));
  const messengerRef = useRef<CorridorMessenger>(new CorridorMessenger());
  const lastSparkRef = useRef<number>(0);
  const lastDustRef = useRef<number>(0);
  const eventPulseRef = useRef<EventPulseSystem>(new EventPulseSystem());
  const prevTasksRef = useRef<Partial<Record<AgentId, string | undefined>>>({});

  // ── Zoom / Pan state (refs — avoid re-renders on every wheel event) ─────────
  const zoomRef = useRef<number>(DEFAULT_ZOOM);
  const panXRef = useRef<number>(0);
  const panYRef = useRef<number>(0);
  // Smooth transition: target zoom for gentle lerp
  const targetZoomRef = useRef<number>(DEFAULT_ZOOM);
  const targetPanXRef = useRef<number>(0);
  const targetPanYRef = useRef<number>(0);
  // Overview label fade (0=hidden, 1=fully visible)
  const overviewAlphaRef = useRef<number>(0);

  // ── Drag / pan tracking ──────────────────────────────────────────────────────
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const totalDragRef = useRef<number>(0); // total px moved since mousedown

  // ── Expose imperative pulse handle ─────────────────────────────────────────
  useEffect(() => {
    if (pulseHandleRef) {
      pulseHandleRef.current = {
        fire: (agentId, kind) => eventPulseRef.current.fire(agentId, kind),
      };
    }
  }, [pulseHandleRef]);

  // Precompute torch array and torch-to-room mapping (stable references)
  const allTorches = useMemo(() => [...ROOMS.flatMap(r => getRoomTorches(r)), ...getCorridorTorches()], []);

  const torchToRoomId = useMemo(() => {
    const map = new Map<(typeof allTorches)[0], string>();
    ROOMS.forEach(r => {
      getRoomTorches(r).forEach(t => map.set(t, r.id));
    });
    return map;
  }, [allTorches]);

  // ── Coordinate helpers accounting for zoom/pan ───────────────────────────
  /**
   * Convert a mouse event position to canvas-space coordinates,
   * accounting for both CSS scaling and the current zoom/pan transform.
   */
  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS pixels → canvas pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cssX = (e.clientX - rect.left) * scaleX;
    const cssY = (e.clientY - rect.top) * scaleY;
    // Undo the zoom/pan transform: world = (canvas - pan) / zoom
    const worldX = (cssX - panXRef.current) / zoomRef.current;
    const worldY = (cssY - panYRef.current) / zoomRef.current;
    return { x: worldX, y: worldY };
  }, []);

  /**
   * Raw canvas-pixel position from mouse event (no zoom/pan applied).
   * Used for drag tracking.
   */
  const toRawCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // ── Hit test ──────────────────────────────────────────────────────────────
  const getRoomAt = useCallback((canvasX: number, canvasY: number): AgentId | null => {
    for (const room of ROOMS) {
      const { px, py, w, h } = roomPixelBounds(room);
      if (canvasX >= px && canvasX < px + w && canvasY >= py && canvasY < py + h) {
        return room.id;
      }
    }
    return null;
  }, []);

  // ── Clamp pan so the dungeon can't be dragged completely off screen ────────
  const clampPan = useCallback((px: number, py: number, zoom: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: px, y: py };
    const vw = canvas.width;
    const vh = canvas.height;
    const worldW = CANVAS_W * zoom;
    const worldH = CANVAS_H * zoom;
    // At min pan world-edge shouldn't move past viewport edge
    const minX = Math.min(0, vw - worldW);
    const maxX = Math.max(0, vw - worldW);
    const minY = Math.min(0, vh - worldH);
    const maxY = Math.max(0, vh - worldH);
    return {
      x: Math.max(minX, Math.min(maxX, px)),
      y: Math.max(minY, Math.min(maxY, py)),
    };
  }, []);

  // ── Wheel: zoom centered on cursor ────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cursorX = (e.clientX - rect.left) * scaleX;
    const cursorY = (e.clientY - rect.top) * scaleY;

    // ctrlKey = pinch-to-zoom on trackpad; treat as zoom
    const delta = e.ctrlKey ? -e.deltaY * 0.02 : -e.deltaY * 0.001;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current * (1 + delta)));

    // Zoom centered on cursor:
    // world point under cursor = (cursor - pan) / zoom  must stay constant
    // newPan = cursor - worldPoint * newZoom
    const worldX = (cursorX - panXRef.current) / zoomRef.current;
    const worldY = (cursorY - panYRef.current) / zoomRef.current;
    let newPanX = cursorX - worldX * newZoom;
    let newPanY = cursorY - worldY * newZoom;
    const clamped = clampPan(newPanX, newPanY, newZoom);
    newPanX = clamped.x;
    newPanY = clamped.y;

    targetZoomRef.current = newZoom;
    targetPanXRef.current = newPanX;
    targetPanYRef.current = newPanY;
  }, [clampPan]);

  // Attach wheel listener imperatively so we can use { passive: false }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse: pan via drag ───────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // left button only
    const { x, y } = toRawCanvasCoords(e);
    isDraggingRef.current = false;
    totalDragRef.current = 0;
    dragStartRef.current = { x, y, panX: panXRef.current, panY: panYRef.current };
  }, [toRawCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current) {
      const { x, y } = toRawCanvasCoords(e);
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      totalDragRef.current = Math.sqrt(dx * dx + dy * dy);

      if (totalDragRef.current > PAN_DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        const newPanX = dragStartRef.current.panX + dx;
        const newPanY = dragStartRef.current.panY + dy;
        const clamped = clampPan(newPanX, newPanY, zoomRef.current);
        panXRef.current = clamped.x;
        panYRef.current = clamped.y;
        targetPanXRef.current = clamped.x;
        targetPanYRef.current = clamped.y;
      }
    }

    // Only update hover when not actively panning
    if (!isDraggingRef.current) {
      const { x, y } = toCanvasCoords(e);
      const id = getRoomAt(x, y);
      if (id !== hoveredIdRef.current) {
        hoveredIdRef.current = id;
        onRoomHover(id);
      }
    }
  }, [toRawCanvasCoords, toCanvasCoords, getRoomAt, onRoomHover, clampPan]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    dragStartRef.current = null;

    if (!wasDragging) {
      // It was a click, not a pan
      const { x, y } = toCanvasCoords(e);
      const id = getRoomAt(x, y);
      if (id) onRoomClick(id);
    }
  }, [toCanvasCoords, getRoomAt, onRoomClick]);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    hoveredIdRef.current = null;
    onRoomHover(null);
  }, [onRoomHover]);

  // ── Double-click: reset zoom/pan ──────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    targetZoomRef.current = DEFAULT_ZOOM;
    targetPanXRef.current = 0;
    targetPanYRef.current = 0;
  }, []);

  // ── Main render loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ps = particlesRef.current;

    function render() {
      if (!ctx) return;
      const now = Date.now();

      // ── Lerp zoom/pan toward targets (smooth) ─────────────────────────────
      const lerpFactor = 0.18;
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * lerpFactor;
      panXRef.current += (targetPanXRef.current - panXRef.current) * lerpFactor;
      panYRef.current += (targetPanYRef.current - panYRef.current) * lerpFactor;

      // Snap to avoid jitter at rest
      if (Math.abs(zoomRef.current - targetZoomRef.current) < 0.0005) zoomRef.current = targetZoomRef.current;
      if (Math.abs(panXRef.current - targetPanXRef.current) < 0.1) panXRef.current = targetPanXRef.current;
      if (Math.abs(panYRef.current - targetPanYRef.current) < 0.1) panYRef.current = targetPanYRef.current;

      const zoom = zoomRef.current;

      // ── Overview label fade ────────────────────────────────────────────────
      const wantOverview = zoom <= OVERVIEW_ZOOM_THRESHOLD ? 1 : 0;
      overviewAlphaRef.current += (wantOverview - overviewAlphaRef.current) * 0.08;
      if (overviewAlphaRef.current < 0.005) overviewAlphaRef.current = 0;
      if (overviewAlphaRef.current > 0.995) overviewAlphaRef.current = 1;

      // Seed dust motes periodically
      if (now - lastDustRef.current > 3000) {
        lastDustRef.current = now;
        ROOMS.forEach(r => {
          const { px, py, w, h } = roomPixelBounds(r);
          ps.emitDust(px + 8, py + 8, w - 16, h - 16, 3);
        });
        for (const seg of CORRIDORS) {
          const tx = seg.x * TILE_SIZE;
          const ty = seg.y * TILE_SIZE;
          const tw = (seg.direction === 'h' ? seg.length : seg.width) * TILE_SIZE;
          const th = (seg.direction === 'h' ? seg.width : seg.length) * TILE_SIZE;
          ps.emitDust(tx, ty, tw, th, 1);
        }
      }

      // Emit sparks from torch positions
      if (now - lastSparkRef.current > 200) {
        lastSparkRef.current = now;
        allTorches.forEach((t, idx) => {
          if (Math.random() < 0.3) ps.emitSpark(t.x, t.y - 6, t.color, 1);
          if (idx === 0 && Math.random() < 0.15) ps.emitSmoke(t.x, t.y - 8, 1);
        });

        // Grim magic particles
        const grimRoom = ROOMS.find(r => r.id === 'grim')!;
        const gc = roomCenter(grimRoom);
        if (Math.random() < 0.4) ps.emitMagic(gc.cx, gc.cy, 30, '#8A2BE2', 1);

        // Kevin sparks when active
        const kevinAgent = agents.find(a => a.id === 'kevin');
        if (kevinAgent?.status === 'active') {
          const kevinRoom = ROOMS.find(r => r.id === 'kevin')!;
          const kc = roomCenter(kevinRoom);
          ps.emitSpark(kc.cx, kc.cy + 5, '#FF6633', 2);
        }

        // Bob research particles (blue magic) when active
        const bobAgent = agents.find(a => a.id === 'bob');
        if (bobAgent?.status === 'active') {
          const bobRoom = ROOMS.find(r => r.id === 'bob')!;
          const bc = roomCenter(bobRoom);
          if (Math.random() < 0.5) ps.emitMagic(bc.cx, bc.cy - 10, 20, '#99CCFF', 1);
          if (Math.random() < 0.2) ps.emitDust(bc.cx - 8, bc.cy - 12, 16, 8, 1);
        }

        // Stuart gold coin sparks when active
        const stuartAgent = agents.find(a => a.id === 'stuart');
        if (stuartAgent?.status === 'active') {
          const stuartRoom = ROOMS.find(r => r.id === 'stuart')!;
          const sc = roomCenter(stuartRoom);
          if (Math.random() < 0.45) ps.emitSpark(sc.cx, sc.cy + 8, '#FFD700', 1);
          if (Math.random() < 0.25) ps.emitMagic(sc.cx, sc.cy + 5, 18, '#FFD700', 1);
        }
      }

      ps.update(now);

      // ── Clear entire canvas ───────────────────────────────────────────────
      ctx.fillStyle = '#0B0C10';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Apply zoom/pan transform ──────────────────────────────────────────
      ctx.save();
      ctx.translate(panXRef.current, panYRef.current);
      ctx.scale(zoom, zoom);

      // ── 1. Background (world space) ───────────────────────────────────────
      ctx.fillStyle = '#0B0C10';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── 2. Draw wall tiles for entire grid ────────────────────────────────
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          drawWallTile(ctx, col * TILE_SIZE, row * TILE_SIZE, col * 31 + row * 17);
        }
      }

      // ── 3. Draw corridors ─────────────────────────────────────────────────
      for (const seg of CORRIDORS) {
        const tiles = seg.direction === 'h' ? seg.length : seg.width;
        const tilesPerp = seg.direction === 'h' ? seg.width : seg.length;
        for (let a = 0; a < tiles; a++) {
          for (let b = 0; b < tilesPerp; b++) {
            const tileX = seg.direction === 'h' ? seg.x + a : seg.x + b;
            const tileY = seg.direction === 'h' ? seg.y + b : seg.y + a;
            drawCorridorFloor(ctx, tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, tileX * 13 + tileY * 7);
          }
        }
      }

      // ── 4. Draw rooms ─────────────────────────────────────────────────────
      for (const room of ROOMS) {
        const { px, py, w, h } = roomPixelBounds(room);
        const isSelected = room.id === selectedId;
        const isHovered = room.id === hoveredIdRef.current;
        const agent = agents.find(a => a.id === room.id);
        const isActive = agent?.status === 'active';

        // Floor tiles
        for (let r = 0; r < room.heightTiles; r++) {
          for (let c = 0; c < room.widthTiles; c++) {
            drawFloorTile(
              ctx,
              px + c * TILE_SIZE,
              py + r * TILE_SIZE,
              room.floorType,
              (room.gridX + c) * 31 + (room.gridY + r) * 17,
            );
          }
        }

        // Decorations
        drawRoomDecorations(ctx, room.id, px, py, w, h, now, isActive);

        // Border glow
        const glowColor = ROOM_LABEL_COLORS[room.id] ?? '#FFA700';
        drawRoomBorder(ctx, px, py, w, h, isSelected || isHovered || isActive, glowColor);

        // Label (existing bottom-of-room label — always shown at normal zoom)
        drawRoomLabel(ctx, room.id, px, py, w, h, isSelected, isHovered, glowColor, now);

        // Task ticker — show current task when agent is active
        if (isActive && agent?.currentTask) {
          drawTaskTicker(ctx, agent.currentTask, px, py, w, h, glowColor, now);
        }
      }

      // ── 5. Torch sprites ──────────────────────────────────────────────────
      allTorches.forEach((torch, idx) => {
        drawTorchSprite(ctx, torch.x, torch.y, torch.color, now, idx);
        const sparks = generateTorchSparks(torch.x, torch.y, now, idx);
        ctx.save();
        for (const sp of sparks) {
          ctx.globalAlpha = sp.alpha;
          ctx.fillStyle = torch.color;
          ctx.shadowColor = torch.color;
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, sp.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      });

      // ── 6. Ambient particles ──────────────────────────────────────────────
      ps.draw(ctx);

      // ── 6b. Corridor messenger orbs ──────────────────────────────────────────
      messengerRef.current.update(now);
      messengerRef.current.draw(ctx);

      // ── 6c. Event pulse system ────────────────────────────────────────────────
      for (const agent of agents) {
        const prev = prevTasksRef.current[agent.id];
        if (prev !== undefined && prev !== agent.currentTask) {
          const kind = agent.id === 'grim' ? 'dispatch' : 'report';
          eventPulseRef.current.fire(agent.id, kind);
        }
        prevTasksRef.current[agent.id] = agent.currentTask;
      }
      eventPulseRef.current.update(now);
      eventPulseRef.current.draw(ctx, now);

      // ── 7. Fog of war + torch lighting ───────────────────────────────────
      const activeSet = new Set(agents.filter(a => a.status === 'active').map(a => a.id));
      applyLighting(ctx, allTorches, CANVAS_W, CANVAS_H, activeSet, now, torchToRoomId);

      // ── 8. Agent sprites (above fog) ──────────────────────────────────────
      for (const room of ROOMS) {
        const agent = agents.find(a => a.id === room.id);
        const { cx, cy } = roomCenter(room);
        drawAgentSprite(ctx, room.id, {
          cx,
          cy: cy - 8,
          status: agent?.status ?? 'idle',
          now,
          selected: room.id === selectedId,
        });
      }

      // ── 9. Hover highlight ────────────────────────────────────────────────
      if (hoveredIdRef.current) {
        const hovRoom = ROOMS.find(r => r.id === hoveredIdRef.current);
        if (hovRoom) {
          const { px, py, w, h } = roomPixelBounds(hovRoom);
          ctx.save();
          ctx.fillStyle = 'rgba(255, 200, 100, 0.05)';
          ctx.fillRect(px, py, w, h);
          ctx.restore();
        }
      }

      // ── 9b. Overview room name labels (visible when zoomed out) ───────────
      const oa = overviewAlphaRef.current;
      if (oa > 0) {
        drawOverviewLabels(ctx, oa, zoom, now);
      }

      // ── 10. Dungeon breathing vignette ──────────────────────────────────────
      {
        const breathe = 0.5 + Math.sin(now / 4200) * 0.5;
        const vigAlpha = 0.12 + breathe * 0.08;
        ctx.save();
        const vg = ctx.createRadialGradient(
          CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.25,
          CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.85,
        );
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${vigAlpha})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      // ── End zoom/pan transform ────────────────────────────────────────────
      ctx.restore();

      // ── 11. HUD overlay (in screen space, outside transform) ──────────────
      drawZoomIndicator(ctx, zoom, now);

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [agents, selectedId, allTorches, torchToRoomId]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: isDraggingRef.current ? 'grabbing' : 'pointer',
        imageRendering: 'pixelated',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    />
  );
}

// ─── Overview room labels (large, centered, visible when zoomed out) ──────────

function drawOverviewLabels(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  zoom: number,
  _now: number,
): void {
  for (const room of ROOMS) {
    const { px, py, w, h } = roomPixelBounds(room);
    const cx = px + w / 2;
    const cy = py + h / 2;
    const label = ROOM_LABELS[room.id] ?? room.id.toUpperCase();
    const color = ROOM_LABEL_COLORS[room.id] ?? '#FFA700';
    const [r, g, b] = hexToRGB(color);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Scale text inversely so it remains readable regardless of zoom
    // At zoom=0.5 the label appears at ~24px; at zoom=0.3 it appears at ~28px (in screen space)
    const baseSize = 18 / zoom;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow / backdrop for legibility
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 12 / zoom;
    ctx.fillStyle = `rgba(0,0,0,0.6)`;
    const metrics = ctx.measureText(label);
    // rough bounding box
    const padX = 10 / zoom;
    const padY = 6 / zoom;
    const textW = metrics.width + padX * 2;
    const textH = baseSize + padY * 2;
    ctx.beginPath();
    ctx.roundRect(cx - textW / 2, cy - textH / 2, textW, textH, 4 / zoom);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 / zoom;
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.font = `bold ${baseSize}px 'Courier New', monospace`;
    ctx.fillText(label, cx, cy);

    ctx.restore();
  }
}

// ─── Zoom level indicator (HUD — drawn in screen space) ───────────────────────

function drawZoomIndicator(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  _now: number,
): void {
  // Only show when not at default zoom
  const diff = Math.abs(zoom - DEFAULT_ZOOM);
  if (diff < 0.01) return;

  const text = `${Math.round(zoom * 100)}%`;
  const x = CANVAS_W - 12;
  const y = CANVAS_H - 12;

  ctx.save();
  ctx.globalAlpha = Math.min(1, diff * 4); // fade in as you zoom
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = "bold 11px 'Courier New', monospace";

  // Background pill
  const tw = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(x - tw, y - 16, tw + 4, 18, 3);
  ctx.fill();

  ctx.fillStyle = '#aaaaaa';
  ctx.shadowColor = '#888';
  ctx.shadowBlur = 4;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ─── Room label ───────────────────────────────────────────────────────────────

function drawRoomLabel(
  ctx: CanvasRenderingContext2D,
  id: string,
  px: number, py: number, w: number, h: number,
  isSelected: boolean,
  isHovered: boolean,
  color: string,
  now: number,
): void {
  const label = ROOM_LABELS[id] ?? id.toUpperCase();
  const alpha = isSelected ? 1.0 : isHovered ? 0.9 : 0.7;
  const labelY = py + h - 14;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';

  // Background pill
  const textW = Math.min(w - 8, 150);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath();
  ctx.roundRect(px + w / 2 - textW / 2, labelY - 14, textW, 18, 3);
  ctx.fill();

  if (isSelected || isHovered) {
    ctx.shadowColor = color;
    ctx.shadowBlur = isSelected ? 10 : 6;
  }

  ctx.fillStyle = color;
  ctx.font = `bold ${isSelected ? 12 : 11}px 'Courier New', monospace`;
  ctx.fillText(label, px + w / 2, labelY);

  if (isSelected) {
    const pulse = 0.5 + Math.sin(now / 500) * 0.5;
    const [r, g, b] = hexToRGB(color);
    ctx.strokeStyle = `rgba(${r},${g},${b},${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + w / 2 - 28, labelY + 2);
    ctx.lineTo(px + w / 2 + 28, labelY + 2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Task ticker — animated task label shown inside active rooms ─────────────

function drawTaskTicker(
  ctx: CanvasRenderingContext2D,
  task: string,
  px: number, py: number, w: number, h: number,
  color: string,
  now: number,
): void {
  // Positioned just above the room label (label is at py+h-14)
  const barY = py + h - 30;
  const barH = 13;
  const barX = px + 4;
  const barW = w - 8;

  ctx.save();

  // Pulsing background
  const pulse = 0.5 + Math.sin(now / 600) * 0.18;
  const [r, g, b] = hexToRGB(color);
  ctx.fillStyle = `rgba(${r},${g},${b},${pulse * 0.18})`;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 2);
  ctx.fill();

  // Glowing border pulse
  ctx.strokeStyle = `rgba(${r},${g},${b},${pulse * 0.5})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 2);
  ctx.stroke();

  // Spinning indicator dot on left side
  const dotAngle = now / 600;
  const dotX = barX + 5.5;
  const dotY = barY + barH / 2;
  ctx.fillStyle = `rgba(${r},${g},${b},${0.6 + Math.sin(dotAngle) * 0.4})`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Task text — truncate to fit available width
  const maxW = barW - 18;
  ctx.font = "8px 'Courier New', monospace";
  const fullText = task.toUpperCase();
  let displayText = fullText;
  while (ctx.measureText(displayText).width > maxW && displayText.length > 0) {
    displayText = displayText.slice(0, -1);
  }
  if (displayText.length < fullText.length) {
    displayText = displayText.slice(0, -2) + '..';
  }

  ctx.fillStyle = `rgba(${r},${g},${b},${0.85 + Math.sin(now / 800) * 0.15})`;
  ctx.textAlign = 'left';
  ctx.fillText(displayText, barX + 11, barY + barH / 2 + 3);

  ctx.restore();
}

function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ─── Room decorations ─────────────────────────────────────────────────────────

function drawRoomDecorations(
  ctx: CanvasRenderingContext2D,
  id: AgentId,
  px: number, py: number, w: number, h: number,
  now: number,
  isActive: boolean,
): void {
  ctx.save();
  switch (id) {
    case 'grim':   drawGrimDecorations(ctx, px, py, w, h, now, isActive); break;
    case 'bob':    drawBobDecorations(ctx, px, py, w, h, now); break;
    case 'kevin':  drawKevinDecorations(ctx, px, py, w, h, now, isActive); break;
    case 'stuart': drawStuartDecorations(ctx, px, py, w, h, now); break;
  }
  ctx.restore();
}

// ── Grim's Chamber ────────────────────────────────────────────────────────────

function drawGrimDecorations(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  now: number,
  _isActive: boolean,
): void {
  const cx = px + w / 2;
  const cy = py + h / 2;

  // Rune circle
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#8A2BE2';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#8A2BE2';
  ctx.shadowBlur = 6;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -(now / 80) % 10;
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = (now / 60) % 10;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Rune points
  ctx.fillStyle = '#CC55FF';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + now / 2000;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Throne
  ctx.save();
  ctx.globalAlpha = 0.75;
  const tx = cx - 14, ty = py + 12;
  ctx.fillStyle = '#2a1040'; ctx.fillRect(tx, ty + 20, 28, 18);
  ctx.fillStyle = '#3a1858'; ctx.fillRect(tx, ty, 28, 22);
  ctx.fillStyle = '#4a2268'; ctx.fillRect(tx - 2, ty - 4, 32, 6);
  ctx.fillStyle = '#2d1250';
  ctx.fillRect(tx - 3, ty + 12, 5, 12);
  ctx.fillRect(tx + 26, ty + 12, 5, 12);
  ctx.fillStyle = '#F3E0BE';
  ctx.fillRect(tx, ty, 28, 2);
  ctx.fillRect(tx - 2, ty - 4, 32, 2);

  const tg = ctx.createRadialGradient(cx, ty + 10, 2, cx, ty + 10, 20);
  tg.addColorStop(0, `rgba(140,43,226,${0.2 + Math.sin(now / 800) * 0.15})`);
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.arc(cx, ty + 10, 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Arcane orbs
  for (const [ox, oy] of [[px + 14, py + 14], [px + w - 14, py + 14]] as const) {
    const p = 0.4 + Math.sin(now / 900 + ox) * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = '#8A2BE2'; ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(100,30,200,${p})`;
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,150,255,${p * 0.5})`;
    ctx.beginPath(); ctx.arc(ox - 1.5, oy - 1.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── Bob's Library ─────────────────────────────────────────────────────────────

function drawBobDecorations(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  now: number,
): void {
  ctx.globalAlpha = 0.75;

  const shelves = [
    { x: px + 5,      y: py + 8, sw: 14, sh: h - 20 },
    { x: px + w - 19, y: py + 8, sw: 14, sh: h - 20 },
  ];

  for (const shelf of shelves) {
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(shelf.x, shelf.y, shelf.sw, shelf.sh);
    const rows = 4;
    const rowH = shelf.sh / rows;
    const bookColors = ['#8b1a1a', '#1a4f8b', '#1a6b2a', '#7a6b1a', '#5a1a7a', '#1a6b6b'];
    for (let s = 0; s < rows; s++) {
      let bx = shelf.x + 1;
      const by = shelf.y + s * rowH + 2;
      const bh = rowH - 5;
      while (bx < shelf.x + shelf.sw - 1) {
        const bw = 2 + Math.floor(Math.abs(Math.sin(bx * 7.3 + s * 31)) * 3);
        const ci = Math.floor(Math.abs(Math.sin(bx * 13.7 + s * 17)) * bookColors.length);
        ctx.fillStyle = bookColors[ci % bookColors.length];
        ctx.fillRect(bx, by, Math.min(bw, shelf.x + shelf.sw - 1 - bx), bh);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(bx, by, 1, bh);
        bx += bw + 1;
      }
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(shelf.x, shelf.y + (s + 1) * rowH - 2, shelf.sw, 2);
    }
  }

  // Desk
  const dx = px + w / 2 - 14, dy = py + h / 2 - 6;
  ctx.fillStyle = '#4a2e10'; ctx.fillRect(dx, dy, 28, 16);
  ctx.fillStyle = '#5a3a18'; ctx.fillRect(dx + 1, dy + 1, 26, 2);
  ctx.fillStyle = '#D2B48C'; ctx.fillRect(dx + 4, dy + 3, 20, 10);
  ctx.strokeStyle = 'rgba(80,50,20,0.4)'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(dx + 5, dy + 5 + i * 3); ctx.lineTo(dx + 23, dy + 5 + i * 3); ctx.stroke();
  }

  // Candle
  ctx.fillStyle = '#e8e0d0'; ctx.fillRect(dx + 24, dy - 4, 3, 8);
  const cf = 0.7 + Math.sin(now / 400 + 5) * 0.3;
  ctx.fillStyle = `rgba(255,200,80,${cf})`;
  ctx.shadowColor = '#FFCC44'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(dx + 25.5, dy - 6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

// ── Kevin's Workshop ──────────────────────────────────────────────────────────

function drawKevinDecorations(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  now: number,
  _isActive: boolean,
): void {
  ctx.globalAlpha = 0.75;

  // Workbench
  ctx.fillStyle = '#3a2810'; ctx.fillRect(px + 6, py + 8, w - 12, 10);
  ctx.fillStyle = '#2a1c08'; ctx.fillRect(px + 6, py + 18, w - 12, 3);

  // Tools on bench
  const toolsData = [
    { x: px + 10, type: 0 },
    { x: px + 22, type: 1 },
    { x: px + 32, type: 2 },
  ];
  for (const t of toolsData) {
    ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(t.x, py + 8); ctx.lineTo(t.x, py); ctx.stroke();
    if (t.type === 0) {
      ctx.fillStyle = '#666'; ctx.fillRect(t.x - 3, py - 3, 6, 4);
    } else if (t.type === 1) {
      ctx.fillStyle = '#cc6600'; ctx.fillRect(t.x - 2, py - 4, 4, 5);
    } else {
      ctx.strokeStyle = '#aaa';
      ctx.beginPath(); ctx.arc(t.x, py - 1, 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Anvil
  const ax = px + w / 2 - 16, ay = py + h / 2 - 4;
  ctx.fillStyle = '#444'; ctx.fillRect(ax, ay + 10, 32, 14);
  ctx.fillStyle = '#555'; ctx.fillRect(ax + 4, ay + 2, 24, 12);
  ctx.fillStyle = '#666'; ctx.fillRect(ax + 8, ay, 16, 5);
  ctx.fillStyle = 'rgba(200,200,200,0.15)'; ctx.fillRect(ax + 4, ay + 2, 24, 2);

  // Gears
  const gears = [
    { x: px + w - 20, y: py + h / 2,     r: 10, spd: 1 },
    { x: px + w - 33, y: py + h / 2 + 8, r: 6,  spd: -1.7 },
  ];
  for (const g of gears) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate((now / 800) * g.spd);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, g.r - 2, 0, Math.PI * 2); ctx.stroke();
    const teeth = Math.max(4, Math.floor(g.r * 0.8));
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (g.r - 2), Math.sin(a) * (g.r - 2));
      ctx.lineTo(Math.cos(a) * (g.r + 2), Math.sin(a) * (g.r + 2));
      ctx.stroke();
    }
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── Stuart's Treasury ─────────────────────────────────────────────────────────

function drawStuartDecorations(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  now: number,
): void {
  ctx.globalAlpha = 0.75;

  // Treasure chests
  for (let i = 0; i < 2; i++) {
    const cx2 = px + 14 + i * (w - 38);
    const cy2 = py + 12;
    ctx.fillStyle = '#7a4a10'; ctx.fillRect(cx2, cy2 + 8, 22, 14);
    ctx.fillStyle = '#5a3a08'; ctx.fillRect(cx2, cy2, 22, 10);
    // Metal bands
    ctx.fillStyle = '#888'; ctx.fillRect(cx2, cy2 + 8, 22, 2);
    // Lock
    ctx.fillStyle = '#FFD700'; ctx.fillRect(cx2 + 8, cy2 + 12, 6, 5);
    ctx.fillStyle = '#b8960a';
    ctx.beginPath(); ctx.arc(cx2 + 11, cy2 + 12, 3, Math.PI, 0); ctx.fill();

    // Gold shimmer glow on chest
    const glow = 0.15 + Math.sin(now / 600 + i) * 0.1;
    ctx.fillStyle = `rgba(255,215,0,${glow})`;
    ctx.beginPath();
    ctx.ellipse(cx2 + 11, cy2 + 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coin pile in center
  const coins = [
    [px + w / 2,     py + h / 2 + 8, 10],
    [px + w / 2 - 8, py + h / 2 + 10, 7],
    [px + w / 2 + 8, py + h / 2 + 10, 7],
  ] as const;
  for (const [cx3, cy3, r] of coins) {
    const shimmer = 0.4 + Math.sin(now / 500 + cx3 * 0.1) * 0.3;
    ctx.fillStyle = `rgba(255,215,0,${shimmer})`;
    ctx.beginPath(); ctx.ellipse(cx3, cy3, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b8960a'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(cx3, cy3, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // Gold sparkle
  const sp = 0.3 + Math.abs(Math.sin(now / 300)) * 0.5;
  ctx.fillStyle = `rgba(255,255,100,${sp})`;
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(px + w / 2, py + h / 2 + 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}
