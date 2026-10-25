/**
 * @fileoverview Unit test suite for Supa Maven Skin frontend TypeScript modules.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BootstrapPlugins,
  Combobox,
  initBootstrapComponents,
  initComponentExamples,
  initComponentPlayground,
  isolateBootstrapComponentsFromProse,
  Menu,
  Tooltip
} from '../../main/frontend/ts/bootstrap-components';
import { enhanceCodeBlocks } from '../../main/frontend/ts/code';
import {
  ADMONITION_META,
  type AdmonitionType,
  initBootstrapAccordions,
  initBootstrapSteppers,
  initContentTabs,
  normalizeDoxiaTables,
  TAB_SYNC_STORAGE_KEY,
  transformBootstrapIcons,
  transformGfmAdmonitions
} from '../../main/frontend/ts/doxia';
import { Drawer, initDrawers } from '../../main/frontend/ts/index';
import {
  collectLocalSearchDocuments,
  filterSearchDocuments,
  highlightQueryTerms
} from '../../main/frontend/ts/search';
import {
  applyPalette,
  applyThemeMode,
  cycleThemeMode,
  getStoredPalette,
  getStoredThemeMode,
  initTheme,
  PALETTE_STORAGE_KEY,
  THEME_STORAGE_KEY
} from '../../main/frontend/ts/theme';
import {
  buildTableOfContents,
  getStickyContentHeaderOffset,
  prepareHeadings,
  slugifyHeading
} from '../../main/frontend/ts/toc';

describe('Supa Maven Skin Frontend Modules', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      }
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true
    });

    document.documentElement.removeAttribute('data-bs-theme');
    document.documentElement.removeAttribute('data-supa-theme-mode');
    document.documentElement.removeAttribute('data-supa-resolved-theme');
    document.documentElement.removeAttribute('data-supa-palette');
    document.documentElement.removeAttribute('data-supa-palette-locked');
    document.body.innerHTML = '';
  });

  describe('Theme & Accessible Color Scheme Controller', () => {
    it('applies explicit light, dark, and auto themes via mutually exclusive .supa-theme-toggle menu items', () => {
      document.body.innerHTML = `
        <div class="supa-theme-toggle">
          <button type="button" class="supa-icon-btn supa-theme-toggle-btn" data-bs-toggle="menu" data-supa-theme-trigger="true">
            <i class="bi bi-sun supa-theme-icon supa-theme-icon-light" aria-hidden="true"></i>
            <i class="bi bi-moon-stars supa-theme-icon supa-theme-icon-dark" aria-hidden="true"></i>
            <i class="bi bi-circle-half supa-theme-icon supa-theme-icon-auto" aria-hidden="true"></i>
          </button>
          <div class="menu supa-theme-menu" role="menu">
            <button type="button" class="menu-item" role="menuitemradio" aria-checked="false" data-supa-theme-option="light">
              <i class="bi bi-sun menu-item-icon" aria-hidden="true"></i>
              <span>Light</span>
              <i class="bi bi-check2 menu-item-check" aria-hidden="true"></i>
            </button>
            <button type="button" class="menu-item" role="menuitemradio" aria-checked="false" data-supa-theme-option="dark">
              <i class="bi bi-moon-stars menu-item-icon" aria-hidden="true"></i>
              <span>Dark</span>
              <i class="bi bi-check2 menu-item-check" aria-hidden="true"></i>
            </button>
            <button type="button" class="menu-item selected" role="menuitemradio" aria-checked="true" data-supa-theme-option="auto">
              <i class="bi bi-circle-half menu-item-icon" aria-hidden="true"></i>
              <span>Auto</span>
              <i class="bi bi-check2 menu-item-check" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      `;

      initTheme();

      const lightOption = document.querySelector<HTMLButtonElement>('[data-supa-theme-option="light"]')!;
      const darkOption = document.querySelector<HTMLButtonElement>('[data-supa-theme-option="dark"]')!;
      const autoOption = document.querySelector<HTMLButtonElement>('[data-supa-theme-option="auto"]')!;

      lightOption.click();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-supa-theme-mode')).toBe('light');
      expect(getStoredThemeMode()).toBe('light');
      expect(lightOption.classList.contains('selected')).toBe(true);
      expect(lightOption.getAttribute('aria-checked')).toBe('true');
      expect(darkOption.classList.contains('selected')).toBe(false);
      expect(autoOption.classList.contains('selected')).toBe(false);

      darkOption.click();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(darkOption.classList.contains('selected')).toBe(true);
      expect(darkOption.getAttribute('aria-checked')).toBe('true');
      expect(lightOption.classList.contains('selected')).toBe(false);

      autoOption.click();
      expect(document.documentElement.hasAttribute('data-bs-theme')).toBe(false);
      expect(document.documentElement.getAttribute('data-supa-theme-mode')).toBe('auto');
      expect(autoOption.classList.contains('selected')).toBe(true);
      expect(autoOption.getAttribute('aria-checked')).toBe('true');
      expect(darkOption.classList.contains('selected')).toBe(false);

      applyThemeMode('light');
      const next = cycleThemeMode();
      expect(next).toBe('dark');
    });

    it('applies and persists all 6 accessible color schemes and syncs menu options, labels & preview cards', () => {
      document.body.innerHTML = `
        <div class="supa-palette-picker">
          <button type="button" class="supa-palette-btn" data-bs-toggle="menu">
            <span data-supa-palette-label="true">Furo (AA)</span>
          </button>
          <div class="menu supa-palette-menu">
            <button type="button" class="menu-item selected" data-supa-palette-option="furo"></button>
            <button type="button" class="menu-item" data-supa-palette-option="bootstrap"></button>
            <button type="button" class="menu-item" data-supa-palette-option="modus"></button>
            <button type="button" class="menu-item" data-supa-palette-option="modus-tinted"></button>
            <button type="button" class="menu-item" data-supa-palette-option="modus-deuteranopia"></button>
            <button type="button" class="menu-item" data-supa-palette-option="modus-tritanopia"></button>
          </div>
        </div>
        <button type="button" data-supa-palette-card="furo"></button>
        <button type="button" data-supa-palette-card="modus-deuteranopia"></button>
      `;

      initTheme();
      expect(document.documentElement.getAttribute('data-supa-palette')).toBe('furo');

      applyPalette('modus');
      expect(document.documentElement.getAttribute('data-supa-palette')).toBe('modus');
      expect(document.documentElement.getAttribute('data-supa-palette-locked')).toBe('true');
      expect(getStoredPalette()).toBe('modus');
      expect(window.localStorage.getItem(PALETTE_STORAGE_KEY)).toBe('modus');

      const labelEl = document.querySelector<HTMLElement>('[data-supa-palette-label]')!;
      expect(labelEl.textContent).toBe('Modus (AAA)');

      const modusOption = document.querySelector<HTMLButtonElement>(
        '[data-supa-palette-option="modus"]'
      )!;
      expect(modusOption.classList.contains('selected')).toBe(true);
      expect(modusOption.getAttribute('aria-checked')).toBe('true');

      const tritOption = document.querySelector<HTMLButtonElement>(
        '[data-supa-palette-option="modus-tritanopia"]'
      )!;
      tritOption.click();
      expect(document.documentElement.getAttribute('data-supa-palette')).toBe('modus-tritanopia');
      expect(labelEl.textContent).toBe('Modus Tritanopia (AAA)');
      expect(tritOption.classList.contains('selected')).toBe(true);

      const deutCard = document.querySelector<HTMLButtonElement>(
        '[data-supa-palette-card="modus-deuteranopia"]'
      )!;
      deutCard.click();
      expect(document.documentElement.getAttribute('data-supa-palette')).toBe('modus-deuteranopia');
      expect(labelEl.textContent).toBe('Modus Deuteranopia (AAA)');
      expect(deutCard.classList.contains('is-active')).toBe(true);
      expect(deutCard.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Doxia HTML Normalization, GFM Admonitions & Synchronized Content Tabs', () => {
    it('normalizes Doxia bodyTable into responsive Bootstrap 6 table and classifies compact vs prose columns', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <table class="bodyTable bodyTableBorder" id="reportTable">
          <thead><tr><th>Goal</th><th>Phase</th></tr></thead>
          <tbody><tr><td>site</td><td>site</td></tr></tbody>
        </table>
        <table class="bodyTable" id="configTable">
          <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr>
              <td><code>&lt;sidebarDrawerBackdrop&gt;</code></td>
              <td><code>$drawerBackdrop</code></td>
              <td>Override data-bs-backdrop (true, false, or static) specifically for the left navigation drawer.</td>
            </tr>
          </tbody>
        </table>
      `;
      normalizeDoxiaTables(container);

      const reportTable = container.querySelector<HTMLTableElement>('#reportTable')!;
      expect(reportTable.classList.contains('bodyTable')).toBe(false);
      expect(reportTable.classList.contains('table')).toBe(true);
      expect(reportTable.parentElement?.classList.contains('supa-table-responsive')).toBe(true);
      expect(reportTable.querySelectorAll('.supa-table-col-prose').length).toBe(0);

      const configTable = container.querySelector<HTMLTableElement>('#configTable')!;
      const configTds = configTable.querySelectorAll('tbody td');
      expect(configTds[0].classList.contains('supa-table-col-compact')).toBe(true);
      expect(configTds[1].classList.contains('supa-table-col-compact')).toBe(true);
      expect(configTds[2].classList.contains('supa-table-col-prose')).toBe(true);
    });

    it('transforms all 12 Furo admonition types with Bootstrap Icons, custom titles, nested admonitions, and Bootstrap 6 alerts', () => {
      const expectedTypes: AdmonitionType[] = [
        'admonition',
        'attention',
        'caution',
        'danger',
        'error',
        'hint',
        'important',
        'note',
        'seealso',
        'tip',
        'todo',
        'warning'
      ];
      expect(Object.keys(ADMONITION_META).sort()).toEqual([...expectedTypes].sort());

      const container = document.createElement('div');
      container.innerHTML = [
        ...expectedTypes.map(
          (type) => `
          <blockquote>
            <p>[!${type.toUpperCase()}]\nBody for ${type}.</p>
          </blockquote>`
        ),
        `<blockquote>
          <p>[!TIP] Custom Performance Tip\nUse frontend-maven-plugin with Vite.</p>
        </blockquote>`,
        `<blockquote>
          <p>[!SEE-ALSO]\nHyphenated see-also alias.</p>
        </blockquote>`,
        `<blockquote>
          <p>[!NOTE]\nOuter note admonition.</p>
          <blockquote>
            <p>[!WARNING]\nNested warning admonition.</p>
          </blockquote>
        </blockquote>`,
        `<blockquote>
          <p>[!ALERT:primary dismissible] Release Ready\nBootstrap 6 support is active.</p>
        </blockquote>`
      ].join('\n');

      transformGfmAdmonitions(container);

      const admonitions = container.querySelectorAll('.supa-admonition');
      expect(admonitions.length).toBe(16);

      expectedTypes.forEach((type, idx) => {
        const meta = ADMONITION_META[type];
        const el = admonitions[idx];
        expect(el.classList.contains(`admonition-${type}`)).toBe(true);
        expect(el.querySelector('.supa-admonition-title span')?.textContent).toBe(
          meta.defaultTitle
        );
        const iconEl = el.querySelector<HTMLElement>('.supa-admonition-title i.bi')!;
        expect(iconEl).not.toBeNull();
        expect(iconEl.classList.contains(meta.iconClass)).toBe(true);
        expect(iconEl.classList.contains('supa-admonition-icon')).toBe(true);
        expect(iconEl.getAttribute('aria-hidden')).toBe('true');
        expect(el.querySelector('.supa-admonition-body')?.textContent?.trim()).toBe(
          `Body for ${type}.`
        );
      });

      // Custom title on [!TIP]
      expect(admonitions[12].classList.contains('admonition-tip')).toBe(true);
      expect(admonitions[12].querySelector('.supa-admonition-title span')?.textContent).toBe(
        'Custom Performance Tip'
      );

      // [!SEE-ALSO] alias maps to .admonition-seealso
      expect(admonitions[13].classList.contains('admonition-seealso')).toBe(true);
      expect(admonitions[13].querySelector('.supa-admonition-title span')?.textContent).toBe(
        'See also'
      );

      // Nested admonition inside outer note
      const outerNote = admonitions[14];
      expect(outerNote.classList.contains('admonition-note')).toBe(true);
      const nestedWarning = outerNote.querySelector('.supa-admonition.admonition-warning');
      expect(nestedWarning).not.toBeNull();
      expect(nestedWarning?.querySelector('.supa-admonition-title i.bi')?.classList.contains('bi-exclamation-triangle')).toBe(true);

      const bsAlert = container.querySelector('.alert.theme-primary');
      expect(bsAlert).not.toBeNull();
      expect(bsAlert?.classList.contains('not-prose')).toBe(true);
      expect(bsAlert?.querySelector('.alert-heading')?.textContent).toBe('Release Ready');
      expect(bsAlert?.querySelector('[data-bs-dismiss="alert"]')).not.toBeNull();
    });

    it('transforms .supa-tabs into synchronized ARIA tablists persisted in localStorage', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-tabs" data-tab-group="lang">
          <div data-tab="Java">Java code</div>
          <div data-tab="Kotlin">Kotlin code</div>
        </div>
        <div class="supa-tabs" data-tab-group="lang">
          <div data-tab="Java">Second Java</div>
          <div data-tab="Kotlin">Second Kotlin</div>
        </div>
      `;

      initContentTabs(container);

      const tabButtons = container.querySelectorAll<HTMLButtonElement>('.supa-tab-btn');
      expect(tabButtons.length).toBe(4);
      expect(tabButtons[0].classList.contains('active')).toBe(true);

      // Click Kotlin in first tab group -> should sync second tab group and persist
      tabButtons[1].click();
      expect(tabButtons[1].classList.contains('active')).toBe(true);
      expect(tabButtons[3].classList.contains('active')).toBe(true);
      expect(window.localStorage.getItem(TAB_SYNC_STORAGE_KEY)).toContain('Kotlin');
    });

    it('transforms .supa-accordion and .supa-stepper shorthands into Bootstrap 6 components', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-accordion">
          <div title="First Question" class="open"><p>First Answer</p></div>
          <div title="Second Question"><p>Second Answer</p></div>
        </div>
        <ol class="supa-stepper" title="2">
          <li>Step One</li>
          <li>Step Two</li>
          <li>Step Three</li>
        </ol>
      `;

      initBootstrapAccordions(container);
      initBootstrapSteppers(container);

      const accItems = container.querySelectorAll<HTMLDetailsElement>('details.accordion-item');
      expect(accItems.length).toBe(2);
      expect(accItems[0].querySelector('summary.accordion-header span')?.textContent).toBe(
        'First Question'
      );
      expect(accItems[0].open).toBe(true);
      expect(accItems[1].open).toBe(false);

      const stepperItems = container.querySelectorAll('.stepper-item');
      expect(stepperItems.length).toBe(3);
      expect(stepperItems[0].classList.contains('active')).toBe(true);
      expect(stepperItems[1].classList.contains('active')).toBe(true);
      expect(stepperItems[2].classList.contains('active')).toBe(false);
    });

    it('transforms :bi-...: Markdown shortcodes into <i class="bi bi-..."> while preserving <code> and <pre>', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Launch :bi-rocket-takeoff: and verify :bi-check-circle-fill text-success fs-5: status.</p>
        <p>Inline code <code>:bi-rocket-takeoff:</code> and <pre>:bi-github:</pre> stay untouched.</p>
      `;

      transformBootstrapIcons(container);

      const icons = container.querySelectorAll('i.bi');
      expect(icons.length).toBe(2);
      expect(icons[0].className).toBe('bi bi-rocket-takeoff');
      expect(icons[0].getAttribute('aria-hidden')).toBe('true');
      expect(icons[1].className).toBe('bi bi-check-circle-fill text-success fs-5');
      expect(container.querySelector('code')?.textContent).toBe(':bi-rocket-takeoff:');
      expect(container.querySelector('pre')?.textContent).toBe(':bi-github:');
    });
  });

  describe('Bootstrap 6 Plugins, Drawers & .prose Isolation', () => {
    it('exports all 20 Bootstrap 6 JS plugins on window.bootstrap and isolates components from .prose', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="card"><div class="card-body">Card</div></div>
        <ul class="nav nav-pills"><li class="nav-item"><a class="nav-link active">Tab</a></li></ul>
        <div class="chip-input" data-bs-chips="true"><span class="chip">tag</span><input type="text" class="form-ghost" /></div>
      `;

      isolateBootstrapComponentsFromProse(container);
      initBootstrapComponents(container);

      expect(Object.keys(BootstrapPlugins).length).toBe(20);
      expect(window.bootstrap).toBeDefined();
      expect(window.bootstrap?.Dialog).toBeDefined();
      expect(window.bootstrap?.Combobox).toBeDefined();
      expect(window.bootstrap?.Datepicker).toBeDefined();
      expect(window.bootstrap?.Chips).toBeDefined();
      expect(window.bootstrap?.Menu).toBeDefined();
      expect(container.querySelector('.card')?.classList.contains('not-prose')).toBe(true);
      expect(container.querySelector('.nav')?.classList.contains('not-prose')).toBe(true);
      expect(container.querySelector('.chip-input')?.classList.contains('not-prose')).toBe(true);
    });

    it('initializes Combobox and internal Menu on the same toggle element without Data.set console errors', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const container = document.createElement('div');
        container.innerHTML = `
          <div class="dropdown">
            <button type="button" class="form-control combobox-toggle" data-bs-toggle="combobox" aria-expanded="false">
              <span class="combobox-value">Apache Maven 3.9+</span>
            </button>
            <div class="menu w-100">
              <div class="combobox-search">
                <input type="text" class="form-control form-control-sm combobox-search-input" />
              </div>
              <button type="button" class="menu-item selected" data-bs-value="maven">Apache Maven 3.9+</button>
              <button type="button" class="menu-item" data-bs-value="maven4">Apache Maven 4.0</button>
            </div>
          </div>
        `;
        document.body.appendChild(container);

        initBootstrapComponents(container);

        const toggleBtn = container.querySelector<HTMLElement>('[data-bs-toggle="combobox"]')!;
        expect(errorSpy).not.toHaveBeenCalled();
        expect(Combobox.getInstance(toggleBtn)).not.toBeNull();
        expect(Menu.getInstance(toggleBtn)).not.toBeNull();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('pairs .supa-component-preview with code blocks or .supa-tabs into .supa-component-example and powers [data-supa-playground]', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-playground" data-supa-playground="true">
          <button type="button" class="supa-playground-pill active" data-playground-component="button"></button>
          <button type="button" class="supa-playground-pill" data-playground-component="alert"></button>
          <button type="button" class="supa-playground-pill active" data-playground-theme="primary"></button>
          <button type="button" class="supa-playground-pill" data-playground-theme="success"></button>
          <button type="button" class="supa-playground-pill active" data-playground-variant="solid"></button>
          <button type="button" class="supa-playground-pill" data-playground-variant="outline"></button>
          <button type="button" class="supa-playground-pill active" data-playground-size="sm"></button>
          <button type="button" class="supa-playground-pill" data-playground-size="lg"></button>
          <div class="supa-playground-stage" data-playground-stage="true"></div>
          <pre><code class="language-html" data-playground-code="true"></code></pre>
        </div>
        <div class="supa-component-preview"><button class="btn theme-primary">Demo</button></div>
        <pre><code class="language-html">&lt;button class="btn theme-primary"&gt;Demo&lt;/button&gt;</code></pre>
        <div class="supa-component-preview"><span class="badge theme-primary">v1.0.0</span></div>
        <div class="supa-tabs" title="badge-syntax">
          <div title="Markdown + HTML"><pre><code class="language-html">&lt;span class="badge theme-primary"&gt;v1.0.0&lt;/span&gt;</code></pre></div>
          <div title="Velocity Macro (.md.vm)"><pre><code class="language-velocity">#bsBadge("primary", "v1.0.0")</code></pre></div>
        </div>
      `;

      initContentTabs(container);
      enhanceCodeBlocks(container, true, true);
      initComponentExamples(container);
      initComponentPlayground(container);

      const examples = container.querySelectorAll<HTMLElement>('.supa-component-example');
      expect(examples.length).toBe(2);

      // Single code block example
      const example = examples[0];
      const toggleBtn = example.querySelector<HTMLButtonElement>('.supa-component-code-toggle')!;
      const codeBlock = example.querySelector<HTMLElement>('.supa-code-block')!;
      expect(toggleBtn).not.toBeNull();
      expect(codeBlock.hidden).toBe(false);

      toggleBtn.click();
      expect(codeBlock.hidden).toBe(true);
      expect(example.classList.contains('is-code-collapsed')).toBe(true);

      toggleBtn.click();
      expect(codeBlock.hidden).toBe(false);

      // Multi-tab (.supa-tabs) example
      const tabbedExample = examples[1];
      const tabbedToggleBtn = tabbedExample.querySelector<HTMLButtonElement>(
        '.supa-tab-list .supa-component-code-toggle'
      )!;
      const tabPanels = tabbedExample.querySelectorAll<HTMLElement>('.supa-tab-panel');
      const tabBtns = tabbedExample.querySelectorAll<HTMLButtonElement>('.supa-tab-btn');
      expect(tabbedToggleBtn).not.toBeNull();
      expect(tabPanels.length).toBe(2);
      expect(tabPanels[0].hidden).toBe(false);
      expect(tabPanels[1].hidden).toBe(true);

      // Collapse tabbed code panels
      tabbedToggleBtn.click();
      expect(tabbedExample.classList.contains('is-code-collapsed')).toBe(true);
      expect(tabPanels[0].hidden).toBe(true);
      expect(tabPanels[1].hidden).toBe(true);

      // Clicking a tab button while collapsed should auto-expand and show that tab
      tabBtns[1].click();
      expect(tabbedExample.classList.contains('is-code-collapsed')).toBe(false);
      expect(tabPanels[0].hidden).toBe(true);
      expect(tabPanels[1].hidden).toBe(false);

      const stage = container.querySelector<HTMLElement>('[data-playground-stage]')!;
      const pgCode = container.querySelector<HTMLElement>('[data-playground-code]')!;
      expect(stage.querySelector('.btn.btn-solid.theme-primary.btn-sm')).not.toBeNull();

      container.querySelector<HTMLButtonElement>('[data-playground-theme="success"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-playground-variant="outline"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-playground-size="lg"]')!.click();
      expect(stage.querySelector('.btn.btn-outline.theme-success.btn-lg')).not.toBeNull();
      expect(pgCode.textContent).toContain('btn-outline theme-success btn-lg');

      container.querySelector<HTMLButtonElement>('[data-playground-component="alert"]')!.click();
      expect(stage.querySelector('.alert.theme-success')).not.toBeNull();
      expect(pgCode.textContent).toContain('[!ALERT:success dismissible]');

      // Switch syntax tab inside playground (Markdown Shorthand -> Velocity Macro)
      const pgVmTab = container.querySelector<HTMLButtonElement>('[data-playground-syntax="vm"]')!;
      expect(pgVmTab).not.toBeNull();
      pgVmTab.click();
      expect(pgCode.textContent).toContain('#bsAlert("success"');
    });

    it('prefers Bootstrap 6 Tooltips over built-in browser title attributes across controls and content', () => {
      document.body.innerHTML = `
        <div class="supa-theme-toggle">
          <button type="button" class="supa-icon-btn supa-theme-toggle-btn" data-bs-toggle="menu" data-supa-theme-trigger="true"></button>
        </div>
        <div class="supa-palette-picker">
          <button type="button" class="supa-palette-btn" data-bs-toggle="menu"></button>
        </div>
        <main id="supa-main-content">
          <h2>Section Heading</h2>
          <pre><code class="language-xml">&lt;skin/&gt;</code></pre>
          <span class="avatar" title="Lead Maintainer">MC</span>
          <a href="https://github.com" class="supa-footer-icon-link" title="GitHub Repository">GH</a>
        </main>
      `;

      const article = document.getElementById('supa-main-content')!;
      initTheme();
      prepareHeadings(article, true, '#');
      enhanceCodeBlocks(article, true, true);
      initBootstrapComponents(document);

      // No visible element in body should retain a native browser `title` attribute
      expect(document.body.querySelectorAll('[title]').length).toBe(0);

      const themeBtn = document.querySelector<HTMLElement>('.supa-theme-toggle-btn')!;
      const paletteBtn = document.querySelector<HTMLElement>('.supa-palette-btn')!;
      const permalink = article.querySelector<HTMLElement>('.supa-headerlink')!;
      const copyBtn = article.querySelector<HTMLElement>('.supa-copy-btn')!;
      const avatar = article.querySelector<HTMLElement>('.avatar')!;
      const ghLink = article.querySelector<HTMLElement>('.supa-footer-icon-link')!;

      expect(themeBtn.getAttribute('data-bs-toggle')).toBe('menu');
      expect(themeBtn.getAttribute('data-bs-title')).toContain('Color theme:');
      expect(Tooltip.getInstance(themeBtn)).not.toBeNull();

      expect(paletteBtn.getAttribute('data-bs-toggle')).toBe('menu');
      expect(paletteBtn.getAttribute('data-bs-title')).toContain('Accessible color scheme:');
      expect(Tooltip.getInstance(paletteBtn)).not.toBeNull();

      expect(permalink.getAttribute('data-bs-toggle')).toBe('tooltip');
      expect(permalink.getAttribute('data-bs-title')).toBe('Copy permalink to this heading');
      expect(Tooltip.getInstance(permalink)).not.toBeNull();

      expect(copyBtn.getAttribute('data-bs-toggle')).toBe('tooltip');
      expect(copyBtn.getAttribute('data-bs-title')).toBe('Copy code');
      expect(Tooltip.getInstance(copyBtn)).not.toBeNull();

      expect(avatar.getAttribute('data-bs-toggle')).toBe('tooltip');
      expect(avatar.getAttribute('data-bs-title')).toBe('Lead Maintainer');
      expect(Tooltip.getInstance(avatar)).not.toBeNull();

      expect(ghLink.getAttribute('data-bs-toggle')).toBe('tooltip');
      expect(ghLink.getAttribute('data-bs-title')).toBe('GitHub Repository');
      expect(Tooltip.getInstance(ghLink)).not.toBeNull();
    });

    it('configures left #supaSidebarDrawer (.drawer-start) and right #supaTocDrawer (.drawer-end) with body scrolling and backdrop options', () => {
      document.body.innerHTML = `
        <dialog class="lg:drawer drawer-start supa-sidebar-drawer"
                id="supaSidebarDrawer"
                data-bs-scroll="true"
                data-bs-backdrop="false"
                tabindex="-1"></dialog>
        <dialog class="xl:drawer drawer-end supa-toc-drawer"
                id="supaTocDrawer"
                data-bs-scroll="false"
                data-bs-backdrop="static"
                tabindex="-1"></dialog>
      `;

      initDrawers();

      const sidebarDrawer = document.getElementById('supaSidebarDrawer')!;
      const tocDrawer = document.getElementById('supaTocDrawer')!;

      expect(sidebarDrawer.classList.contains('drawer-start')).toBe(true);
      expect(sidebarDrawer.classList.contains('drawer-sheet')).toBe(false);
      expect(tocDrawer.classList.contains('drawer-end')).toBe(true);
      expect(tocDrawer.classList.contains('drawer-sheet')).toBe(false);

      const sidebarInstance = Drawer.getInstance(sidebarDrawer) as unknown as {
        _config: { scroll: boolean; backdrop: boolean | string };
        _getShowOptions: () => { modal: boolean; preventBodyScroll: boolean };
      };
      const tocInstance = Drawer.getInstance(tocDrawer) as unknown as {
        _config: { scroll: boolean; backdrop: boolean | string };
        _getShowOptions: () => { modal: boolean; preventBodyScroll: boolean };
      };

      expect(sidebarInstance._config.scroll).toBe(true);
      expect(sidebarInstance._config.backdrop).toBe(false);
      expect(sidebarInstance._getShowOptions()).toEqual({
        modal: false,
        preventBodyScroll: false
      });

      expect(tocInstance._config.scroll).toBe(false);
      expect(tocInstance._config.backdrop).toBe('static');
      expect(tocInstance._getShowOptions()).toEqual({
        modal: true,
        preventBodyScroll: true
      });
    });
  });

  describe('Headings, Permalinks, and Table of Contents', () => {
    it('measures the sticky content header offset only when <stickyContentHeader> is enabled and pinned', () => {
      document.body.className = 'supa-body';
      document.body.innerHTML = '<div class="supa-content-header not-prose"></div>';
      const header = document.querySelector<HTMLElement>('.supa-content-header')!;
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 56.4 } as DOMRect);

      expect(getStickyContentHeaderOffset()).toBe(0);

      document.body.classList.add('supa-sticky-content-header');
      header.style.position = 'static';
      expect(getStickyContentHeaderOffset()).toBe(0);

      header.style.position = 'sticky';
      expect(getStickyContentHeaderOffset()).toBe(57);

      header.remove();
      expect(getStickyContentHeaderOffset()).toBe(0);
      document.body.className = '';
    });

    it('slugifies headings, adds permalink anchors, and builds TOC nav links', () => {
      expect(slugifyHeading('Getting Started with Furo!')).toBe('getting-started-with-furo');

      document.body.innerHTML = `
        <nav class="supa-sidebar-tree">
          <a class="supa-nav-link" href="#getting-started">Getting Started</a>
          <a class="supa-nav-link" href="#1-actions-buttons">1. Actions &amp; Buttons</a>
        </nav>
        <main id="supa-main-content">
          <h1>Page Title</h1>
          <a id="Getting_Started"></a><h2>Getting Started</h2>
          <h3>Installation</h3>
          <a id="a1._Actions_.26_Buttons"></a><h2>1. Actions &amp; Buttons</h2>
          <h2>Getting Started</h2>
        </main>
        <aside class="supa-toc-column">
          <nav id="supaTocNav"></nav>
        </aside>
      `;

      const article = document.getElementById('supa-main-content')!;
      const tocNav = document.getElementById('supaTocNav')!;

      prepareHeadings(article, true, '#');
      buildTableOfContents(article, tocNav, 4);

      const h2s = article.querySelectorAll('h2');
      expect(h2s[0].id).toBe('getting-started');
      expect(h2s[0].getAttribute('data-doxia-id')).toBe('Getting_Started');
      expect(h2s[1].id).toBe('1-actions-buttons');
      expect(h2s[1].getAttribute('data-doxia-id')).toBe('a1._Actions_.26_Buttons');
      expect(h2s[2].id).toBe('getting-started-2');
      expect(h2s[1].querySelector('.supa-headerlink')?.getAttribute('href')).toBe(
        '#1-actions-buttons'
      );

      const tocLinks = tocNav.querySelectorAll('a.nav-link');
      expect(tocLinks.length).toBe(4);
      expect(tocLinks[0].textContent).toBe('Getting Started');
      expect(tocLinks[1].classList.contains('supa-toc-level-3')).toBe(true);
      expect(tocLinks[2].getAttribute('href')).toBe('#1-actions-buttons');
    });
  });

  describe('Code Block Highlighting, Language Pill, and Copy Button', () => {
    it('wraps pre elements, applies Highlight.js (including unified diff additions/deletions), renders language pill, and adds copy button', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <pre><code class="language-xml">&lt;skin&gt;&lt;/skin&gt;</code></pre>
        <pre><code class="language-diff"> &lt;skin&gt;\n-  &lt;artifactId&gt;maven-fluido-skin&lt;/artifactId&gt;\n+  &lt;artifactId&gt;supa-maven-skin&lt;/artifactId&gt;\n &lt;/skin&gt;</code></pre>
      `;

      enhanceCodeBlocks(container, true, true);

      const wrappers = container.querySelectorAll('.supa-code-block');
      expect(wrappers.length).toBe(2);
      expect(wrappers[0].querySelector('code')?.classList.contains('hljs')).toBe(true);
      expect(wrappers[0].querySelector('.supa-code-lang')?.textContent).toBe('xml');
      expect(wrappers[0].querySelector('.supa-copy-btn')).not.toBeNull();

      expect(wrappers[1].querySelector('.supa-code-lang')?.textContent).toBe('diff');
      expect(wrappers[1].querySelector('.hljs-deletion')).not.toBeNull();
      expect(wrappers[1].querySelector('.hljs-addition')).not.toBeNull();
    });

    it('uses .hljs.language-plaintext for all license <pre> blocks in Project Licenses and preserves Doxia verbatimLink <pre><a ...> without unescaped HTML warnings', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const container = document.createElement('div');
        container.innerHTML = `
          <section><a id="Overview"></a><h1>Overview</h1></section>
          <section><a id="Project_Licenses"></a>
            <h1>Project Licenses</h1>
            <section><a id="MIT_License"></a>
              <h2>MIT License</h2>
              <pre>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE.</pre>
            </section>
            <section><a id="Apache_License"></a>
              <h2>Apache License, Version 2.0</h2>
              <pre>Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS.</pre>
            </section>
          </section>
          <section><a id="Access"></a>
            <h1>Access</h1>
            <pre><a class="externalLink" href="https://github.com/mepcotterell/supa-maven-skin/actions">https://github.com/mepcotterell/supa-maven-skin/actions</a></pre>
          </section>
        `;

        enhanceCodeBlocks(container, true, true);

        expect(warnSpy).not.toHaveBeenCalled();

        const pres = container.querySelectorAll('pre');
        expect(pres.length).toBe(3);
        pres.forEach((pre) => {
          expect(pre.classList.contains('hljs')).toBe(true);
          expect(pre.classList.contains('language-plaintext')).toBe(true);
          expect(pre.classList.contains('language-sql')).toBe(false);
        });

        // Verify the clickable <a> link inside the Doxia verbatimLink <pre> is preserved
        const verbatimLink = pres[2].querySelector('a.externalLink');
        expect(verbatimLink).not.toBeNull();
        expect(verbatimLink?.getAttribute('href')).toBe(
          'https://github.com/mepcotterell/supa-maven-skin/actions'
        );
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('Client-Side Search Indexing, Filtering & Highlighting', () => {
    it('collects sidebar and heading documents, ranks query matches, and highlights terms', () => {
      document.body.innerHTML = `
        <nav class="supa-sidebar-tree">
          <div class="supa-nav-group">
            <div class="supa-nav-caption">Guide</div>
            <a class="supa-nav-link" href="config.html">Skin Configuration</a>
          </div>
        </nav>
        <main id="supa-main-content">
          <h2 id="dark-mode">Dark Mode Customization</h2>
          <p>Configure lightCssVariables and darkCssVariables in site.xml.</p>
        </main>
      `;

      const docs = collectLocalSearchDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(2);

      const results = filterSearchDocuments(docs, 'dark');
      expect(results.length).toBe(1);
      expect(results[0].title).toContain('Dark Mode');

      const highlighted = highlightQueryTerms('Dark Mode Customization', 'dark');
      expect(highlighted).toContain('<mark class="supa-search-mark">Dark</mark>');
    });
  });
});
