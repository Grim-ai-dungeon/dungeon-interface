// ─── GrimLiveRoom.ts — Live animated Grim's Command Chamber ──────────────────
// Manages Grim's state machine: walking between waypoints inside his room,
// idle animations at stations (throne, display wall, arcane circle, window).
// Designed to be called from the main render loop each frame.

import { Container, Graphics, Sprite, Text, TextStyle, Assets, Texture } from 'pixi.js';
import { roomPixelBounds } from '../dungeon/rooms';
import type { Room } from '../types';

// ─── Waypoint definitions ────────────────────────────────────────────────────
// Relative offsets inside Grim's room (as fractions of room width/height)
export interface Waypoint {
  name: string;
  relX: number;  // 0..1 fraction of room width
  relY: number;  // 0..1 fraction of room height
  idleDuration: number;  // seconds to linger here
  idleAction: 'throne' | 'inspect' | 'patrol' | 'arcane' | 'window';
}

export const GRIM_WAYPOINTS: Waypoint[] = [
  // Throne — center-slightly-back: Grim sits and surveys
  { name: 'throne',       relX: 0.50, relY: 0.45, idleDuration: 5.0, idleAction: 'throne'  },
  // Display wall — top-left area: inspects the scrying screens
  { name: 'display_wall', relX: 0.18, relY: 0.22, idleDuration: 3.5, idleAction: 'inspect' },
  // Arcane circle — bottom-right: performs ritual
  { name: 'arcane',       relX: 0.75, relY: 0.72, idleDuration: 4.0, idleAction: 'arcane'  },
  // Patrol point top-right: checks the far corner
  { name: 'patrol_tr',    relX: 0.80, relY: 0.20, idleDuration: 1.5, idleAction: 'patrol'  },
  // Window/portal — left wall mid: gazes into the void
  { name: 'window',       relX: 0.15, relY: 0.68, idleDuration: 3.0, idleAction: 'window'  },
  // Brief center pass — strides through
  { name: 'center',       relX: 0.50, relY: 0.62, idleDuration: 1.0, idleAction: 'patrol'  },
];

// ─── Movement state ───────────────────────────────────────────────────────────

type GrimPhase = 'walking' | 'idle';

export interface GrimState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  phase: GrimPhase;
  waypointIndex: number;
  idleTimer: number;        // remaining idle seconds at current station
  idleAction: Waypoint['idleAction'];
  walkTimer: number;        // accumulates walking time for leg animation
  facingRight: boolean;     // sprite flip direction
  initialized: boolean;
}

// Singleton state so it persists across frames
const grimState: GrimState = {
  x: 0, y: 0,
  targetX: 0, targetY: 0,
  phase: 'idle',
  waypointIndex: 0,
  idleTimer: 3.0,
  idleAction: 'throne',
  walkTimer: 0,
  facingRight: true,
  initialized: false,
};

// Sprite texture cache
let grimTexture: Texture | null = null;
let grimTextureLoading = false;

async function loadGrimTexture(): Promise<void> {
  if (grimTexture || grimTextureLoading) return;
  grimTextureLoading = true;
  try {
    grimTexture = await Assets.load('/assets/sprites/grim-minion-128.png');
  } catch {
    // fallback to null — procedural drawing used
  }
  grimTextureLoading = false;
}

// ─── Initialize Grim at throne position ──────────────────────────────────────
function initGrimState(room: Room): void {
  const { px, py, w, h } = roomPixelBounds(room);
  // Start at throne
  const wp = GRIM_WAYPOINTS[0];
  const startX = px + w * wp.relX;
  const startY = py + h * wp.relY;
  grimState.x = startX;
  grimState.y = startY;
  grimState.targetX = startX;
  grimState.targetY = startY;
  grimState.phase = 'idle';
  grimState.idleTimer = wp.idleDuration;
  grimState.idleAction = wp.idleAction;
  grimState.waypointIndex = 0;
  grimState.facingRight = true;
  grimState.initialized = true;
  // Kick off texture load
  loadGrimTexture().catch(() => {});
}

