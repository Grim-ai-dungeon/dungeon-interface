// ─── ThemeSwitcher.tsx — HUD theme picker ────────────────────────────────────
//
// Self-contained: reads/writes localStorage, applies CSS vars to :root.
// No context needed — CSS vars are global.

import { useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID, applyTheme } from '../themes';
import type { ThemeId } from '../themes';

const LS_KEY = 'dungeon-theme';

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as ThemeId | null;
      return saved && THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME_ID;
    } catch {
      return DEFAULT_THEME_ID;
    }
  });

  // Apply theme on mount and whenever active changes
  useEffect(() => {
    applyTheme(active);
    try {
      localStorage.setItem(LS_KEY, active);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [active]);

  return (
    <div className="theme-switcher" title="Switch dungeon skin">
      <span className="theme-switcher-label">SKIN</span>
      <div className="theme-switcher-buttons">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            className={`theme-btn${active === theme.id ? ' theme-btn--active' : ''}`}
            title={theme.label}
            onClick={() => setActive(theme.id)}
            aria-pressed={active === theme.id}
          >
            {theme.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
