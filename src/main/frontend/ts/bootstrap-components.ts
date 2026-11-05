/**
 * @fileoverview Bootstrap 6.0.0-alpha.1 plugin registration, multi-instance Data map patch,
 * prose isolation, native-title-to-Tooltip promotion, interactive component examples,
 * and on-demand loading of the widgets only author content uses (`LAZY_WIDGETS`), including
 * the interactive Bootstrap 6 Component Playground (`playground.ts`).
 *
 * The plugins the skin's own chrome needs on every page (menus, tooltips, drawers, the search
 * dialog, ScrollSpy) and the small data-API plugins stay in the main bundle. The rest are split
 * into chunks next to it (`js/supa-maven-skin-<name>.min.js`) and imported only when the page
 * contains their markup, which keeps most of the weight off pages that never use them.
 */

import Alert from 'bootstrap/js/dist/alert.js';
import Button from 'bootstrap/js/dist/button.js';
import type CarouselPlugin from 'bootstrap/js/dist/carousel.js';
import type ChipsPlugin from 'bootstrap/js/dist/chips.js';
import Collapse from 'bootstrap/js/dist/collapse.js';
import type ComboboxPlugin from 'bootstrap/js/dist/combobox.js';
import type DatepickerPlugin from 'bootstrap/js/dist/datepicker.js';
import Dialog from 'bootstrap/js/dist/dialog.js';
import Data from 'bootstrap/js/dist/dom/data.js';
import Drawer from 'bootstrap/js/dist/drawer.js';
import Menu from 'bootstrap/js/dist/menu.js';
import type NavOverflowPlugin from 'bootstrap/js/dist/nav-overflow.js';
import type OtpInputPlugin from 'bootstrap/js/dist/otp-input.js';
import Popover from 'bootstrap/js/dist/popover.js';
import type RangePlugin from 'bootstrap/js/dist/range.js';
import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';
import type StrengthPlugin from 'bootstrap/js/dist/strength.js';
import type TabPlugin from 'bootstrap/js/dist/tab.js';
import Toast from 'bootstrap/js/dist/toast.js';
import Toggler from 'bootstrap/js/dist/toggler.js';
import Tooltip from 'bootstrap/js/dist/tooltip.js';
import { initContentTabs } from './doxia';

/**
 * Bootstrap 6.0.0-alpha.1's `dom/data.js` still carries a Bootstrap 5 guard in `Data.set`
 * that logs `console.error("Bootstrap doesn't allow more than one instance per element...")`
 * and drops the second instance when two plugins bind to the same element.
 * However, Bootstrap 6's `Combobox` internally creates a `Menu` instance (`bs.menu`) on the
 * same toggle element that already holds `bs.combobox`, and triggers with tooltips (`bs.tooltip`)
 * also share their element with `bs.menu` / `bs.dialog` / `bs.drawer`.
 * Patch `Data` so each element can hold one instance per distinct `DATA_KEY`.
 *
 * The lazily loaded plugin chunks import `dom/data.js` (through `base-component.js`) from the
 * main bundle rather than carrying their own copy, so this patch covers their instances too.
 */
const elementInstanceMap = new Map<Element, Map<string, unknown>>();

Data.set = (element: Element, key: string, instance: unknown): void => {
  if (!elementInstanceMap.has(element)) {
    elementInstanceMap.set(element, new Map());
  }
  elementInstanceMap.get(element)!.set(key, instance);
};

Data.get = (element: Element | null, key: string): unknown => {
  if (element && elementInstanceMap.has(element)) {
    return elementInstanceMap.get(element)!.get(key) || null;
  }
  return null;
};

Data.getAny = (element: Element | null): unknown => {
  if (element && elementInstanceMap.has(element)) {
    return elementInstanceMap.get(element)!.values().next().value || null;
  }
  return null;
};

Data.remove = (element: Element, key: string): void => {
  if (!elementInstanceMap.has(element)) {
    return;
  }
  const instanceMap = elementInstanceMap.get(element)!;
  instanceMap.delete(key);
  if (instanceMap.size === 0) {
    elementInstanceMap.delete(element);
  }
};

