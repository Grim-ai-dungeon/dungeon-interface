// ─── Agent sprite rendering ───────────────────────────────────────────────────
// All sprites are drawn procedurally with Canvas2D — no external images.
// Minion aesthetic: yellow bodies, goggle eyes, colored overalls.

import type { AgentId, AgentStatus } from '../types';

export interface SpriteOptions {
  cx: number;
  cy: number;
  status: AgentStatus;
  now: number;
  selected: boolean;
}

// ─── Helper drawing primitives ────────────────────────────────────────────────

function drawCapsuleBody(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  fillColor: string,
  borderColor = 'rgba(0,0,0,0.4)',
): void {
  const r = w / 2;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.arc(x, y - (h / 2 - r), r, Math.PI, 0);
  ctx.arc(x, y + (h / 2 - r), r, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Subtle highlight on upper left
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - h * 0.3, r * 0.35, r * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.arc(x, y - (h / 2 - r), r, Math.PI, 0);
  ctx.arc(x, y + (h / 2 - r), r, 0, Math.PI);
  ctx.closePath();
  ctx.stroke();
}

function drawOveralls(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, h, [0, 0, w / 2, w / 2]);
  ctx.fill();

  // Straps
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 4, 3, 5);
  ctx.fillRect(x + 1, y - 4, 3, 5);

  // Pocket
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - 5, y + 3, 4, 3);
}

function drawGoggles(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  eyeCount: number,
  irisColor = '#4a90e2',
  now = 0,
): void {
  const blink = Math.sin(now / 3000) > 0.97; // rare blink

  if (eyeCount === 1) {
    // Goggle frame (metallic)
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Lens background
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    if (!blink) {
      // Iris
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.arc(x + 0.5, y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + 0.5, y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Gleam
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blink
      ctx.fillStyle = '#888';
      ctx.fillRect(x - 4, y - 1, 8, 2);
    }

    // Goggle band
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();
  } else {
    // Two-eye goggles
    const positions = [-5, 5];
    for (const ex of positions) {
      // Frame
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(x + ex, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Lens
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.arc(x + ex, y, 4, 0, Math.PI * 2);
      ctx.fill();

      if (!blink) {
        // Iris
        ctx.fillStyle = irisColor;
        ctx.beginPath();
        ctx.arc(x + ex + 0.4, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + ex + 0.4, y, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Gleam
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(x + ex - 0.3, y - 1, 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(x + ex - 3, y - 0.5, 6, 1.5);
      }
    }

    // Bridge connecting lenses
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 1, y - 2, 2, 2);

    // Goggle band
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, Math.PI * 0.8, Math.PI * 1.2);
    ctx.stroke();
  }
}

// ─── BOB — Librarian with magnifying glass ───────────────────────────────────

function drawBob(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 700) * 3;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Body (minion yellow capsule)
  drawCapsuleBody(ctx, 0, 0, 22, 30, '#FDCE2A');

  // Overalls (blue — classic librarian)
  drawOveralls(ctx, 0, 6, 20, 16, '#3a6bbf');

  // Goggles (1 eye — Bob has one eye)
  drawGoggles(ctx, 0, -8, 1, '#8BC34A', now);

  // Magnifying glass
  ctx.save();
  const glassAngle = status === 'active' ? Math.sin(now / 300) * 0.3 : 0;
  const glassX = 13;
  const glassY = status === 'active' ? -10 : 4;
  ctx.translate(glassX, glassY);
  ctx.rotate(glassAngle);

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.stroke();
  // Shine
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-1, -1, 3, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  // Handle
  ctx.strokeStyle = '#7a5520';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, 3);
  ctx.lineTo(7, 7);
  ctx.stroke();
  ctx.restore();

  // When active: little book held in other hand
  if (status === 'active') {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-16, 2, 6, 8);
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(-15, 3, 4, 6);
    // Pages
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(-14.5, 3.5, 1.5, 5);
  }

  ctx.restore();
}

// ─── KEVIN — Workshop foreman, two eyes, stocky ──────────────────────────────

