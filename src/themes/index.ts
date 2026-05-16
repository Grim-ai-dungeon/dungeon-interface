// ─── Theme Registry ───────────────────────────────────────────────────────────

export type { Theme, ThemeColors, ThemePixi } from './types';
export { cyberpunkDungeonTheme } from './cyberpunk';
export { hellfireTheme } from './hellfire';
export { arcticFortressTheme } from './arctic';

import { cyberpunkDungeonTheme } from './cyberpunk';
import { hellfireTheme } from './hellfire';
import { arcticFortressTheme } from './arctic';
import type { Theme } from './types';

export const ALL_THEMES: Theme[] = [
  cyberpunkDungeonTheme,
  hellfireTheme,
  arcticFortressTheme,
];

export const DEFAULT_THEME_ID = 'cyberpunk';

export function getThemeById(id: string): Theme {
  return ALL_THEMES.find((t) => t.id === id) ?? cyberpunkDungeonTheme;
}
