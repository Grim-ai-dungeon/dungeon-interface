// ─── Shared types for Dungeon Interface v2 ────────────────────────────────────

export type AgentId = string;

/** The default built-in agent IDs that cannot be deleted */
export const DEFAULT_AGENT_IDS = ['grim', 'bob', 'kevin', 'stuart', 'agnes'] as const;
export type DefaultAgentId = typeof DEFAULT_AGENT_IDS[number];

export type AgentStatus = 'active' | 'idle' | 'error';

export interface AgentInfo {
  id: AgentId;
  name: string;
  role: string;
  emoji: string;
  status: AgentStatus;
  currentTask?: string;
  activityLog: ActivityEntry[];
  /** Real session data from dungeon-state.json */
  model?: string;
  lastInteractionAt?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  /** 'running' | 'done' | 'idle' from the actual session file */
  sessionStatus?: string;
}

export interface ActivityEntry {
  id: number;
  time: string;
  agentId: AgentId;
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface Room {
  id: AgentId;
  label: string;
  /** grid col, row (0-indexed) */
  gridX: number;
  gridY: number;
  /** in tile units */
  widthTiles: number;
  heightTiles: number;
  floorType: 'stone' | 'sand' | 'brick' | 'gold';
}

export interface Torch {
  /** canvas pixel coords */
  x: number;
  y: number;
  color: string;
  radius: number;
}