/** Bootstrap 6 plugins bundled into the main script and available on every page. */
const EAGER_PLUGINS = {
  Alert,
  Button,
  Collapse,
  Dialog,
  Drawer,
  Menu,
  Popover,
  ScrollSpy,
  Toast,
  Toggler,
  Tooltip
};

/** Bootstrap 6 plugins in `LAZY_WIDGETS`, present only once their chunk has loaded. */
interface LazyBootstrapPlugins {
  Carousel: typeof CarouselPlugin;
  Chips: typeof ChipsPlugin;
  Combobox: typeof ComboboxPlugin;
  Datepicker: typeof DatepickerPlugin;
  NavOverflow: typeof NavOverflowPlugin;
  OtpInput: typeof OtpInputPlugin;
  Range: typeof RangePlugin;
  Strength: typeof StrengthPlugin;
  Tab: typeof TabPlugin;
}

/**
 * The Bootstrap 6 plugins exposed on `window.bootstrap`: the eager plugins at once, and each
 * lazily loaded plugin as soon as its chunk loads (on pages that contain its markup, before
 * `html[data-supa-ready]` is set).
 */
export const BootstrapPlugins: typeof EAGER_PLUGINS & Partial<LazyBootstrapPlugins> = {
  ...EAGER_PLUGINS
};

declare global {
  interface Window {
    bootstrap?: typeof BootstrapPlugins;
  }
}

/**
 * Top-level Bootstrap 6 component root selectors that should automatically be
 * isolated from `.prose` typography rules when placed inside `.supa-article`.
 */
const BOOTSTRAP_PROSE_ISOLATION_SELECTORS = [
  '.accordion',
  '.alert',
  '.avatar',
  '.avatar-stack',
  '.badge',
  '.breadcrumb',
  '.btn',
  '.btn-group',
  '.btn-group-vertical',
  '.btn-toolbar',
  '.callout',
  '.card',
  '.card-group',
  '.carousel',
  '.chip',
  '.chip-input',
  '.dialog',
  '.drawer',
  '.dropdown',
  '.form-check',
  '.form-floating',
  '.form-range',
  '.input-group',
  '.list-group',
  '.menu',
  '.nav',
  '.navbar',
  '.otp',
  '.pagination',
  '.progress',
  '.spinner-border',
  '.spinner-grow',
  '.stepper',
  '.strength',
  '.tab-content',
  '.toast',
  '.toast-container',
  '.tooltip'
].join(', ');

const NON_TOOLTIP_TAGS = new Set([
  'HTML',
  'HEAD',
  'TITLE',
  'META',
  'LINK',
  'STYLE',
  'SCRIPT',
  'NOSCRIPT',
  'IFRAME',
  'FRAME',
  'OBJECT',
  'EMBED'
]);

const CODE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';

/** Chevron of the "Hide code" toggles on component examples and the playground. */
export const CHEVRON_ICON_SVG =
  '<svg class="supa-code-toggle-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

/**
 * Interactive Component Playground roots. Defined here rather than in `playground.ts` so the
 * main bundle can detect a playground without pulling that module out of its chunk.
 */
export const PLAYGROUND_SELECTOR = '.supa-playground, [data-supa-playground]';

/**
 * Checks whether an element's `title` attribute is used as Doxia shorthand metadata
 * for `.supa-tabs`, `.supa-accordion`, or `.supa-stepper` rather than a tooltip.
 *
 * @param el - Element to inspect.
 * @returns True when `el` uses `title` for Doxia component shorthand.
 */
function isDoxiaShorthandTitleElement(el: HTMLElement): boolean {
  if (
    el.classList.contains('supa-tabs') ||
    el.classList.contains('supa-accordion') ||
    el.classList.contains('supa-stepper')
  ) {
    return true;
  }
  const parent = el.parentElement;
  if (
    parent &&
    (parent.classList.contains('supa-tabs') || parent.classList.contains('supa-accordion'))
  ) {
    return true;
  }
  return false;
}

