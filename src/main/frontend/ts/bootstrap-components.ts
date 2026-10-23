import Alert from 'bootstrap/js/dist/alert.js';
import Button from 'bootstrap/js/dist/button.js';
import Carousel from 'bootstrap/js/dist/carousel.js';
import Chips from 'bootstrap/js/dist/chips.js';
import Collapse from 'bootstrap/js/dist/collapse.js';
import Combobox from 'bootstrap/js/dist/combobox.js';
import Datepicker from 'bootstrap/js/dist/datepicker.js';
import Dialog from 'bootstrap/js/dist/dialog.js';
import Data from 'bootstrap/js/dist/dom/data.js';
import Drawer from 'bootstrap/js/dist/drawer.js';
import Menu from 'bootstrap/js/dist/menu.js';
import NavOverflow from 'bootstrap/js/dist/nav-overflow.js';
import OtpInput from 'bootstrap/js/dist/otp-input.js';
import Popover from 'bootstrap/js/dist/popover.js';
import Range from 'bootstrap/js/dist/range.js';
import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';
import Strength from 'bootstrap/js/dist/strength.js';
import Tab from 'bootstrap/js/dist/tab.js';
import Toast from 'bootstrap/js/dist/toast.js';
import Toggler from 'bootstrap/js/dist/toggler.js';
import Tooltip from 'bootstrap/js/dist/tooltip.js';
import { highlightCodeElement } from './code';
import { initContentTabs } from './doxia';

/**
 * Bootstrap 6.0.0-alpha.1's `dom/data.js` still carries a Bootstrap 5 guard in `Data.set`
 * that logs `console.error("Bootstrap doesn't allow more than one instance per element...")`
 * and drops the second instance when two plugins bind to the same element.
 * However, Bootstrap 6's `Combobox` internally creates a `Menu` instance (`bs.menu`) on the
 * same toggle element that already holds `bs.combobox`, and triggers with tooltips (`bs.tooltip`)
 * also share their element with `bs.menu` / `bs.dialog` / `bs.drawer`.
 * Patch `Data` so each element can hold one instance per distinct `DATA_KEY`.
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

export const BootstrapPlugins = {
  Alert,
  Button,
  Carousel,
  Chips,
  Collapse,
  Combobox,
  Datepicker,
  Dialog,
  Drawer,
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
  Strength,
  Tab,
  Toast,
  Toggler,
  Tooltip
};

declare global {
  interface Window {
    bootstrap?: typeof BootstrapPlugins;
  }
}

/**
 * Top-level Bootstrap 6 component root selectors that should automatically be
 * isolated from `.prose` typography rules when placed inside `.furo-article`.
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

const CHEVRON_ICON_SVG =
  '<svg class="furo-code-toggle-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function isDoxiaShorthandTitleElement(el: HTMLElement): boolean {
  if (
    el.classList.contains('furo-tabs') ||
    el.classList.contains('furo-accordion') ||
    el.classList.contains('furo-stepper')
  ) {
    return true;
  }
  const parent = el.parentElement;
  if (
    parent &&
    (parent.classList.contains('furo-tabs') || parent.classList.contains('furo-accordion'))
  ) {
    return true;
  }
  return false;
}

function bindTooltipAutoHideOnInteract(el: HTMLElement): void {
  if (el.hasAttribute('data-furo-tooltip-bound')) {
    return;
  }
  el.setAttribute('data-furo-tooltip-bound', 'true');
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
 * Automatically pairs `.furo-component-preview` showcase cards with an immediately
 * following `.furo-code-block` or `.furo-tabs` syntax block into a unified Bootstrap 6
 * docs-style `.furo-component-example` container with an interactive Show/Hide Code bar.
 */
