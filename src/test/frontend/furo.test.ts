import { beforeEach, describe, expect, it } from 'vitest';
import {
  BootstrapPlugins,
  initBootstrapComponents,
  isolateBootstrapComponentsFromProse
} from '../../main/frontend/ts/bootstrap-components';
import { enhanceCodeBlocks } from '../../main/frontend/ts/code';
import {
  initBootstrapAccordions,
  initBootstrapSteppers,
  initContentTabs,
  normalizeDoxiaTables,
  TAB_SYNC_STORAGE_KEY,
  transformGfmAdmonitions
} from '../../main/frontend/ts/doxia';
import {
  collectLocalSearchDocuments,
  filterSearchDocuments,
  highlightQueryTerms
} from '../../main/frontend/ts/search';
import {
  applyThemeMode,
  cycleThemeMode,
  getStoredThemeMode,
  THEME_STORAGE_KEY
} from '../../main/frontend/ts/theme';
import { buildTableOfContents, prepareHeadings, slugifyHeading } from '../../main/frontend/ts/toc';

describe('Maven Furo Skin Frontend Modules', () => {
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
    document.documentElement.removeAttribute('data-furo-theme-mode');
    document.documentElement.removeAttribute('data-furo-resolved-theme');
    document.body.innerHTML = '';
  });

  describe('Theme Manager (Light / Dark / Auto)', () => {
    it('applies explicit light and dark themes and removes data-bs-theme in auto mode', () => {
      document.body.innerHTML = `<button data-furo-theme-toggle="true"></button>`;

      applyThemeMode('light');
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-furo-theme-mode')).toBe('light');
      expect(getStoredThemeMode()).toBe('light');

      const next1 = cycleThemeMode();
      expect(next1).toBe('dark');
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

      const next2 = cycleThemeMode();
      expect(next2).toBe('auto');
      expect(document.documentElement.hasAttribute('data-bs-theme')).toBe(false);
      expect(document.documentElement.getAttribute('data-furo-theme-mode')).toBe('auto');
    });
  });

  describe('Doxia HTML Normalization, GFM Admonitions & Synchronized Content Tabs', () => {
    it('normalizes Doxia bodyTable into responsive Bootstrap 6 table', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <table class="bodyTable bodyTableBorder">
          <thead><tr><th>Goal</th><th>Phase</th></tr></thead>
          <tbody><tr><td>site</td><td>site</td></tr></tbody>
        </table>
      `;
      normalizeDoxiaTables(container);

      const table = container.querySelector('table');
      expect(table?.classList.contains('bodyTable')).toBe(false);
      expect(table?.classList.contains('table')).toBe(true);
      expect(table?.parentElement?.classList.contains('furo-table-responsive')).toBe(true);
    });

    it('transforms GFM blockquote alerts into Furo admonition cards and Bootstrap 6 alerts', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <blockquote>
          <p>[!NOTE]\nFuro uses Bootstrap 6 Alpha under the hood.</p>
        </blockquote>
        <blockquote>
          <p>[!TIP] Custom Performance Tip\nUse frontend-maven-plugin with Vite.</p>
        </blockquote>
        <blockquote>
          <p>[!ALERT:primary dismissible] Release Ready\nBootstrap 6 support is active.</p>
        </blockquote>
      `;

      transformGfmAdmonitions(container);

      const admonitions = container.querySelectorAll('.furo-admonition');
      expect(admonitions.length).toBe(2);
      expect(admonitions[0].classList.contains('admonition-note')).toBe(true);
      expect(admonitions[0].querySelector('.furo-admonition-title')?.textContent).toBe('Note');
      expect(admonitions[0].querySelector('.furo-admonition-body')?.textContent?.trim()).toBe(
        'Furo uses Bootstrap 6 Alpha under the hood.'
      );

      expect(admonitions[1].classList.contains('admonition-tip')).toBe(true);
      expect(admonitions[1].querySelector('.furo-admonition-title')?.textContent).toBe(
        'Custom Performance Tip'
      );

      const bsAlert = container.querySelector('.alert.theme-primary');
      expect(bsAlert).not.toBeNull();
      expect(bsAlert?.classList.contains('not-prose')).toBe(true);
      expect(bsAlert?.querySelector('.alert-heading')?.textContent).toBe('Release Ready');
      expect(bsAlert?.querySelector('[data-bs-dismiss="alert"]')).not.toBeNull();
    });

    it('transforms .furo-tabs into synchronized ARIA tablists persisted in localStorage', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="furo-tabs" data-tab-group="lang">
          <div data-tab="Java">Java code</div>
          <div data-tab="Kotlin">Kotlin code</div>
        </div>
        <div class="furo-tabs" data-tab-group="lang">
          <div data-tab="Java">Second Java</div>
          <div data-tab="Kotlin">Second Kotlin</div>
        </div>
      `;

      initContentTabs(container);

      const tabButtons = container.querySelectorAll<HTMLButtonElement>('.furo-tab-btn');
      expect(tabButtons.length).toBe(4);
      expect(tabButtons[0].classList.contains('active')).toBe(true);

      // Click Kotlin in first tab group -> should sync second tab group and persist
      tabButtons[1].click();
      expect(tabButtons[1].classList.contains('active')).toBe(true);
      expect(tabButtons[3].classList.contains('active')).toBe(true);
      expect(window.localStorage.getItem(TAB_SYNC_STORAGE_KEY)).toContain('Kotlin');
    });

    it('transforms .furo-accordion and .furo-stepper shorthands into Bootstrap 6 components', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="furo-accordion">
          <div title="First Question" class="open"><p>First Answer</p></div>
          <div title="Second Question"><p>Second Answer</p></div>
        </div>
        <ol class="furo-stepper" title="2">
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
  });

  describe('Bootstrap 6 Plugins & .prose Isolation', () => {
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
  });

  describe('Headings, Permalinks, and Table of Contents', () => {
    it('slugifies headings, adds permalink anchors, and builds TOC nav links', () => {
      expect(slugifyHeading('Getting Started with Furo!')).toBe('getting-started-with-furo');

      document.body.innerHTML = `
        <main id="furo-main-content">
          <h1>Page Title</h1>
          <h2>Getting Started</h2>
          <h3>Installation</h3>
          <h2>Getting Started</h2>
        </main>
        <aside class="furo-toc-column">
          <nav id="furoTocNav"></nav>
        </aside>
      `;

      const article = document.getElementById('furo-main-content')!;
      const tocNav = document.getElementById('furoTocNav')!;

      prepareHeadings(article, true, '#');
      buildTableOfContents(article, tocNav, 4);

      const h2s = article.querySelectorAll('h2');
      expect(h2s[0].id).toBe('getting-started');
      expect(h2s[1].id).toBe('getting-started-2');
      expect(h2s[0].querySelector('.furo-headerlink')?.getAttribute('href')).toBe(
        '#getting-started'
      );

      const tocLinks = tocNav.querySelectorAll('a.nav-link');
      expect(tocLinks.length).toBe(3);
      expect(tocLinks[0].textContent).toBe('Getting Started');
      expect(tocLinks[1].classList.contains('furo-toc-level-3')).toBe(true);
    });
  });

  describe('Code Block Highlighting, Language Pill, and Copy Button', () => {
    it('wraps pre elements, applies Highlight.js, renders language pill, and adds copy button', () => {
      const container = document.createElement('div');
      container.innerHTML = `<pre><code class="language-xml">&lt;skin&gt;&lt;/skin&gt;</code></pre>`;

      enhanceCodeBlocks(container, true, true);

      const wrapper = container.querySelector('.furo-code-block');
      expect(wrapper).not.toBeNull();
      expect(wrapper?.querySelector('code')?.classList.contains('hljs')).toBe(true);
      expect(wrapper?.querySelector('.furo-code-lang')?.textContent).toBe('xml');
      expect(wrapper?.querySelector('.furo-copy-btn')).not.toBeNull();
    });
  });

  describe('Client-Side Search Indexing, Filtering & Highlighting', () => {
    it('collects sidebar and heading documents, ranks query matches, and highlights terms', () => {
      document.body.innerHTML = `
        <nav class="furo-sidebar-tree">
          <div class="furo-nav-group">
            <div class="furo-nav-caption">Guide</div>
            <a class="furo-nav-link" href="config.html">Skin Configuration</a>
          </div>
        </nav>
        <main id="furo-main-content">
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
      expect(highlighted).toContain('<mark class="furo-search-mark">Dark</mark>');
    });
  });
});
