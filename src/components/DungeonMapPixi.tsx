// ─── DungeonMapPixi.tsx — PixiJS v8 dungeon map — sci-fi panel style ──────────
// Clean sci-fi look: AI-generated room backgrounds with colored borders, glows, corner brackets.
// Room interiors use AI-generated images; overlays and labels rendered on top.

import React, { useRef, useEffect } from 'react';
import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  Sprite,
  Assets,
} from 'pixi.js';
import type { AgentId, AgentInfo, Room } from '../types';
import { ROOMS, CORRIDORS, CANVAS_W, CANVAS_H, roomCenter, roomPixelBounds } from '../dungeon/rooms';
import type { PulseHandle } from './DungeonMap';
import { TILE_SIZE } from '../dungeon/tiles';
import { drawAgnesSprite, preloadMinionSprites } from '../pixi/PixiAgentSprites';
import { PixiParticleSystem } from '../pixi/PixiParticles';
import { PixiEventPulseSystem } from '../pixi/PixiEventPulse';

// ─── Room color palette ───────────────────────────────────────────────────────
const ROOM_COLORS: Record<string, number> = {
  grim:   0xFFA700,
  bob:    0x6699CC,
  kevin:  0xFF5522,
  stuart: 0xFFD700,
  agnes:  0xFF66AA,
};

const ROOM_LABELS: Record<string, string> = {
  grim:   "GRIM'S CHAMBER",
  bob:    "BOB'S LIBRARY",
  kevin:  "KEVIN'S WORKSHOP",
  stuart: "TREASURY",
  agnes:  "AGNES'S STUDIO",
};

// ─── Zoom/Pan constants ───────────────────────────────────────────────────────
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.5;
const DEFAULT_ZOOM = 1.0;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CustomRoomMeta {
  id: string;
  label: string;
  emoji: string;
  colorPixi: number;
}

interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onRoomClick: (id: AgentId) => void;
  onRoomHover: (id: AgentId | null) => void;
  pulseHandleRef?: React.MutableRefObject<PulseHandle | null>;
  customRoomMeta?: CustomRoomMeta[];
}