export function initComponentExamples(root: ParentNode = document): void {
  const previews = Array.from(root.querySelectorAll<HTMLElement>('.furo-component-preview'));
  previews.forEach((previewEl) => {
    if (
      previewEl.hasAttribute('data-furo-example-bound') ||
      previewEl.closest('.furo-component-example') ||
      previewEl.closest('.furo-playground, [data-furo-playground]')
    ) {
      return;
    }

    const nextEl = previewEl.nextElementSibling as HTMLElement | null;
    if (
      !nextEl ||
      (!nextEl.classList.contains('furo-code-block') && !nextEl.classList.contains('furo-tabs'))
    ) {
      return;
    }

    previewEl.setAttribute('data-furo-example-bound', 'true');
    const wrapper = document.createElement('div');
    wrapper.className = 'furo-component-example not-prose';
    previewEl.parentNode?.insertBefore(wrapper, previewEl);
    wrapper.appendChild(previewEl);

    const createToggleBtn = (onToggle: (collapsed: boolean, btn: HTMLButtonElement) => void) => {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'furo-component-code-toggle';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.innerHTML = `<span class="furo-code-toggle-text">Hide code</span>${CHEVRON_ICON_SVG}`;
      setTooltipTitle(toggleBtn, 'Collapse or expand code snippet', 'top');

      toggleBtn.addEventListener('click', () => {
        const isCollapsed = wrapper.classList.toggle('is-code-collapsed');
        toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        const labelSpan = toggleBtn.querySelector('.furo-code-toggle-text');
        if (labelSpan) {
          labelSpan.textContent = isCollapsed ? 'Show code' : 'Hide code';
        }
        onToggle(isCollapsed, toggleBtn);
      });
      return toggleBtn;
    };

    if (nextEl.classList.contains('furo-code-block')) {
      const pre = nextEl.querySelector('pre');
      const customSyntax =
        pre?.getAttribute('data-syntax-label') ||
        previewEl.getAttribute('data-syntax-label') ||
        'Markdown + HTML';

      const bar = document.createElement('div');
      bar.className = 'furo-component-example-bar';

      const labelEl = document.createElement('span');
      labelEl.className = 'furo-component-example-label';
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
    } else if (nextEl.classList.contains('furo-tabs')) {
      wrapper.appendChild(nextEl);
      if (!nextEl.hasAttribute('data-furo-tabs-ready')) {
        initContentTabs(wrapper);
      }

      const tabList = nextEl.querySelector<HTMLElement>('.furo-tab-list');
      if (tabList && !tabList.querySelector('.furo-component-code-toggle')) {
        const toggleBtn = createToggleBtn((collapsed) => {
          nextEl.querySelectorAll<HTMLElement>('.furo-tab-panel').forEach((panel) => {
            panel.hidden = collapsed ? true : !panel.classList.contains('active');
          });
        });
        toggleBtn.classList.add('ms-auto');
        tabList.appendChild(toggleBtn);

        tabList.querySelectorAll<HTMLButtonElement>('.furo-tab-btn').forEach((tabBtn) => {
          tabBtn.addEventListener('click', () => {
            if (wrapper.classList.contains('is-code-collapsed')) {
              wrapper.classList.remove('is-code-collapsed');
              toggleBtn.setAttribute('aria-expanded', 'true');
              const labelSpan = toggleBtn.querySelector('.furo-code-toggle-text');
              if (labelSpan) {
                labelSpan.textContent = 'Hide code';
              }
              nextEl.querySelectorAll<HTMLElement>('.furo-tab-panel').forEach((panel) => {
                panel.hidden = !panel.classList.contains('active');
              });
            }
          });
        });
      }
    }
  });
}

type PlaygroundComponent = 'button' | 'alert' | 'badge' | 'card';
type PlaygroundTheme =
  | 'primary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'secondary';
type PlaygroundVariant = 'solid' | 'outline' | 'subtle' | 'text' | 'styled';
type PlaygroundSize = 'xs' | 'sm' | 'md' | 'lg';

interface PlaygroundState {
  component: PlaygroundComponent;
  theme: PlaygroundTheme;
  variant: PlaygroundVariant;
  size: PlaygroundSize;
  syntaxTab: string;
}

interface PlaygroundSyntaxTab {
  id: string;
  label: string;
  lang: string;
  code: string;
}

