// ─── DungeonMapPixi.tsx — PixiJS v8 dungeon map with real tileset ─────────────
// Uses 0x72's DungeonTileset II (512x512, 16x16 tiles, 32×32 grid)
// Tile grid reference (col, row) — 0-indexed:
//   Floor tiles:
//     Stone floor:   col 0-5, row 6  (inner floor variants)
//     Dark floor:    col 0, row 6
//   Wall tiles:
//     Top wall:      col 0-7, row 2 (mid wall face)
//     Wall face:     col 0, row 2
//   0x72 DungeonTileset II layout is 16px per tile, 32 cols × 32 rows

import React, { useRef, useEffect } from 'react';
import {
  Application,
  Sprite,
  Container,
  Graphics,
  Texture,
  Rectangle,
  Assets,
  Text,
  TextStyle,
} from 'pixi.js';
import type { AgentId, AgentInfo } from '../types';
import { ROOMS, CORRIDORS, CANVAS_W, CANVAS_H, roomCenter, roomPixelBounds } from '../dungeon/rooms';
import type { PulseHandle } from './DungeonMap';
import { TILE_SIZE } from '../dungeon/tiles';
import { drawGrimSprite, drawBobSprite, drawKevinSprite, drawStuartSprite, drawAgnesSprite } from '../pixi/PixiAgentSprites';
import { PixiParticleSystem } from '../pixi/PixiParticles';
import { PixiEventPulseSystem } from '../pixi/PixiEventPulse';

// ─── 0x72 DungeonTileset II tile definitions ──────────────────────────────────
// The tileset is 512×512 with 16×16 pixel tiles = 32×32 grid
const T = 16; // tile size in the source tileset

// Tile coordinate helpers — (col, row) → pixel rect in the tileset
function tileRect(col: number, row: number): Rectangle {
  return new Rectangle(col * T, row * T, T, T);
}

// Key tile regions from 0x72 DungeonTileset II (16x16 grid refs)
// Row 0-1: characters/entities
// Row 2-3: wall tops and faces
// Row 4-5: wall variants / props
// Row 6-7: floor tiles (stone)
// Row 8-9: special floors
const TILE_DEFS = {
  // Floor tiles — various stone floor variants (row 6)
  floorStone:    [tileRect(0,6), tileRect(1,6), tileRect(2,6), tileRect(3,6)],
  // Wood/plank floor for library (row 7)
  floorWood:     [tileRect(0,7), tileRect(1,7), tileRect(2,7)],
  // Brick/red floor for workshop (row 8)  
  floorBrick:    [tileRect(0,8), tileRect(1,8), tileRect(2,8)],
  // Gold/special floor for treasury (row 9)
  floorGold:     [tileRect(0,9), tileRect(1,9), tileRect(2,9)],
  // Wall mid face (row 2)
  wallMid:       [tileRect(0,2), tileRect(1,2), tileRect(2,2), tileRect(3,2)],
  // Wall top (row 1 — the "top" of the wall seen from above)
  wallTop:       [tileRect(0,1), tileRect(1,1), tileRect(2,1)],
  // Wall side corners
  wallLeft:      tileRect(4,2),
  wallRight:     tileRect(5,2),
  // Column / pillar
  pillar:        tileRect(9,3),
  // Corridor floor
  corridorFloor: [tileRect(0,6), tileRect(1,6)],
};

// ─── Room color palette (for tinting and glow) ────────────────────────────────
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

const ROOM_EMOJIS: Record<string, string> = {
  grim:   '🐉',
  bob:    '📚',
  kevin:  '🔧',
  stuart: '💰',
  agnes:  '🎨',
};

// ─── Zoom/Pan constants ───────────────────────────────────────────────────────
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.5;
const DEFAULT_ZOOM = 1.0;
// PAN_DRAG_THRESHOLD removed — drag detection now uses 3px inline check

// ─── Seeded random (deterministic per tile position) ─────────────────────────
function seededRand(seed: number): number {
  let s = Math.abs(seed | 0);
  s = (s ^ 61) ^ (s >>> 16);
  s += s << 3;
  s ^= s >>> 4;
  s *= 0x27d4eb2d;
  s ^= s >>> 15;
  return (s >>> 0) / 0xffffffff;
}