// ─── Waypoint helpers ─────────────────────────────────────────────────────────
function getWaypointPixel(room: Room, wp: Waypoint): { x: number; y: number } {
  const { px, py, w, h } = roomPixelBounds(room);
  return {
    x: px + w * wp.relX,
    y: py + h * wp.relY,
  };
}

function nextWaypoint(): void {
  grimState.waypointIndex = (grimState.waypointIndex + 1) % GRIM_WAYPOINTS.length;
}

// ─── Main update function — called every frame ───────────────────────────────
const WALK_SPEED = 28; // pixels per second

export function updateGrimLiveRoom(
  container: Container,
  room: Room,
  deltaMs: number,
  timeSec: number,
  status: string,
  selected: boolean,
  particleEmitter?: (x: number, y: number) => void,
): void {
  if (!grimState.initialized) {
    initGrimState(room);
  }

  const dt = Math.min(deltaMs / 1000, 0.1); // cap dt to avoid jumps

  // ── State machine update ──────────────────────────────────────────────────
  if (status !== 'active') {
    // When idle/offline — stand at throne, bob gently
    const wp = GRIM_WAYPOINTS[0]; // throne
    const { x: tx, y: ty } = getWaypointPixel(room, wp);
    // Drift back to throne if far away
    grimState.targetX = tx;
    grimState.targetY = ty;
    grimState.phase = 'idle';
    grimState.idleAction = 'throne';
  } else {
    // ACTIVE: full movement state machine
    if (grimState.phase === 'idle') {
      grimState.idleTimer -= dt;
      if (grimState.idleTimer <= 0) {
        // Time to move — pick next waypoint
        nextWaypoint();
        const nextWP = GRIM_WAYPOINTS[grimState.waypointIndex];
        const { x: tx, y: ty } = getWaypointPixel(room, nextWP);
        grimState.targetX = tx;
        grimState.targetY = ty;
        grimState.phase = 'walking';
        // Set facing direction
        grimState.facingRight = tx > grimState.x;
      }
    } else if (grimState.phase === 'walking') {
      // Move toward target
      const dx = grimState.targetX - grimState.x;
      const dy = grimState.targetY - grimState.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Arrived — snap and switch to idle
        grimState.x = grimState.targetX;
        grimState.y = grimState.targetY;
        grimState.phase = 'idle';
        const wp = GRIM_WAYPOINTS[grimState.waypointIndex];
        grimState.idleTimer = wp.idleDuration;
        grimState.idleAction = wp.idleAction;
      } else {
        // Step toward target
        const speed = WALK_SPEED * dt;
        const nx = dx / dist;
        const ny = dy / dist;
        grimState.x += nx * Math.min(speed, dist);
        grimState.y += ny * Math.min(speed, dist);
        grimState.walkTimer += dt;
        grimState.facingRight = dx > 0;

        // Emit footstep particle occasionally
        if (particleEmitter && Math.random() < 0.15) {
          particleEmitter(grimState.x, grimState.y + 12);
        }
      }
    }
  }

  // ── Smooth position lerp for nice movement ────────────────────────────────
  // (state machine above already moves directly, this just applies)

  // ── Render ────────────────────────────────────────────────────────────────
  drawGrimAtPosition(container, grimState.x, grimState.y, timeSec, status, selected, grimState);
}