function drawKevin(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 500) * 2;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Kevin is taller/stockier
  drawCapsuleBody(ctx, 0, 2, 26, 34, '#FDCE2A');

  // Green overalls (engineer)
  drawOveralls(ctx, 0, 8, 24, 18, '#3a7a3a');

  // Two eyes
  drawGoggles(ctx, 0, -10, 2, '#4a90e2', now);

  // Hard hat (construction worker vibe)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(0, -20, 13, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#FFC200';
  ctx.fillRect(-11, -20, 22, 3);
  ctx.fillStyle = '#e0b000';
  ctx.fillRect(-13, -18, 26, 2);

  // Wrench
  ctx.save();
  const wrenchAngle = status === 'active' ? Math.sin(now / 180) * 0.7 : 0.2;
  ctx.translate(15, 2);
  ctx.rotate(wrenchAngle);

  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -8);
  ctx.stroke();

  // Wrench head (fork shape)
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -8, 4, -Math.PI * 0.8, Math.PI * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-4, -10);
  ctx.moveTo(4, -6);
  ctx.lineTo(4, -10);
  ctx.stroke();

  ctx.restore();

  // Active: gear spinning above head
  if (status === 'active') {
    ctx.save();
    ctx.translate(-12, -18);
    ctx.rotate(now / 500);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ─── STUART — Treasury keeper, one eye, stylish ──────────────────────────────

function drawStuart(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 800) * 2.5;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Body
  drawCapsuleBody(ctx, 0, 0, 22, 30, '#FDCE2A');

  // Purple overalls (royalty/treasury)
  drawOveralls(ctx, 0, 6, 20, 16, '#6b3a9a');

  // One eye (Stuart's classic)
  drawGoggles(ctx, 0, -8, 1, '#4a90d9', now);

  // Coin
  const coinPhase = now / 400;
  const coinX = 13;
  const coinY = status === 'active' ? -14 + Math.abs(Math.sin(coinPhase)) * -8 : 2;
  const scaleX = status === 'active' ? Math.cos(coinPhase) : 1;

  ctx.save();
  ctx.translate(coinX, coinY);
  ctx.scale(scaleX, 1);
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#b8960a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (Math.abs(scaleX) > 0.4) {
    ctx.fillStyle = '#b8960a';
    ctx.font = 'bold 6px serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 2);
  }
  ctx.restore();

  // Ledger book
  ctx.fillStyle = '#5a3a8a';
  ctx.fillRect(-16, 2, 7, 9);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(-15.5, 3, 6, 7);
  // Lines
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-15, 4.5 + i * 2);
    ctx.lineTo(-10, 4.5 + i * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── GRIM — The Dungeon Master, hooded dragon form ───────────────────────────

function drawGrim(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const hover = Math.sin(now / 1000) * 2.5;

  ctx.save();
  ctx.translate(cx, cy + hover);

  // Dragon wings (behind body)
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#2d0050';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 10, -2);
    ctx.bezierCurveTo(side * 26, -16, side * 30, -2, side * 24, 8);
    ctx.bezierCurveTo(side * 20, 14, side * 14, 12, side * 10, 8);
    ctx.closePath();
    ctx.fill();

    // Wing membrane veins
    ctx.strokeStyle = 'rgba(120,0,180,0.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(side * 10, 0);
    ctx.bezierCurveTo(side * 22, -10, side * 26, -4, side * 22, 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Robe/cloak base
  ctx.fillStyle = '#150025';
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-10, -6);
  ctx.lineTo(0, -12);
  ctx.lineTo(10, -6);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();

  // Robe sheen
  ctx.fillStyle = 'rgba(100,0,140,0.15)';
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-2, -10);
  ctx.lineTo(4, -6);
  ctx.lineTo(6, 22);
  ctx.closePath();
  ctx.fill();

  // Hood
  ctx.fillStyle = '#250035';
  ctx.beginPath();
  ctx.arc(0, -8, 13, Math.PI, 0);
  ctx.fill();

  // Hood shadow inside (face area dark)
  ctx.fillStyle = '#0d0018';
  ctx.beginPath();
  ctx.arc(0, -6, 9, Math.PI * 0.1, Math.PI * 0.9);
  ctx.fill();

  // Glowing eyes — pulsing red/orange
  const eyeGlow = 0.55 + Math.sin(now / 400) * 0.45;
  ctx.shadowColor = '#FF4400';
  ctx.shadowBlur = 10 * eyeGlow;

  ctx.fillStyle = `rgba(255, 80, 0, ${eyeGlow})`;
  ctx.beginPath();
  ctx.ellipse(-3.5, -8, 2.5, 1.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, -8, 2.5, 1.8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Inner eye glow (brighter core)
  ctx.fillStyle = `rgba(255, 200, 100, ${eyeGlow * 0.8})`;
  ctx.beginPath();
  ctx.arc(-3.5, -8, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.5, -8, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Hood rim detail
  ctx.strokeStyle = 'rgba(150,50,200,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -8, 13, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // Staff
  ctx.strokeStyle = '#4a2a0a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-17, 20);
  ctx.lineTo(-20, -8);
  ctx.lineTo(-18, -18);
  ctx.stroke();

  // Staff crystal orb
  const orbPulse = 0.45 + Math.sin(now / 600) * 0.55;
  const orbColor = status === 'active' ? '#CC33FF' : '#8A2BE2';
  ctx.shadowColor = orbColor;
  ctx.shadowBlur = status === 'active' ? 18 : 8;

  // Orb glow halo
  const haloGrad = ctx.createRadialGradient(-18, -21, 0, -18, -21, 10);
  haloGrad.addColorStop(0, `rgba(200, 50, 255, ${orbPulse * 0.5})`);
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(-18, -21, 10, 0, Math.PI * 2);
  ctx.fill();

  // Orb core
  ctx.fillStyle = `rgba(180, 30, 255, ${orbPulse})`;
  ctx.beginPath();
  ctx.arc(-18, -21, 5, 0, Math.PI * 2);
  ctx.fill();

  // Orb gleam
  ctx.fillStyle = `rgba(255, 255, 255, ${orbPulse * 0.5})`;
  ctx.beginPath();
  ctx.arc(-20, -23, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ─── Status indicators ────────────────────────────────────────────────────────

function drawSleepIndicator(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  ctx.save();

  for (let i = 0; i < 3; i++) {
    const t = ((now / 1200 + i * 0.33) % 1);
    const alpha = Math.sin(t * Math.PI) * 0.6;
    const fy = cy - 22 - t * 18;
    const fx = cx + 18 + Math.sin(t * Math.PI * 2) * 4;
    const size = 8 - i * 1.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaaaff';
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('z', fx, fy);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawActivityAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number, _color: string): void {
  const pulse = 0.5 + Math.sin(now / 400) * 0.3;
  ctx.save();

  // Larger, more visible ground glow
  const grad = ctx.createRadialGradient(cx, cy + 10, 4, cx, cy + 10, 36);
  grad.addColorStop(0, `rgba(255,200,50,0)`);
  grad.addColorStop(0.4, `rgba(255,200,50,${pulse * 0.22})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 36, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spinning work ring — shows the agent is actively processing
  const ringAngle = now / 1200;
  ctx.strokeStyle = `rgba(255, 200, 60, ${0.45 + Math.sin(now / 400) * 0.25})`;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 6;
  ctx.setLineDash([5, 7]);
  ctx.lineDashOffset = -(now / 40) % 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, ringAngle, ringAngle + Math.PI * 1.6);
  ctx.stroke();

  // Second counter-rotating arc
  ctx.strokeStyle = `rgba(255, 160, 30, ${0.25 + Math.sin(now / 600) * 0.15})`;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 11]);
  ctx.lineDashOffset = (now / 55) % 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 33, -ringAngle * 0.7, -ringAngle * 0.7 + Math.PI * 1.2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawActivitySparks(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  ctx.save();
  // More sparks in a wider, more visible elliptical orbit
  for (let i = 0; i < 8; i++) {
    const angle = (now / 320 + i * ((Math.PI * 2) / 8)) % (Math.PI * 2);
    const r = 22 + Math.sin(now / 180 + i * 1.3) * 6;
    const sx = cx + Math.cos(angle) * r;
    const sy = cy + Math.sin(angle) * r * 0.55 + 2;
    const alpha = 0.55 + Math.sin(now / 160 + i * 0.7) * 0.4;
    const size = 1.5 + Math.sin(now / 220 + i) * 0.7;
    ctx.fillStyle = `rgba(255, 210, 60, ${alpha})`;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // WORKING status badge above the sprite
  const textPulse = 0.7 + Math.sin(now / 500) * 0.3;
  ctx.globalAlpha = textPulse;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(cx - 18, cy - 40, 36, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#44ff88';
  ctx.shadowColor = '#44ff88';
  ctx.shadowBlur = 6;
  ctx.font = 'bold 6px \'Courier New\', monospace';
  ctx.textAlign = 'center';
  ctx.fillText('● ACTIVE', cx, cy - 32);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawErrorIndicator(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  const pulse = 0.6 + Math.abs(Math.sin(now / 400)) * 0.4;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#CC3333';
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('!', cx + 2, cy - 24);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawSelectionRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  const pulse = 1 + Math.sin(now / 300) * 0.08;
  ctx.save();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 14;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating dashes
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -(now / 40) % 10;
  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function drawAgentSprite(
  ctx: CanvasRenderingContext2D,
  agentId: AgentId,
  opts: SpriteOptions,
): void {
  const { cx, cy, status, now, selected } = opts;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Active aura glow beneath sprite
  if (status === 'active') {
    drawActivityAura(ctx, cx, cy, now, '#FFD700');
  }

  if (selected) {
    drawSelectionRing(ctx, cx, cy, now);
  }

  switch (agentId) {
    case 'grim':   drawGrim(ctx, opts); break;
    case 'bob':    drawBob(ctx, opts); break;
    case 'kevin':  drawKevin(ctx, opts); break;
    case 'stuart': drawStuart(ctx, opts); break;
  }

  if (status === 'idle') {
    drawSleepIndicator(ctx, cx, cy, now);
  } else if (status === 'active') {
    drawActivitySparks(ctx, cx, cy, now);
  } else if (status === 'error') {
    drawErrorIndicator(ctx, cx, cy, now);
  }
}
