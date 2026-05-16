// ─── DungeonMap.tsx — Canvas-based 2D top-down dungeon ───────────────────────

import { useRef, useEffect, useCallback } from 'react';
import type { AgentId, AgentInfo } from '../types';
import { ROOMS, CORRIDORS, CANVAS_W, CANVAS_H, roomCenter, roomPixelBounds } from '../dungeon/rooms';
import { TILE_SIZE, drawFloorTile, drawWallTile, drawRoomBorder } from '../dungeon/tiles';
import { getRoomTorches, drawTorchSprite } from '../dungeon/lighting';
import { drawAgentSprite } from './AgentSprite';

interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onRoomClick: (id: AgentId) => void;
  onRoomHover: (id: AgentId | null) => void;
}

const ROOM_LABEL_COLORS: Record<string, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
};

const ROOM_EMOJIS: Record<string, string> = {
  grim: '🐉',
  bob: '📚',
  kevin: '🔧',
  stuart: '💰',
};

export function DungeonMap({ agents, selectedId, onRoomClick, onRoomHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const hoveredIdRef = useRef<AgentId | null>(null);

  // ── Hit test: which room did the user click/hover? ─────────────────────────
  const getRoomAt = useCallback((canvasX: number, canvasY: number): AgentId | null => {
    for (const room of ROOMS) {
      const { px, py, w, h } = roomPixelBounds(room);
      if (canvasX >= px && canvasX < px + w && canvasY >= py && canvasY < py + h) {
        return room.id;
      }
    }
    return null;
  }, []);

  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
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

  // ── Canvas click/hover handlers ────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e);
    const id = getRoomAt(x, y);
    if (id) onRoomClick(id);
  }, [toCanvasCoords, getRoomAt, onRoomClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e);
    const id = getRoomAt(x, y);
    if (id !== hoveredIdRef.current) {
      hoveredIdRef.current = id;
      onRoomHover(id);
    }
  }, [toCanvasCoords, getRoomAt, onRoomHover]);

  const handleMouseLeave = useCallback(() => {
    hoveredIdRef.current = null;
    onRoomHover(null);
  }, [onRoomHover]);

  // ── Main render loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const allTorches = ROOMS.flatMap(r => getRoomTorches(r));

    function render() {
      if (!ctx) return;
      const now = Date.now();

      // 1. Fill with deep dark background
      ctx.fillStyle = '#1a140a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Draw wall tiles for entire grid
      for (let row = 0; row < Math.ceil(CANVAS_H / TILE_SIZE); row++) {
        for (let col = 0; col < Math.ceil(CANVAS_W / TILE_SIZE); col++) {
          drawWallTile(ctx, col * TILE_SIZE, row * TILE_SIZE, col * 31 + row * 17);
        }
      }

      // 3. Draw corridors (floor tiles)
      ctx.save();
      for (const seg of CORRIDORS) {
        const tiles = seg.direction === 'h' ? seg.length : seg.width;
        const tilesPerp = seg.direction === 'h' ? seg.width : seg.length;
        for (let a = 0; a < tiles; a++) {
          for (let b = 0; b < tilesPerp; b++) {
            const tileX = seg.direction === 'h' ? seg.x + a : seg.x + b;
            const tileY = seg.direction === 'h' ? seg.y + b : seg.y + a;
            drawFloorTile(ctx, tileX * TILE_SIZE, tileY * TILE_SIZE, 'stone', tileX * 13 + tileY * 7);
          }
        }
      }
      ctx.restore();

      // 4. Draw rooms
      for (const room of ROOMS) {
        const { px, py, w, h } = roomPixelBounds(room);
        const isSelected = room.id === selectedId;
        const isHovered = room.id === hoveredIdRef.current;
        const agent = agents.find(a => a.id === room.id);
        const isActive = agent?.status === 'active';

        // Floor tiles
        for (let row = 0; row < room.heightTiles; row++) {
          for (let col = 0; col < room.widthTiles; col++) {
            drawFloorTile(
              ctx,
              px + col * TILE_SIZE,
              py + row * TILE_SIZE,
              room.floorType,
              (room.gridX + col) * 31 + (room.gridY + row) * 17,
            );
          }
        }

        // Room decorations (furniture-like symbols)
        drawRoomDecorations(ctx, room.id, px, py, w, h, now);

        // Room border glow
        const glowColor = ROOM_LABEL_COLORS[room.id] ?? '#FF9933';
        const shouldGlow = isSelected || isHovered || isActive;
        drawRoomBorder(ctx, px, py, w, h, shouldGlow, glowColor);

        // Room label
        ctx.save();
        const labelAlpha = isSelected || isHovered ? 1.0 : 0.65;
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = ROOM_LABEL_COLORS[room.id] ?? '#FF9933';
        ctx.font = `bold ${isSelected ? 12 : 10}px monospace`;
        ctx.textAlign = 'center';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isSelected ? 8 : 4;
        ctx.fillText(ROOM_EMOJIS[room.id] + ' ' + room.label, px + w / 2, py + h - 8);
        ctx.restore();
      }

      // 5. Draw torch sprites
      allTorches.forEach((torch, idx) => {
        drawTorchSprite(ctx, torch.x, torch.y, torch.color, now, idx);
      });

      // 6. Lighting overlay (fog of war + torch glow)
      const activeSet = new Set(agents.filter(a => a.status === 'active').map(a => a.id));
      applySimpleLighting(ctx, CANVAS_W, CANVAS_H, allTorches, activeSet, now);

      // 7. Draw agent sprites on top of lighting
      for (const room of ROOMS) {
        const agent = agents.find(a => a.id === room.id);
        const { cx, cy } = roomCenter(room);
        drawAgentSprite(ctx, room.id, {
          cx,
          cy: cy - 8, // shift up slightly from center
          status: agent?.status ?? 'idle',
          now,
          selected: room.id === selectedId,
        });
      }

      // 8. Hover cursor highlight
      if (hoveredIdRef.current) {
        const hovRoom = ROOMS.find(r => r.id === hoveredIdRef.current);
        if (hovRoom) {
          const { px, py, w, h } = roomPixelBounds(hovRoom);
          ctx.save();
          ctx.fillStyle = 'rgba(255, 200, 100, 0.06)';
          ctx.fillRect(px, py, w, h);
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [agents, selectedId]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer', imageRendering: 'pixelated' }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}

// ─── Simplified lighting pass ─────────────────────────────────────────────────
function applySimpleLighting(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  torches: { x: number; y: number; color: string; radius: number }[],
  _activeSet: Set<string>,
  now: number,
): void {
  // Dark fog overlay
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(30, 20, 10, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Light halos (using source-over with low alpha for web compat)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  torches.forEach((t, idx) => {
    const phase = now / 600 + idx * 1.3;
    const flicker = Math.sin(phase) * 5 + Math.sin(phase * 2.7) * 3;
    const r = t.radius + flicker;
    const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
    const hex = t.color;
    grad.addColorStop(0, hexToRgba(hex, 0.18));
    grad.addColorStop(0.5, hexToRgba(hex, 0.08));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Room decorations ────────────────────────────────────────────────────────
function drawRoomDecorations(
  ctx: CanvasRenderingContext2D,
  id: AgentId,
  px: number,
  py: number,
  w: number,
  h: number,
  now: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.55;

  switch (id) {
    case 'grim': {
      // Throne
      ctx.fillStyle = '#4a2a6a';
      ctx.fillRect(px + w / 2 - 10, py + 14, 20, 24);
      ctx.fillStyle = '#6a3a9a';
      ctx.fillRect(px + w / 2 - 8, py + 10, 16, 8);
      // Throne glow
      const throneGlow = 0.3 + Math.sin(now / 800) * 0.2;
      ctx.fillStyle = `rgba(180, 50, 255, ${throneGlow})`;
      ctx.beginPath();
      ctx.arc(px + w / 2, py + 18, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bob': {
      // Bookshelves (two)
      for (let i = 0; i < 2; i++) {
        const bx = px + 10 + i * 60;
        const by = py + 10;
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(bx, by, 16, 30);
        // Books
        const bookColors = ['#aa3333', '#3355aa', '#337744', '#aaaa22'];
        for (let b = 0; b < 4; b++) {
          ctx.fillStyle = bookColors[b];
          ctx.fillRect(bx + 2 + b * 3, by + 3, 2, 24);
        }
      }
      break;
    }
    case 'kevin': {
      // Anvil shape
      ctx.fillStyle = '#555';
      ctx.fillRect(px + w / 2 - 16, py + 16, 32, 10);
      ctx.fillStyle = '#777';
      ctx.fillRect(px + w / 2 - 10, py + 8, 20, 10);
      // Sparks (active)
      const phase = now / 200;
      for (let s = 0; s < 3; s++) {
        const sx = px + w / 2 + Math.cos(phase + s * 2.1) * 18;
        const sy = py + 16 + Math.sin(phase * 1.7 + s) * 8;
        const sparkAlpha = Math.abs(Math.sin(phase + s)) * 0.8;
        ctx.fillStyle = `rgba(255, 200, 50, ${sparkAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'stuart': {
      // Treasure chests
      for (let i = 0; i < 2; i++) {
        const tx = px + 16 + i * 55;
        const ty = py + 12;
        ctx.fillStyle = '#7a4a10';
        ctx.fillRect(tx, ty + 8, 22, 14);
        ctx.fillStyle = '#5a3a08';
        ctx.fillRect(tx, ty, 22, 10);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(tx + 8, ty + 12, 6, 6);
      }
      // Coin pile shimmer
      const shimmer = 0.4 + Math.sin(now / 500) * 0.3;
      ctx.fillStyle = `rgba(255, 215, 0, ${shimmer})`;
      ctx.beginPath();
      ctx.ellipse(px + w / 2, py + h / 2 + 10, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}