// ─── Render Grim at a specific position ──────────────────────────────────────
function drawGrimAtPosition(
  container: Container,
  cx: number,
  cy: number,
  time: number,
  status: string,
  selected: boolean,
  state: GrimState,
): void {
  const isActive = status === 'active';
  const isWalking = state.phase === 'walking';

  // ── Ground shadow ─────────────────────────────────────────────────────────
  let shadowG = container.getChildByLabel('grim_shadow') as Graphics | null;
  if (!shadowG) {
    shadowG = new Graphics();
    shadowG.label = 'grim_shadow';
    container.addChildAt(shadowG, 0);
  }
  shadowG.clear();
  shadowG.ellipse(cx, cy + 14, 14, 5).fill({ color: 0x000000, alpha: 0.4 });

  // ── Selection ring ────────────────────────────────────────────────────────
  let ringG = container.getChildByLabel('grim_ring') as Graphics | null;
  if (!ringG) {
    ringG = new Graphics();
    ringG.label = 'grim_ring';
    container.addChildAt(ringG, 1);
  }
  ringG.clear();
  if (selected) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ringG.circle(cx, cy + 2, 26).stroke({ color: 0xFFD700, alpha: 0.4 + 0.4 * pulse, width: 2 });
    ringG.circle(cx, cy + 2, 32).stroke({ color: 0xFFD700, alpha: 0.15 * pulse, width: 1 });
  }

  // ── Sprite PNG or procedural fallback ────────────────────────────────────
  const bob = isWalking
    ? Math.sin(time * 9) * 1.5  // fast slight bob when walking
    : Math.sin(time * 1.4) * 2.5; // slow bob when idle

  // Lean/tilt when walking
  const tilt = isWalking ? Math.sin(time * 9) * 0.04 : 0;

  if (grimTexture) {
    let sp = container.getChildByLabel('grim_sprite') as Sprite | null;
    if (!sp) {
      sp = new Sprite(grimTexture);
      sp.label = 'grim_sprite';
      sp.anchor.set(0.5, 0.75);
      grimTexture.source.scaleMode = 'nearest';
      container.addChild(sp);
    }
    const targetHeight = 64;
    sp.scale.x = (state.facingRight ? 1 : -1) * (targetHeight / grimTexture.height);
    sp.scale.y = targetHeight / grimTexture.height;
    sp.x = cx;
    sp.y = cy + bob;
    sp.rotation = tilt;

    // Tint based on action
    if (!isActive) {
      sp.tint = 0x8888aa; // dimmed when offline
    } else if (state.idleAction === 'arcane' && !isWalking) {
      sp.tint = 0xcc88ff; // purple glow during ritual
    } else {
      sp.tint = 0xffffff;
    }
  } else {
    // Procedural Grim fallback
    let g = container.getChildByLabel('grim_proc') as Graphics | null;
    if (!g) {
      g = new Graphics();
      g.label = 'grim_proc';
      container.addChild(g);
    }
    g.clear();
    drawProceduralGrim(g, cx, cy + bob, time, isActive, isWalking, state.facingRight);
  }

  // ── Active overlay effects ────────────────────────────────────────────────
  let fxG = container.getChildByLabel('grim_fx') as Graphics | null;
  if (!fxG) {
    fxG = new Graphics();
    fxG.label = 'grim_fx';
    container.addChild(fxG);
  }
  fxG.clear();

  if (isActive) {
    // Orbiting arcane sparks
    const N = 5;
    for (let i = 0; i < N; i++) {
      const angle = (time * 2.2 + (i / N) * Math.PI * 2);
      const r = 22 + 4 * Math.sin(time * 3 + i);
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r * 0.5;
      fxG.circle(sx, sy, 1.5 + Math.sin(time * 4 + i) * 0.5).fill({ color: 0xcc00ff, alpha: 0.7 });
    }
  } else {
    // Sleep zzz
    const bz = Math.sin(time * 0.8) * 2;
    const opac = 0.45 + 0.3 * Math.sin(time * 1.2);
    fxG.circle(cx + 16, cy - 26 + bz, 3).fill({ color: 0xaaccff, alpha: opac });
    fxG.circle(cx + 20, cy - 32 + bz, 4).fill({ color: 0xaaccff, alpha: opac * 0.7 });
    fxG.circle(cx + 25, cy - 39 + bz, 5).fill({ color: 0xaaccff, alpha: opac * 0.5 });
  }

  // ── Idle action overlays ──────────────────────────────────────────────────
  if (!isWalking && isActive) {
    drawIdleActionOverlay(fxG, cx, cy, time, state.idleAction);
  }

  // ── Station label (small, subtle) ────────────────────────────────────────
  if (!isWalking && isActive) {
    let stationText = container.getChildByLabel('grim_station') as Text | null;
    if (!stationText) {
      stationText = new Text({
        text: '',
        style: new TextStyle({
          fontSize: 7,
          fill: 0xcc88ff,
          fontFamily: '"Share Tech Mono", "Courier New", monospace',
          letterSpacing: 1,
          dropShadow: { color: 0x000000, blur: 4, distance: 0, alpha: 1 },
        }),
      });
      stationText.label = 'grim_station';
      stationText.anchor.set(0.5, 1);
      container.addChild(stationText);
    }
    stationText.text = getStationLabel(state.idleAction);
    stationText.x = cx;
    stationText.y = cy - 52;
    stationText.visible = true;
  } else {
    const st = container.getChildByLabel('grim_station') as Text | null;
    if (st) st.visible = false;
  }

  // ── ACTIVE badge ──────────────────────────────────────────────────────────
  if (isActive) {
    let badgeG = container.getChildByLabel('grim_badge_g') as Graphics | null;
    if (!badgeG) {
      badgeG = new Graphics();
      badgeG.label = 'grim_badge_g';
      container.addChild(badgeG);
    }
    badgeG.clear();
    badgeG.roundRect(cx - 22, cy - 68, 44, 12, 3).fill({ color: 0x003300, alpha: 0.85 });
    badgeG.roundRect(cx - 22, cy - 68, 44, 12, 3).stroke({ color: 0x00ff88, alpha: 0.9, width: 1 });

    let badgeText = container.getChildByLabel('grim_badge_t') as Text | null;
    if (!badgeText) {
      badgeText = new Text({
        text: '● ACTIVE',
        style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }),
      });
      badgeText.label = 'grim_badge_t';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 62;
    badgeText.visible = true;
  } else {
    const bg = container.getChildByLabel('grim_badge_g') as Graphics | null;
    if (bg) bg.clear();
    const bt = container.getChildByLabel('grim_badge_t') as Text | null;
    if (bt) bt.visible = false;
  }
}