/**
 * Binds `click` and `show.bs.menu` listeners on `el` so its Bootstrap `Tooltip`
 * automatically hides when the user activates the control.
 *
 * @param el - Target element with a bound Tooltip.
 */
function bindTooltipAutoHideOnInteract(el: HTMLElement): void {
  if (el.hasAttribute('data-supa-tooltip-bound')) {
    return;
  }
  el.setAttribute('data-supa-tooltip-bound', 'true');
  /**
   * Hides any active Bootstrap Tooltip instance attached to `el`.
   */
  const hideTip = () => {
    try {
      Tooltip.getInstance(el)?.hide();
    } catch {
      // Ignore in synthetic DOMs
    }
  };
  el.addEventListener('click', hideTip);
  el.addEventListener('show.bs.menu', hideTip);
}

/**
 * Sets or updates a Bootstrap 6 Tooltip on an element while removing any native
 * `title` attribute so the browser never displays a built-in tooltip.
 *
 * @param el - Element to configure with a Bootstrap 6 Tooltip.
 * @param title - Tooltip text content.
 * @param placement - Optional tooltip placement (`top`, `bottom`, `left`, `right`).
 */
export function setTooltipTitle(el: HTMLElement, title: string, placement?: string): void {
  const trimmed = title.trim();
  el.removeAttribute('title');
  if (!trimmed) {
    return;
  }

  if (!el.getAttribute('aria-label') && !el.textContent?.trim()) {
    el.setAttribute('aria-label', trimmed);
  }
  el.setAttribute('data-bs-title', trimmed);
  el.setAttribute('data-bs-original-title', trimmed);

  const toggleType = el.getAttribute('data-bs-toggle');
  const isOverlayTrigger =
    toggleType === 'menu' || toggleType === 'dialog' || toggleType === 'drawer';

  if (placement && !el.hasAttribute('data-bs-placement')) {
    el.setAttribute('data-bs-placement', placement);
  }
  if (!toggleType) {
    el.setAttribute('data-bs-toggle', 'tooltip');
  }

  bindTooltipAutoHideOnInteract(el);

  try {
    const existing = Tooltip.getInstance(el) as
      | (InstanceType<typeof Tooltip> & {
          setContent?: (content: Record<string, string>) => void;
          _config?: { title?: string };
        })
      | null;
    if (existing) {
      if (existing._config) {
        existing._config.title = trimmed;
      }
      if (typeof existing.setContent === 'function') {
        existing.setContent({ '.tooltip-inner': trimmed });
      }
    } else {
      const rawPlacement = el.getAttribute('data-bs-placement') || placement || 'top';
      const tooltipPlacement = isOverlayTrigger
        ? rawPlacement.startsWith('top')
          ? 'top'
          : 'bottom'
        : rawPlacement;
      Tooltip.getOrCreateInstance(el, {
        placement: tooltipPlacement,
        trigger: isOverlayTrigger ? 'hover' : 'hover focus'
      });
    }
  } catch {
    // Ignore initialization errors in headless test DOMs
  }
}

/**
 * Upgrades all `[data-bs-toggle="tooltip"]`, `[data-bs-title]`, and native `[title]`
 * elements within `root` to Bootstrap 6 `Tooltip` instances and strips native `title`
 * attributes so built-in browser tooltips are suppressed.
 *
 * @param root - Root node to scan for tooltip targets (defaults to `document`).
 */
