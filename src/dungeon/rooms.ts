// ─── Room definitions and layout ──────────────────────────────────────────────
// Grid-based 2D top-down dungeon layout.
// Tile size = 48px. Compact station-style layout — rooms share walls, no corridors.
//
// Layout (col, row):
//   [Bob's Lab 4x4]  [Grim's Chamber 5x5]  [Kevin's Workshop 4x4]
//   [Agnes's Studio 4x4]  [Stuart's Treasury 5x3]
//
// Row 0: all top-row rooms start at gridY=0
// Row 1: bottom rooms start at gridY=5

import type { Room, AgentId } from '../types';
import { TILE_SIZE } from './tiles';

export const GRID_COLS = 13;
export const GRID_ROWS = 8;

// Room definitions in tile-grid coords — rooms are adjacent, no gaps
export const ROOMS: Room[] = [
  {
    id: 'bob' as AgentId,
    label: "Bob's Library",
    gridX: 0,
    gridY: 0,
    widthTiles: 4,
    heightTiles: 4,
    floorType: 'sand',
  },
  {
    id: 'grim' as AgentId,
    label: "Grim's Chamber",
    gridX: 4,
    gridY: 0,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'stone',
  },
  {
    id: 'kevin' as AgentId,
    label: "Kevin's Workshop",
    gridX: 9,
    gridY: 0,
    widthTiles: 4,
    heightTiles: 4,
    floorType: 'brick',
  },
  {
    id: 'agnes' as AgentId,
    label: "Agnes's Studio",
    gridX: 0,
    gridY: 4,
    widthTiles: 4,
    heightTiles: 4,
    floorType: 'stone',
  },
  {
    id: 'stuart' as AgentId,
    label: "Stuart's Treasury",
    gridX: 4,
    gridY: 5,
    widthTiles: 5,
    heightTiles: 3,
    floorType: 'gold',
  },
];

// Corridors: empty — rooms are adjacent (station-style layout)
export interface CorridorSegment {
  x: number;
  y: number;
  length: number;
  direction: 'h' | 'v';
  width: number;
}

export const CORRIDORS: CorridorSegment[] = [];

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
