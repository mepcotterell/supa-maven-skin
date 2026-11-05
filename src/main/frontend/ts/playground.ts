/**
 * @fileoverview Interactive Bootstrap 6 Component Playground (`[data-supa-playground]`).
 *
 * Only showcase pages such as the self-site's `components.html` contain a playground, so it
 * ships as its own chunk (`js/supa-maven-skin-playground.min.js`) that `bootstrap-components.ts`
 * imports only when the page has one. Its imports from the other skin modules resolve to the
 * main bundle, which has always loaded by then.
 */

import {
  CHEVRON_ICON_SVG,
  initTooltips,
  PLAYGROUND_SELECTOR,
  setTooltipTitle
} from './bootstrap-components';
import { highlightCodeElement } from './code';

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

/**
 * Capitalizes the first character of `word`.
 *
 * @param word - String to capitalize.
 * @returns Capitalized string.
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Renders the live HTML preview and syntax code tabs for the given `PlaygroundState`.
 *
 * @param state - Current interactive playground state.
 * @returns Rendered HTML preview and code tabs.
 */
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
 * Initializes every interactive Bootstrap 6 Component Playground (`[data-supa-playground]`)
 * under `root`.
 *
 * @param root - Root node to scan for `.supa-playground` blocks.
 */
export function initComponentPlayground(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(PLAYGROUND_SELECTOR).forEach(initPlayground);
}

/**
 * Initializes one interactive Bootstrap 6 Component Playground, inspired by
 * https://getbootstrap.com/docs/6.0/components/button/#playground. Calling it again on the same
 * element does nothing.
 *
 * @param pg - `.supa-playground` / `[data-supa-playground]` element.
 */
export function initPlayground(pg: HTMLElement): void {
  if (pg.hasAttribute('data-supa-playground-ready')) {
    return;
  }
  pg.setAttribute('data-supa-playground-ready', 'true');

  const stageEl = pg.querySelector<HTMLElement>(
    '.supa-playground-stage, [data-playground-stage]'
  );
  const codeEl = pg.querySelector<HTMLElement>(
    '[data-playground-code], .supa-code-block code, pre code'
  );
  if (!stageEl || !codeEl) {
    return;
  }

  const codeBlockEl =
    codeEl.closest<HTMLElement>('.supa-code-block') ??
    codeEl.closest<HTMLElement>('pre') ??
    codeEl;

  const barEl = document.createElement('div');
  barEl.className = 'supa-tab-list supa-playground-bar';

  // Only the syntax tabs live in the tablist; the sibling "Hide code" toggle is not a tab
  // (axe aria-required-children).
  const tabBtnsContainer = document.createElement('div');
  tabBtnsContainer.className = 'supa-tab-list-tabs d-flex flex-wrap gap-1 align-items-center';
  tabBtnsContainer.setAttribute('role', 'tablist');
  tabBtnsContainer.setAttribute('aria-label', 'Code syntax');

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'supa-component-code-toggle ms-auto';
  toggleBtn.setAttribute('aria-expanded', 'true');
  toggleBtn.innerHTML = `<span class="supa-code-toggle-text">Hide code</span>${CHEVRON_ICON_SVG}`;
  setTooltipTitle(toggleBtn, 'Collapse or expand code snippet', 'top');

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = pg.classList.toggle('is-code-collapsed');
    toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    const labelSpan = toggleBtn.querySelector('.supa-code-toggle-text');
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

  /**
   * Synchronizes the playground control buttons, stage HTML preview, and syntax code block
   * with the current `state`.
   */
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
      btn.className = `supa-tab-btn${tab.id === activeTab.id ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.id === activeTab.id ? 'true' : 'false');
      btn.setAttribute('data-playground-syntax', tab.id);
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        state.syntaxTab = tab.id;
        if (pg.classList.contains('is-code-collapsed')) {
          pg.classList.remove('is-code-collapsed');
          toggleBtn.setAttribute('aria-expanded', 'true');
          const labelSpan = toggleBtn.querySelector('.supa-code-toggle-text');
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
}