export function initTooltips(root: ParentNode = document): void {
  const selector = [
    '[data-bs-toggle="tooltip"]',
    '[data-bs-title]:not([data-bs-toggle="popover"])',
    '[title]'
  ].join(', ');

  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    if (NON_TOOLTIP_TAGS.has(el.tagName)) {
      return;
    }
    if (el.getAttribute('data-bs-toggle') === 'popover') {
      if (el.hasAttribute('title')) {
        const popoverTitle = el.getAttribute('title')?.trim() ?? '';
        if (popoverTitle && !el.hasAttribute('data-bs-title')) {
          el.setAttribute('data-bs-title', popoverTitle);
        }
        el.removeAttribute('title');
      }
      return;
    }
    if (isDoxiaShorthandTitleElement(el)) {
      return;
    }

    const explicitTitle =
      el.getAttribute('data-bs-title')?.trim() ||
      el.getAttribute('title')?.trim() ||
      el.getAttribute('data-bs-original-title')?.trim() ||
      '';

    if (el.hasAttribute('title')) {
      el.removeAttribute('title');
    }

    if (!explicitTitle) {
      return;
    }

    setTooltipTitle(el, explicitTitle);
  });
}

/**
 * Automatically pairs `.supa-component-preview` showcase cards with an immediately
 * following `.supa-code-block` or `.supa-tabs` syntax block into a unified Bootstrap 6
 * docs-style `.supa-component-example` container with an interactive Show/Hide Code bar.
 *
 * @param root - Root node to scan for `.supa-component-preview` blocks.
 */
export function initComponentExamples(root: ParentNode = document): void {
  const previews = Array.from(root.querySelectorAll<HTMLElement>('.supa-component-preview'));
  previews.forEach((previewEl) => {
    if (
      previewEl.hasAttribute('data-supa-example-bound') ||
      previewEl.closest('.supa-component-example') ||
      previewEl.closest(PLAYGROUND_SELECTOR)
    ) {
      return;
    }

    const nextEl = previewEl.nextElementSibling as HTMLElement | null;
    if (
      !nextEl ||
      (!nextEl.classList.contains('supa-code-block') && !nextEl.classList.contains('supa-tabs'))
    ) {
      return;
    }

    previewEl.setAttribute('data-supa-example-bound', 'true');
    const wrapper = document.createElement('div');
    wrapper.className = 'supa-component-example not-prose';
    previewEl.parentNode?.insertBefore(wrapper, previewEl);
    wrapper.appendChild(previewEl);

    /**
     * Creates a Show/Hide code toggle button for a `.supa-component-example` wrapper.
     *
     * @param onToggle - Callback invoked when toggled.
     * @returns Configured toggle button element.
     */
    const createToggleBtn = (onToggle: (collapsed: boolean, btn: HTMLButtonElement) => void) => {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'supa-component-code-toggle';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.innerHTML = `<span class="supa-code-toggle-text">Hide code</span>${CHEVRON_ICON_SVG}`;
      setTooltipTitle(toggleBtn, 'Collapse or expand code snippet', 'top');

      toggleBtn.addEventListener('click', () => {
        const isCollapsed = wrapper.classList.toggle('is-code-collapsed');
        toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        const labelSpan = toggleBtn.querySelector('.supa-code-toggle-text');
        if (labelSpan) {
          labelSpan.textContent = isCollapsed ? 'Show code' : 'Hide code';
        }
        onToggle(isCollapsed, toggleBtn);
      });
      return toggleBtn;
    };

    if (nextEl.classList.contains('supa-code-block')) {
      const pre = nextEl.querySelector('pre');
      const customSyntax =
        pre?.getAttribute('data-syntax-label') ||
        previewEl.getAttribute('data-syntax-label') ||
        'Markdown + HTML';

      const bar = document.createElement('div');
      bar.className = 'supa-component-example-bar';

      const labelEl = document.createElement('span');
      labelEl.className = 'supa-component-example-label';
      labelEl.innerHTML = `${CODE_ICON_SVG}<span></span>`;
      const textSpan = labelEl.querySelector('span');
      if (textSpan) {
        textSpan.textContent = customSyntax;
      }

      const toggleBtn = createToggleBtn((collapsed) => {
        nextEl.hidden = collapsed;
      });

      bar.appendChild(labelEl);
      bar.appendChild(toggleBtn);
      wrapper.appendChild(bar);
      wrapper.appendChild(nextEl);
    } else if (nextEl.classList.contains('supa-tabs')) {
      wrapper.appendChild(nextEl);
      if (!nextEl.hasAttribute('data-supa-tabs-ready')) {
        initContentTabs(wrapper);
      }

      const tabList = nextEl.querySelector<HTMLElement>('.supa-tab-list');
      if (tabList && !tabList.querySelector('.supa-component-code-toggle')) {
        const toggleBtn = createToggleBtn((collapsed) => {
          nextEl.querySelectorAll<HTMLElement>('.supa-tab-panel').forEach((panel) => {
            panel.hidden = collapsed ? true : !panel.classList.contains('active');
          });
        });
        toggleBtn.classList.add('ms-auto');
        // A `role="tablist"` may only own tabs (axe aria-required-children), so move the tabs
        // into an inner tablist and keep the outer `.supa-tab-list` as a plain styled bar.
        const tabs = document.createElement('div');
        tabs.className = 'supa-tab-list-tabs';
        tabs.setAttribute('role', 'tablist');
        tabList.querySelectorAll<HTMLElement>(':scope > [role="tab"]').forEach((tab) => {
          tabs.appendChild(tab);
        });
        tabList.removeAttribute('role');
        tabList.appendChild(tabs);
        tabList.appendChild(toggleBtn);

        tabList.querySelectorAll<HTMLButtonElement>('.supa-tab-btn').forEach((tabBtn) => {
          tabBtn.addEventListener('click', () => {
            if (wrapper.classList.contains('is-code-collapsed')) {
              wrapper.classList.remove('is-code-collapsed');
              toggleBtn.setAttribute('aria-expanded', 'true');
              const labelSpan = toggleBtn.querySelector('.supa-code-toggle-text');
              if (labelSpan) {
                labelSpan.textContent = 'Hide code';
              }
              nextEl.querySelectorAll<HTMLElement>('.supa-tab-panel').forEach((panel) => {
                panel.hidden = !panel.classList.contains('active');
              });
            }
          });
        });
      }
    }
  });
}