const ARROW_LEFT_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/></svg>';
const ARROW_RIGHT_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>';
const PLUS_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/></svg>';

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderPlaygroundState(state: PlaygroundState): {
  html: string;
  tabs: PlaygroundSyntaxTab[];
} {
  const { component, theme, variant, size } = state;
  const label = capitalize(theme);
  const sizeClass = size === 'md' ? '' : ` btn-${size}`;

  if (component === 'button') {
    const variantClass =
      variant === 'styled' ? 'btn-solid btn-styled' : `btn-${variant}`;
    const btnCls = `btn ${variantClass} theme-${theme}${sizeClass}`;
    const iconBtnCls = `btn ${variantClass} btn-icon theme-${theme}${sizeClass}`;

    const html = `
      <div class="d-flex flex-wrap align-items-center gap-2">
        <button type="button" class="${btnCls}" data-button-type="text">${label}</button>
        <button type="button" class="${btnCls} d-inline-flex align-items-center gap-2" data-button-type="left-icon">${ARROW_LEFT_SVG}<span>Left icon</span></button>
        <button type="button" class="${btnCls} d-inline-flex align-items-center gap-2" data-button-type="right-icon"><span>Right icon</span>${ARROW_RIGHT_SVG}</button>
        <button type="button" class="${iconBtnCls}" data-button-type="icon-only" aria-label="Add item" data-bs-title="Icon-only button (${btnCls})">${PLUS_ICON_SVG}</button>
        <button type="button" class="${btnCls}" data-bs-toggle="button" aria-pressed="false">Toggle state</button>
      </div>
    `;

    const htmlCode = [
      `<!-- Direct HTML in Markdown (.md) -->`,
      `<button type="button" class="${btnCls}">${label}</button>`,
      `<button type="button" class="${btnCls}">`,
      `  <svg class="bi" width="16" height="16" aria-hidden="true"><use href="#arrow-left"/></svg>`,
      `  Left icon`,
      `</button>`,
      `<button type="button" class="${btnCls}">`,
      `  Right icon`,
      `  <svg class="bi" width="16" height="16" aria-hidden="true"><use href="#arrow-right"/></svg>`,
      `</button>`,
      `<button type="button" class="${iconBtnCls}" aria-label="Add item">`,
      `  <svg class="bi" width="16" height="16" aria-hidden="true"><use href="#plus-lg"/></svg>`,
      `</button>`,
      `<button type="button" class="${btnCls}" data-bs-toggle="button" aria-pressed="false">Toggle state</button>`
    ].join('\n');

    return {
      html,
      tabs: [{ id: 'html', label: 'Markdown + HTML', lang: 'html', code: htmlCode }]
    };
  }

  if (component === 'alert') {
    const alertTheme = theme === 'accent' ? 'primary' : theme;
    const html = `
      <div class="alert theme-${theme} not-prose mb-0" role="alert">
        <div class="flex-grow-1">
          <div class="alert-heading fw-semibold mb-1">${label} Alert Callout</div>
          <p class="mb-0">Contextual feedback rendered with <code>.alert.theme-${theme}</code> and optional inline dismissal.</p>
        </div>
        <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    const mdCode = [
      `> [!ALERT:${alertTheme} dismissible] ${label} Alert Callout`,
      `> Contextual feedback rendered with \`.alert.theme-${theme}\` and optional inline dismissal.`
    ].join('\n');

    const htmlCode = [
      `<div class="alert theme-${theme}" role="alert">`,
      `  <div class="flex-grow-1">`,
      `    <div class="alert-heading fw-semibold mb-1">${label} Alert Callout</div>`,
      `    <p class="mb-0">Contextual feedback rendered with <code>.alert.theme-${theme}</code>.</p>`,
      `  </div>`,
      `  <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>`,
      `</div>`
    ].join('\n');

    const vmCode = `#bsAlert("${alertTheme}", "<strong>${label} Alert Callout:</strong> Contextual feedback.")`;

    return {
      html,
      tabs: [
        { id: 'md', label: 'Markdown Shorthand', lang: 'markdown', code: mdCode },
        { id: 'html', label: 'Markdown + HTML', lang: 'html', code: htmlCode },
        { id: 'vm', label: 'Velocity Macro (.md.vm)', lang: 'velocity', code: vmCode }
      ]
    };
  }

  if (component === 'badge') {
    const badgeVariant =
      variant === 'outline'
        ? ' badge-outline'
        : variant === 'subtle' || variant === 'text'
          ? ' badge-subtle'
          : '';
    const badgeSize = size === 'lg' ? ' badge-lg' : size === 'sm' || size === 'xs' ? ' badge-sm' : '';
    const badgeCls = `badge${badgeVariant}${badgeSize} theme-${theme}`;
    const pillCls = `badge${badgeVariant}${badgeSize} rounded-pill theme-${theme}`;
    const chipCls = `chip ${variant === 'solid' || variant === 'styled' ? 'active ' : ''}theme-${theme}`;

    const html = `
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="${badgeCls}">${label} Badge</span>
        <span class="${pillCls}">${label} Pill</span>
        <span class="${chipCls}">${theme}-tag</span>
        <span class="avatar avatar-${size === 'md' ? 'sm' : size} theme-${theme}">${theme.slice(0, 2).toUpperCase()}<span class="avatar-status status-online"></span></span>
      </div>
    `;

    const htmlCode = [
      `<span class="${badgeCls}">${label} Badge</span>`,
      `<span class="${pillCls}">${label} Pill</span>`,
      `<span class="${chipCls}">${theme}-tag</span>`,
      `<span class="avatar avatar-${size === 'md' ? 'sm' : size} theme-${theme}">`,
      `  ${theme.slice(0, 2).toUpperCase()}<span class="avatar-status status-online"></span>`,
      `</span>`
    ].join('\n');

    const vmCode = `#bsBadge("${theme}", "${label} Badge")`;

    return {
      html,
      tabs: [
        { id: 'html', label: 'Markdown + HTML', lang: 'html', code: htmlCode },
        { id: 'vm', label: 'Velocity Macro (.md.vm)', lang: 'velocity', code: vmCode }
      ]
    };
  }

  // component === 'card'
  const btnVariant = variant === 'styled' ? 'btn-solid btn-styled' : `btn-${variant}`;
  const btnCls = `btn ${btnVariant} theme-${theme}${sizeClass}`;
  const badgeCls = `badge badge-subtle theme-${theme}`;

  const html = `
    <div class="card" style="max-width: 28rem;">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">${label} Component Card</span>
        <span class="${badgeCls}">theme-${theme}</span>
      </div>
      <div class="card-body">
        <div class="card-title h6 mb-2">Composable Bootstrap 6 Surface</div>
        <p class="card-text text-body-secondary small mb-3">Combine <code>.card</code> containers with <code>.theme-${theme}</code> badges and <code>.${btnVariant}</code> actions inside any Doxia Markdown page.</p>
        <button type="button" class="${btnCls}">Inspect ${label}</button>
      </div>
    </div>
  `;

  const htmlCode = [
    `<div class="card">`,
    `  <div class="card-header d-flex justify-content-between align-items-center">`,
    `    <span class="fw-semibold">${label} Component Card</span>`,
    `    <span class="${badgeCls}">theme-${theme}</span>`,
    `  </div>`,
    `  <div class="card-body">`,
    `    <div class="card-title h6">Composable Bootstrap 6 Surface</div>`,
    `    <p class="card-text text-body-secondary">Combine .card containers with .theme-${theme} actions.</p>`,
    `    <button type="button" class="${btnCls}">Inspect ${label}</button>`,
    `  </div>`,
    `</div>`
  ].join('\n');

  const vmCode = `#bsCard("${label} Component Card", "<p>Combine .card containers with .theme-${theme} actions.</p>")`;

  return {
    html,
    tabs: [
      { id: 'html', label: 'Markdown + HTML', lang: 'html', code: htmlCode },
      { id: 'vm', label: 'Velocity Macro (.md.vm)', lang: 'velocity', code: vmCode }
    ]
  };
}