// ─── Idle action visual overlays ─────────────────────────────────────────────

function drawIdleActionOverlay(g: Graphics, cx: number, cy: number, time: number, action: Waypoint['idleAction']): void {
  switch (action) {
    case 'throne': {
      // Throne aura — golden radiating lines
      const N = 6;
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        const len = 18 + 4 * Math.sin(time * 1.5 + i);
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy - 10 + Math.sin(angle) * len;
        const alpha = 0.15 + 0.1 * Math.sin(time * 2 + i);
        g.moveTo(cx, cy - 10).lineTo(x2, y2);
        g.stroke({ color: 0xFFD700, alpha, width: 1 });
      }
      break;
    }
    case 'inspect': {
      // Inspection scan line — horizontal beam sweeping
      const scanY = cy - 8 + Math.sin(time * 2.5) * 12;
      g.rect(cx - 20, scanY - 0.5, 40, 1).fill({ color: 0x00ffff, alpha: 0.4 });
      // "Reading" sparkles
      for (let i = 0; i < 3; i++) {
        const px2 = cx - 15 + Math.sin(time * 3 + i * 2) * 10;
        const py2 = cy - 20 + i * 5;
        g.circle(px2, py2, 1.5).fill({ color: 0x88ddff, alpha: 0.6 });
      }
      break;
    }
    case 'arcane': {
      // Ritual circle — spinning runes
      const R = 16;
      const N = 5;
      for (let i = 0; i < N; i++) {
        const angle = (time * 1.8 + (i / N) * Math.PI * 2);
        const rx = cx + Math.cos(angle) * R;
        const ry = cy + Math.sin(angle) * R * 0.6;
        g.circle(rx, ry, 2).fill({ color: 0x9900ff, alpha: 0.7 + 0.3 * Math.sin(time * 3 + i) });
      }
      // Inner circle
      g.circle(cx, cy, R * 0.4).stroke({ color: 0xcc00ff, alpha: 0.3 + 0.2 * Math.sin(time * 2), width: 1 });
      break;
    }
    case 'window': {
      // Gazing — subtle shimmer on Grim
      const shimmer = 0.1 + 0.08 * Math.sin(time * 2.5);
      g.circle(cx, cy - 15, 20).fill({ color: 0x6600ff, alpha: shimmer });
      // Star motes drifting inward
      for (let i = 0; i < 4; i++) {
        const angle = (time * 0.4 + i * 1.57);
        const r = 25 - (time * 3 + i * 5) % 25;
        g.circle(cx + Math.cos(angle) * r, cy - 10 + Math.sin(angle) * r * 0.5, 1).fill({ color: 0xddaaff, alpha: 0.5 });
      }
      break;
    }
    case 'patrol': {
      // Alert eyes — scanning sweep
      const scanAlpha = 0.15 + 0.1 * Math.sin(time * 4);
      g.rect(cx - 25, cy - 30, 50, 2).fill({ color: 0xFF4400, alpha: scanAlpha });
      break;
    }
  }
}