/**
 * Automatically adds `.not-prose` to Bootstrap 6 component root containers inside
 * `.supa-article` so site authors don't have to manually wrap every component.
 *
 * @param container - Root container to scan for Bootstrap 6 component roots.
 */
export function isolateBootstrapComponentsFromProse(container: ParentNode = document): void {
  const elements = container.querySelectorAll<HTMLElement>(BOOTSTRAP_PROSE_ISOLATION_SELECTORS);
  elements.forEach((el) => {
    if (!el.classList.contains('not-prose')) {
      el.classList.add('not-prose');
    }
  });
}

/** Initializes one element that matches a lazily loaded widget's selector. */
export type WidgetInitializer = (el: HTMLElement) => void;

/**
 * A widget that only author content uses, whose code ships as its own chunk next to the main
 * bundle (`js/supa-maven-skin-<chunk>.min.js`) and is imported only when a page contains its
 * markup, the way `optional.ts` loads Mermaid and KaTeX only when a page needs them.
 */
export interface LazyWidget {
  /** Plugin or feature name, used in the console warning when its chunk fails to load. */
  name: string;
  /** Markup that needs the widget: the chunk loads only when the root contains a match. */
  selector: string;
  /** Imports the widget's chunk and returns the initializer for each matching element. */
  load: () => Promise<WidgetInitializer>;
}

/**
 * The lazily loaded widgets. Each loader names its module in a literal `import()` so Vite splits
 * it into its own chunk; the chunk imports everything it shares with the skin (Bootstrap's
 * `base-component.js` and patched `dom/data.js`, `Menu`, the sanitizer, the skin's own helpers)
 * from the main bundle, so one instance of each serves both.
 *
 * Bootstrap's own `DOMContentLoaded` and `window` `load` data-API initializers have usually
 * fired before a chunk arrives, so each selector also covers the markup those initializers would
 * have handled.
 */
