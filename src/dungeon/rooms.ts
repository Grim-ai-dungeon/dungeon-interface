// ─── Room definitions and layout ──────────────────────────────────────────────
// Grid-based 2D top-down dungeon layout.
// Tile size = 48px. Layout designed for ~900-1400px wide canvas.

import type { Room, AgentId } from '../types';
import { TILE_SIZE } from './tiles';

export const GRID_COLS = 19;
export const GRID_ROWS = 14;

// Room definitions in tile-grid coords
export const ROOMS: Room[] = [
  {
    id: 'grim' as AgentId,
    label: "Grim's Chamber",
    gridX: 7,
    gridY: 4,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'stone',
  },
  {
    id: 'bob' as AgentId,
    label: "Bob's Library",
    gridX: 1,
    gridY: 1,
    widthTiles: 4,
    heightTiles: 4,
    floorType: 'sand',
  },
  {
    id: 'kevin' as AgentId,
    label: "Kevin's Workshop",
    gridX: 14,
    gridY: 1,
    widthTiles: 4,
    heightTiles: 4,
    floorType: 'brick',
  },
  {
    id: 'stuart' as AgentId,
    label: "Stuart's Treasury",
    gridX: 7,
    gridY: 10,
    widthTiles: 5,
    heightTiles: 3,
    floorType: 'gold',
  },
];

// Corridors: list of [x1, y1] → [x2, y2] in tile coords (horizontal or vertical segments)
export interface CorridorSegment {
  x: number;
  y: number;
  length: number;   // in tiles
  direction: 'h' | 'v';
  width: number;    // tile width of corridor
}

export const CORRIDORS: CorridorSegment[] = [
  // Grim ↔ Bob (NW corridor): go left from grim room top-left area, then up
  { x: 5, y: 5, length: 2, direction: 'h', width: 2 },   // left stub from grim
  { x: 5, y: 3, length: 3, direction: 'v', width: 2 },   // going up
  { x: 4, y: 3, length: 2, direction: 'h', width: 2 },   // connect to bob col
  // Grim ↔ Kevin (NE corridor)
  { x: 12, y: 5, length: 2, direction: 'h', width: 2 },  // right stub from grim
  { x: 13, y: 3, length: 3, direction: 'v', width: 2 },  // going up
  { x: 13, y: 3, length: 2, direction: 'h', width: 2 },  // connect to kevin col
  // Grim ↔ Stuart (south corridor)
  { x: 8, y: 9, length: 1, direction: 'v', width: 3 },   // going down from grim
];

/** Convert tile grid coords to canvas pixel coords */
export function tileToPixel(gridX: number, gridY: number): { px: number; py: number } {
  return { px: gridX * TILE_SIZE, py: gridY * TILE_SIZE };
}

export function roomPixelBounds(room: Room): { px: number; py: number; w: number; h: number } {
  const { px, py } = tileToPixel(room.gridX, room.gridY);
  return { px, py, w: room.widthTiles * TILE_SIZE, h: room.heightTiles * TILE_SIZE };
}

/** Returns the center pixel of a room */
export function roomCenter(room: Room): { cx: number; cy: number } {
  const { px, py, w, h } = roomPixelBounds(room);
  return { cx: px + w / 2, cy: py + h / 2 };
}

/** Canvas size based on grid */
export const CANVAS_W = GRID_COLS * TILE_SIZE;
export const CANVAS_H = GRID_ROWS * TILE_SIZE;