// ─── DungeonMapPixi component ─────────────────────────────────────────────────
export function DungeonMapPixi({ agents, selectedId, onRoomClick, onRoomHover, pulseHandleRef, customRoomMeta = [] }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const containerRef = useRef<Container | null>(null);
  const roomContainersRef = useRef<Map<string, Container>>(new Map());
  const glowGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const lightingLayerRef = useRef<Graphics | null>(null);
  const animFrameRef = useRef<number>(0);
  const hoveredIdRef = useRef<AgentId | null>(null);
  const spriteContainersRef = useRef<Map<string, Container>>(new Map());
  const particleSystemRef = useRef<PixiParticleSystem | null>(null);
  const pulseSysRef = useRef<PixiEventPulseSystem | null>(null);
  const customRoomMetaRef = useRef<CustomRoomMeta[]>([]);
  const roomLayerRef = useRef<Container | null>(null);
  const glowLayerRef = useRef<Container | null>(null);
  const labelLayerRef = useRef<Container | null>(null);
  const spriteLayerRef = useRef<Container | null>(null);

  // ── Zoom/Pan state ──────────────────────────────────────────────────────────
  const zoomRef = useRef(DEFAULT_ZOOM);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const targetZoomRef = useRef(DEFAULT_ZOOM);
  const targetPanXRef = useRef(0);
  const targetPanYRef = useRef(0);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const totalDragRef = useRef(0);

  // ── Agent state ref ─────────────────────────────────────────────────────────
  const agentsRef = useRef(agents);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { customRoomMetaRef.current = customRoomMeta; }, [customRoomMeta]);

  const canvasSizeRef = useRef({ w: 800, h: 600 });

  // ── Expose pulse handle ──────────────────────────────────────────────────
  useEffect(() => {
    if (pulseHandleRef) {
      pulseHandleRef.current = {
        fire: (agentId, _kind) => {
          const pulseSys = pulseSysRef.current;
          if (!pulseSys) return;
          const grimRoom = ROOMS.find(r => r.id === 'grim');
          const targetRoom = ROOMS.find(r => r.id === agentId);
          if (!grimRoom || !targetRoom) return;
          const from = roomCenter(grimRoom);
          const to = roomCenter(targetRoom);
          const color = ROOM_COLORS[agentId] ?? 0xffffff;
          pulseSys.fire(from.cx, from.cy, to.cx, to.cy, color);
        },
      };
    }
  }, [pulseHandleRef]);

  // ── Dynamic room addition ──────────────────────────────────────────────────
  const builtRoomsRef = useRef<Set<string>>(new Set(['bob', 'grim', 'kevin', 'agnes', 'stuart']));

  useEffect(() => {
    if (!appRef.current) return;

    for (const meta of customRoomMeta) {
      if (builtRoomsRef.current.has(meta.id)) continue;
      builtRoomsRef.current.add(meta.id);

      const room = ROOMS.find(r => r.id === meta.id);
      if (!room) continue;

      if (roomLayerRef.current) {
        const roomCont = new Container();
        roomCont.label = room.id;
        roomContainersRef.current.set(room.id, roomCont);
        roomLayerRef.current.addChild(roomCont);
        buildRoom(roomCont, room);
      }

      if (glowLayerRef.current) {
        const glow = new Graphics();
        glowGraphicsRef.current.set(room.id, glow);
        glowLayerRef.current.addChild(glow);
      }

      if (labelLayerRef.current) {
        drawSingleRoomLabel(labelLayerRef.current, room, meta);
      }

      if (spriteLayerRef.current) {
        const sc = new Container();
        sc.label = `sprite_${room.id}`;
        spriteLayerRef.current.addChild(sc);
        spriteContainersRef.current.set(room.id, sc);
      }
    }
  }, [customRoomMeta]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main PixiJS initialization ──────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    let destroyed = false;

    async function init() {
      if (!mountRef.current || destroyed) return;

      const rect = mountRef.current.getBoundingClientRect();
      const W = rect.width || 900;
      const H = rect.height || 600;
      canvasSizeRef.current = { w: W, h: H };

      const app = new Application();
      await app.init({
        width: W,
        height: H,
        background: 0x050508,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        hello: false,
      });
      if (destroyed) { app.destroy(true); return; }

      appRef.current = app;
      mountRef.current!.appendChild(app.canvas);

      // Pre-load Agnes sprite PNGs
      preloadMinionSprites().catch(console.warn);

      // ── Root container (zoom/pan target) ────────────────────────────────
      const worldContainer = new Container();
      app.stage.addChild(worldContainer);
      containerRef.current = worldContainer;

      // ── Build dungeon map ───────────────────────────────────────────────
      buildDungeon(app, worldContainer);

      // ── Lighting layer ───────────────────────────────────────────────────
      const lightingLayer = new Graphics();
      worldContainer.addChild(lightingLayer);
      lightingLayerRef.current = lightingLayer;

      // ── Sprite containers ────────────────────────────────────────────────
      const spriteLayer = new Container();
      worldContainer.addChild(spriteLayer);
      spriteLayerRef.current = spriteLayer;
      for (const room of ROOMS) {
        const sc = new Container();
        sc.label = `sprite_${room.id}`;
        spriteLayer.addChild(sc);
        spriteContainersRef.current.set(room.id, sc);
      }

      // ── Particle and event pulse systems ────────────────────────────────
      const fxLayer = new Container();
      worldContainer.addChild(fxLayer);
      particleSystemRef.current = new PixiParticleSystem(fxLayer);
      pulseSysRef.current = new PixiEventPulseSystem(fxLayer);

      centerDungeon(W, H);
      setupInteraction(app);

      // ── Render loop ──────────────────────────────────────────────────────
      let lastTime = 0;
      function renderLoop(time: number) {
        if (destroyed) return;
        animFrameRef.current = requestAnimationFrame(renderLoop);

        const dt = Math.min(time - lastTime, 100);
        lastTime = time;

        const lerpSpeed = 0.14;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * lerpSpeed;
        panXRef.current += (targetPanXRef.current - panXRef.current) * lerpSpeed;
        panYRef.current += (targetPanYRef.current - panYRef.current) * lerpSpeed;

        if (worldContainer) {
          worldContainer.scale.set(zoomRef.current);
          worldContainer.x = panXRef.current;
          worldContainer.y = panYRef.current;
        }

        updateGlowEffects(time);
        updateLighting(time);
        updateAgentSprites(time / 1000);

        if (particleSystemRef.current) {
          particleSystemRef.current.update(dt);
          particleSystemRef.current.draw();
        }
        if (pulseSysRef.current) {
          pulseSysRef.current.update(dt);
          pulseSysRef.current.draw();
        }
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }

    init().catch(console.error);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animFrameRef.current);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build the dungeon scene ───────────────────────────────────────────────
  function buildDungeon(_app: Application, world: Container) {
    // Pure dark void background
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill(0x050508);
    world.addChild(bg);

    // Draw corridors (simple dark lines)
    const corridorLayer = new Container();
    world.addChild(corridorLayer);
    drawCorridors(corridorLayer);

    // Draw rooms
    const roomLayer = new Container();
    world.addChild(roomLayer);
    roomLayerRef.current = roomLayer;

    for (const room of ROOMS) {
      const roomCont = new Container();
      roomCont.label = room.id;
      roomContainersRef.current.set(room.id, roomCont);
      roomLayer.addChild(roomCont);
      buildRoom(roomCont, room);
    }

    // Glow overlay layer
    const glowLayer = new Container();
    world.addChild(glowLayer);
    glowLayerRef.current = glowLayer;

    for (const room of ROOMS) {
      const glow = new Graphics();
      glowGraphicsRef.current.set(room.id, glow);
      glowLayer.addChild(glow);
    }

    // Labels layer
    const labelLayer = new Container();
    world.addChild(labelLayer);
    labelLayerRef.current = labelLayer;
    drawRoomLabels(labelLayer);
  }

  // ── Draw a room with layered procedural sci-fi dressing ───────────────────
  function buildRoom(container: Container, room: typeof ROOMS[0]) {
    const { px, py, w, h } = roomPixelBounds(room);
    const roomColor = ROOM_COLORS[room.id] ?? 0x888888;
    const panelInset = 10;

    const bg = new Graphics();
    bg.label = 'room_bg';
    bg.rect(px, py, w, h).fill({ color: 0x0d1118 });
    bg.rect(px + 4, py + 4, w - 8, h - 8).fill({ color: 0x141a24 });
    bg.rect(px, py, w, h).fill({ color: roomColor, alpha: 0.08 });
    container.addChild(bg);

    const floor = new Graphics();
    floor.label = 'room_floor';
    floor.rect(px + panelInset, py + panelInset, w - panelInset * 2, h - panelInset * 2).fill({ color: 0x101722 });
    for (let gx = px + panelInset; gx < px + w - panelInset; gx += 24) {
      floor.moveTo(gx, py + panelInset);
      floor.lineTo(gx, py + h - panelInset);
    }
    for (let gy = py + panelInset; gy < py + h - panelInset; gy += 24) {
      floor.moveTo(px + panelInset, gy);
      floor.lineTo(px + w - panelInset, gy);
    }
    floor.stroke({ color: 0x243244, alpha: 0.65, width: 1 });

    for (let gx = px + panelInset + 12; gx < px + w - panelInset; gx += 48) {
      for (let gy = py + panelInset + 12; gy < py + h - panelInset; gy += 48) {
        floor.rect(gx - 6, gy - 6, 12, 12).stroke({ color: roomColor, alpha: 0.18, width: 1 });
      }
    }
    container.addChild(floor);

    const roomDetails = new Graphics();
    roomDetails.label = 'room_details';

    const drawConsoleBank = (x: number, y: number, width: number, height: number, glowAlpha = 0.22) => {
      roomDetails.roundRect(x, y, width, height, 6).fill({ color: 0x1a202b });
      roomDetails.roundRect(x + 4, y + 4, width - 8, height - 8, 4).fill({ color: 0x0b0f14 });
      roomDetails.roundRect(x + 8, y + 8, width - 16, height - 16, 3).fill({ color: roomColor, alpha: glowAlpha });
      roomDetails.roundRect(x, y, width, height, 6).stroke({ color: 0x3b4a5f, alpha: 0.8, width: 1.5 });
    };

    const drawServerRack = (x: number, y: number, width: number, height: number) => {
      roomDetails.roundRect(x, y, width, height, 5).fill({ color: 0x151a22 });
      roomDetails.roundRect(x, y, width, height, 5).stroke({ color: 0x56657a, alpha: 0.75, width: 1.5 });
      for (let yy = y + 8; yy < y + height - 6; yy += 10) {
        roomDetails.rect(x + 5, yy, width - 10, 3).fill({ color: roomColor, alpha: 0.18 });
        roomDetails.circle(x + width - 8, yy + 1.5, 1.2).fill({ color: 0x7df7ff, alpha: 0.8 });
      }
    };

    const drawPipeRun = (x1: number, y1: number, x2: number, y2: number) => {
      roomDetails.moveTo(x1, y1);
      roomDetails.lineTo(x2, y2);
      roomDetails.stroke({ color: 0x596777, alpha: 0.9, width: 4 });
      roomDetails.moveTo(x1, y1 + 2);
      roomDetails.lineTo(x2, y2 + 2);
      roomDetails.stroke({ color: roomColor, alpha: 0.18, width: 1 });
    };

    const drawCrate = (x: number, y: number, size: number) => {
      roomDetails.rect(x, y, size, size).fill({ color: 0x221b12 });
      roomDetails.rect(x, y, size, size).stroke({ color: 0x6f5331, alpha: 0.8, width: 1.2 });
      roomDetails.moveTo(x + 4, y + 4);
      roomDetails.lineTo(x + size - 4, y + size - 4);
      roomDetails.moveTo(x + size - 4, y + 4);
      roomDetails.lineTo(x + 4, y + size - 4);
      roomDetails.stroke({ color: 0xa57940, alpha: 0.5, width: 1 });
    };

    const drawPortalRing = (cx: number, cy: number, r: number) => {
      roomDetails.circle(cx, cy, r).stroke({ color: 0x364052, alpha: 0.8, width: 5 });
      roomDetails.circle(cx, cy, r - 6).stroke({ color: roomColor, alpha: 0.35, width: 2 });
      roomDetails.circle(cx, cy, r - 12).stroke({ color: 0x7df7ff, alpha: 0.2, width: 1 });
    };

    drawPipeRun(px + 18, py + 18, px + w - 18, py + 18);
    drawPipeRun(px + 18, py + h - 18, px + w - 18, py + h - 18);
    drawPipeRun(px + 18, py + 18, px + 18, py + h - 18);
    drawPipeRun(px + w - 18, py + 18, px + w - 18, py + h - 18);

    switch (room.id) {
      case 'grim':
        drawConsoleBank(px + 24, py + 22, 52, 24, 0.26);
        drawConsoleBank(px + w - 76, py + 24, 48, 20, 0.24);
        roomDetails.roundRect(px + w / 2 - 22, py + h - 62, 44, 24, 7).fill({ color: 0x24180f });
        roomDetails.roundRect(px + w / 2 - 16, py + h - 72, 32, 16, 5).fill({ color: 0x3c2a16 });
        drawPortalRing(px + 42, py + h - 42, 16);
        break;
      case 'bob':
        drawConsoleBank(px + 20, py + 24, 46, 18, 0.18);
        drawServerRack(px + w - 54, py + 22, 28, 74);
        drawCrate(px + 26, py + h - 52, 18);
        drawCrate(px + 48, py + h - 46, 14);
        break;
      case 'kevin':
        drawServerRack(px + 22, py + 20, 24, 78);
        drawConsoleBank(px + 56, py + 28, 58, 20, 0.26);
        drawConsoleBank(px + 58, py + h - 46, 52, 16, 0.18);
        roomDetails.circle(px + w - 34, py + h - 42, 12).stroke({ color: 0xff8844, alpha: 0.45, width: 3 });
        roomDetails.circle(px + w - 34, py + h - 42, 5).fill({ color: 0xff8844, alpha: 0.18 });
        break;
      case 'agnes':
        drawConsoleBank(px + 22, py + 24, 54, 18, 0.20);
        roomDetails.roundRect(px + 28, py + h - 58, 64, 26, 6).fill({ color: 0x231528 });
        roomDetails.roundRect(px + 34, py + h - 52, 52, 14, 4).fill({ color: 0xff66aa, alpha: 0.18 });
        roomDetails.circle(px + w - 38, py + 42, 14).fill({ color: 0xffffff, alpha: 0.06 });
        roomDetails.circle(px + w - 38, py + 42, 10).stroke({ color: 0xff66aa, alpha: 0.3, width: 2 });
        break;
      case 'stuart':
        drawConsoleBank(px + 22, py + 22, 48, 18, 0.16);
        drawCrate(px + w - 52, py + h - 50, 20);
        drawCrate(px + w - 78, py + h - 44, 14);
        roomDetails.rect(px + w / 2 - 18, py + h / 2 - 18, 36, 36).stroke({ color: 0xffd86b, alpha: 0.35, width: 2 });
        roomDetails.circle(px + w / 2, py + h / 2, 6).fill({ color: 0xffd86b, alpha: 0.2 });
        break;
    }

    container.addChild(roomDetails);

    const ambient = new Graphics();
    ambient.label = 'room_ambient';
    ambient.rect(px + 12, py + 12, w - 24, 14).fill({ color: roomColor, alpha: 0.06 });
    ambient.rect(px + 12, py + h - 26, w - 24, 10).fill({ color: roomColor, alpha: 0.04 });
    ambient.circle(px + w * 0.25, py + h * 0.3, 26).fill({ color: roomColor, alpha: 0.035 });
    ambient.circle(px + w * 0.74, py + h * 0.66, 32).fill({ color: roomColor, alpha: 0.03 });
    container.addChild(ambient);

    if (room.backgroundImage) {
      Assets.load(room.backgroundImage).then((texture) => {
        const sprite = new Sprite(texture);
        sprite.label = 'room_image';
        sprite.x = px;
        sprite.y = py;
        sprite.width = w;
        sprite.height = h;
        sprite.alpha = 0.28;
        container.addChildAt(sprite, 1);

        const tint = new Graphics();
        tint.label = 'room_image_tint';
        tint.rect(px, py, w, h).fill({ color: roomColor, alpha: 0.06 });
        container.addChildAt(tint, 2);
      }).catch(() => {
        console.warn(`[DungeonMap] Failed to load room image: ${room.backgroundImage}`);
      });
    }

    const border = new Graphics();
    border.label = 'border';
    border.rect(px, py, w, h).stroke({ color: roomColor, alpha: 1.0, width: 4 });
    border.rect(px - 4, py - 4, w + 8, h + 8).stroke({ color: roomColor, alpha: 0.35, width: 5 });
    border.rect(px - 8, py - 8, w + 16, h + 16).stroke({ color: roomColor, alpha: 0.20, width: 6 });
    const bLen = 20;
    const bW = 3;
    border.rect(px - 2, py - 2, bLen, bW).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px - 2, py - 2, bW, bLen).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px + w - bLen + 2, py - 2, bLen, bW).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px + w - 1, py - 2, bW, bLen).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px - 2, py + h - 1, bLen, bW).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px - 2, py + h - bLen + 2, bW, bLen).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px + w - bLen + 2, py + h - 1, bLen, bW).fill({ color: roomColor, alpha: 1.0 });
    border.rect(px + w - 1, py + h - bLen + 2, bW, bLen).fill({ color: roomColor, alpha: 1.0 });
    container.addChild(border);

    const hitArea = new Graphics();
    hitArea.label = `hit_${room.id}`;
    hitArea.rect(px, py, w, h).fill({ color: 0xffffff, alpha: 0.001 });
    hitArea.interactive = true;
    hitArea.cursor = 'pointer';
    hitArea.on('pointerup', () => {
      if (!isDraggingRef.current) {
        onRoomClick(room.id as AgentId);
      }
    });
    hitArea.on('pointerover', () => {
      hoveredIdRef.current = room.id as AgentId;
      onRoomHover(room.id as AgentId);
    });
    hitArea.on('pointerout', () => {
      if (hoveredIdRef.current === (room.id as AgentId)) {
        hoveredIdRef.current = null;
        onRoomHover(null);
      }
    });
    container.addChild(hitArea);
  }

  // ── Draw corridors — simple dark filled rectangles ────────────────────────
  function drawCorridors(layer: Container) {
    const corridorGraphics = new Graphics();

    for (const seg of CORRIDORS) {
      const { x, y, length, direction, width: segWidth } = seg;

      const tilesX = direction === 'h' ? length : segWidth;
      const tilesY = direction === 'v' ? length : segWidth;

      const px2 = x * TILE_SIZE;
      const py2 = y * TILE_SIZE;
      const pw = tilesX * TILE_SIZE;
      const ph = tilesY * TILE_SIZE;

      // Dark corridor — slightly lighter than void
      corridorGraphics.rect(px2, py2, pw, ph).fill({ color: 0x0a0c12, alpha: 1.0 });
      // Subtle edge line
      corridorGraphics.rect(px2, py2, pw, ph).stroke({ color: 0x1a2030, alpha: 0.4, width: 1 });
    }

    layer.addChild(corridorGraphics);
  }

  // ── Draw room label (name text at bottom of room, no emoji) ──────────────
  function drawSingleRoomLabel(layer: Container, room: Room, meta?: CustomRoomMeta) {
    const { cx } = roomCenter(room);
    const { py, h } = roomPixelBounds(room);
    const color = meta?.colorPixi ?? ROOM_COLORS[room.id] ?? 0xaaaaaa;
    const label = meta?.label ?? ROOM_LABELS[room.id] ?? room.label.toUpperCase();

    const labelStyle = new TextStyle({
      fontSize: 14,
      fill: color,
      fontFamily: '"Orbitron", "Share Tech Mono", "Courier New", monospace',
      letterSpacing: 3,
      fontWeight: 'bold',
      align: 'center',
      dropShadow: { color: 0x000000, blur: 8, distance: 0, alpha: 1 },
    });
    const labelText = new Text({ text: label, style: labelStyle });
    labelText.alpha = 0.90;
    labelText.anchor.set(0.5);
    labelText.x = cx;
    labelText.y = py + h - 14;
    layer.addChild(labelText);
  }

  function drawRoomLabels(layer: Container) {
    for (const room of ROOMS) {
      drawSingleRoomLabel(layer, room);
    }
  }

  // ── Update glow/selection effects ─────────────────────────────────────────
  function updateGlowEffects(time: number) {
    const t = time / 1000;

    for (const room of ROOMS) {
      const glow = glowGraphicsRef.current.get(room.id);
      if (!glow) continue;

      const { px, py, w, h } = roomPixelBounds(room);
      const isSelected = selectedIdRef.current === room.id;
      const isHovered = hoveredIdRef.current === room.id;
      const color = ROOM_COLORS[room.id] ?? 0x888888;
      const roomIdx = ROOMS.indexOf(room);

      glow.clear();

      // Passive ambient breathe
      const breathe = 0.05 + 0.03 * Math.sin(t * 0.8 + roomIdx * 1.2);
      glow.rect(px - 6, py - 6, w + 12, h + 12).stroke({ color, alpha: breathe, width: 5 });

      if (isSelected) {
        const pulse = 0.45 + 0.35 * Math.sin(t * 2.8);
        const pulse2 = 0.3 + 0.2 * Math.sin(t * 2.8 + 0.5);

        glow.rect(px - 10, py - 10, w + 20, h + 20).stroke({ color, alpha: pulse * 0.25, width: 8 });
        glow.rect(px - 5, py - 5, w + 10, h + 10).stroke({ color, alpha: pulse * 0.6, width: 3 });
        glow.rect(px - 1, py - 1, w + 2, h + 2).stroke({ color, alpha: 0.95, width: 2 });
        glow.rect(px + 3, py + 3, w - 6, h - 6).stroke({ color, alpha: pulse2 * 0.4, width: 1 });

        const bLen = 16 + 4 * Math.sin(t * 2.8);
        const bW = 2.5;
        const bAlpha = 0.95;
        glow.rect(px - 3, py - 3, bLen, bW).fill({ color, alpha: bAlpha });
        glow.rect(px - 3, py - 3, bW, bLen).fill({ color, alpha: bAlpha });
        glow.rect(px + w - bLen + 3, py - 3, bLen, bW).fill({ color, alpha: bAlpha });
        glow.rect(px + w + 1, py - 3, bW, bLen).fill({ color, alpha: bAlpha });
        glow.rect(px - 3, py + h + 1, bLen, bW).fill({ color, alpha: bAlpha });
        glow.rect(px - 3, py + h - bLen + 3, bW, bLen).fill({ color, alpha: bAlpha });
        glow.rect(px + w - bLen + 3, py + h + 1, bLen, bW).fill({ color, alpha: bAlpha });
        glow.rect(px + w + 1, py + h - bLen + 3, bW, bLen).fill({ color, alpha: bAlpha });

        const { cx: rcx, cy: rcy } = roomCenter(room);
        const scanAlpha = 0.06 + 0.04 * Math.sin(t * 3.5);
        glow.rect(px, rcy - 0.5, w, 1).fill({ color, alpha: scanAlpha });
        glow.rect(rcx - 0.5, py, 1, h).fill({ color, alpha: scanAlpha });

      } else if (isHovered) {
        const pulse = 0.3 + 0.2 * Math.sin(t * 3.2);
        glow.rect(px - 5, py - 5, w + 10, h + 10).stroke({ color, alpha: pulse * 0.55, width: 4 });
        glow.rect(px - 1, py - 1, w + 2, h + 2).stroke({ color, alpha: 0.65, width: 1.5 });
        const hLen = 12;
        const hAlpha = 0.7;
        glow.rect(px - 2, py - 2, hLen, 2).fill({ color, alpha: hAlpha });
        glow.rect(px - 2, py - 2, 2, hLen).fill({ color, alpha: hAlpha });
        glow.rect(px + w - hLen + 2, py - 2, hLen, 2).fill({ color, alpha: hAlpha });
        glow.rect(px + w, py - 2, 2, hLen).fill({ color, alpha: hAlpha });
        glow.rect(px - 2, py + h, hLen, 2).fill({ color, alpha: hAlpha });
        glow.rect(px - 2, py + h - hLen + 2, 2, hLen).fill({ color, alpha: hAlpha });
        glow.rect(px + w - hLen + 2, py + h, hLen, 2).fill({ color, alpha: hAlpha });
        glow.rect(px + w, py + h - hLen + 2, 2, hLen).fill({ color, alpha: hAlpha });
      }

      // Agent status dot
      const agent = agentsRef.current.find(a => a.id === room.id);
      if (agent?.status === 'active') {
        const statusPulse = 0.7 + 0.3 * Math.sin(t * 2.2 + roomIdx * 0.7);
        glow.circle(px + w - 8, py + 8, 7).fill({ color: 0x00ff88, alpha: 0.15 });
        glow.circle(px + w - 8, py + 8, 4.5).fill({ color: 0x00ff88, alpha: statusPulse });
        glow.circle(px + w - 8, py + 8, 2.5).fill({ color: 0xaaffcc, alpha: statusPulse });
      } else if (agent?.status === 'error') {
        const errorPulse = 0.8 + 0.2 * Math.sin(t * 5);
        glow.circle(px + w - 8, py + 8, 7).fill({ color: 0xff3333, alpha: 0.2 });
        glow.circle(px + w - 8, py + 8, 4.5).fill({ color: 0xff3333, alpha: errorPulse });
      } else {
        glow.circle(px + w - 8, py + 8, 3).fill({ color: 0x334455, alpha: 0.6 });
      }
    }
  }

  // ── Lighting — no effects needed ──────────────────────────────────────────
  function updateLighting(_time: number) {
    const lg = lightingLayerRef.current;
    if (!lg) return;
    lg.clear();
  }

  // ── Update agent sprites — only Agnes ────────────────────────────────────
  function updateAgentSprites(timeSec: number) {
    for (const room of ROOMS) {
      const sc = spriteContainersRef.current.get(room.id);
      if (!sc) continue;
      const agent = agentsRef.current.find(a => a.id === room.id);
      const status = agent?.status ?? 'idle';
      const selected = selectedIdRef.current === room.id;
      const { cx, cy } = roomCenter(room);
      if (room.id === 'agnes') {
        drawAgnesSprite(sc, cx, cy, timeSec, status, selected);
      }
      // All other agents: no sprite
    }
  }

  // ── Center dungeon in viewport ────────────────────────────────────────────
  function centerDungeon(W: number, H: number) {
    const scaleFit = Math.min(W / CANVAS_W, H / CANVAS_H) * 0.85;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scaleFit));
    targetZoomRef.current = zoom;
    zoomRef.current = zoom;
    targetPanXRef.current = (W - CANVAS_W * zoom) / 2;
    targetPanYRef.current = (H - CANVAS_H * zoom) / 2;
    panXRef.current = targetPanXRef.current;
    panYRef.current = targetPanYRef.current;
  }

  // ── Interaction setup ─────────────────────────────────────────────────────
  function setupInteraction(app: Application) {
    const canvas = app.canvas;

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current * zoomFactor));
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = (mx - targetPanXRef.current) / targetZoomRef.current;
      const worldY = (my - targetPanYRef.current) / targetZoomRef.current;
      targetZoomRef.current = newZoom;
      targetPanXRef.current = mx - worldX * newZoom;
      targetPanYRef.current = my - worldY * newZoom;
    }, { passive: false });

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX: targetPanXRef.current, panY: targetPanYRef.current };
      totalDragRef.current = 0;
      isDraggingRef.current = false;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        isDraggingRef.current = true;
        totalDragRef.current = dist;
        targetPanXRef.current = dragStartRef.current.panX + dx;
        targetPanYRef.current = dragStartRef.current.panY + dy;
      }
    });

    window.addEventListener('mouseup', () => {
      dragStartRef.current = null;
      isDraggingRef.current = false;
      totalDragRef.current = 0;
    });

    canvas.addEventListener('dblclick', () => {
      const W = canvasSizeRef.current.w;
      const H = canvasSizeRef.current.h;
      const scaleFit = Math.min(W / CANVAS_W, H / CANVAS_H) * 0.85;
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scaleFit));
      targetZoomRef.current = zoom;
      targetPanXRef.current = (W - CANVAS_W * zoom) / 2;
      targetPanYRef.current = (H - CANVAS_H * zoom) / 2;
    });

    let lastTouchDist = 0;
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      } else if (e.touches.length === 1) {
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: targetPanXRef.current,
          panY: targetPanYRef.current,
        };
        totalDragRef.current = 0;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          targetZoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current * factor));
        }
        lastTouchDist = dist;
      } else if (e.touches.length === 1 && dragStartRef.current) {
        const ddx = e.touches[0].clientX - dragStartRef.current.x;
        const ddy = e.touches[0].clientY - dragStartRef.current.y;
        targetPanXRef.current = dragStartRef.current.panX + ddx;
        targetPanYRef.current = dragStartRef.current.panY + ddy;
      }
    }, { passive: false });
  }

  // ── Handle window resize ──────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !appRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const W = rect.width || 900;
      const H = rect.height || 600;
      canvasSizeRef.current = { w: W, h: H };
      appRef.current.renderer.resize(W, H);
      centerDungeon(W, H);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isDraggingRef.current ? 'grabbing' : 'default',
        background: '#050508',
      }}
    />
  );
}