export const LAZY_WIDGETS: readonly LazyWidget[] = [
  {
    name: 'Combobox',
    selector: '[data-bs-toggle="combobox"]',
    load: async () => {
      // Combobox creates a Menu instance on its own toggle; the Data patch above lets both live
      // there, and Menu itself comes from the main bundle.
      const { default: Combobox } = await import('bootstrap/js/dist/combobox.js');
      BootstrapPlugins.Combobox = Combobox;
      return (el) => {
        Combobox.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Datepicker',
    selector: '[data-bs-toggle="datepicker"]',
    load: async () => {
      // The largest chunk by far: it carries the vanilla-calendar-pro peer dependency.
      const { default: Datepicker } = await import('bootstrap/js/dist/datepicker.js');
      BootstrapPlugins.Datepicker = Datepicker;
      return (el) => {
        Datepicker.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Chips',
    selector: '[data-bs-chips], .chip-input',
    load: async () => {
      const { default: Chips } = await import('bootstrap/js/dist/chips.js');
      BootstrapPlugins.Chips = Chips;
      return (el) => {
        if (!el.hasAttribute('data-bs-chips')) {
          el.setAttribute('data-bs-chips', '');
        }
        Chips.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'OtpInput',
    selector: '[data-bs-otp], .otp',
    load: async () => {
      const { default: OtpInput } = await import('bootstrap/js/dist/otp-input.js');
      BootstrapPlugins.OtpInput = OtpInput;
      return (el) => {
        if (!el.hasAttribute('data-bs-otp')) {
          el.setAttribute('data-bs-otp', '');
        }
        OtpInput.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Range',
    selector: '.form-range',
    load: async () => {
      const { default: Range } = await import('bootstrap/js/dist/range.js');
      BootstrapPlugins.Range = Range;
      return (el) => {
        if (!el.hasAttribute('data-bs-bubble')) {
          el.setAttribute('data-bs-bubble', 'true');
        }
        Range.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Strength',
    selector: '[data-bs-strength], .strength',
    load: async () => {
      const { default: Strength } = await import('bootstrap/js/dist/strength.js');
      BootstrapPlugins.Strength = Strength;
      return (el) => {
        if (!el.hasAttribute('data-bs-strength')) {
          el.setAttribute('data-bs-strength', '');
        }
        if (!el.hasAttribute('data-bs-input')) {
          const prevInput = el.previousElementSibling;
          if (prevInput instanceof HTMLInputElement && prevInput.id) {
            el.setAttribute('data-bs-input', `#${prevInput.id}`);
          }
        }
        Strength.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'NavOverflow',
    selector: '.nav-overflow, [data-bs-toggle="nav-overflow"]',
    load: async () => {
      const { default: NavOverflow } = await import('bootstrap/js/dist/nav-overflow.js');
      BootstrapPlugins.NavOverflow = NavOverflow;
      return (el) => {
        NavOverflow.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Carousel',
    selector: '[data-bs-ride="carousel"], [data-bs-autoplay="true"], .carousel',
    load: async () => {
      const { default: Carousel } = await import('bootstrap/js/dist/carousel.js');
      BootstrapPlugins.Carousel = Carousel;
      return (el) => {
        Carousel.getOrCreateInstance(el);
      };
    }
  },
  {
    name: 'Tab',
    selector: '[data-bs-toggle="tab"]',
    load: async () => {
      const { default: Tab } = await import('bootstrap/js/dist/tab.js');
      BootstrapPlugins.Tab = Tab;
      return (el) => {
        // Bootstrap creates the active tabs' instances (which wire up the tablist's ARIA
        // attributes) on window `load`, and creates the rest on click.
        if (el.classList.contains('active')) {
          Tab.getOrCreateInstance(el);
        }
      };
    }
  },
  {
    name: 'Component Playground',
    selector: PLAYGROUND_SELECTOR,
    load: async () => {
      const { initPlayground } = await import('./playground');
      return initPlayground;
    }
  }
];

/** One load per widget and page, so a chunk is fetched, and a failure logged, only once. */
const widgetLoads = new Map<LazyWidget, Promise<WidgetInitializer | null>>();

/**
 * Loads a widget's chunk once. A failed load (offline, a server that does not serve the chunk
 * files, a Content Security Policy that blocks them) is logged once and resolves to `null`, so the
 * widget's markup stays plain HTML and the rest of the skin keeps working.
 *
 * @param widget - Widget to load.
 * @returns The widget's initializer, or `null` when its chunk could not be loaded.
 */
function loadWidget(widget: LazyWidget): Promise<WidgetInitializer | null> {
  let pending = widgetLoads.get(widget);
  if (!pending) {
    pending = Promise.resolve()
      .then(() => widget.load())
      .catch((error: unknown) => {
        console.warn(
          `Supa Maven Skin: could not load the ${widget.name} script; its markup stays plain HTML.`,
          error
        );
        return null;
      });
    widgetLoads.set(widget, pending);
  }
  return pending;
}

/**
 * Loads and initializes each widget whose selector matches inside `root`. Widgets without a match
 * are never imported. Safe to call again: chunks load once and initializers are idempotent.
 *
 * @param root - Root node to scan (defaults to `document`).
 * @param widgets - Widgets to consider (defaults to `LAZY_WIDGETS`; injectable for tests).
 * @returns Promise that resolves once every matching widget has initialized or failed to load;
 *     it never rejects.
 */
export async function initLazyWidgets(
  root: ParentNode = document,
  widgets: readonly LazyWidget[] = LAZY_WIDGETS
): Promise<void> {
  await Promise.all(
    widgets.map(async (widget) => {
      if (!root.querySelector(widget.selector)) {
        return;
      }
      const init = await loadWidget(widget);
      if (!init) {
        return;
      }
      root.querySelectorAll<HTMLElement>(widget.selector).forEach((el) => {
        try {
          init(el);
        } catch {
          // Ignore initialization errors in synthetic DOMs and malformed markup
        }
      });
    })
  );
}

/**
 * Attaches the Bootstrap 6 plugins to `window.bootstrap` and auto-initializes opt-in
 * interactive widgets (`Tooltip`, `Popover`, `Toast`, and the `LAZY_WIDGETS`: `Combobox`,
 * `Datepicker`, `Chips`, `OtpInput`, `Range`, `Strength`, `NavOverflow`, `Carousel`, `Tab`, and
 * the Component Playground).
 *
 * @param root - Root node to initialize (defaults to `document`).
 * @returns Promise that resolves once the lazily loaded widgets on the page have initialized
 *     (or failed to load); everything else is initialized synchronously. It never rejects.
 */
export function initBootstrapComponents(root: ParentNode = document): Promise<void> {
  if (typeof window !== 'undefined') {
    window.bootstrap = BootstrapPlugins;
  }

  isolateBootstrapComponentsFromProse(root);
  initComponentExamples(root);

  // 1. Tooltips (including upgrading native [title] attributes across the page)
  initTooltips(root);

  // 2. Popovers: [data-bs-toggle="popover"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="popover"]').forEach((el) => {
    try {
      Popover.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 3. Toasts & declarative toast triggers ([data-supa-toast-target="#toastId"])
  root.querySelectorAll<HTMLElement>('.toast').forEach((el) => {
    try {
      Toast.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  root.querySelectorAll<HTMLElement>('[data-supa-toast-target]').forEach((trigger) => {
    if (trigger.hasAttribute('data-supa-toast-bound')) {
      return;
    }
    trigger.setAttribute('data-supa-toast-bound', 'true');
    trigger.addEventListener('click', () => {
      const selector = trigger.getAttribute('data-supa-toast-target');
      if (!selector) {
        return;
      }
      const toastEl = document.querySelector<HTMLElement>(selector);
      if (toastEl) {
        try {
          Toast.getOrCreateInstance(toastEl).show();
        } catch {
          toastEl.classList.add('show');
        }
      }
    });
  });

  // 4. Widgets only author content uses: Combobox, Datepicker, Chips, OTP inputs, Range
  //    sliders, strength meters, overflowing navs, carousels, Bootstrap tabs, and the playground.
  return initLazyWidgets(root);
}

export { Alert, Button, Collapse, Dialog, Drawer, Menu, Popover, ScrollSpy, Toast, Toggler, Tooltip };