// ─── Station label text ───────────────────────────────────────────────────────
function getStationLabel(action: Waypoint['idleAction']): string {
  switch (action) {
    case 'throne':  return 'COMMANDING';
    case 'inspect': return 'SCRYING';
    case 'arcane':  return 'RITUAL';
    case 'window':  return 'OBSERVING';
    case 'patrol':  return 'PATROL';
  }
}

// ─── Procedural Grim (fallback if PNG fails) ──────────────────────────────────
function drawProceduralGrim(
  g: Graphics,
  cx: number, cy: number,
  time: number,
  isActive: boolean,
  isWalking: boolean,
  facingRight: boolean,
): void {
  const dir = facingRight ? 1 : -1;

  // Wing flap — faster when walking
  const flapSpeed = isWalking ? 6 : 2;
  const wingFlap = Math.sin(time * flapSpeed) * (isWalking ? 10 : 6);
  g.moveTo(cx - 14 * dir, cy - 4).lineTo(cx - 34 * dir, cy - 18 + wingFlap).lineTo(cx - 18 * dir, cy - 2)
    .fill({ color: 0x330066, alpha: 0.75 });

  // Robe
  g.roundRect(cx - 13, cy - 20, 26, 32, 6).fill({ color: 0x1a0033, alpha: 1 });

  // Head/hood
  g.moveTo(cx - 14 * dir, cy - 20)
    .bezierCurveTo(cx - 12 * dir, cy - 46, cx + 12 * dir, cy - 46, cx + 14 * dir, cy - 20)
    .fill({ color: 0x0d001a, alpha: 1 });

  // Walking legs (simple pendulum)
  if (isWalking) {
    const legSwing = Math.sin(time * 9) * 5;
    g.rect(cx - 5, cy + 10, 4, 8 + legSwing).fill({ color: 0x1a0033, alpha: 1 });
    g.rect(cx + 1, cy + 10, 4, 8 - legSwing).fill({ color: 0x1a0033, alpha: 1 });
  }

  // Eyes
  const eyePulse = isActive ? 0.6 + 0.4 * Math.sin(time * 3.5) : 0.3;
  g.circle(cx - 5 * dir, cy - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });
  g.circle(cx + 5 * dir, cy - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });

  // Staff
  const staffX = cx + 18 * dir;
  g.rect(staffX - 1, cy - 44, 2, 46).fill({ color: 0x553300, alpha: 1 });
  const orbPulse = 0.5 + 0.5 * Math.sin(time * 2.1);
  g.circle(staffX, cy - 46, 6).fill({ color: 0x9900ff, alpha: 0.6 + 0.3 * orbPulse });
  g.circle(staffX, cy - 46, 4).fill({ color: 0xcc66ff, alpha: 0.9 });
}
