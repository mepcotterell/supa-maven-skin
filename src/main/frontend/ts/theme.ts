import { setTooltipTitle } from './bootstrap-components';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';
export type SupaPaletteId =
  | 'furo'
  | 'bootstrap'
  | 'modus'
  | 'modus-tinted'
  | 'modus-deuteranopia'
  | 'modus-tritanopia';

export interface SupaPaletteMeta {
  id: SupaPaletteId;
  label: string;
  shortLabel: string;
  wcag: 'AA' | 'AAA';
  description: string;
}

export const THEME_STORAGE_KEY = 'supa-theme';
export const PALETTE_STORAGE_KEY = 'supa-palette';

export const SUPA_PALETTES: readonly SupaPaletteMeta[] = [
  {
    id: 'furo',
    label: 'Furo Default (AA)',
    shortLabel: 'Furo (AA)',
    wcag: 'AA',
    description: 'Sphinx Furo default documentation palette (WCAG 2.2 AA >= 4.5:1).'
  },
  {
    id: 'bootstrap',
    label: 'Bootstrap 6 OKLCH (AA)',
    shortLabel: 'Bootstrap 6 (AA)',
    wcag: 'AA',
    description: 'Perceptually uniform Bootstrap 6 OKLCH semantic palette (WCAG 2.2 AA >= 4.5:1).'
  },
  {
    id: 'modus',
    label: 'Modus High Contrast (AAA)',
    shortLabel: 'Modus (AAA)',
    wcag: 'AAA',
    description: 'Emacs Modus Operandi & Modus Vivendi strict high-contrast palette (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-tinted',
    label: 'Modus Tinted (AAA)',
    shortLabel: 'Modus Tinted (AAA)',
    wcag: 'AAA',
    description: 'Low-glare warm cream paper & deep night-sky surfaces (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-deuteranopia',
    label: 'Modus Deuteranopia (AAA)',
    shortLabel: 'Modus Deuteranopia (AAA)',
    wcag: 'AAA',
    description: 'Red-green colorblind-safe Blue / Gold / Warm Amber palette (WCAG 2.2 AAA >= 7:1).'
  },
  {
    id: 'modus-tritanopia',
    label: 'Modus Tritanopia (AAA)',
    shortLabel: 'Modus Tritanopia (AAA)',
    wcag: 'AAA',
    description: 'Blue-yellow colorblind-safe Teal / Magenta / Crimson palette (WCAG 2.2 AAA >= 7:1).'
  }
] as const;

const VALID_PALETTE_IDS = new Set<string>(SUPA_PALETTES.map((p) => p.id));
const PALETTE_SHORT_LABEL_MAP = new Map<SupaPaletteId, string>(
  SUPA_PALETTES.map((p) => [p.id, p.shortLabel])
);
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

export function isValidPaletteId(value: string | null | undefined): value is SupaPaletteId {
  return typeof value === 'string' && VALID_PALETTE_IDS.has(value);
}