/**
 * Initializes the interactive Bootstrap 6 Component Playground (`[data-furo-playground]`),
 * inspired by https://getbootstrap.com/docs/6.0/components/button/#playground.
 */
export function initComponentPlayground(root: ParentNode = document): void {
  const playgrounds = Array.from(
    root.querySelectorAll<HTMLElement>('.furo-playground, [data-furo-playground]')
  );
  playgrounds.forEach((pg) => {
    if (pg.hasAttribute('data-furo-playground-ready')) {
      return;
    }
    pg.setAttribute('data-furo-playground-ready', 'true');

    const stageEl = pg.querySelector<HTMLElement>(
      '.furo-playground-stage, [data-playground-stage]'
    );
    const codeEl = pg.querySelector<HTMLElement>(
      '[data-playground-code], .furo-code-block code, pre code'
    );
    if (!stageEl || !codeEl) {
      return;
    }

    const codeBlockEl =
      codeEl.closest<HTMLElement>('.furo-code-block') ??
      codeEl.closest<HTMLElement>('pre') ??
      codeEl;

    const barEl = document.createElement('div');
    barEl.className = 'furo-tab-list furo-playground-bar';
    barEl.setAttribute('role', 'tablist');

    const tabBtnsContainer = document.createElement('div');
    tabBtnsContainer.className = 'd-flex flex-wrap gap-1 align-items-center';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'furo-component-code-toggle ms-auto';
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.innerHTML = `<span class="furo-code-toggle-text">Hide code</span>${CHEVRON_ICON_SVG}`;
    setTooltipTitle(toggleBtn, 'Collapse or expand code snippet', 'top');

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = pg.classList.toggle('is-code-collapsed');
      toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      const labelSpan = toggleBtn.querySelector('.furo-code-toggle-text');
      if (labelSpan) {
        labelSpan.textContent = isCollapsed ? 'Show code' : 'Hide code';
      }
      codeBlockEl.hidden = isCollapsed;
    });

    barEl.appendChild(tabBtnsContainer);
    barEl.appendChild(toggleBtn);
    codeBlockEl.parentNode?.insertBefore(barEl, codeBlockEl);

    const state: PlaygroundState = {
      component: 'button',
      theme: 'primary',
      variant: 'solid',
      size: 'sm',
      syntaxTab: ''
    };

    const updateUI = () => {
      pg.querySelectorAll<HTMLButtonElement>('[data-playground-component]').forEach((btn) => {
        const active = btn.getAttribute('data-playground-component') === state.component;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      pg.querySelectorAll<HTMLButtonElement>('[data-playground-theme]').forEach((btn) => {
        const active = btn.getAttribute('data-playground-theme') === state.theme;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      pg.querySelectorAll<HTMLButtonElement>('[data-playground-variant]').forEach((btn) => {
        const active = btn.getAttribute('data-playground-variant') === state.variant;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      pg.querySelectorAll<HTMLButtonElement>('[data-playground-size]').forEach((btn) => {
        const active = btn.getAttribute('data-playground-size') === state.size;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      const { html, tabs } = renderPlaygroundState(state);
      stageEl.innerHTML = html;

      const activeTab =
        tabs.find((t) => t.id === state.syntaxTab) ?? tabs[0];
      state.syntaxTab = activeTab.id;

      tabBtnsContainer.innerHTML = '';
      tabs.forEach((tab) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `furo-tab-btn${tab.id === activeTab.id ? ' active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', tab.id === activeTab.id ? 'true' : 'false');
        btn.setAttribute('data-playground-syntax', tab.id);
        btn.textContent = tab.label;
        btn.addEventListener('click', () => {
          state.syntaxTab = tab.id;
          if (pg.classList.contains('is-code-collapsed')) {
            pg.classList.remove('is-code-collapsed');
            toggleBtn.setAttribute('aria-expanded', 'true');
            const labelSpan = toggleBtn.querySelector('.furo-code-toggle-text');
            if (labelSpan) {
              labelSpan.textContent = 'Hide code';
            }
            codeBlockEl.hidden = false;
          }
          updateUI();
        });
        tabBtnsContainer.appendChild(btn);
      });

      codeEl.textContent = activeTab.code;
      highlightCodeElement(codeEl, activeTab.lang);
      initTooltips(stageEl);
    };

    pg.querySelectorAll<HTMLButtonElement>('[data-playground-component]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-playground-component') as PlaygroundComponent | null;
        if (val) {
          state.component = val;
          state.syntaxTab = '';
          updateUI();
        }
      });
    });

    pg.querySelectorAll<HTMLButtonElement>('[data-playground-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-playground-theme') as PlaygroundTheme | null;
        if (val) {
          state.theme = val;
          updateUI();
        }
      });
    });

    pg.querySelectorAll<HTMLButtonElement>('[data-playground-variant]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-playground-variant') as PlaygroundVariant | null;
        if (val) {
          state.variant = val;
          updateUI();
        }
      });
    });

    pg.querySelectorAll<HTMLButtonElement>('[data-playground-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-playground-size') as PlaygroundSize | null;
        if (val) {
          state.size = val;
          updateUI();
        }
      });
    });

    updateUI();
  });
}

/**
 * Automatically adds `.not-prose` to Bootstrap 6 component root containers inside
 * `.furo-article` so site authors don't have to manually wrap every component.
 */
export function isolateBootstrapComponentsFromProse(container: ParentNode = document): void {
  const elements = container.querySelectorAll<HTMLElement>(BOOTSTRAP_PROSE_ISOLATION_SELECTORS);
  elements.forEach((el) => {
    if (!el.classList.contains('not-prose')) {
      el.classList.add('not-prose');
    }
  });
}

/**
 * Attaches all 20 Bootstrap 6 JS plugins to `window.bootstrap` and auto-initializes
 * opt-in interactive widgets (`Tooltip`, `Popover`, `Toast`, `Combobox`, `Datepicker`,
 * `Chips`, `OtpInput`, `Range`, `Strength`, `NavOverflow`, `Carousel`).
 */
export function initBootstrapComponents(root: ParentNode = document): void {
  if (typeof window !== 'undefined') {
    window.bootstrap = BootstrapPlugins;
  }

  isolateBootstrapComponentsFromProse(root);
  initComponentExamples(root);
  initComponentPlayground(root);

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

  // 3. Toasts & declarative toast triggers ([data-furo-toast-target="#toastId"])
  root.querySelectorAll<HTMLElement>('.toast').forEach((el) => {
    try {
      Toast.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  root.querySelectorAll<HTMLElement>('[data-furo-toast-target]').forEach((trigger) => {
    if (trigger.hasAttribute('data-furo-toast-bound')) {
      return;
    }
    trigger.setAttribute('data-furo-toast-bound', 'true');
    trigger.addEventListener('click', () => {
      const selector = trigger.getAttribute('data-furo-toast-target');
      if (!selector) return;
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

  // 4. Comboboxes: [data-bs-toggle="combobox"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="combobox"]').forEach((el) => {
    try {
      Combobox.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 5. Datepickers: [data-bs-toggle="datepicker"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="datepicker"]').forEach((el) => {
    try {
      Datepicker.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 6. Chips input: [data-bs-chips], .chip-input
  root.querySelectorAll<HTMLElement>('[data-bs-chips], .chip-input').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-chips')) {
        el.setAttribute('data-bs-chips', '');
      }
      Chips.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 7. OTP inputs: [data-bs-otp], .otp
  root.querySelectorAll<HTMLElement>('[data-bs-otp], .otp').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-otp')) {
        el.setAttribute('data-bs-otp', '');
      }
      OtpInput.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 8. Range sliders: .form-range
  root.querySelectorAll<HTMLElement>('.form-range').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-bubble')) {
        el.setAttribute('data-bs-bubble', 'true');
      }
      Range.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 9. Password / token strength meters: [data-bs-strength], .strength
  root.querySelectorAll<HTMLElement>('[data-bs-strength], .strength').forEach((el) => {
    try {
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
    } catch {
      // Ignore
    }
  });

  // 10. Overflowing horizontal navigation bars: .nav-overflow
  root.querySelectorAll<HTMLElement>('.nav-overflow').forEach((el) => {
    try {
      NavOverflow.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 11. Carousels: [data-bs-ride="carousel"], .carousel
  root.querySelectorAll<HTMLElement>('[data-bs-ride="carousel"], .carousel').forEach((el) => {
    try {
      Carousel.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });
}

export {
  Alert,
  Button,
  Carousel,
  Chips,
  Collapse,
  Combobox,
  Datepicker,
  Dialog,
  Drawer,
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
  Strength,
  Tab,
  Toast,
  Toggler,
  Tooltip
};