// ─── Pick a tile variant deterministically for a position ─────────────────────
function pickTile(variants: Rectangle[], gridX: number, gridY: number): Rectangle {
  const idx = Math.floor(seededRand(gridX * 997 + gridY * 1303) * variants.length);
  return variants[idx];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  agents: AgentInfo[];
  selectedId: AgentId | null;
  onRoomClick: (id: AgentId) => void;
  onRoomHover: (id: AgentId | null) => void;
  pulseHandleRef?: React.MutableRefObject<PulseHandle | null>;
}

// ─── DungeonMapPixi component ─────────────────────────────────────────────────
export function DungeonMapPixi({ agents, selectedId, onRoomClick, onRoomHover, pulseHandleRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const containerRef = useRef<Container | null>(null);
  const roomContainersRef = useRef<Map<string, Container>>(new Map());
  const glowGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const tileTexturesRef = useRef<Map<string, Texture>>(new Map());
  const lightingLayerRef = useRef<Graphics | null>(null);
  const animFrameRef = useRef<number>(0);
  const hoveredIdRef = useRef<AgentId | null>(null);
  const spriteContainersRef = useRef<Map<string, Container>>(new Map());
  const particleSystemRef = useRef<PixiParticleSystem | null>(null);
  const pulseSysRef = useRef<PixiEventPulseSystem | null>(null);

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

  // ── Agent state ref (avoid stale closure in render loop) ───────────────────
  const agentsRef = useRef(agents);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // ── Canvas size tracking ────────────────────────────────────────────────────
  const canvasSizeRef = useRef({ w: 800, h: 600 });

  // ── Expose pulse handle ──────────────────────────────────────────────────
  useEffect(() => {
    if (pulseHandleRef) {
      pulseHandleRef.current = {
        fire: (agentId, _kind) => {
          const pulseSys = pulseSysRef.current;
          if (!pulseSys) return;
          // Fire pulse from Grim's room to the target agent's room
          const grimRoom = ROOMS.find(r => r.id === 'grim');
          const targetRoom = ROOMS.find(r => r.id === agentId);
          if (!grimRoom || !targetRoom) return;
          const from = roomCenter(grimRoom);
          const to = roomCenter(targetRoom);
          const ROOM_COLORS_MAP: Record<string, number> = {
            grim: 0xFFA700, bob: 0x6699CC, kevin: 0xFF5522, stuart: 0xFFD700, agnes: 0xFF66AA,
          };
          const color = ROOM_COLORS_MAP[agentId] ?? 0xffffff;
          pulseSys.fire(from.cx, from.cy, to.cx, to.cy, color);
        },
      };
    }
  }, [pulseHandleRef]);

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

      // ── Initialize PixiJS Application (v8 async init) ───────────────────
      const app = new Application();
      await app.init({
        width: W,
        height: H,
        background: 0x0a0d0f,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        hello: false,
      });
      if (destroyed) { app.destroy(true); return; }

      appRef.current = app;
      mountRef.current!.appendChild(app.canvas);

      // ── Load tileset texture ─────────────────────────────────────────────
      let tilesetTexture: Texture;
      try {
        tilesetTexture = await Assets.load('/assets/tilesets/dungeon-tileset.png');
      } catch {
        // Fallback: create a procedural tileset texture
        tilesetTexture = createFallbackTileTexture(app);
      }
      if (destroyed) { app.destroy(true); return; }

      // Pre-slice textures
      buildTileTextures(tilesetTexture, tileTexturesRef.current);

      // ── Root container (zoom/pan target) ────────────────────────────────
      const worldContainer = new Container();
      app.stage.addChild(worldContainer);
      containerRef.current = worldContainer;

      // ── Build dungeon map layers ─────────────────────────────────────────
      buildDungeon(app, worldContainer, tilesetTexture);

      // ── Lighting layer ───────────────────────────────────────────────────
      const lightingLayer = new Graphics();
      worldContainer.addChild(lightingLayer);
      lightingLayerRef.current = lightingLayer;

      // ── Sprite containers for each agent ────────────────────────────────
      const spriteLayer = new Container();
      worldContainer.addChild(spriteLayer);
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

      // Center the dungeon initially
      centerDungeon(W, H);

      // ── Interaction ──────────────────────────────────────────────────────
      setupInteraction(app);

      // ── Render loop ──────────────────────────────────────────────────────
      let lastTime = 0;
      function renderLoop(time: number) {
        if (destroyed) return;
        animFrameRef.current = requestAnimationFrame(renderLoop);

        const dt = time - lastTime;
        lastTime = time;

        // Smooth zoom/pan
        const lerpSpeed = 0.14;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * lerpSpeed;
        panXRef.current += (targetPanXRef.current - panXRef.current) * lerpSpeed;
        panYRef.current += (targetPanYRef.current - panYRef.current) * lerpSpeed;

        if (worldContainer) {
          worldContainer.scale.set(zoomRef.current);
          worldContainer.x = panXRef.current;
          worldContainer.y = panYRef.current;
        }

        // Update glow/selection effects
        updateGlowEffects(time);

        // Update lighting
        updateLighting(time);

        // Draw minion sprites
        updateAgentSprites(time / 1000);

        // Update particles and pulses
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

  // ── Build tile texture map from the spritesheet ──────────────────────────
  function buildTileTextures(base: Texture, map: Map<string, Texture>) {
    const src = base.source;
    const makeKey = (rect: Rectangle) => `${rect.x}_${rect.y}_${rect.width}_${rect.height}`;

    const allRects: Rectangle[] = [
      ...TILE_DEFS.floorStone,
      ...TILE_DEFS.floorWood,
      ...TILE_DEFS.floorBrick,
      ...TILE_DEFS.floorGold,
      ...TILE_DEFS.wallMid,
      ...TILE_DEFS.wallTop,
      TILE_DEFS.wallLeft,
      TILE_DEFS.wallRight,
      TILE_DEFS.pillar,
      ...TILE_DEFS.corridorFloor,
    ];

    for (const rect of allRects) {
      const key = makeKey(rect);
      if (!map.has(key)) {
        const tex = new Texture({ source: src, frame: rect });
        map.set(key, tex);
      }
    }
  }

  function getTileTex(rect: Rectangle): Texture {
    const key = `${rect.x}_${rect.y}_${rect.width}_${rect.height}`;
    return tileTexturesRef.current.get(key) ?? Texture.EMPTY;
  }

  // ── Build the dungeon scene ───────────────────────────────────────────────
  function buildDungeon(app: Application, world: Container, _tileset: Texture) {
    // Background fill — deep dungeon black
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill(0x0a0d0f);
    world.addChild(bg);

    // Draw corridors first (below rooms)
    const corridorLayer = new Container();
    world.addChild(corridorLayer);
    drawCorridors(corridorLayer);

    // Draw rooms
    const roomLayer = new Container();
    world.addChild(roomLayer);

    for (const room of ROOMS) {
      const roomCont = new Container();
      roomCont.label = room.id;
      roomContainersRef.current.set(room.id, roomCont);
      roomLayer.addChild(roomCont);
      buildRoom(app, roomCont, room);
    }

    // Glow overlay layer
    const glowLayer = new Container();
    world.addChild(glowLayer);

    for (const room of ROOMS) {
      const glow = new Graphics();
      glowGraphicsRef.current.set(room.id, glow);
      glowLayer.addChild(glow);
    }

    // Labels layer
    const labelLayer = new Container();
    world.addChild(labelLayer);
    drawRoomLabels(labelLayer);
  }

  // ── Draw a single room ────────────────────────────────────────────────────
  function buildRoom(_app: Application, container: Container, room: typeof ROOMS[0]) {
    const { px, py, w, h } = roomPixelBounds(room);

    // Floor layer
    const floorTiles = getFloorTiles(room.floorType);
    const wallMids = TILE_DEFS.wallMid;

    // Scale tiles to our TILE_SIZE (source is 16px, target is 48px → scale 3x)
    const scale = TILE_SIZE / T; // 3.0

    // Draw walls around entire room first
    for (let gy = -1; gy <= room.heightTiles; gy++) {
      for (let gx = -1; gx <= room.widthTiles; gx++) {
        const isInterior = gx >= 0 && gx < room.widthTiles && gy >= 0 && gy < room.heightTiles;
        const tpx = px + gx * TILE_SIZE;
        const tpy = py + gy * TILE_SIZE;

        if (isInterior) {
          // Floor tile
          const rect = pickTile(floorTiles, room.gridX + gx, room.gridY + gy);
          const sp = new Sprite(getTileTex(rect));
          sp.x = tpx;
          sp.y = tpy;
          sp.scale.set(scale);
          container.addChild(sp);
        } else {
          // Wall tile
          const wallRect = pickTile(wallMids, room.gridX + gx, room.gridY + gy);
          const sp = new Sprite(getTileTex(wallRect));
          sp.x = tpx;
          sp.y = tpy;
          sp.scale.set(scale);
          // Wall tint — slightly darker
          sp.tint = 0xaaaaaa;
          container.addChild(sp);
        }
      }
    }

    // Room border overlay (inner glow frame) — drawn with Graphics
    const border = new Graphics();
    border.label = 'border';
    // Subtle room outline
    border
      .rect(px, py, w, h)
      .stroke({ color: ROOM_COLORS[room.id] ?? 0x888888, alpha: 0.3, width: 2 });
    container.addChild(border);

    // Torch positions — four corners
    const torchPositions = [
      { x: px + 12, y: py + 12 },
      { x: px + w - 12, y: py + 12 },
      { x: px + 12, y: py + h - 12 },
      { x: px + w - 12, y: py + h - 12 },
    ];

    for (const tp of torchPositions) {
      drawTorch(container, tp.x, tp.y, ROOM_COLORS[room.id] ?? 0xFF8800);
    }

    // Make room interactive
    // We'll handle click/hover at the world level via hit-test
    const hitArea = new Graphics();
    hitArea.label = `hit_${room.id}`;
    hitArea.rect(px, py, w, h).fill({ color: 0xffffff, alpha: 0.001 });
    hitArea.interactive = true;
    hitArea.cursor = 'pointer';
    hitArea.on('pointerup', () => {
      // Only fire room select if NOT dragging
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

  // ── Draw corridors ────────────────────────────────────────────────────────
  function drawCorridors(layer: Container) {
    const scale = TILE_SIZE / T;

    for (const seg of CORRIDORS) {
      const { x, y, length, direction, width: segWidth } = seg;

      const tilesX = direction === 'h' ? length : segWidth;
      const tilesY = direction === 'v' ? length : segWidth;

      for (let gy = 0; gy < tilesY; gy++) {
        for (let gx = 0; gx < tilesX; gx++) {
          const tgx = x + gx;
          const tgy = y + gy;
          const px2 = tgx * TILE_SIZE;
          const py2 = tgy * TILE_SIZE;

          const rect = pickTile(TILE_DEFS.corridorFloor, tgx, tgy);
          const sp = new Sprite(getTileTex(rect));
          sp.x = px2;
          sp.y = py2;
          sp.scale.set(scale);
          sp.tint = 0x888899;
          layer.addChild(sp);
        }
      }
    }
  }

  // ── Draw a torch sprite ───────────────────────────────────────────────────
  function drawTorch(container: Container, x: number, y: number, color: number) {
    const g = new Graphics();
    // Torch base
    g.circle(x, y, 4).fill({ color: 0x443322, alpha: 1 });
    // Flame
    g.circle(x, y - 2, 3).fill({ color, alpha: 0.9 });
    g.circle(x, y - 4, 2).fill({ color: 0xffff99, alpha: 0.8 });
    container.addChild(g);

    // Light halo
    const halo = new Graphics();
    halo.circle(x, y, 18).fill({ color, alpha: 0.0 });
    halo.label = `torch_halo_${x}_${y}`;
    container.addChild(halo);
  }

  // ── Draw room labels ──────────────────────────────────────────────────────
  function drawRoomLabels(layer: Container) {
    for (const room of ROOMS) {
      const { cx, cy } = roomCenter(room);
      const { h } = roomPixelBounds(room);

      // Emoji label
      const emojiStyle = new TextStyle({
        fontSize: 24,
        fill: 0xffffff,
        align: 'center',
      });
      const emojiText = new Text({ text: ROOM_EMOJIS[room.id] ?? '', style: emojiStyle });
      emojiText.anchor.set(0.5);
      emojiText.x = cx;
      emojiText.y = cy - 16;
      layer.addChild(emojiText);

      // Name label
      const labelStyle = new TextStyle({
        fontSize: 9,
        fill: ROOM_COLORS[room.id] ?? 0xaaaaaa,
        fontFamily: '"Courier New", monospace',
        letterSpacing: 2,
        fontWeight: 'bold',
        align: 'center',
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 0,
          alpha: 1,
        },
      });
      const labelText = new Text({ text: ROOM_LABELS[room.id] ?? room.label.toUpperCase(), style: labelStyle });
      labelText.anchor.set(0.5);
      labelText.x = cx;
      labelText.y = cy + h / 2 - 16;
      layer.addChild(labelText);
    }
  }

  // ── Update glow/selection effects ────────────────────────────────────────
  function updateGlowEffects(time: number) {
    const t = time / 1000;

    for (const room of ROOMS) {
      const glow = glowGraphicsRef.current.get(room.id);
      if (!glow) continue;

      const { px, py, w, h } = roomPixelBounds(room);
      const isSelected = selectedIdRef.current === room.id;
      const isHovered = hoveredIdRef.current === room.id;
      const color = ROOM_COLORS[room.id] ?? 0x888888;

      glow.clear();

      if (isSelected) {
        // Pulsing selection glow
        const pulse = 0.4 + 0.3 * Math.sin(t * 2.5);
        // Outer glow
        glow
          .rect(px - 4, py - 4, w + 8, h + 8)
          .stroke({ color, alpha: pulse * 0.8, width: 3 });
        // Inner glow
        glow
          .rect(px - 1, py - 1, w + 2, h + 2)
          .stroke({ color, alpha: 0.9, width: 2 });
        // Corner marks
        const corners = [
          [px - 4, py - 4], [px + w - 8, py - 4],
          [px - 4, py + h - 8], [px + w - 8, py + h - 8],
        ] as const;
        for (const [cx2, cy2] of corners) {
          glow.rect(cx2, cy2, 12, 2).fill({ color, alpha: 0.9 });
          glow.rect(cx2, cy2, 2, 12).fill({ color, alpha: 0.9 });
        }
      } else if (isHovered) {
        const pulse = 0.2 + 0.15 * Math.sin(t * 3);
        glow
          .rect(px - 2, py - 2, w + 4, h + 4)
          .stroke({ color, alpha: pulse + 0.3, width: 2 });
      }

      // Agent status indicator
      const agent = agentsRef.current.find(a => a.id === room.id);
      if (agent?.status === 'active') {
        const statusPulse = 0.6 + 0.4 * Math.sin(t * 1.5 + ROOMS.indexOf(room) * 0.8);
        // Small status dot at top-right
        glow.circle(px + w - 8, py + 8, 4).fill({ color: 0x00ff88, alpha: statusPulse });
      } else if (agent?.status === 'error') {
        const errorPulse = 0.7 + 0.3 * Math.sin(t * 4);
        glow.circle(px + w - 8, py + 8, 4).fill({ color: 0xff3333, alpha: errorPulse });
      }
    }
  }

  // ── Update dynamic lighting ───────────────────────────────────────────────
  function updateLighting(time: number) {
    const lg = lightingLayerRef.current;
    if (!lg) return;

    const t = time / 1000;
    lg.clear();

    // Dark ambient overlay
    lg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x000000, alpha: 0.55 });

    // Cut out light areas for each room
    for (const room of ROOMS) {
      const { cx, cy } = roomCenter(room);
      const { w, h } = roomPixelBounds(room);
      const color = ROOM_COLORS[room.id] ?? 0xff8800;
      const pulse = 0.03 * Math.sin(t * 1.2 + ROOMS.indexOf(room) * 1.1);
      const lightRadius = Math.min(w, h) * 0.65 + pulse * 20;

      // Erase darkness in room area using blending — approximate with a semi-transparent fill
      // In PixiJS v8 we use alpha blending; we'll draw a radial "light" in multiply/screen mode
      // We simulate this by drawing decreasing-alpha circles
      const steps = 5;
      for (let i = steps; i >= 0; i--) {
        const r = lightRadius * (i / steps + 0.2);
        const alpha = (0.45 * (1 - i / steps)) + pulse * 0.05;
        lg.circle(cx, cy, r).fill({ color, alpha: alpha * 0.3 });
      }

      // Torch glows at corners
      const { px, py } = roomPixelBounds(room);
      const torchPositions = [
        { x: px + 12, y: py + 12 },
        { x: px + w - 12, y: py + 12 },
      ];
      for (const tp of torchPositions) {
        const torchPulse = 0.2 * Math.sin(t * 5.3 + tp.x * 0.1);
        lg.circle(tp.x, tp.y, 22 + torchPulse * 5).fill({ color: 0xFF8800, alpha: 0.12 + torchPulse * 0.05 });
        lg.circle(tp.x, tp.y, 10).fill({ color: 0xFFCC44, alpha: 0.18 });
      }
    }
  }

  // ── Update agent sprites in their room containers ────────────────────────
  function updateAgentSprites(timeSec: number) {
    for (const room of ROOMS) {
      const sc = spriteContainersRef.current.get(room.id);
      if (!sc) continue;
      const agent = agentsRef.current.find(a => a.id === room.id);
      const status = agent?.status ?? 'idle';
      const selected = selectedIdRef.current === room.id;
      const { cx, cy } = roomCenter(room);
      switch (room.id) {
        case 'grim':   drawGrimSprite(sc, cx, cy, timeSec, status, selected); break;
        case 'bob':    drawBobSprite(sc, cx, cy, timeSec, status, selected); break;
        case 'kevin':  drawKevinSprite(sc, cx, cy, timeSec, status, selected); break;
        case 'stuart': drawStuartSprite(sc, cx, cy, timeSec, status, selected); break;
        case 'agnes':  drawAgnesSprite(sc, cx, cy, timeSec, status, selected); break;
      }
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

    // Wheel zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current * zoomFactor));

      // Zoom toward cursor
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const worldX = (mx - targetPanXRef.current) / targetZoomRef.current;
      const worldY = (my - targetPanYRef.current) / targetZoomRef.current;

      targetZoomRef.current = newZoom;
      targetPanXRef.current = mx - worldX * newZoom;
      targetPanYRef.current = my - worldY * newZoom;
    }, { passive: false });

    // Mouse drag for panning
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

    // Listen on window so mouseup fires even if cursor leaves canvas
    window.addEventListener('mouseup', () => {
      dragStartRef.current = null;
      isDraggingRef.current = false;
      totalDragRef.current = 0;
    });

    // Double-click to reset
    canvas.addEventListener('dblclick', () => {
      const W = canvasSizeRef.current.w;
      const H = canvasSizeRef.current.h;
      const scaleFit = Math.min(W / CANVAS_W, H / CANVAS_H) * 0.85;
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scaleFit));
      targetZoomRef.current = zoom;
      targetPanXRef.current = (W - CANVAS_W * zoom) / 2;
      targetPanYRef.current = (H - CANVAS_H * zoom) / 2;
    });

    // Touch zoom/pan
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

  // ── Fallback: create procedural tile textures when tileset fails ──────────
  function createFallbackTileTexture(_app: Application): Texture {
    // Create a 512x512 canvas with procedural tiles
    const offscreen = document.createElement('canvas');
    offscreen.width = 512;
    offscreen.height = 512;
    const ctx = offscreen.getContext('2d')!;

    // Fill with dark base
    ctx.fillStyle = '#1a1e22';
    ctx.fillRect(0, 0, 512, 512);

    // Draw 32x32 grid of tile variants
    for (let row = 0; row < 32; row++) {
      for (let col = 0; col < 32; col++) {
        const x = col * T;
        const y = row * T;
        drawProceduralTile(ctx, x, y, row, col);
      }
    }

    return Texture.from(offscreen);
  }

  function drawProceduralTile(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, col: number) {
    const seed = row * 97 + col * 1303;
    const s = T;

    if (row >= 6 && row <= 9) {
      // Floor tiles — various types
      const palettes: string[][] = [
        ['#2a3040', '#252c38', '#222830'],  // stone (row 6)
        ['#2a2218', '#241e14', '#1e1a10'],  // wood (row 7)
        ['#261310', '#22110e', '#1e0f0c'],  // brick (row 8)
        ['#1a1508', '#1c1606', '#201808'],  // gold (row 9)
      ];
      const palette = palettes[Math.min(row - 6, 3)];
      const shade = palette[Math.floor(seededRand(seed) * palette.length)];
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, s, s);
      // Grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    } else if (row >= 1 && row <= 5) {
      // Wall tiles
      ctx.fillStyle = `hsl(210, 10%, ${18 + seededRand(seed) * 8}%)`;
      ctx.fillRect(x, y, s, s);
      // Brick divisions
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y + s / 2, s, 1);
      if (row % 2 === 0) {
        ctx.fillRect(x + s / 2, y, 1, s / 2);
        ctx.fillRect(x, y + s / 2, 1, s / 2);
      } else {
        ctx.fillRect(x, y, 1, s / 2);
        ctx.fillRect(x + s / 2, y + s / 2, 1, s / 2);
      }
    } else {
      // Other tiles (chars etc.) — just dark
      ctx.fillStyle = '#080a0c';
      ctx.fillRect(x, y, s, s);
    }
  }

  // ── Get floor tile variants for a floor type ──────────────────────────────
  function getFloorTiles(floorType: string): Rectangle[] {
    switch (floorType) {
      case 'sand':  return TILE_DEFS.floorWood;
      case 'brick': return TILE_DEFS.floorBrick;
      case 'gold':  return TILE_DEFS.floorGold;
      default:      return TILE_DEFS.floorStone;
    }
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
        background: '#0a0d0f',
      }}
    />
  );
}