export function getStoredPalette(defaultPalette: SupaPaletteId = 'furo'): SupaPaletteId {
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

export function applyPalette(palette: SupaPaletteId, persist = true): SupaPaletteId {
  const root = document.documentElement;
  const resolvedPalette: SupaPaletteId = isValidPaletteId(palette) ? palette : 'furo';

  root.setAttribute('data-supa-palette', resolvedPalette);
  if (persist) {
    root.setAttribute('data-supa-palette-locked', 'true');
    try {
      getStorage()?.setItem(PALETTE_STORAGE_KEY, resolvedPalette);
    } catch {
      // Ignore storage write errors
    }
  }

  updatePaletteControls(resolvedPalette);

  document.dispatchEvent(
    new CustomEvent('supa:palette-changed', {
      detail: { palette: resolvedPalette }
    })
  );

  return resolvedPalette;
}

function updatePaletteControls(palette: SupaPaletteId): void {
  const shortLabel = PALETTE_SHORT_LABEL_MAP.get(palette) ?? 'Furo (AA)';
  const labels = document.querySelectorAll<HTMLElement>('[data-supa-palette-label]');
  labels.forEach((labelEl) => {
    labelEl.textContent = shortLabel;
  });

  const paletteMeta = SUPA_PALETTES.find((p) => p.id === palette);
  const triggerLabel = paletteMeta
    ? `Accessible color scheme: ${paletteMeta.label}`
    : 'Select accessible color scheme (WCAG 2.2 AA / AAA)';
  const paletteBtns = document.querySelectorAll<HTMLButtonElement>('.supa-palette-btn');
  paletteBtns.forEach((btn) => {
    btn.setAttribute('aria-label', triggerLabel);
    setTooltipTitle(btn, triggerLabel, 'bottom');
  });

  const options = document.querySelectorAll<HTMLElement>('[data-supa-palette-option]');
  options.forEach((optionEl) => {
    const optionPalette = optionEl.getAttribute('data-supa-palette-option');
    const isActive = optionPalette === palette;
    optionEl.classList.toggle('selected', isActive);
    optionEl.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  const selects = document.querySelectorAll<HTMLSelectElement>('[data-supa-palette-select]');
  selects.forEach((select) => {
    if (select.value !== palette) {
      select.value = palette;
    }
  });

  const cards = document.querySelectorAll<HTMLElement>('[data-supa-palette-card]');
  cards.forEach((card) => {
    const cardPalette = card.getAttribute('data-supa-palette-card');
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

  root.setAttribute('data-supa-theme-mode', mode);
  root.setAttribute('data-supa-resolved-theme', resolved);

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

  updateThemeControls(mode, resolved);

  document.dispatchEvent(
    new CustomEvent('supa:theme-changed', {
      detail: { mode, resolvedTheme: resolved }
    })
  );

  return resolved;
}

export function cycleThemeMode(current?: ThemeMode): ThemeMode {
  const root = document.documentElement;
  const activeMode =
    current ??
    ((root.getAttribute('data-supa-theme-mode') as ThemeMode | null) || 'auto');
  const idx = THEME_CYCLE.indexOf(activeMode);
  const nextMode = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
  applyThemeMode(nextMode, true);
  return nextMode;
}

function updateThemeControls(mode: ThemeMode, resolved: ResolvedTheme): void {
  const triggerLabelMap: Record<ThemeMode, string> = {
    light: 'Color theme: Light',
    dark: 'Color theme: Dark',
    auto: `Color theme: Auto (${resolved === 'dark' ? 'Dark' : 'Light'})`
  };
  const triggerLabel = triggerLabelMap[mode];
  const triggers = document.querySelectorAll<HTMLButtonElement>('[data-supa-theme-trigger]');
  triggers.forEach((btn) => {
    btn.setAttribute('aria-label', triggerLabel);
    setTooltipTitle(btn, triggerLabel, 'bottom');
    btn.setAttribute('data-supa-current-mode', mode);
  });

  const themeOptions = document.querySelectorAll<HTMLElement>('[data-supa-theme-option]');
  themeOptions.forEach((optionEl) => {
    const optionMode = optionEl.getAttribute('data-supa-theme-option');
    const isActive = optionMode === mode;
    optionEl.classList.toggle('selected', isActive);
    optionEl.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  const toggleLabelMap: Record<ThemeMode, string> = {
    light: 'Color theme: Light (click for Dark)',
    dark: 'Color theme: Dark (click for Auto)',
    auto: `Color theme: Auto (${resolved === 'dark' ? 'Dark' : 'Light'}) (click for Light)`
  };
  const toggleLabel = toggleLabelMap[mode];
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-supa-theme-toggle]');
  buttons.forEach((btn) => {
    btn.setAttribute('aria-label', toggleLabel);
    setTooltipTitle(btn, toggleLabel, 'bottom');
    btn.setAttribute('data-supa-current-mode', mode);
  });
}

export function initTheme(): void {
  const root = document.documentElement;
  const defaultAttr = root.getAttribute('data-supa-default-theme');
  const defaultMode: ThemeMode =
    defaultAttr === 'light' || defaultAttr === 'dark' || defaultAttr === 'auto'
      ? defaultAttr
      : 'auto';

  const defaultPaletteAttr = root.getAttribute('data-supa-default-palette');
  const defaultPalette: SupaPaletteId = isValidPaletteId(defaultPaletteAttr)
    ? defaultPaletteAttr
    : 'furo';

  const initialMode = getStoredThemeMode(defaultMode);
  applyThemeMode(initialMode, false);

  const initialPalette = getStoredPalette(defaultPalette);
  applyPalette(initialPalette, false);

  const themeOptions = document.querySelectorAll<HTMLElement>('[data-supa-theme-option]');
  themeOptions.forEach((optionEl) => {
    optionEl.addEventListener('click', () => {
      const targetMode = optionEl.getAttribute('data-supa-theme-option');
      if (targetMode === 'light' || targetMode === 'dark' || targetMode === 'auto') {
        applyThemeMode(targetMode, true);
      }
    });
  });

  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-supa-theme-toggle]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      cycleThemeMode();
    });
  });

  const options = document.querySelectorAll<HTMLElement>('[data-supa-palette-option]');
  options.forEach((optionEl) => {
    optionEl.addEventListener('click', () => {
      const targetPalette = optionEl.getAttribute('data-supa-palette-option');
      if (isValidPaletteId(targetPalette)) {
        applyPalette(targetPalette, true);
      }
    });
  });

  const selects = document.querySelectorAll<HTMLSelectElement>('[data-supa-palette-select]');
  selects.forEach((select) => {
    select.value = initialPalette;
    select.addEventListener('change', () => {
      if (isValidPaletteId(select.value)) {
        applyPalette(select.value, true);
      }
    });
  });

  const cards = document.querySelectorAll<HTMLElement>('[data-supa-palette-card]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const targetPalette = card.getAttribute('data-supa-palette-card');
      if (isValidPaletteId(targetPalette)) {
        applyPalette(targetPalette, true);
      }
    });
  });

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentMode =
        (root.getAttribute('data-supa-theme-mode') as ThemeMode | null) || 'auto';
      if (currentMode === 'auto') {
        applyThemeMode('auto', false);
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    }
  }
}
