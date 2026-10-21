export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';
export type FuroPaletteId =
  | 'furo'
  | 'bootstrap'
  | 'modus'
  | 'modus-tinted'
  | 'modus-deuteranopia'
  | 'modus-tritanopia';

export interface FuroPaletteMeta {
  id: FuroPaletteId;
  label: string;
  wcag: 'AA' | 'AAA';
  description: string;
}

export const THEME_STORAGE_KEY = 'furo-theme';
export const PALETTE_STORAGE_KEY = 'furo-palette';

export const FURO_PALETTES: readonly FuroPaletteMeta[] = [
  {
    id: 'furo',
    label: 'Furo Default (AA)',
    wcag: 'AA',
    description: 'Sphinx Furo default documentation palette (WCAG 2.2 AA >= 4.5:1).'
  },
  {
    id: 'bootstrap',
    label: 'Bootstrap 6 OKLCH (AA)',
    wcag: 'AA',
    description: 'Perceptually uniform Bootstrap 6 OKLCH semantic palette (WCAG 2.2 AA >= 4.5:1).'
  },
  {
    id: 'modus',
    label: 'Modus High Contrast (AAA)',
    wcag: 'AAA',
    description: 'Emacs Modus Operandi & Modus Vivendi strict high-contrast palette (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-tinted',
    label: 'Modus Tinted (AAA)',
    wcag: 'AAA',
    description: 'Low-glare warm cream paper & deep night-sky surfaces (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-deuteranopia',
    label: 'Modus Deuteranopia (AAA)',
    wcag: 'AAA',
    description: 'Red-green colorblind-safe Blue / Gold / Warm Amber palette (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-tritanopia',
    label: 'Modus Tritanopia (AAA)',
    wcag: 'AAA',
    description: 'Blue-yellow colorblind-safe Teal / Magenta / Crimson palette (WCAG 2.2 AAA >= 7:1).'
  }
] as const;

const VALID_PALETTE_IDS = new Set<string>(FURO_PALETTES.map((p) => p.id));
const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'auto'];

function getStorage(): Storage | null {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.getItem === 'function'
    ) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function isValidPaletteId(value: string | null | undefined): value is FuroPaletteId {
  return typeof value === 'string' && VALID_PALETTE_IDS.has(value);
}

export function getStoredPalette(defaultPalette: FuroPaletteId = 'furo'): FuroPaletteId {
  try {
    const raw = getStorage()?.getItem(PALETTE_STORAGE_KEY);
    if (isValidPaletteId(raw)) {
      return raw;
    }
  } catch {
    // Ignore storage access errors
  }
  return defaultPalette;
}

export function applyPalette(palette: FuroPaletteId, persist = true): FuroPaletteId {
  const root = document.documentElement;
  const resolvedPalette: FuroPaletteId = isValidPaletteId(palette) ? palette : 'furo';

  root.setAttribute('data-furo-palette', resolvedPalette);
  if (persist) {
    root.setAttribute('data-furo-palette-locked', 'true');
    try {
      getStorage()?.setItem(PALETTE_STORAGE_KEY, resolvedPalette);
    } catch {
      // Ignore storage write errors
    }
  }

  updatePaletteControls(resolvedPalette);

  document.dispatchEvent(
    new CustomEvent('furo:palette-changed', {
      detail: { palette: resolvedPalette }
    })
  );

  return resolvedPalette;
}

function updatePaletteControls(palette: FuroPaletteId): void {
  const selects = document.querySelectorAll<HTMLSelectElement>('[data-furo-palette-select]');
  selects.forEach((select) => {
    if (select.value !== palette) {
      select.value = palette;
    }
  });

  const cards = document.querySelectorAll<HTMLElement>('[data-furo-palette-card]');
  cards.forEach((card) => {
    const cardPalette = card.getAttribute('data-furo-palette-card');
    const isActive = cardPalette === palette;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
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

  const defaultPaletteAttr = root.getAttribute('data-furo-default-palette');
  const defaultPalette: FuroPaletteId = isValidPaletteId(defaultPaletteAttr)
    ? defaultPaletteAttr
    : 'furo';

  const initialMode = getStoredThemeMode(defaultMode);
  applyThemeMode(initialMode, false);

  const initialPalette = getStoredPalette(defaultPalette);
  applyPalette(initialPalette, false);

  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-furo-theme-toggle]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      cycleThemeMode();
    });
  });

  const selects = document.querySelectorAll<HTMLSelectElement>('[data-furo-palette-select]');
  selects.forEach((select) => {
    select.value = initialPalette;
    select.addEventListener('change', () => {
      if (isValidPaletteId(select.value)) {
        applyPalette(select.value, true);
      }
    });
  });

  const cards = document.querySelectorAll<HTMLElement>('[data-furo-palette-card]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const targetPalette = card.getAttribute('data-furo-palette-card');
      if (isValidPaletteId(targetPalette)) {
        applyPalette(targetPalette, true);
      }
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
