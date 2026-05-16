import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Theme, ALL_THEMES, DEFAULT_THEME_ID, getThemeById } from './themes';

// ─── Apply CSS variables from active theme ────────────────────────────────────

function applyThemeCssVars(theme: Theme) {
  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty('--theme-primary', c.primary);
  root.style.setProperty('--theme-primary-dim', c.primaryDim);
  root.style.setProperty('--theme-primary-dark', c.primaryDark);
  root.style.setProperty('--theme-secondary', c.secondary);
  root.style.setProperty('--theme-secondary-dim', c.secondaryDim);
  root.style.setProperty('--theme-bg-deep', c.bgDeep);
  root.style.setProperty('--theme-bg-panel', c.bgPanel);
  root.style.setProperty('--theme-bg-card', c.bgCard);
  root.style.setProperty('--theme-status-green', c.statusGreen);
  root.style.setProperty('--theme-status-green-dim', c.statusGreenDim);
  root.style.setProperty('--theme-status-blue', c.statusBlue);
  root.style.setProperty('--theme-status-blue-dim', c.statusBlueDim);
  root.style.setProperty('--theme-status-purple', c.statusPurple);
  root.style.setProperty('--theme-status-purple-dim', c.statusPurpleDim);
  root.style.setProperty('--theme-status-red', c.statusRed);
  root.style.setProperty('--theme-status-orange', c.statusOrange);
  root.style.setProperty('--theme-border-primary', c.borderPrimary);
  root.style.setProperty('--theme-border-secondary', c.borderSecondary);
  root.style.setProperty('--theme-text-primary', c.textPrimary);
  root.style.setProperty('--theme-text-dim', c.textDim);
  root.style.setProperty('--theme-text-dimmer', c.textDimmer);
  root.style.setProperty('--theme-font-title', c.primary); // font color
  root.style.setProperty('--font-title', theme.fontTitle);
  root.style.setProperty('--font-mono', theme.fontMono);

  // Legacy vars kept for backwards compat with any code still using them
  root.style.setProperty('--cyan', c.primary);
  root.style.setProperty('--cyan-dim', c.primaryDim);
  root.style.setProperty('--cyan-dark', c.primaryDark);
  root.style.setProperty('--gold', c.secondary);
  root.style.setProperty('--gold-dim', c.secondaryDim);
  root.style.setProperty('--green', c.statusGreen);
  root.style.setProperty('--green-dim', c.statusGreenDim);
  root.style.setProperty('--blue', c.statusBlue);
  root.style.setProperty('--blue-dim', c.statusBlueDim);
  root.style.setProperty('--purple', c.statusPurple);
  root.style.setProperty('--purple-dim', c.statusPurpleDim);
  root.style.setProperty('--red', c.statusRed);
  root.style.setProperty('--orange', c.statusOrange);
  root.style.setProperty('--bg-deep', c.bgDeep);
  root.style.setProperty('--bg-panel', c.bgPanel);
  root.style.setProperty('--bg-card', c.bgCard);
  root.style.setProperty('--border-cyan', c.borderPrimary);
  root.style.setProperty('--border-gold', c.borderSecondary);

  // Body background
  document.body.style.background = c.bgDeep;
  document.body.style.color = c.textPrimary;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  themes: Theme[];
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getThemeById(DEFAULT_THEME_ID),
  themes: ALL_THEMES,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dungeon-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
    } catch {
      return DEFAULT_THEME_ID;
    }
  });

  const theme = getThemeById(themeId);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyThemeCssVars(theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themes: ALL_THEMES, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
