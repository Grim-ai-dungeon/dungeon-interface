// ─── Agent sprite rendering ───────────────────────────────────────────────────
// All sprites are drawn procedurally with Canvas2D — no external images.

import type { AgentId, AgentStatus } from '../types';

export interface SpriteOptions {
  cx: number;
  cy: number;
  status: AgentStatus;
  now: number;
  selected: boolean;
}

/** Bob: small yellow minion with magnifying glass */
function drawBob(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 700) * 3; // idle bob

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Body (yellow oval)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Overalls (blue)
  ctx.fillStyle = '#4a7ab5';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(1, -3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Goggles ring
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Magnifying glass (idle: held; active: raised)
  const glassY = status === 'active' ? -8 : 4;
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(12, glassY, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, glassY + 3);
  ctx.lineTo(18, glassY + 7);
  ctx.stroke();

  ctx.restore();
}

/** Kevin: stocky minion with wrench */
function drawKevin(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 500) * 2;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Body (taller, stocky)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(0, 3, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Overalls
  ctx.fillStyle = '#3a6b3a';
  ctx.beginPath();
  ctx.ellipse(0, 10, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Two eyes (Kevin's signature two-eyes)
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(i * 4, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(i * 4, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(i * 4 + 0.5, -4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Goggles
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(i * 4, -4, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Wrench
  const wrenchAngle = status === 'active' ? Math.sin(now / 200) * 0.5 : 0;
  ctx.save();
  ctx.translate(14, 0);
  ctx.rotate(wrenchAngle);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 8);
  ctx.stroke();
  // Wrench head
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -10, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** Stuart: minion with coin/ledger */
function drawStuart(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 800) * 2.5;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Body
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Overalls (purple for treasury vibe)
  ctx.fillStyle = '#6b3a9a';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // One eye (Stuart's signature one-eye)
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.arc(0.5, -3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(1, -3.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Coin (active: tossing)
  const coinY = status === 'active' ? -12 + Math.abs(Math.sin(now / 300)) * -8 : 0;
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#b8960a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(12, coinY, 6, 6, status === 'active' ? now / 500 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8960a';
  ctx.font = '6px serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', 12, coinY + 2);

  ctx.restore();
}

/** Grim: hooded dragon master */
function drawGrim(ctx: CanvasRenderingContext2D, opts: SpriteOptions): void {
  const { cx, cy, now, status } = opts;
  const bob = Math.sin(now / 1000) * 2;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Robe/cloak
  ctx.fillStyle = '#1a0a1a';
  ctx.beginPath();
  ctx.moveTo(-14, 20);
  ctx.lineTo(-10, -8);
  ctx.lineTo(0, -14);
  ctx.lineTo(10, -8);
  ctx.lineTo(14, 20);
  ctx.closePath();
  ctx.fill();

  // Hood
  ctx.fillStyle = '#2a0a2a';
  ctx.beginPath();
  ctx.arc(0, -8, 12, Math.PI, 0);
  ctx.fill();
  // Hood shadow inside
  ctx.fillStyle = '#1a0030';
  ctx.beginPath();
  ctx.arc(0, -6, 8, Math.PI, 0);
  ctx.fill();

  // Glowing eyes
  const eyeGlow = 0.6 + Math.sin(now / 400) * 0.4;
  ctx.fillStyle = `rgba(255, 50, 0, ${eyeGlow})`;
  ctx.shadowColor = '#FF3300';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-3, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Staff
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, 18);
  ctx.lineTo(-18, -16);
  ctx.stroke();

  // Staff orb
  const orbGlow = 0.5 + Math.sin(now / 600) * 0.5;
  ctx.fillStyle = `rgba(200, 50, 255, ${orbGlow})`;
  ctx.shadowColor = '#CC33FF';
  ctx.shadowBlur = status === 'active' ? 16 : 6;
  ctx.beginPath();
  ctx.arc(-18, -19, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Dragon wings (subtle)
  ctx.fillStyle = 'rgba(80,0,80,0.5)';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.bezierCurveTo(-22, -8, -26, 4, -20, 10);
  ctx.lineTo(-10, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.bezierCurveTo(22, -8, 26, 4, 20, 10);
  ctx.lineTo(10, 8);
  ctx.fill();

  ctx.restore();
}

/** Draw a "sleeping Zzz" indicator for idle agents */
function drawSleepIndicator(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  const alpha = 0.4 + Math.sin(now / 800) * 0.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#aaaaff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('z', cx + 18, cy - 22);
  ctx.font = 'bold 8px monospace';
  ctx.fillText('z', cx + 22, cy - 30);
  ctx.font = 'bold 6px monospace';
  ctx.fillText('z', cx + 26, cy - 37);
  ctx.restore();
}

/** Draw activity sparks for active agents */
function drawActivitySparks(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const angle = (now / 300 + i * ((Math.PI * 2) / 5)) % (Math.PI * 2);
    const r = 22 + Math.sin(now / 200 + i) * 4;
    const sx = cx + Math.cos(angle) * r;
    const sy = cy + Math.sin(angle) * r;
    const alpha = 0.5 + Math.sin(now / 150 + i) * 0.4;
    ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draw selection ring */
function drawSelectionRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  const pulse = 1 + Math.sin(now / 300) * 0.1;
  ctx.save();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 12;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, 22 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Main entry point — draw an agent sprite */
export function drawAgentSprite(
  ctx: CanvasRenderingContext2D,
  agentId: AgentId,
  opts: SpriteOptions,
): void {
  const { cx, cy, status, now, selected } = opts;

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
  }
}
