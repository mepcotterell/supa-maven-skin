export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'furo-theme';
const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'auto'];

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }
  return getSystemTheme();
}

export function getStoredThemeMode(defaultMode: ThemeMode = 'auto'): ThemeMode {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') {
      return raw;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return defaultMode;
}

export function applyThemeMode(mode: ThemeMode, persist = true): ResolvedTheme {
  const root = document.documentElement;
  const resolved = resolveTheme(mode);

  root.setAttribute('data-furo-theme-mode', mode);
  root.setAttribute('data-furo-resolved-theme', resolved);

  if (mode === 'light' || mode === 'dark') {
    root.setAttribute('data-bs-theme', mode);
  } else {
    root.removeAttribute('data-bs-theme');
  }

  if (persist) {
    try {
      getStorage()?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors
    }
  }

  updateThemeToggleButtons(mode, resolved);

  document.dispatchEvent(
    new CustomEvent('furo:theme-changed', {
      detail: { mode, resolvedTheme: resolved }
    })
  );

  return resolved;
}

export function cycleThemeMode(current?: ThemeMode): ThemeMode {
  const root = document.documentElement;
  const activeMode =
    current ??
    ((root.getAttribute('data-furo-theme-mode') as ThemeMode | null) || 'auto');
  const idx = THEME_CYCLE.indexOf(activeMode);
  const nextMode = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
  applyThemeMode(nextMode, true);
  return nextMode;
}

function updateThemeToggleButtons(mode: ThemeMode, resolved: ResolvedTheme): void {
  const labelMap: Record<ThemeMode, string> = {
    light: 'Color theme: Light (click for Dark)',
    dark: 'Color theme: Dark (click for Auto)',
    auto: `Color theme: Auto (${resolved === 'dark' ? 'Dark' : 'Light'}) (click for Light)`
  };
  const label = labelMap[mode];
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-furo-theme-toggle]');
  buttons.forEach((btn) => {
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('data-furo-current-mode', mode);
  });
}

export function initTheme(): void {
  const root = document.documentElement;
  const defaultAttr = root.getAttribute('data-furo-default-theme');
  const defaultMode: ThemeMode =
    defaultAttr === 'light' || defaultAttr === 'dark' || defaultAttr === 'auto'
      ? defaultAttr
      : 'auto';

  const initialMode = getStoredThemeMode(defaultMode);
  applyThemeMode(initialMode, false);

  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-furo-theme-toggle]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      cycleThemeMode();
    });
  });

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentMode =
        (root.getAttribute('data-furo-theme-mode') as ThemeMode | null) || 'auto';
      if (currentMode === 'auto') {
        applyThemeMode('auto', false);
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    }
  }
}
