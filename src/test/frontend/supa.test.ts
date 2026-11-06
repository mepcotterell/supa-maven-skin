/**
 * @fileoverview Unit test suite for Supa Maven Skin frontend TypeScript modules.
 */

import Combobox from 'bootstrap/js/dist/combobox.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseCss } from 'postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BUNDLED_LICENSES,
  findUnlicensedPackages,
  packageNameFromModuleId,
  packageNameFromSassSpecifier,
  sassModuleSpecifiers
} from '../../../scripts/bundled-licenses';
import {
  auditContrast,
  collectRootTokens,
  compositeOver,
  matchRootSelector,
  resolveColor,
  resolveOpacity,
  SURFACE_AUDITS,
  type SurfaceSpec,
  toHex
} from '../../../scripts/contrast-audit';
import {
  BootstrapPlugins,
  initBootstrapComponents,
  initComponentExamples,
  initLazyWidgets,
  isolateBootstrapComponentsFromProse,
  LAZY_WIDGETS,
  type LazyWidget,
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
  initDoxiaEnhancements,
  initScrollRegions,
  labelReportAvatars,
  markDisabledPageLinks,
  normalizeDoxiaTables,
  syncScrollRegionFocus,
  TAB_SYNC_STORAGE_KEY,
  transformBootstrapIcons,
  transformGfmAdmonitions
} from '../../main/frontend/ts/doxia';
import {
  Drawer,
  initDrawers,
  initSupaSkin,
  SUPA_READY_ATTRIBUTE
} from '../../main/frontend/ts/index';
import { initOptionalLibraries, isModuleUrl, PINNED_ASSETS, pinnedIntegrity } from '../../main/frontend/ts/optional';
import { initComponentPlayground } from '../../main/frontend/ts/playground';
import {
  collectLocalSearchDocuments,
  filterSearchDocuments,
  getSearchIndexCacheKey,
  getSiteRelativePath,
  highlightQueryTerms,
  initSearch,
  toPageHref,
  toSiteRootHref
} from '../../main/frontend/ts/search';
import {
  applyPalette,
  applyThemeMode,
  cycleThemeMode,
  getStoredPalette,
  getStoredThemeMode,
  initTheme,
  PALETTE_STORAGE_KEY,
  SUPA_PALETTES,
  THEME_STORAGE_KEY
} from '../../main/frontend/ts/theme';
import {
  assignHeadingIds,
  buildTableOfContents,
  findProseHeadings,
  doxiaLinkId,
  getStickyContentHeaderOffset,
  initTocAndScrollSpy,
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

    it("keeps the drawer footer's native color-scheme <select> and the header menu in sync both ways", () => {
      // site-macros.vm #supaPaletteSelect: the sidebar drawer's color-scheme control is a native
      // <select>, because the floating menu opened from the drawer footer covered the nav links.
      document.body.innerHTML = `
        <div class="supa-palette-picker">
          <button type="button" class="supa-palette-btn" data-bs-toggle="menu">
            <span data-supa-palette-label="true">Furo (AA)</span>
          </button>
          <div class="menu supa-palette-menu">
            <button type="button" class="menu-item selected" data-supa-palette-option="furo"></button>
            <button type="button" class="menu-item" data-supa-palette-option="modus-tinted"></button>
          </div>
        </div>
        <div class="supa-sidebar-footer">
          <div class="supa-palette-picker">
            <select class="supa-palette-select" data-supa-palette-select="true" aria-label="Accessible color scheme">
              <optgroup label="WCAG 2.2 AA Standard">
                <option value="furo" selected>Furo (AA)</option>
                <option value="bootstrap">Bootstrap 6 (AA)</option>
              </optgroup>
              <optgroup label="WCAG 2.2 AAA High Contrast">
                <option value="modus">Modus (AAA)</option>
                <option value="modus-tinted">Modus Tinted (AAA)</option>
              </optgroup>
            </select>
          </div>
        </div>
      `;
      window.localStorage.setItem(PALETTE_STORAGE_KEY, 'modus');

      initTheme();
      const select = document.querySelector<HTMLSelectElement>('[data-supa-palette-select]')!;
      expect(select.value).toBe('modus');

      select.value = 'bootstrap';
      select.dispatchEvent(new Event('change'));
      expect(document.documentElement.getAttribute('data-supa-palette')).toBe('bootstrap');
      expect(getStoredPalette()).toBe('bootstrap');
      expect(document.querySelector('[data-supa-palette-label]')!.textContent).toBe('Bootstrap 6 (AA)');

      document.querySelector<HTMLButtonElement>('[data-supa-palette-option="modus-tinted"]')!.click();
      expect(select.value).toBe('modus-tinted');
    });

    it('names the color-scheme trigger after the scheme it shows in every palette (WCAG 2.5.3 Label in Name)', () => {
      // Voice-control users activate a button by saying its visible text, so the trigger's
      // accessible name and tooltip must contain the short name it shows ("Furo (AA)"); the
      // long names ("Furo Default (AA)") did not.
      document.body.innerHTML = `
        <div class="supa-palette-picker">
          <button type="button" class="supa-palette-btn" data-bs-toggle="menu"
                  data-bs-title="Color scheme: Furo (AA)" aria-label="Color scheme: Furo (AA)">
            <span class="supa-palette-btn-label" data-supa-palette-label="true">Furo (AA)</span>
          </button>
        </div>
      `;

      initTheme();
      const trigger = document.querySelector<HTMLButtonElement>('.supa-palette-btn')!;
      expect(SUPA_PALETTES.length).toBe(6);
      for (const { id, shortLabel } of SUPA_PALETTES) {
        applyPalette(id);
        const visibleText = trigger.textContent!.replace(/\s+/g, ' ').trim();
        expect(visibleText).toBe(shortLabel);
        expect(trigger.getAttribute('aria-label')).toBe(`Color scheme: ${visibleText}`);
        expect(trigger.getAttribute('data-bs-title')).toBe(`Color scheme: ${visibleText}`);
      }
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

    it('marks Team report Gravatar avatars without alt as decorative and leaves authored alt text alone', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <figure><img id="avatar" src="https://www.gravatar.com/avatar/abc.jpg?d=blank&amp;s=60" /></figure>
        <img id="authored" src="https://www.gravatar.com/avatar/def.jpg" alt="Jane Doe" />
        <img id="content" src="images/diagram.png" />
      `;
      labelReportAvatars(container);
      expect(container.querySelector('#avatar')?.getAttribute('alt')).toBe('');
      expect(container.querySelector('#authored')?.getAttribute('alt')).toBe('Jane Doe');
      expect(container.querySelector('#content')?.hasAttribute('alt')).toBe(false);
    });

    it('makes overflowing code and table scroll regions keyboard-focusable only while they overflow', () => {
      document.body.innerHTML = `
        <div class="supa-code-block"><pre id="wide"><code>x</code></pre></div>
        <div class="supa-code-block"><pre id="short"><code>y</code></pre></div>
        <div class="supa-table-responsive" id="authored" tabindex="-1"><table></table></div>
      `;
      const setSize = (el: HTMLElement, scrollWidth: number, clientWidth: number) => {
        Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
        Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
      };
      const wide = document.getElementById('wide')!;
      const short = document.getElementById('short')!;
      const authored = document.getElementById('authored')!;
      setSize(wide, 900, 400);
      setSize(short, 400, 400);
      setSize(authored, 900, 400);

      initScrollRegions(document);
      expect(wide.getAttribute('tabindex')).toBe('0');
      expect(wide.getAttribute('data-supa-scroll-focus')).toBe('true');
      expect(short.hasAttribute('tabindex')).toBe(false);
      // An author-supplied tabindex is never overwritten or removed.
      expect(authored.getAttribute('tabindex')).toBe('-1');

      setSize(wide, 400, 400);
      expect(syncScrollRegionFocus(wide)).toBe(false);
      expect(wide.hasAttribute('tabindex')).toBe(false);
      setSize(authored, 400, 400);
      syncScrollRegionFocus(authored);
      expect(authored.getAttribute('tabindex')).toBe('-1');
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

    it('renders custom admonition titles as authored instead of double-escaping their HTML', () => {
      const container = document.createElement('div');
      // Mirrors Doxia's Markdown output: the title line is already serialized HTML.
      container.innerHTML = [
        '<blockquote><p>[!TIP] Colors &amp; Brands\nPick a palette.</p></blockquote>',
        '<blockquote><p>[!NOTE] Set <code>&lt;colorScheme&gt;</code> <em>first</em> via ' +
          '<a href="configuration.html">config</a>\nThe body keeps <strong>its</strong> markup.\n' +
          'And its <em>second</em> line.</p></blockquote>',
        '<blockquote><p>[!WARNING]\nDefault title body.</p></blockquote>'
      ].join('\n');

      transformGfmAdmonitions(container);

      const titles = container.querySelectorAll<HTMLElement>('.supa-admonition-title span');
      expect(titles.length).toBe(3);

      expect(titles[0].textContent).toBe('Colors & Brands');
      expect(titles[0].innerHTML).toBe('Colors &amp; Brands');

      // Inline markup stays as elements, and the title still ends at the first line break.
      expect(titles[1].textContent).toBe('Set <colorScheme> first via config');
      expect(titles[1].querySelector('code')?.textContent).toBe('<colorScheme>');
      expect(titles[1].querySelector('em')?.textContent).toBe('first');
      expect(titles[1].querySelector('a')?.getAttribute('href')).toBe('configuration.html');
      const body = titles[1].closest('.supa-admonition')?.querySelector('.supa-admonition-body');
      expect(body?.innerHTML).toBe(
        '<p>The body keeps <strong>its</strong> markup.\nAnd its <em>second</em> line.</p>'
      );

      // Default titles stay plain text.
      expect(titles[2].textContent).toBe('Warning');
      expect(titles[2].children.length).toBe(0);
    });

    it('renders custom [!ALERT:...] headings as authored instead of double-escaping their HTML', () => {
      const container = document.createElement('div');
      container.innerHTML = [
        '<blockquote><p>[!ALERT:info] Run <code>mvn site</code> &amp; <em>verify</em>\n' +
          'Output lands in <code>target/site</code>.</p></blockquote>',
        '<blockquote><p>[!ALERT:success]\nNo heading here.</p></blockquote>'
      ].join('\n');

      transformGfmAdmonitions(container);

      const infoAlert = container.querySelector('.alert.theme-info');
      const heading = infoAlert?.querySelector<HTMLElement>('.alert-heading');
      expect(heading?.textContent).toBe('Run mvn site & verify');
      expect(heading?.querySelector('code')?.textContent).toBe('mvn site');
      expect(heading?.querySelector('em')?.textContent).toBe('verify');
      expect(infoAlert?.querySelector('.flex-grow-1 > p')?.innerHTML).toBe(
        'Output lands in <code>target/site</code>.'
      );

      const successAlert = container.querySelector('.alert.theme-success');
      expect(successAlert?.querySelector('.alert-heading')).toBeNull();
      expect(successAlert?.textContent?.trim()).toBe('No heading here.');
    });

    it('infers unlabeled tab labels from the code fence, not inline code in an admonition title', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-tabs">
          <div>
            <blockquote><p>[!NOTE] Use <code>x</code>\nbody</p></blockquote>
            <pre><code class="language-markdown">md</code></pre>
          </div>
          <div><pre><code class="language-velocity">vm</code></pre></div>
        </div>
      `;

      // Same order as initDoxiaEnhancements: titles gain real <code> before tabs are labeled.
      transformGfmAdmonitions(container);
      initContentTabs(container);

      const labels = Array.from(container.querySelectorAll('.supa-tab-btn')).map((b) => b.textContent);
      expect(labels).toEqual(['Markdown Shorthand', 'Velocity Macro (.md.vm)']);
    });
  });

  describe('Bootstrap 6 Plugins, Drawers & .prose Isolation', () => {
    it('exposes Bootstrap 6 plugins on window.bootstrap (lazy ones once loaded) and isolates components from .prose', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="card"><div class="card-body">Card</div></div>
        <ul class="nav nav-pills"><li class="nav-item"><a class="nav-link active">Tab</a></li></ul>
        <div class="chip-input" data-bs-chips="true"><span class="chip">tag</span><input type="text" class="form-ghost" /></div>
      `;

      isolateBootstrapComponentsFromProse(container);
      const settled = initBootstrapComponents(container);

      // The plugins the skin's chrome uses are bundled into the main script.
      expect(Object.keys(BootstrapPlugins)).toEqual(
        expect.arrayContaining([
          'Alert',
          'Button',
          'Collapse',
          'Dialog',
          'Drawer',
          'Menu',
          'Popover',
          'ScrollSpy',
          'Toast',
          'Toggler',
          'Tooltip'
        ])
      );
      expect(window.bootstrap).toBe(BootstrapPlugins);
      expect(window.bootstrap?.Dialog).toBeDefined();
      expect(window.bootstrap?.Menu).toBeDefined();

      // Chips loads on demand because the container has a chip input.
      await settled;
      const chipInput = container.querySelector<HTMLElement>('.chip-input')!;
      expect(window.bootstrap?.Chips?.getInstance(chipInput)).not.toBeNull();
      expect(container.querySelector('.card')?.classList.contains('not-prose')).toBe(true);
      expect(container.querySelector('.nav')?.classList.contains('not-prose')).toBe(true);
      expect(container.querySelector('.chip-input')?.classList.contains('not-prose')).toBe(true);
    });

    it('initializes Combobox and internal Menu on the same toggle element without Data.set console errors', async () => {
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

        // Combobox is a lazily loaded chunk; its Menu and the patched Data map come from the
        // main bundle, so both instances must coexist on the toggle.
        await initBootstrapComponents(container);

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

      // Every role="tablist" owns only tabs (axe aria-required-children): the "Hide code"
      // toggles sit beside the tablists, never inside them.
      const tablists = container.querySelectorAll<HTMLElement>('[role="tablist"]');
      expect(tablists.length).toBe(2);
      tablists.forEach((list) => {
        expect(list.children.length).toBeGreaterThan(0);
        Array.from(list.children).forEach((child) => {
          expect(child.getAttribute('role')).toBe('tab');
        });
      });
      expect(tabbedToggleBtn.closest('[role="tablist"]')).toBeNull();
      expect(container.querySelector('.supa-playground-bar')?.hasAttribute('role')).toBe(false);
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
      expect(paletteBtn.getAttribute('data-bs-title')).toBe('Color scheme: Furo (AA)');
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

    it('sets html[data-supa-ready] asynchronously once initSupaSkin settles (see the optional-libraries suite for pending and failed loads)', async () => {
      document.body.innerHTML = '<main id="supa-main-content"><p>Plain page</p></main>';
      document.documentElement.removeAttribute(SUPA_READY_ATTRIBUTE);
      const ready = initSupaSkin();
      // Optional libraries load asynchronously, so the flag must not be set synchronously.
      expect(document.documentElement.hasAttribute(SUPA_READY_ATTRIBUTE)).toBe(false);
      await ready;
      expect(document.documentElement.getAttribute(SUPA_READY_ATTRIBUTE)).toBe('true');
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

    it('never imports a lazy widget chunk when the page lacks its trigger', async () => {
      const load = vi.fn(async () => () => undefined);
      const widget: LazyWidget = { name: 'Absent', selector: '[data-test-absent]', load };
      const container = document.createElement('div');
      container.innerHTML = '<p>No widgets here</p>';

      await initLazyWidgets(container, [widget]);

      expect(load).not.toHaveBeenCalled();
    });

    it('imports a lazy widget chunk once when its trigger is present and initializes every match', async () => {
      const init = vi.fn();
      const load = vi.fn(async () => init);
      const widget: LazyWidget = { name: 'Present', selector: '[data-test-present]', load };
      const container = document.createElement('div');
      container.innerHTML = '<span data-test-present></span><span data-test-present></span>';

      await initLazyWidgets(container, [widget]);
      expect(load).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledTimes(2);
      expect(init.mock.calls.map(([el]) => el)).toEqual(
        Array.from(container.querySelectorAll('[data-test-present]'))
      );

      // Re-initializing (new content, or a second initBootstrapComponents call) reuses the chunk.
      container.insertAdjacentHTML('beforeend', '<span data-test-present></span>');
      await initLazyWidgets(container, [widget]);
      expect(load).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledTimes(5);
    });

    it('tolerates a rejected chunk import: warns once, leaves the markup alone, and still initializes other widgets', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const brokenLoad = vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
        const throwingInit = vi.fn(() => {
          throw new Error('bad markup');
        });
        const workingInit = vi.fn();
        const widgets: LazyWidget[] = [
          { name: 'Broken', selector: '[data-test-broken]', load: brokenLoad },
          { name: 'Throws', selector: '[data-test-throws]', load: async () => throwingInit },
          { name: 'Works', selector: '[data-test-works]', load: async () => workingInit }
        ];
        const container = document.createElement('div');
        container.innerHTML =
          '<input data-test-broken value="2026-10-20" /><span data-test-throws></span><span data-test-works></span>';
        const before = container.innerHTML;

        await expect(initLazyWidgets(container, widgets)).resolves.toBeUndefined();
        await expect(initLazyWidgets(container, widgets)).resolves.toBeUndefined();

        expect(brokenLoad).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain('Broken');
        expect(container.innerHTML).toBe(before);
        expect(throwingInit).toHaveBeenCalledTimes(2);
        expect(workingInit).toHaveBeenCalledTimes(2);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('loads every lazily loaded Bootstrap 6 widget chunk and exposes its plugin on window.bootstrap', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const container = document.createElement('div');
        container.innerHTML = `
          <div class="carousel"><div class="carousel-inner"><div class="carousel-item active">1</div></div></div>
          <div class="chip-input"><input type="text" class="form-ghost" /></div>
          <div class="dropdown">
            <button type="button" class="form-control" data-bs-toggle="combobox" aria-expanded="false"></button>
            <div class="menu"><button type="button" class="menu-item" data-bs-value="a">A</button></div>
          </div>
          <input type="text" class="form-control" data-bs-toggle="datepicker" />
          <ul class="nav nav-overflow"><li class="nav-item"><a class="nav-link" href="#a">A</a></li></ul>
          <div class="otp"><input type="text" /><input type="text" /></div>
          <input type="range" class="form-range" />
          <input type="password" id="lazyPw" /><div class="strength"></div>
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#lazyTabA" type="button" role="tab">A</button></li>
          </ul>
          <div class="tab-content"><div class="tab-pane active" id="lazyTabA" role="tabpanel">A</div></div>
        `;
        document.body.appendChild(container);

        await initLazyWidgets(container);

        expect(warnSpy).not.toHaveBeenCalled();
        const lazyPlugins = [
          'Carousel',
          'Chips',
          'Combobox',
          'Datepicker',
          'NavOverflow',
          'OtpInput',
          'Range',
          'Strength',
          'Tab'
        ] as const;
        lazyPlugins.forEach((name) => {
          expect(BootstrapPlugins[name], name).toBeDefined();
        });
        expect(LAZY_WIDGETS.length).toBe(lazyPlugins.length + 1);
        const tab = container.querySelector<HTMLElement>('[data-bs-toggle="tab"]')!;
        expect(BootstrapPlugins.Tab?.getInstance(tab)).not.toBeNull();
        expect(container.querySelector('.strength')?.getAttribute('data-bs-input')).toBe('#lazyPw');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('sets html[data-supa-ready] only after the lazily loaded Component Playground has initialized', async () => {
      document.body.innerHTML = `
        <main id="supa-main-content">
          <div class="supa-playground" data-supa-playground="true">
            <button type="button" class="supa-playground-pill active" data-playground-component="button"></button>
            <div class="supa-playground-stage" data-playground-stage="true"></div>
            <pre><code class="language-html" data-playground-code="true"></code></pre>
          </div>
        </main>
      `;
      document.documentElement.removeAttribute(SUPA_READY_ATTRIBUTE);

      await initSupaSkin();

      expect(document.documentElement.getAttribute(SUPA_READY_ATTRIBUTE)).toBe('true');
      const playground = document.querySelector('.supa-playground')!;
      expect(playground.getAttribute('data-supa-playground-ready')).toBe('true');
      expect(playground.querySelector('[data-playground-stage] .btn')).not.toBeNull();
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

    it('honors <headingPermalinks> through the data-supa-permalinks attribute site.vm emits on <body>', () => {
      /**
       * Renders a fresh article, runs the real TOC enhancer, and counts permalinks.
       *
       * @param permalinks - Value for `data-supa-permalinks`, or `null` to omit it.
       * @returns Number of `.supa-headerlink` anchors added to the article.
       */
      const countPermalinks = (permalinks: string | null): number => {
        if (permalinks === null) {
          document.body.removeAttribute('data-supa-permalinks');
        } else {
          document.body.setAttribute('data-supa-permalinks', permalinks);
        }
        document.body.innerHTML = `
          <main id="supa-main-content">
            <h1>Page Title</h1>
            <h2>Install</h2>
            <h3>Requirements</h3>
            <h6>Footnote</h6>
          </main>
          <nav id="supaTocNav"></nav>
        `;
        initTocAndScrollSpy();
        return document.querySelectorAll('#supa-main-content .supa-headerlink').length;
      };

      try {
        expect(countPermalinks('false')).toBe(0);
        expect(countPermalinks('true')).toBe(3);
        expect(countPermalinks(null)).toBe(3);
      } finally {
        document.body.removeAttribute('data-supa-permalinks');
      }
    });

    it('reads only <body> data-supa-* attributes that site.vm emits on <body>', () => {
      // site.vm renders each <custom><supaSkin> option onto <body>, and the enhancers read them
      // back with getAttribute(). A misspelled name on either side silently falls back to the
      // default (toc.ts once read data-supa-heading-permalinks while site.vm emitted
      // data-supa-permalinks, so <headingPermalinks>false</headingPermalinks> did nothing).
      // Only <body> reads are checked. <html> mixes defaults site.vm emits (such as
      // data-supa-default-theme) with attributes the inline <head> script sets at runtime, so it
      // is out of scope for this scan. Attributes the enhancers set on <body> themselves are not
      // template output either.
      const tsDir = resolve(process.cwd(), 'src/main/frontend/ts');
      const read = new Set<string>();
      const setAtRuntime = new Set<string>();
      for (const file of readdirSync(tsDir).filter((name) => name.endsWith('.ts'))) {
        const source = readFileSync(resolve(tsDir, file), 'utf8');
        // A bare `body.` receiver counts only where the file binds `body` to document.body
        // (doxia.ts also names an accordion panel element `body`).
        const receiver = /\bconst body = document\.body\b/.test(source)
          ? '(?:\\bdocument\\.|(?<![\\w.$]))body'
          : '\\bdocument\\.body';
        /**
         * Builds a matcher for `<receiver>.<method>('data-supa-*')` calls.
         *
         * @param methods - Alternation of DOM attribute method names.
         * @returns Global regex capturing the attribute name.
         */
        const call = (methods: string): RegExp =>
          new RegExp(`${receiver}\\.(?:${methods})\\(\\s*['"](data-supa-[\\w-]+)['"]`, 'g');
        for (const match of source.matchAll(call('getAttribute|hasAttribute'))) {
          read.add(match[1]);
        }
        for (const match of source.matchAll(call('setAttribute|toggleAttribute'))) {
          setAtRuntime.add(match[1]);
        }
      }

      const siteVm = readFileSync(resolve(process.cwd(), 'src/main/resources/META-INF/maven/site.vm'), 'utf8');
      // The tag ends at the first `">` rather than `>`, so a Velocity comparison inside an
      // #if( ... ) between attributes cannot cut the tag short.
      const bodyTag = /<body\b[\s\S]*?">/.exec(siteVm)?.[0] ?? '';
      const emitted = new Set(Array.from(bodyTag.matchAll(/\b(data-supa-[\w-]+)="/g), (match) => match[1]));

      // Guard against the scan silently matching nothing.
      expect(read.size).toBeGreaterThanOrEqual(5);
      expect(emitted.size).toBeGreaterThanOrEqual(5);
      const missing = [...read].filter((name) => !setAtRuntime.has(name) && !emitted.has(name)).sort();
      expect(missing).toEqual([]);
    });

    it('keeps Unicode letters, combining marks, and digits in heading slugs', () => {
      expect(slugifyHeading('Überblick')).toBe('überblick');
      expect(slugifyHeading('Größe & Maße')).toBe('größe-maße');
      expect(slugifyHeading('概要')).toBe('概要');
      expect(slugifyHeading('インストール手順')).toBe('インストール手順');
      expect(slugifyHeading('Начало работы')).toBe('начало-работы');
      expect(slugifyHeading('Εισαγωγή')).toBe('εισαγωγή');
      // Devanagari vowel signs and the virama are combining marks (Mc, Mn)
      expect(slugifyHeading('हिन्दी अनुवाद')).toBe('हिन्दी-अनुवाद');

      // Mixed scripts and separators
      expect(slugifyHeading('Java 21 и Kotlin 2')).toBe('java-21-и-kotlin-2');
      expect(slugifyHeading('API リファレンス (v2)')).toBe('api-リファレンス-v2');
      expect(slugifyHeading('Café-Menü_Übersicht')).toBe('café-menü-übersicht');

      // Composed and decomposed input give one NFC slug
      const nfc = 'ångström';
      expect(slugifyHeading('Ångström'.normalize('NFD'))).toBe(nfc);
      expect(slugifyHeading('Ångström'.normalize('NFC'))).toBe(nfc);
      // J + caron has no precomposed capital, but lowercasing gives the precomposed U+01F0
      expect(slugifyHeading('J\u030C')).toBe('\u01F0');
      // Composing first turns = + combining long solidus into \u2260, a symbol, before symbols are
      // stripped; decomposed, its mark would survive as a letter-less slug part
      expect(slugifyHeading('a \u2260 b'.normalize('NFD'))).toBe('a-b');

      // Emoji carry no slug text, including their variation selectors and keycap marks
      expect(slugifyHeading('🚀✨')).toBe('section');
      expect(slugifyHeading('⚠️')).toBe('section');
      expect(slugifyHeading('👩‍💻')).toBe('section');
      expect(slugifyHeading('🇩🇪')).toBe('section');
      expect(slugifyHeading('🚀 Quick Start')).toBe('quick-start');
      expect(slugifyHeading('1️⃣ Install')).toBe('1-install');
      // U+2139 INFORMATION SOURCE is an emoji with the letter category Ll
      expect(slugifyHeading('ℹ️ Note')).toBe('note');

      // Nothing left falls back to 'section'
      expect(slugifyHeading('')).toBe('section');
      expect(slugifyHeading('   ')).toBe('section');
      expect(slugifyHeading('— · —')).toBe('section');
    });

    it('keeps the slug of every ASCII heading unchanged from 0.1.5', () => {
      // 0.1.5 removed [^\w\s-] without the u flag. Published links to ASCII headings must keep
      // working, so the Unicode rules must give the same slug for any ASCII-only text.
      const legacySlug = (text: string): string =>
        text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'section';
      const ascii = [
        '\t',
        '\n',
        ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))
      ];
      const samples = [
        ...ascii,
        'Getting Started with Furo!',
        '1. Actions & Buttons',
        'Choosing Markdown (`.md`) vs. Velocity Templates (`.md.vm`)',
        'Extending Palettes via `<lightCssVariables>` / `<darkCssVariables>`',
        '  __Leading -- and trailing__  '
      ];
      // A fixed-seed linear congruential generator keeps the random sample reproducible
      let seed = 20261105;
      const next = (): number => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
      for (let n = 0; n < 2000; n++) {
        const length = next() % 32;
        samples.push(Array.from({ length }, () => ascii[next() % ascii.length]).join(''));
      }

      expect(samples.filter((text) => slugifyHeading(text) !== legacySlug(text))).toEqual([]);
    });

    it('gives non-ASCII headings Unicode ids that TOC links and permalinks reuse, de-duplicated as before', () => {
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Handbuch</h1>
          <a id="a.C3.9Cberblick"></a><h2>Überblick</h2>
          <h2>概要</h2>
          <h3>概要</h3>
          <h2>🚀</h2>
          <h2>✨</h2>
          <h2>Начало работы</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      const article = document.getElementById('supa-main-content')!;
      const tocNav = document.getElementById('supaTocNav')!;

      prepareHeadings(article, true, '#');
      buildTableOfContents(article, tocNav, 4);

      const headings = Array.from(article.querySelectorAll('h1, h2, h3'));
      expect(headings.map((h) => h.id)).toEqual([
        'handbuch',
        'überblick',
        '概要',
        '概要-2',
        'section',
        'section-2',
        'начало-работы'
      ]);
      expect(headings[1].getAttribute('data-doxia-id')).toBe('a.C3.9Cberblick');

      const tocLinks = Array.from(tocNav.querySelectorAll<HTMLAnchorElement>('a.nav-link'));
      const permalinks = Array.from(article.querySelectorAll<HTMLAnchorElement>('.supa-headerlink'));
      expect(tocLinks.map((link) => link.getAttribute('href'))).toEqual(
        headings.slice(1).map((h) => `#${h.id}`)
      );
      expect(permalinks.map((link) => link.getAttribute('href'))).toEqual(
        headings.slice(1).map((h) => `#${h.id}`)
      );
      // Browsers report link.hash percent-encoded (#%C3%BCberblick), and ScrollSpy decodes it
      // again to find each section with getElementById
      tocLinks.forEach((link, idx) => {
        expect(document.getElementById(decodeURIComponent(link.hash.slice(1)))).toBe(headings[idx + 1]);
      });
    });

    it('copies a percent-encoded permalink that leads back to a non-ASCII heading', async () => {
      const writeText = vi.fn(async (_text: string) => {});
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      try {
        document.body.innerHTML = '<main id="supa-main-content"><h2>Überblick</h2></main>';
        prepareHeadings(document.getElementById('supa-main-content')!, true, '#');
        const permalink = document.querySelector<HTMLAnchorElement>('.supa-headerlink')!;
        permalink.addEventListener('click', (event) => event.preventDefault());
        permalink.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

        const copied = new URL(writeText.mock.calls[0][0]);
        expect(copied.hash).toBe('#%C3%BCberblick');
        expect(document.getElementById(decodeURIComponent(copied.hash.slice(1)))).toBe(
          document.querySelector('h2')
        );
      } finally {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    });

    it('follows percent-encoded, decomposed, and malformed fragments to non-ASCII headings', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const scrolledTo: string[] = [];
      const scrollSpy = vi
        .spyOn(Element.prototype, 'scrollIntoView')
        .mockImplementation(function (this: Element) {
          scrolledTo.push(this.id);
        });
      /**
       * Opens a page at `hash`, as a link from another page would, and runs the TOC enhancer.
       *
       * @param hash - URL fragment, including the leading `#`.
       */
      const load = (hash: string): void => {
        happyDOM.setURL(`https://example.org/docs/guide.html${hash}`);
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree">
            <a class="supa-nav-link" href="#%C3%BCberblick">Überblick</a>
          </nav>
          <main id="supa-main-content"><h1>Handbuch</h1><h2>Überblick</h2><h2>Einleitung</h2></main>
          <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
        `;
        initTocAndScrollSpy();
      };
      const activeTocHref = (): string | null | undefined =>
        document.querySelector('#supaTocNav a.active')?.getAttribute('href');
      const sidebarLink = (): Element | null => document.querySelector('.supa-sidebar-tree a');
      // happy-dom reports an exception thrown by an event listener as a window "error" event
      const listenerErrors: string[] = [];
      const recordError = (event: ErrorEvent): void => {
        listenerErrors.push(event.message);
      };
      window.addEventListener('error', recordError);

      try {
        // Browsers report location.hash percent-encoded; NFD input names the same NFC id
        load('#%C3%BCberblick');
        load('#u%CC%88berblick');
        expect(scrolledTo).toEqual(['überblick', 'überblick']);

        // happy-dom lays every heading out at the top, so the scroll sync marks the last one
        expect(activeTocHref()).toBe('#einleitung');
        expect(sidebarLink()?.classList.contains('active')).toBe(false);

        // A link that changes the fragment in place marks the matching TOC and sidebar entries
        happyDOM.setURL('https://example.org/docs/guide.html#%C3%BCberblick');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(activeTocHref()).toBe('#überblick');
        expect(sidebarLink()?.classList.contains('active')).toBe(true);

        // A stray "%" is not a percent-encoded sequence: it names no heading and must not throw
        happyDOM.setURL('https://example.org/docs/guide.html#100%');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(listenerErrors).toEqual([]);
        expect(activeTocHref()).toBe('#überblick');

        // ... nor stop the TOC from building on a page opened at that fragment
        expect(() => load('#100%')).not.toThrow();
        expect(document.querySelectorAll('#supaTocNav a').length).toBe(2);
        expect(scrolledTo).toHaveLength(2);
      } finally {
        window.removeEventListener('error', recordError);
        scrollSpy.mockRestore();
        happyDOM.setURL(originalUrl);
      }
    });

    it('adds the id Doxia writes into Markdown links to a non-ASCII heading as an anchor before it', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      // Doxia writes its own anchor (DoxiaUtils.encodeId of the heading text) before each heading
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Handbuch</h1>
          <a id="a.C3.9Cberblick"></a><h2>Überblick</h2>
          <a id="a.E6.A6.82.E8.A6.81"></a><h2>概要</h2>
          <h2>概要</h2>
          <h2>Начало работы</h2>
          <h2>Café-Menü</h2>
          <h2>𝔘nicode</h2>
          <h2>Getting Started</h2>
          <h2>1. Install</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      const article = document.getElementById('supa-main-content')!;
      prepareHeadings(article, true, '#');

      const headings = Array.from(article.querySelectorAll('h2'));
      expect(headings.map((h) => h.id)).toEqual([
        'überblick',
        '概要',
        '概要-2',
        'начало-работы',
        'café-menü',
        '𝔘nicode',
        'getting-started',
        '1-install'
      ]);
      // Doxia 2.2.0 passes the fragment of a relative Markdown link that is not a valid Doxia id
      // through DoxiaUtils.encodeId, so [Überblick](#überblick) reaches the page as
      // #a.C3.BCberblick. The expected ids below are that method's output for each slug.
      // 概要 encodes to the heading's own Doxia anchor, and valid ASCII ids are left alone, but
      // not 1-install, which starts with a digit.
      expect(Array.from(article.querySelectorAll('a[id]')).map((a) => a.id)).toEqual([
        'a.C3.BCberblick',
        'a.C3.9Cberblick',
        'a.E6.A6.82.E8.A6.81',
        'a.E6.A6.82.E8.A6.81-2',
        'a.D0.BD.D0.B0.D1.87.D0.B0.D0.BB.D0.BE-.D1.80.D0.B0.D0.B1.D0.BE.D1.82.D1.8B',
        'caf.C3.A9-men.C3.BC',
        'a.3F.3Fnicode',
        'a1-install'
      ]);
      // Each added anchor sits right before its heading's Doxia anchor, or the heading itself
      const nextHeading = (id: string): string | undefined => {
        let el = document.getElementById(id)?.nextElementSibling;
        while (el && el.tagName === 'A') {
          el = el.nextElementSibling;
        }
        return el?.id;
      };
      expect(nextHeading('a.C3.BCberblick')).toBe('überblick');
      expect(nextHeading('a.E6.A6.82.E8.A6.81-2')).toBe('概要-2');
      expect(nextHeading('a.3F.3Fnicode')).toBe('𝔘nicode');
      expect(headings[0].getAttribute('data-doxia-id')).toBe('a.C3.9Cberblick');

      // Running the enhancer again keeps one anchor per heading and the Doxia anchor on record
      prepareHeadings(article, true, '#');
      expect(article.querySelectorAll('a[id]').length).toBe(8);
      expect(headings[0].getAttribute('data-doxia-id')).toBe('a.C3.9Cberblick');

      // Following such a link in place marks the heading in the TOC
      buildTableOfContents(article, document.getElementById('supaTocNav'), 4);
      try {
        happyDOM.setURL(`${window.location.origin}/docs/guide.html#a.C3.BCberblick`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(document.querySelector('#supaTocNav a.active')?.getAttribute('href')).toBe('#überblick');
      } finally {
        happyDOM.setURL(originalUrl);
      }
    });

    it('declares the language of heading text on its TOC entry', () => {
      const pageLang = document.documentElement.getAttribute('lang');
      document.documentElement.setAttribute('lang', 'en');
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h2><span lang="ja">概要</span></h2>
          <h2 lang="de">Überblick</h2>
          <section lang="fr"><h2>Aperçu</h2></section>
          <h2><span lang="de"><em lang="de-CH">Grüezi</em></span></h2>
          <h2>API <span lang="ja">リファレンス</span></h2>
          <h2><span lang="en">Overview</span></h2>
          <h2>Details</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      try {
        const article = document.getElementById('supa-main-content')!;
        prepareHeadings(article, true, '#');
        buildTableOfContents(article, document.getElementById('supaTocNav'), 4);

        // Only an entry whose text is in another language than the TOC itself declares one;
        // mixed-language text keeps the language the heading inherits (WCAG 2.2 SC 3.1.2)
        const tocLinks = Array.from(document.querySelectorAll('#supaTocNav a'));
        expect(tocLinks.map((link) => link.getAttribute('lang'))).toEqual([
          'ja',
          'de',
          'fr',
          'de-CH',
          null,
          null,
          null
        ]);
        expect(tocLinks.map((link) => link.textContent)).toEqual([
          '概要',
          'Überblick',
          'Aperçu',
          'Grüezi',
          'API リファレンス',
          'Overview',
          'Details'
        ]);
      } finally {
        if (pageLang === null) {
          document.documentElement.removeAttribute('lang');
        } else {
          document.documentElement.setAttribute('lang', pageLang);
        }
      }
    });

    it('computes the ids prepareHeadings gives without changing the page', () => {
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Guide</h1>
          <h5>Notes</h5>
          <p id="notes-2">An author id.</p>
          <h2>Notes</h2>
          <h2><a id="install"></a>Install</h2>
          <p id="setup">An author id that a Doxia anchor repeats.</p>
          <a id="setup"></a><h3>Setup</h3>
          <h3>Later</h3>
          <h3 id="later">Later on</h3>
          <h4>Überblick</h4>
          <div class="supa-tabs not-prose"><h2>Guide</h2></div>
          <h6>Guide</h6>
        </main>`;
      const article = document.getElementById('supa-main-content')!;
      const headings = findProseHeadings(article);
      const ids = assignHeadingIds(
        headings,
        Array.from(document.querySelectorAll('[id]'), (el) => el.id)
      );
      expect(headings.map((h) => h.id)).toEqual(['', '', '', '', '', '', 'later', '', '']);
      expect(document.getElementById('install')?.parentElement?.tagName).toBe('H2');

      // The same ids as before 0.1.7: numbered over h1-h6, around ids already in the document
      // (repeats included), and taking the slug a heading's own Doxia anchor holds
      expect(ids).toEqual([
        'guide',
        'notes',
        'notes-3',
        'install',
        'setup-2',
        'later-2',
        'later',
        'überblick',
        'guide-2'
      ]);
      prepareHeadings(article, true, '#');
      expect(headings.map((h) => h.id)).toEqual(ids);
      expect(document.getElementById('install')?.tagName).toBe('H2');
      expect(document.getElementById('setup')?.tagName).toBe('P');
      expect(document.getElementById('a.C3.BCberblick')?.nextElementSibling?.id).toBe('überblick');
    });

    it('names the id Doxia 2.2.0 writes into a Markdown link to any heading id it rewrites', () => {
      // Computed with the real DoxiaUtils of doxia-core 2.2.0 (the Doxia that pom.xml pins), in
      // `jshell --class-path ~/.m2/repository/org/apache/maven/doxia/doxia-core/2.2.0/doxia-core-2.2.0.jar`
      // after `import org.apache.maven.doxia.util.DoxiaUtils;`, as
      // `DoxiaUtils.isValidId(id) ? null : DoxiaUtils.encodeId(id)`: null where Doxia leaves a
      // link to the id as written (Xhtml5BaseParser.handleAStart), else the id it writes instead.
      const vectors: Array<[string, string | null]> = [
        ['install', null],
        ['getting-started', null],
        ['section-2', null],
        ['a1-install', null],
        ['_private', null],
        ['v2.0', null],
        ['Getting_Started', null],
        ['1-install', 'a1-install'],
        ['1-actions-buttons', 'a1-actions-buttons'],
        ['2026-roadmap', 'a2026-roadmap'],
        ['3d-rendering', 'a3d-rendering'],
        ['42', 'a42'],
        ['1-install-2', 'a1-install-2'],
        ['-intro', 'a-intro'],
        ['.hidden', 'a.hidden'],
        ['x:y', 'x.3Ay'],
        ['a b', 'a_b'],
        ['step/2', 'step.2F2'],
        ['100%', 'a100.25'],
        ['a+b', 'a.2Bb'],
        ['überblick', 'a.C3.BCberblick'],
        ['概要', 'a.E6.A6.82.E8.A6.81'],
        ['café-menü', 'caf.C3.A9-men.C3.BC'],
        ['𝔘nicode', 'a.3F.3Fnicode'],
        ['1-überblick', 'a1-.C3.BCberblick'],
        ['٣-مقدمة', 'a.D9.A3-.D9.85.D9.82.D8.AF.D9.85.D8.A9'],
        ['²-squared', 'a.C2.B2-squared'],
        ['3-alerts-overlays-dialogs-drawers-toasts', 'a3-alerts-overlays-dialogs-drawers-toasts']
      ];
      expect(vectors.map(([id]) => doxiaLinkId(id))).toEqual(vectors.map(([, linkId]) => linkId));

      // Every printable ASCII character before and after an x, from the same jshell session: the
      // characters isValidId accepts first and after the first, and encodeId of each other first
      const printable = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i));
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
      expect(printable.filter((c) => doxiaLinkId(`${c}x`) === null).join('')).toBe(letters);
      expect(printable.filter((c) => doxiaLinkId(`x${c}`) === null).join('')).toBe(
        `-.0123456789${letters}`
      );
      const encodedFirsts = printable
        .map((c) => doxiaLinkId(`${c}x`))
        .filter((linkId) => linkId !== null);
      expect(encodedFirsts.join(' ')).toBe(
        'a.21x a.22x a.23x a.24x a.25x a.26x a.27x a.28x a.29x a.2Ax a.2Bx a.2Cx a-x a.x a.2Fx ' +
          'a0x a1x a2x a3x a4x a5x a6x a7x a8x a9x a.3Ax a.3Bx a.3Cx a.3Dx a.3Ex a.3Fx a.40x ' +
          'a.5Bx a.5Cx a.5Dx a.5Ex a.60x a.7Bx a.7Cx a.7Dx a.7Ex'
      );
      expect(doxiaLinkId(`x ${printable.join('')}`)).toBe(
        'x_.21.22.23.24.25.26.27.28.29.2A.2B.2C-..2F0123456789.3A.3B.3C.3D.3E.3F.40' +
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ.5B.5C.5D.5E_.60abcdefghijklmnopqrstuvwxyz.7B.7C.7D.7E'
      );
    });

    it('adds anchors for Markdown links to digit-first heading ids once every heading id is set', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      // Doxia writes its own anchor (DoxiaUtils.encodeId of the heading text) before some headings
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Install Guide</h1>
          <a id="a1._Install"></a><h2>1. Install</h2>
          <a id="a2._Configure"></a><h2>2. Configure</h2>
          <h3>2026 Roadmap</h3>
          <h2>A1 Install</h2>
          <h2 id="x:y">Namespaced</h2>
          <h2>Überblick</h2>
          <h2>1. Install</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      const article = document.getElementById('supa-main-content')!;
      prepareHeadings(article, true, '#');

      // The alias of 1-install is a1-install, the slug of the later "A1 Install". Aliases are added
      // after every heading has its id, so that heading keeps its slug rather than a1-install-2.
      expect(Array.from(article.querySelectorAll('h1, h2, h3')).map((h) => h.id)).toEqual([
        'install-guide',
        '1-install',
        '2-configure',
        '2026-roadmap',
        'a1-install',
        'x:y',
        'überblick',
        '1-install-2'
      ]);
      // Each heading whose id DoxiaUtils.isValidId rejects gets an anchor named by encodeId, unless
      // an element already has that id: a1-install stays the "A1 Install" heading's.
      expect(Array.from(article.querySelectorAll('a[id]')).map((a) => a.id)).toEqual([
        'a1._Install',
        'a2-configure',
        'a2._Configure',
        'a2026-roadmap',
        'x.3Ay',
        'a.C3.BCberblick',
        'a1-install-2'
      ]);
      const ids = Array.from(document.querySelectorAll('[id]'), (el) => el.id);
      expect(ids.filter((id, idx) => ids.indexOf(id) !== idx)).toEqual([]);

      // Each added anchor sits right before its heading's Doxia anchor, or the heading itself
      const nextHeading = (id: string): string | undefined => {
        let el = document.getElementById(id)?.nextElementSibling;
        while (el && el.tagName === 'A') {
          el = el.nextElementSibling;
        }
        return el?.id;
      };
      expect(nextHeading('a2-configure')).toBe('2-configure');
      expect(document.getElementById('a2-configure')?.nextElementSibling?.id).toBe('a2._Configure');
      expect(nextHeading('a2026-roadmap')).toBe('2026-roadmap');
      expect(nextHeading('x.3Ay')).toBe('x:y');
      expect(nextHeading('a1-install-2')).toBe('1-install-2');

      // Following such a link in place marks its heading in the TOC, and a1-install keeps naming
      // "A1 Install", the heading the browser scrolls to
      buildTableOfContents(article, document.getElementById('supaTocNav'), 4);
      const followed = (hash: string): string | null | undefined => {
        happyDOM.setURL(`${window.location.origin}/docs/guide.html${hash}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return document.querySelector('#supaTocNav a.active')?.getAttribute('href');
      };
      try {
        expect(followed('#a2026-roadmap')).toBe('#2026-roadmap');
        expect(followed('#a2-configure')).toBe('#2-configure');
        expect(followed('#x.3Ay')).toBe('#x:y');
        expect(followed('#a1-install-2')).toBe('#1-install-2');
        expect(followed('#a1-install')).toBe('#a1-install');
      } finally {
        happyDOM.setURL(originalUrl);
      }
    });

    it('leaves a Doxia link id that an earlier heading has to that heading in the TOC', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h2>A1 Install</h2>
          <h2>1. Install</h2>
          <h2>Überblick</h2>
          <h2>Configure</h2>
          <h2 id=".C3.BCberblick">Escaped</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      const article = document.getElementById('supa-main-content')!;
      prepareHeadings(article, true, '#');
      buildTableOfContents(article, document.getElementById('supaTocNav'), 4);

      // a1-install is the earlier heading's id, so 1-install gets no anchor. The author's
      // .C3.BCberblick encodes to the alias überblick already has, so only überblick keeps it.
      expect(Array.from(article.querySelectorAll('a[id]')).map((a) => a.id)).toEqual([
        'a.C3.BCberblick'
      ]);
      const followed = (hash: string): string | null | undefined => {
        happyDOM.setURL(`${window.location.origin}/docs/guide.html${hash}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return document.querySelector('#supaTocNav a.active')?.getAttribute('href');
      };
      try {
        // The TOC marks the heading the browser scrolls to, not the one the link was written for
        expect(followed('#configure')).toBe('#configure');
        expect(followed('#a1-install')).toBe('#a1-install');
        expect(followed('#configure')).toBe('#configure');
        expect(followed('#a.C3.BCberblick')).toBe('#überblick');
      } finally {
        happyDOM.setURL(originalUrl);
      }
    });

    it('leaves a Doxia link id that a heading outside the TOC has to that heading', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      // The h1 and the h5 (deeper than the TOC's default depth of 4) own a1-install and
      // a2-install, so neither digit-first h2 gets an anchor, and neither alias may name it.
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>A1 Install</h1>
          <h2>1. Install</h2>
          <h2>2. Install</h2>
          <h5>A2 Install</h5>
          <h2>Configure</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      const article = document.getElementById('supa-main-content')!;
      prepareHeadings(article, true, '#');
      buildTableOfContents(article, document.getElementById('supaTocNav'), 4);

      expect(article.querySelectorAll('a[id]').length).toBe(0);
      const followed = (hash: string): string | null | undefined => {
        happyDOM.setURL(`${window.location.origin}/docs/guide.html${hash}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return document.querySelector('#supaTocNav a.active')?.getAttribute('href');
      };
      try {
        expect(followed('#configure')).toBe('#configure');
        expect(followed('#a1-install')).toBe('#configure');
        expect(followed('#a2-install')).toBe('#configure');
      } finally {
        happyDOM.setURL(originalUrl);
      }
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

    describe('Copy button clipboard access and fallback', () => {
      const CODE_TEXT = 'mvn -B verify site';

      /**
       * Replaces `navigator.clipboard` for one test. Passing `undefined` simulates an insecure
       * context (plain HTTP from a non-localhost host), where browsers do not expose the API.
       *
       * @param clipboard - Mock clipboard, or undefined to remove the API.
       */
      const mockClipboard = (clipboard: Pick<Clipboard, 'writeText'> | undefined): void => {
        Object.defineProperty(navigator, 'clipboard', {
          value: clipboard,
          configurable: true,
          writable: true
        });
      };

      /**
       * Installs a `document.execCommand` mock (happy-dom does not implement it). Real browsers
       * focus the temporary `<textarea>` when it is selected, but happy-dom's `select()` does
       * not, so the mock focuses it first. Without that, focus would never leave the button and
       * the focus-return assertions would pass even if the code never returned focus.
       *
       * @param impl - Implementation called with the command name.
       * @returns The installed mock.
       */
      const mockExecCommand = (impl: (commandId: string) => boolean) => {
        const execCommand = vi.fn((commandId: string) => {
          document.querySelector('textarea')?.focus();
          return impl(commandId);
        });
        Object.defineProperty(document, 'execCommand', {
          value: execCommand,
          configurable: true,
          writable: true
        });
        return execCommand;
      };

      /**
       * Renders one code block into the document and returns its focused copy button.
       *
       * @returns The copy button.
       */
      const renderCopyButton = (): HTMLButtonElement => {
        const container = document.createElement('div');
        container.innerHTML = `<pre><code>${CODE_TEXT}</code></pre>`;
        document.body.appendChild(container);
        enhanceCodeBlocks(container, false, true);
        const btn = container.querySelector<HTMLButtonElement>('.supa-copy-btn');
        expect(btn).not.toBeNull();
        btn!.focus();
        return btn!;
      };

      /**
       * Renders one code block, clicks its copy button, and waits for the click handler to
       * settle on a result state.
       *
       * @returns The clicked copy button.
       */
      const clickCopyButton = async (): Promise<HTMLButtonElement> => {
        const btn = renderCopyButton();
        btn.click();
        await vi.waitFor(() => {
          expect(btn.getAttribute('aria-label')).not.toBe('Copy code to clipboard');
        });
        return btn;
      };

      /**
       * Asserts that a copy button shows the "Copied!" confirmation.
       *
       * @param btn - Copy button to inspect.
       */
      const expectCopiedState = (btn: HTMLButtonElement): void => {
        expect(btn.classList.contains('is-copied')).toBe(true);
        expect(btn.classList.contains('is-copy-failed')).toBe(false);
        expect(btn.getAttribute('aria-label')).toBe('Copied!');
        expect(btn.getAttribute('data-bs-title')).toBe('Copied!');
      };

      /**
       * Asserts that a copy button shows the failure state and never claims success.
       *
       * @param btn - Copy button to inspect.
       */
      const expectFailedState = (btn: HTMLButtonElement): void => {
        expect(btn.classList.contains('is-copied')).toBe(false);
        expect(btn.classList.contains('is-copy-failed')).toBe(true);
        expect(btn.getAttribute('aria-label')).toBe('Copy failed');
        expect(btn.getAttribute('data-bs-title')).toBe('Copy failed');
      };

      afterEach(() => {
        Reflect.deleteProperty(navigator, 'clipboard');
        Reflect.deleteProperty(document, 'execCommand');
        vi.useRealTimers();
      });

      it('writes with navigator.clipboard when it is available and shows Copied!', async () => {
        const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
        mockClipboard({ writeText });
        const execCommand = mockExecCommand(() => true);

        const btn = await clickCopyButton();

        expect(writeText).toHaveBeenCalledWith(CODE_TEXT);
        expect(execCommand).not.toHaveBeenCalled();
        expectCopiedState(btn);
      });

      it('falls back to a hidden textarea and execCommand("copy") when navigator.clipboard is absent', async () => {
        mockClipboard(undefined);
        let copiedValue: string | undefined;
        let textareaWasReadonly = false;
        const execCommand = mockExecCommand(() => {
          const textarea = document.querySelector('textarea');
          copiedValue = textarea?.value;
          textareaWasReadonly = textarea?.hasAttribute('readonly') ?? false;
          return true;
        });

        const btn = await clickCopyButton();

        expect(execCommand).toHaveBeenCalledWith('copy');
        expect(copiedValue).toBe(CODE_TEXT);
        expect(textareaWasReadonly).toBe(true);
        expect(document.querySelector('textarea')).toBeNull();
        expect(document.activeElement).toBe(btn);
        expectCopiedState(btn);
      });

      it('shows Copy failed, never Copied!, when navigator.clipboard is absent and execCommand fails or throws', async () => {
        const failingImpls: Array<(commandId: string) => boolean> = [
          () => false,
          () => {
            throw new Error('execCommand is not supported');
          }
        ];
        for (const impl of failingImpls) {
          document.body.innerHTML = '';
          mockClipboard(undefined);
          const execCommand = mockExecCommand(impl);

          const btn = await clickCopyButton();

          expect(execCommand).toHaveBeenCalledWith('copy');
          expect(document.querySelector('textarea')).toBeNull();
          expect(document.activeElement).toBe(btn);
          expectFailedState(btn);
        }
      });

      it('shows Copy failed when neither navigator.clipboard nor execCommand exists', async () => {
        mockClipboard(undefined);
        Reflect.deleteProperty(document, 'execCommand');

        const btn = await clickCopyButton();

        expect(document.querySelector('textarea')).toBeNull();
        expectFailedState(btn);
      });

      it('falls back to execCommand("copy") when navigator.clipboard.writeText rejects', async () => {
        const writeText = vi
          .fn<(text: string) => Promise<void>>()
          .mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'));
        mockClipboard({ writeText });
        const execCommand = mockExecCommand(() => true);

        const btn = await clickCopyButton();

        expect(writeText).toHaveBeenCalledWith(CODE_TEXT);
        expect(execCommand).toHaveBeenCalledWith('copy');
        expectCopiedState(btn);

        document.body.innerHTML = '';
        mockExecCommand(() => false);
        expectFailedState(await clickCopyButton());
      });

      it('resets the failure state to the idle Copy code state after the same delay as success', async () => {
        vi.useFakeTimers();
        mockClipboard(undefined);
        mockExecCommand(() => false);

        // vi.waitFor() advances fake timers on every poll, so click directly and only flush
        // pending promises (advancing by 0 ms) to keep the reset countdown measurable.
        const btn = renderCopyButton();
        btn.click();
        await vi.advanceTimersByTimeAsync(0);
        expectFailedState(btn);

        vi.advanceTimersByTime(1799);
        expectFailedState(btn);

        vi.advanceTimersByTime(1);
        expect(btn.classList.contains('is-copy-failed')).toBe(false);
        expect(btn.classList.contains('is-copied')).toBe(false);
        expect(btn.getAttribute('aria-label')).toBe('Copy code to clipboard');
        expect(btn.getAttribute('data-bs-title')).toBe('Copy code');
      });

      it('puts the fallback textarea inside the code block, so a modal dialog cannot make it inert', async () => {
        mockClipboard(undefined);
        let textareaParent: Element | null | undefined;
        mockExecCommand(() => {
          textareaParent = document.querySelector('textarea')?.parentElement;
          return true;
        });

        const btn = await clickCopyButton();

        // A <textarea> appended to <body> is inert while a modal <dialog> (Bootstrap's .dialog or
        // .drawer) is open, so nothing is selected, yet Chromium and Firefox report success.
        expect(textareaParent).toBe(btn.parentElement);
        expect(textareaParent?.classList.contains('supa-code-block')).toBe(true);
        expectCopiedState(btn);
      });

      it('shows Copy failed when the fallback textarea cannot take focus, even if execCommand reports success', async () => {
        mockClipboard(undefined);
        // Stands in for an inert textarea: it cannot be focused or selected.
        const focusSpy = vi
          .spyOn(HTMLTextAreaElement.prototype, 'focus')
          .mockImplementation(() => undefined);
        mockExecCommand(() => true);
        try {
          const btn = await clickCopyButton();

          expect(document.querySelector('textarea')).toBeNull();
          expectFailedState(btn);
        } finally {
          focusSpy.mockRestore();
        }
      });

      it('returns focus to the button only after showing the result, so it is announced on refocus', async () => {
        for (const copied of [true, false]) {
          document.body.innerHTML = '';
          mockClipboard(undefined);
          mockExecCommand(() => copied);
          const btn = renderCopyButton();
          const labelsOnRefocus: Array<string | null> = [];
          btn.addEventListener('focus', () => {
            labelsOnRefocus.push(btn.getAttribute('aria-label'));
          });

          btn.click();
          await vi.waitFor(() => {
            expect(document.activeElement).toBe(btn);
          });

          expect(labelsOnRefocus).toEqual([copied ? 'Copied!' : 'Copy failed']);
          if (copied) {
            expectCopiedState(btn);
          } else {
            expectFailedState(btn);
          }
        }
      });

      it('does not move focus to the button after the fallback when the button never had focus', async () => {
        mockClipboard(undefined);
        mockExecCommand(() => true);
        const btn = renderCopyButton();
        // WebKit does not focus a button on mouse click, so focus stays on <body>.
        btn.blur();
        expect(document.activeElement).toBe(document.body);

        btn.click();
        await vi.waitFor(() => {
          expect(btn.getAttribute('aria-label')).not.toBe('Copy code to clipboard');
        });

        expectCopiedState(btn);
        expect(document.activeElement).not.toBe(btn);
        expect(document.activeElement).toBe(document.body);
      });
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

    it('converts page-relative links to site-root-relative hrefs and back for any page depth', () => {
      const nestedPage = 'https://example.org/docs/guides/install.html';
      expect(toSiteRootHref('../faq.html', nestedPage, '..')).toBe('faq.html');
      expect(toSiteRootHref('../guides/install.html#setup', nestedPage, '..')).toBe(
        'guides/install.html#setup'
      );
      expect(toSiteRootHref('/project-info.html', nestedPage, '..')).toBe('project-info.html');
      expect(toSiteRootHref('#requirements', nestedPage, '..')).toBe('#requirements');
      expect(toSiteRootHref('https://maven.apache.org/', nestedPage, '..')).toBe(
        'https://maven.apache.org/'
      );
      // A parent-project link leaves the site, so it is pinned to an absolute URL
      expect(toSiteRootHref('../../index.html', nestedPage, '..')).toBe('https://example.org/index.html');
      expect(toSiteRootHref('faq.html', 'https://example.org/docs/index.html', '.')).toBe('faq.html');
      expect(toSiteRootHref('faq.html', 'about:blank', '.')).toBe('faq.html');

      expect(toPageHref('faq.html', '.')).toBe('faq.html');
      expect(toPageHref('guides/install.html#setup', '..')).toBe('../guides/install.html#setup');
      expect(toPageHref('faq.html', '../../')).toBe('../../faq.html');
      expect(toPageHref('#requirements', '..')).toBe('#requirements');
      expect(toPageHref('/server/path.html', '..')).toBe('/server/path.html');
      expect(toPageHref('https://maven.apache.org/', '..')).toBe('https://maven.apache.org/');
      expect(toPageHref('mailto:dev@example.org', '..')).toBe('mailto:dev@example.org');

      document.documentElement.setAttribute('data-supa-relative-path', '..');
      expect(getSiteRelativePath()).toBe('..');
      document.documentElement.removeAttribute('data-supa-relative-path');
      expect(getSiteRelativePath()).toBe('.');
    });

    describe('search index shared through sessionStorage', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const remotePages: Record<string, string> = {
        'https://example.org/docs/index.html': `
          <title>Welcome</title>
          <main id="supa-main-content"><h1>Welcome</h1><h2 id="architecture">Architecture</h2><p>Layers.</p></main>`,
        'https://example.org/docs/guides/install.html': `
          <title>Installation</title>
          <main id="supa-main-content"><h1>Installation</h1><h2 id="requirements">Requirements</h2><p>Java.</p></main>`,
        'https://example.org/docs/faq.html': `
          <title>FAQ</title>
          <main id="supa-main-content"><h1>FAQ</h1><h2 id="top">Top Questions</h2><p>Answers.</p></main>`,
        'https://example.org/docs/fr/index.html': `
          <title>Bienvenue</title>
          <main id="supa-main-content"><h1>Bienvenue</h1><h2 id="architecture">Architecture</h2><p>Couches.</p></main>`,
        'https://example.org/docs/fr/guides/install.html': `
          <title>Mise en route</title>
          <main id="supa-main-content"><h1>Mise en route</h1><h2 id="prerequis">Prérequis</h2><p>Java.</p></main>`
      };
      const fetchMock = vi.fn(async (input: string) => {
        // search.ts fetches page-relative URLs, which the browser resolves against the page
        const html = remotePages[new URL(input, window.location.href).href];
        return { ok: html !== undefined, text: async () => html ?? '' } as unknown as Response;
      });

      beforeEach(() => {
        window.sessionStorage.clear();
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
      });

      afterEach(() => {
        happyDOM.setURL(originalUrl);
        vi.unstubAllGlobals();
        window.sessionStorage.clear();
        document.documentElement.removeAttribute('data-supa-relative-path');
        document.documentElement.removeAttribute('data-supa-project-version');
        document.documentElement.removeAttribute('lang');
      });

      /**
       * Renders a search-enabled page as site.vm would at `pageUrl`, with sidebar links already
       * relativized for the page, and initializes search on it.
       *
       * @param pageUrl - Absolute URL of the page.
       * @param relativePath - Doxia `$relativePath` of the page.
       * @param heading - Heading id and text in the page's own article.
       * @param extraNavLinks - Additional sidebar link markup, written for this page.
       */
      const openPage = (
        pageUrl: string,
        relativePath: string,
        heading: string,
        extraNavLinks = ''
      ): void => {
        happyDOM.setURL(pageUrl);
        const prefix = relativePath === '.' ? '' : `${relativePath}/`;
        document.documentElement.setAttribute('data-supa-relative-path', relativePath);
        document.documentElement.setAttribute('data-supa-project-version', '1.0.0');
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree">
            <a class="supa-nav-link" href="${prefix}index.html">Welcome</a>
            <a class="supa-nav-link" href="${prefix}guides/install.html">Installation</a>
            ${extraNavLinks}
          </nav>
          <main id="supa-main-content"><h2 id="${heading}">${heading}</h2></main>
          <dialog id="supaSearchDialog">
            <input id="supaSearchInput" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults"></div>
          </dialog>`;
        initSearch();
      };

      /**
       * Types `query` into the search input and waits until the site index has been merged in.
       *
       * @param query - Search query.
       * @param expectedHref - Result href attribute that signals the merged index was rendered.
       * @returns Href attributes of the rendered results.
       */
      const search = async (query: string, expectedHref: string): Promise<string[]> => {
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        input.value = query;
        input.dispatchEvent(new Event('input'));
        const hrefs = (): string[] =>
          Array.from(document.querySelectorAll('.supa-search-result-item')).map(
            (link) => link.getAttribute('href') || ''
          );
        await vi.waitFor(() => expect(hrefs()).toContain(expectedHref));
        return hrefs();
      };

      it('reuses an index built on a top-level page with working links on a nested page', async () => {
        openPage('https://example.org/docs/index.html', '.', 'architecture');
        expect(await search('requirements', 'guides/install.html#requirements')).toEqual([
          'guides/install.html#requirements'
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const cached = JSON.parse(
          window.sessionStorage.getItem(getSearchIndexCacheKey()) || '[]'
        ) as Array<{ href: string }>;
        expect(cached.map((doc) => doc.href).sort()).toEqual([
          'guides/install.html',
          'guides/install.html#requirements',
          'index.html',
          'index.html#architecture'
        ]);

        openPage('https://example.org/docs/guides/install.html', '..', 'requirements');
        expect(await search('architecture', '../index.html#architecture')).toEqual([
          '../index.html#architecture'
        ]);
        // The cached entry for this page's own heading yields to the local #fragment link
        expect(await search('requirements', '#requirements')).toEqual(['#requirements']);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('reuses an index built on a nested page with working links on a top-level page', async () => {
        openPage('https://example.org/docs/guides/install.html', '..', 'requirements');
        expect(await search('architecture', '../index.html#architecture')).toEqual([
          '../index.html#architecture'
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        openPage('https://example.org/docs/index.html', '.', 'architecture');
        expect(await search('requirements', 'guides/install.html#requirements')).toEqual([
          'guides/install.html#requirements'
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('links a sidebar item for the site root to the site root from any page depth', async () => {
        // site.vm writes the site root as "./", "../", or "../../": the site-root-relative path
        // is empty, which must not turn into an empty href that reopens the current page
        const nestedPage = 'https://example.org/docs/guides/install.html';
        expect(toSiteRootHref('../', nestedPage, '..')).toBe('./');
        expect(toSiteRootHref('../#news', nestedPage, '..')).toBe('./#news');
        expect(toSiteRootHref('./', 'https://example.org/docs/index.html', '.')).toBe('./');
        expect(toPageHref('./', '.')).toBe('./');
        expect(toPageHref('./', '..')).toBe('../');
        expect(toPageHref('./#news', '../..')).toBe('../../#news');

        const homeLink = (href: string): string => `<a class="supa-nav-link" href="${href}">Home</a>`;
        openPage('https://example.org/docs/index.html', '.', 'architecture', homeLink('./'));
        expect(await search('home', './')).toEqual(['./']);

        openPage(nestedPage, '..', 'requirements', homeLink('../'));
        expect(await search('home', '../')).toEqual(['../']);

        // On the directory URL of the site root, the index.html entries in the merged index still
        // yield to the page's own #fragment headings
        openPage('https://example.org/docs/', '.', 'architecture');
        await search('requirements', 'guides/install.html#requirements');
        expect(await search('architecture', '#architecture')).toEqual(['#architecture']);
      });

      it('crawls same-origin sidebar pages outside the site root, such as the parent project', async () => {
        // On a module site, <menu ref="parent"/> links to the parent site one directory up
        openPage(
          'https://example.org/docs/module-a/index.html',
          '.',
          'overview',
          `<a class="supa-nav-link" href="../index.html">Parent Project</a>
           <a class="supa-nav-link" href="https://maven.apache.org/index.html">Maven</a>`
        );
        expect(
          await search('architecture', 'https://example.org/docs/index.html#architecture')
        ).toEqual(['https://example.org/docs/index.html#architecture']);
        expect(fetchMock).toHaveBeenCalledWith('https://example.org/docs/index.html');
        expect(fetchMock).not.toHaveBeenCalledWith('https://maven.apache.org/index.html');
      });

      /**
       * Reads the rendered search results as their displayed titles and href attributes.
       *
       * @returns `[title text, href]` for each result, in rendered order.
       */
      const renderedResults = (): Array<[string, string]> =>
        Array.from(document.querySelectorAll('.supa-search-result-item')).map((link) => [
          link.querySelector('.supa-search-result-title')?.textContent || '',
          link.getAttribute('href') || ''
        ]);

      it('keeps the index of each locale of a multi-locale site apart', async () => {
        // maven-site-plugin renders the default locale at the site root and every other locale
        // under <locale>/, on the same origin and with the same project version
        document.documentElement.setAttribute('lang', 'en');
        openPage('https://example.org/docs/index.html', '.', 'architecture');
        expect(await search('requirements', 'guides/install.html#requirements')).toEqual([
          'guides/install.html#requirements'
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        document.documentElement.setAttribute('lang', 'fr');
        openPage('https://example.org/docs/fr/index.html', '.', 'architecture');
        expect(await search('prérequis', 'guides/install.html#prerequis')).toEqual([
          'guides/install.html#prerequis'
        ]);
        expect(renderedResults()).toEqual([
          ['Mise en route › Prérequis', 'guides/install.html#prerequis']
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(4);

        // Every page of one locale shares that locale's index, at any directory depth
        openPage('https://example.org/docs/fr/guides/install.html', '..', 'prerequis');
        expect(await search('couches', '../index.html#architecture')).toEqual([
          '../index.html#architecture'
        ]);
        expect(renderedResults()).toEqual([
          ['Bienvenue › Architecture', '../index.html#architecture']
        ]);

        document.documentElement.setAttribute('lang', 'en');
        openPage('https://example.org/docs/guides/install.html', '..', 'requirements');
        expect(await search('layers', '../index.html#architecture')).toEqual([
          '../index.html#architecture'
        ]);
        expect(renderedResults()).toEqual([
          ['Welcome › Architecture', '../index.html#architecture']
        ]);
        expect(fetchMock).toHaveBeenCalledTimes(4);
      });

      it('caches entry kinds rather than generic section text, and still shows and ranks that text', async () => {
        // No <title> or <h1> here, so this page's headings fall back to the generic section
        // name; faq.html is reached only through a #fragment link, so its page entry survives
        // the merge with the sidebar links
        openPage(
          'https://example.org/docs/index.html',
          '.',
          'architecture',
          '<a class="supa-nav-link" href="faq.html#top">FAQ</a>'
        );
        expect(await search('site page', 'faq.html')).toEqual(['faq.html']);
        expect(renderedResults()).toEqual([['Site Page › FAQ', 'faq.html']]);

        const cacheKeys = Object.keys(window.sessionStorage).filter((key) =>
          key.startsWith('supa-search-index-')
        );
        expect(cacheKeys).toHaveLength(1);
        const cached = window.sessionStorage.getItem(cacheKeys[0]) || '';
        expect(cached).not.toContain('Site Page');
        expect(
          (JSON.parse(cached) as Array<{ kind: string }>).map((doc) => doc.kind).sort()
        ).toEqual(['page', 'page', 'page', 'section', 'section', 'section']);

        await search('navigation', 'index.html');
        expect(renderedResults()).toEqual([
          ['Navigation › Welcome', 'index.html'],
          ['Navigation › Installation', 'guides/install.html'],
          ['Navigation › FAQ', 'faq.html#top']
        ]);
        await search('current page', '#architecture');
        expect(renderedResults()).toEqual([['Current Page › architecture', '#architecture']]);
        await search('installation', 'guides/install.html#requirements');
        expect(renderedResults()).toEqual([
          ['Navigation › Installation', 'guides/install.html'],
          ['Installation › Requirements', 'guides/install.html#requirements']
        ]);
        await search('faq', 'faq.html');
        expect(renderedResults()).toEqual([
          ['Navigation › FAQ', 'faq.html#top'],
          ['Site Page › FAQ', 'faq.html']
        ]);

        // The cached kinds give the same text on a page that reuses the index
        openPage('https://example.org/docs/guides/install.html', '..', 'requirements');
        expect(await search('site page', '../faq.html')).toEqual(['../faq.html']);
        expect(renderedResults()).toEqual([['Site Page › FAQ', '../faq.html']]);
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      it('keys the index by project version, page language, and site root URL', () => {
        /**
         * Points the document at `pageUrl` as site.vm would render it and reads the cache key.
         *
         * @param pageUrl - Absolute URL of the page.
         * @param relativePath - Doxia `$relativePath` of the page.
         * @param lang - `<html lang>` of the page.
         * @param version - Project version of the page.
         * @returns The page's search index cache key.
         */
        const keyFor = (pageUrl: string, relativePath: string, lang: string, version = '1.0.0'): string => {
          happyDOM.setURL(pageUrl);
          document.documentElement.setAttribute('data-supa-relative-path', relativePath);
          document.documentElement.setAttribute('data-supa-project-version', version);
          document.documentElement.setAttribute('lang', lang);
          return getSearchIndexCacheKey();
        };

        const defaultLocale = keyFor('https://example.org/docs/index.html', '.', 'en');
        expect(defaultLocale).toBe('supa-search-index-1.0.0 en https://example.org/docs/');
        expect(keyFor('https://example.org/docs/', '.', 'en')).toBe(defaultLocale);
        expect(keyFor('https://example.org/docs/guides/install.html?q=1#setup', '..', 'en')).toBe(
          defaultLocale
        );
        expect(keyFor('https://example.org/docs/a/b/c.html', '../..', 'en')).toBe(defaultLocale);

        const french = keyFor('https://example.org/docs/fr/index.html', '.', 'fr');
        expect(french).toBe('supa-search-index-1.0.0 fr https://example.org/docs/fr/');
        expect(keyFor('https://example.org/docs/fr/guides/install.html', '..', 'fr')).toBe(french);

        // Another site root (a module site below its parent) or version keeps its own index
        expect(keyFor('https://example.org/docs/module-a/index.html', '.', 'en')).toBe(
          'supa-search-index-1.0.0 en https://example.org/docs/module-a/'
        );
        expect(keyFor('https://example.org/docs/index.html', '.', 'en', '1.1.0')).toBe(
          'supa-search-index-1.1.0 en https://example.org/docs/'
        );
        expect(keyFor('https://example.org/docs/index.html', '.', 'de')).not.toBe(defaultLocale);
      });
    });

    it('links results to non-ASCII headings on crawled pages by the ids those pages assign', async () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      // Doxia 2 writes no heading ids, so the crawler slugs headings the way prepareHeadings does
      const guideArticle =
        '<h1>Handbuch</h1><h2>Überblick</h2><p>Erste Schritte.</p><h2>概要</h2><h3>概要</h3>';
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          text: async () => `<title>Handbuch</title><main id="supa-main-content">${guideArticle}</main>`
        }) as unknown as Response)
      );
      window.sessionStorage.clear();
      try {
        happyDOM.setURL('https://example.org/docs/index.html');
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree"><a class="supa-nav-link" href="guide.html">Handbuch</a></nav>
          <main id="supa-main-content"><h1>Start</h1></main>
          <dialog id="supaSearchDialog">
            <input id="supaSearchInput" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults"></div>
          </dialog>`;
        initSearch();
        const resultHrefs = (): string[] =>
          Array.from(document.querySelectorAll('.supa-search-result-item')).map(
            (link) => link.getAttribute('href') || ''
          );
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        input.value = '概要';
        input.dispatchEvent(new Event('input'));
        await vi.waitFor(() => expect(resultHrefs()).toContain('guide.html#概要-2'));
        input.value = 'überblick';
        input.dispatchEvent(new Event('input'));
        const fragments = [...resultHrefs()];
        input.value = '概要';
        input.dispatchEvent(new Event('input'));
        fragments.push(...resultHrefs());
        const sectionFragments = fragments
          .filter((href) => href.includes('#'))
          .map((href) => href.slice(href.indexOf('#') + 1));
        expect(sectionFragments).toEqual(['überblick', '概要', '概要-2']);

        // Open the crawled page: every fragment names the heading the search result is titled after
        document.body.innerHTML = `<main id="supa-main-content">${guideArticle}</main>`;
        prepareHeadings(document.getElementById('supa-main-content')!, false);
        expect(sectionFragments.map((id) => document.getElementById(id)?.textContent)).toEqual([
          'Überblick',
          '概要',
          '概要'
        ]);
        expect(document.getElementById('概要')?.tagName).toBe('H2');
        expect(document.getElementById('概要-2')?.tagName).toBe('H3');
      } finally {
        happyDOM.setURL(originalUrl);
        vi.unstubAllGlobals();
        window.sessionStorage.clear();
      }
    });

    it('lists a sidebar link to a non-ASCII heading once, merged with the crawled section', async () => {
      // URL parsing percent-encodes a fragment (#%C3%BCberblick), and crawled sections keep the
      // id as the page assigns it (#überblick), so both must reach the index in one form
      expect(toSiteRootHref('guide.html#überblick', 'https://example.org/docs/index.html', '.')).toBe(
        'guide.html#überblick'
      );
      expect(
        toSiteRootHref('guide.html#%C3%BCberblick', 'https://example.org/docs/index.html', '.')
      ).toBe('guide.html#überblick');
      expect(toSiteRootHref('guide.html#100%', 'https://example.org/docs/index.html', '.')).toBe(
        'guide.html#100%'
      );

      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          text: async () =>
            '<title>Handbuch</title><main id="supa-main-content"><h1>Handbuch</h1>' +
            '<h2>Überblick</h2><p>Erste Schritte.</p><h2>Overview</h2><p>First steps.</p>' +
            '<h2>Details</h2><p>Only on the crawled page.</p></main>'
        }) as unknown as Response)
      );
      window.sessionStorage.clear();
      try {
        happyDOM.setURL('https://example.org/docs/index.html');
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree">
            <a class="supa-nav-link" href="guide.html">Handbuch</a>
            <a class="supa-nav-link" href="guide.html#überblick">Überblick</a>
            <a class="supa-nav-link" href="guide.html#overview">Overview</a>
          </nav>
          <main id="supa-main-content"><h1>Start</h1></main>
          <dialog id="supaSearchDialog">
            <input id="supaSearchInput" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults"></div>
          </dialog>`;
        initSearch();
        const resultHrefs = (): string[] =>
          Array.from(document.querySelectorAll('.supa-search-result-item')).map(
            (link) => link.getAttribute('href') || ''
          );
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        // Wait for the crawl, which adds the sections the sidebar does not link to
        input.value = 'details';
        input.dispatchEvent(new Event('input'));
        await vi.waitFor(() => expect(resultHrefs()).toContain('guide.html#details'));

        // As for the ASCII heading, the sidebar entry stands for the crawled section
        input.value = 'overview';
        input.dispatchEvent(new Event('input'));
        expect(resultHrefs().filter((href) => href.includes('#'))).toEqual(['guide.html#overview']);
        input.value = 'überblick';
        input.dispatchEvent(new Event('input'));
        expect(resultHrefs().filter((href) => href.includes('#'))).toEqual(['guide.html#überblick']);
      } finally {
        happyDOM.setURL(originalUrl);
        vi.unstubAllGlobals();
        window.sessionStorage.clear();
      }
    });

    describe('crawled headings, linked and labeled as their own page renders them', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const pageLang = document.documentElement.getAttribute('lang');
      let guideHtml = '';
      const fetchMock = vi.fn(
        async () => ({ ok: true, text: async () => guideHtml }) as unknown as Response
      );

      beforeEach(() => {
        window.sessionStorage.clear();
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
        happyDOM.setURL('https://example.org/docs/index.html');
        document.documentElement.setAttribute('lang', 'en');
      });

      afterEach(() => {
        happyDOM.setURL(originalUrl);
        vi.unstubAllGlobals();
        window.sessionStorage.clear();
        if (pageLang === null) {
          document.documentElement.removeAttribute('lang');
        } else {
          document.documentElement.setAttribute('lang', pageLang);
        }
      });

      /**
       * Opens a search-enabled page at the site root whose sidebar links to `guide.html`, which
       * serves `guideArticle`, lets the crawl finish, and then runs each query.
       *
       * @param guideArticle - Article markup of the crawled `guide.html`, as Doxia writes it.
       * @param queries - Queries to type once the site index is complete.
       * @param localArticle - Article markup of the page that runs the search.
       * @returns The rendered result links for each query, in order.
       */
      const searchGuide = async (
        guideArticle: string,
        queries: string[],
        localArticle = '<h1>Start</h1>'
      ): Promise<HTMLAnchorElement[][]> => {
        guideHtml =
          '<!DOCTYPE html><html lang="en"><head><title>Guide</title></head><body>' +
          `<main id="supa-main-content">${guideArticle}</main></body></html>`;
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree"><a class="supa-nav-link" href="guide.html">Guide</a></nav>
          <main id="supa-main-content">${localArticle}</main>
          <dialog id="supaSearchDialog">
            <input id="supaSearchInput" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults"></div>
          </dialog>`;
        initSearch();
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        input.value = queries[0] ?? '';
        input.dispatchEvent(new Event('input'));
        // The crawl caches its entries just before they are merged into the index
        await vi.waitFor(() =>
          expect(window.sessionStorage.getItem(getSearchIndexCacheKey())).not.toBeNull()
        );
        await new Promise((resolveWait) => setTimeout(resolveWait, 0));
        return queries.map((query) => {
          input.value = query;
          input.dispatchEvent(new Event('input'));
          return Array.from(
            document.querySelectorAll<HTMLAnchorElement>('.supa-search-result-item')
          );
        });
      };

      /**
       * Renders `guideArticle` the way `guide.html` renders itself in the browser: Doxia
       * normalization first, then heading ids, as `initSupaSkin()` orders them.
       *
       * @param guideArticle - Article markup of `guide.html`.
       */
      const openGuide = (guideArticle: string): void => {
        document.body.innerHTML = `<main id="supa-main-content">${guideArticle}</main>`;
        const article = document.getElementById('supa-main-content')!;
        initDoxiaEnhancements(article);
        prepareHeadings(article, false);
      };

      /**
       * Lists the `#fragment` of every result link that points into `guide.html`.
       *
       * @param results - Rendered result links.
       * @returns The fragments, in rendered order.
       */
      const guideFragments = (results: HTMLAnchorElement[]): string[] =>
        results
          .map((link) => link.getAttribute('href') || '')
          .filter((href) => href.startsWith('guide.html#'))
          .map((href) => href.slice('guide.html#'.length));

      it('numbers repeated headings over h1-h6, as the page does, while indexing h1-h4', async () => {
        const guide =
          '<h1>Guide</h1>' +
          '<h5>Example</h5><p>Fine print.</p><h5>Example</h5><p>Finer print.</p>' +
          '<h2>Example</h2><p>First example.</p><h2>Example</h2><p>Second example.</p>';
        const [results] = await searchGuide(guide, ['example']);
        const fragments = guideFragments(results);
        expect(fragments).toEqual(['example-3', 'example-4']);

        openGuide(guide);
        const targets = fragments.map((id) => document.getElementById(id));
        expect(targets.map((el) => el?.tagName)).toEqual(['H2', 'H2']);
        expect(targets.map((el) => el?.nextElementSibling?.textContent)).toEqual([
          'First example.',
          'Second example.'
        ]);
      });

      it('skips ids already taken on the page, as the page does', async () => {
        // An empty <a id> written by Doxia or the author before another heading, an author id on
        // a paragraph, and a Doxia anchor that holds its own heading's slug, which the heading
        // then takes over
        const guide =
          '<h1>Guide</h1>' +
          '<a id="faq"></a><h2>Questions</h2><p>Asked often.</p>' +
          '<h2>FAQ</h2><p>Answered here.</p>' +
          '<p id="usage">Run it.</p><h2>Usage</h2><p>Options.</p>' +
          '<section><a id="install"></a><h2>Install</h2><p>Download.</p></section>';
        const results = await searchGuide(guide, ['faq', 'usage', 'install']);
        const fragments = results.map(guideFragments);
        expect(fragments).toEqual([['faq-2'], ['usage-2'], ['install']]);

        openGuide(guide);
        expect(fragments.flat().map((id) => document.getElementById(id)?.textContent)).toEqual([
          'FAQ',
          'Usage',
          'Install'
        ]);
        expect(document.getElementById('faq')?.tagName).toBe('A');
        expect(document.getElementById('usage')?.tagName).toBe('P');
      });

      it('links headings that the page transforms before it assigns ids', async () => {
        // Synchronized tabs become .not-prose, so their headings get no id, and a :bi-*: shortcode
        // becomes an icon, which leaves the heading text and its slug
        const guide =
          '<h1>Guide</h1>' +
          '<div class="supa-tabs">' +
          '<div data-tab="Maven"><h3>Setup</h3><p>Maven steps.</p></div>' +
          '</div>' +
          '<h2>Setup</h2><p>Shared steps.</p>' +
          '<h2>:bi-star: Favorites</h2><p>Starred pages.</p>';
        const results = await searchGuide(guide, ['setup', 'favorites']);
        expect(results.map(guideFragments)).toEqual([['setup'], ['favorites']]);
        expect(results[1][0]?.querySelector('.supa-search-result-title')?.textContent).toBe(
          'Guide › Favorites'
        );

        openGuide(guide);
        expect(document.getElementById('setup')?.nextElementSibling?.textContent).toBe(
          'Shared steps.'
        );
        expect(document.getElementById('favorites')?.tagName).toBe('H2');
      });

      it('declares the language of heading text in result titles and snippets', async () => {
        const guide =
          '<h1>Guide</h1>' +
          '<h2><span lang="ja">概要</span></h2><p>Short summary.</p>' +
          '<h2>Overview</h2><p>Longer summary.</p>';
        const [japanese, english, local] = await searchGuide(
          guide,
          ['概要', 'overview', 'überblick'],
          '<h1>Start</h1><h2 id="überblick" lang="de">Überblick</h2><p>Erste Schritte.</p>'
        );
        expect(guideFragments(japanese)).toEqual(['概要']);
        expect(
          Array.from(japanese[0].querySelectorAll('[lang]')).map((el) => [
            el.closest('.supa-search-result-title, .supa-search-result-snippet')?.className,
            el.getAttribute('lang'),
            el.textContent
          ])
        ).toEqual([
          ['supa-search-result-title', 'ja', '概要'],
          ['supa-search-result-snippet', 'ja', '概要']
        ]);
        // The section name stays in the page language, and so does the text after the heading
        expect(japanese[0].querySelector('.supa-search-result-title')?.textContent).toBe(
          'Guide › 概要'
        );
        expect(japanese[0].querySelector('.supa-search-result-snippet')?.textContent).toBe(
          '概要 Short summary.'
        );

        // Text in the language of its page declares none
        expect(guideFragments(english)).toEqual(['overview']);
        expect(english[0].querySelector('[lang]')).toBeNull();

        // Headings on the page that runs the search are indexed the same way
        expect(local.map((link) => link.getAttribute('href'))).toEqual(['#überblick']);
        expect(
          local[0].querySelector('.supa-search-result-title [lang]')?.getAttribute('lang')
        ).toBe('de');

        const cached = JSON.parse(
          window.sessionStorage.getItem(getSearchIndexCacheKey()) || '[]'
        ) as Array<{ href: string; lang?: string }>;
        expect(cached.filter((doc) => doc.lang).map((doc) => [doc.href, doc.lang])).toEqual([
          ['guide.html#概要', 'ja']
        ]);
      });

      it('renders cached entries without a language, as 0.1.6 stored them', async () => {
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree"><a class="supa-nav-link" href="guide.html">Guide</a></nav>
          <main id="supa-main-content"><h1>Start</h1></main>
          <dialog id="supaSearchDialog">
            <input id="supaSearchInput" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults"></div>
          </dialog>`;
        window.sessionStorage.setItem(
          getSearchIndexCacheKey(),
          JSON.stringify([
            { title: 'Guide', href: 'guide.html', kind: 'page', content: 'Guide 概要' },
            {
              title: '概要',
              href: 'guide.html#概要',
              section: 'Guide',
              kind: 'section',
              content: '概要 Short.'
            },
            // Not a language tag: rendered as if absent
            {
              title: 'Overview',
              href: 'guide.html#overview',
              section: 'Guide',
              kind: 'section',
              content: 'Overview',
              lang: 7
            }
          ])
        );
        initSearch();
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        input.value = 'guide';
        input.dispatchEvent(new Event('input'));
        await vi.waitFor(() =>
          expect(document.querySelectorAll('.supa-search-result-item').length).toBe(3)
        );
        expect(fetchMock).not.toHaveBeenCalled();
        const results = Array.from(document.querySelectorAll('.supa-search-result-item'));
        const titles = results.map(
          (link) => link.querySelector('.supa-search-result-title')?.textContent
        );
        expect(titles).toEqual([
          'Navigation › Guide',
          'Guide › 概要',
          'Guide › Overview'
        ]);
        expect(document.querySelector('#supaSearchResults [lang]')).toBeNull();
      });
    });
  });

  describe('Optional Mermaid & KaTeX Loading (pinned CDN + SRI)', () => {
    const optionalGlobals = ['mermaid', 'katex', 'renderMathInElement'];
    const optionalBodyAttrs = [
      'data-supa-mermaid',
      'data-supa-mermaid-url',
      'data-supa-katex',
      'data-supa-katex-css-url',
      'data-supa-katex-js-url'
    ];
    let appended: Element[] = [];
    let onExecute: (src: string) => void = () => undefined;
    let failingSrcs = new Set<string>();
    let heldSrcs = new Set<string>();

    /**
     * Returns the global object as an indexable record for installing fakes.
     *
     * @returns The writable global record.
     */
    function globals(): Record<string, unknown> {
      return globalThis as unknown as Record<string, unknown>;
    }

    /**
     * Sets how simulated `<script>` executions install globals. The real file
     * never runs: appends to `<head>` are intercepted so happy-dom performs no
     * network fetches, and each script's `load` event fires after `execute`.
     *
     * @param execute - Called with each script's `src` before `load` fires.
     */
    function simulateScriptExecution(execute: (src: string) => void): void {
      onExecute = execute;
    }

    /**
     * Makes the listed script URLs fire `error` instead of `load`, which is how
     * browsers report network failures and SRI mismatches.
     *
     * @param srcs - Script `src` values that should fail.
     */
    function simulateScriptFailure(...srcs: string[]): void {
      failingSrcs = new Set(srcs);
    }

    /**
     * Keeps the listed script URLs pending: neither `load` nor `error` fires
     * until the test dispatches one on the intercepted element.
     *
     * @param srcs - Script `src` values that should stay pending.
     */
    function simulateScriptPending(...srcs: string[]): void {
      heldSrcs = new Set(srcs);
    }

    /**
     * Builds a fake Mermaid API whose `run` resolves immediately.
     *
     * @returns Fake Mermaid object with spy methods.
     */
    function fakeMermaid(): { initialize: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> } {
      return { initialize: vi.fn(), run: vi.fn(async () => undefined) };
    }

    /**
     * Lists the `<script>` elements the loader tried to append to `<head>`.
     *
     * @returns Intercepted script elements in append order.
     */
    function headScripts(): HTMLScriptElement[] {
      return appended.filter((el): el is HTMLScriptElement => el instanceof HTMLScriptElement);
    }

    /**
     * Returns the first stylesheet `<link>` the loader tried to append.
     *
     * @returns The intercepted link element, or `undefined`.
     */
    function headStylesheet(): HTMLLinkElement | undefined {
      return appended.find((el): el is HTMLLinkElement => el instanceof HTMLLinkElement);
    }

    beforeEach(() => {
      appended = [];
      onExecute = () => undefined;
      failingSrcs = new Set<string>();
      heldSrcs = new Set<string>();
      optionalBodyAttrs.forEach((name) => document.body.removeAttribute(name));
      optionalGlobals.forEach((name) => delete globals()[name]);
      vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
        if (node instanceof Element) {
          appended.push(node);
        }
        if (node instanceof HTMLScriptElement) {
          const script = node;
          queueMicrotask(() => {
            const src = script.getAttribute('src') ?? '';
            if (heldSrcs.has(src)) {
              return;
            }
            if (failingSrcs.has(src)) {
              script.dispatchEvent(new Event('error'));
              return;
            }
            onExecute(src);
            script.dispatchEvent(new Event('load'));
          });
        }
        return node;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      optionalGlobals.forEach((name) => delete globals()[name]);
    });

    it('pins every built-in asset to an exact version with a sha384 SRI hash', () => {
      Object.values(PINNED_ASSETS).forEach((asset) => {
        expect(asset.url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/[a-z]+@\d+\.\d+\.\d+\/dist\//);
        expect(asset.url).not.toMatch(/\.mjs$/);
        expect(asset.integrity).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
        expect(pinnedIntegrity(asset.url)).toBe(asset.integrity);
      });
      expect(pinnedIntegrity('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js')).toBeUndefined();
      expect(isModuleUrl('https://example.org/mermaid.esm.min.mjs?v=1#x')).toBe(true);
      expect(isModuleUrl('https://cdn.jsdelivr.net/npm/mermaid@11/+esm')).toBe(true);
      expect(isModuleUrl('https://esm.sh/mermaid@11')).toBe(true);
      expect(isModuleUrl('/vendor/mermaid.min.js')).toBe(false);
      expect(isModuleUrl('https://example.org/esm.sh/mermaid.min.js')).toBe(false);
    });

    it('loads the default Mermaid build via <script> with integrity and crossorigin', async () => {
      const mermaid = fakeMermaid();
      simulateScriptExecution((src) => {
        if (src === PINNED_ASSETS.mermaid.url) {
          globals()['mermaid'] = mermaid;
        }
      });
      document.body.innerHTML =
        '<main id="supa-main-content"><pre><code class="language-mermaid">flowchart LR\n  A --> B</code></pre></main>';
      const importModule = vi.fn(async () => ({}));

      await initOptionalLibraries(importModule);

      const scripts = headScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].getAttribute('src')).toBe(PINNED_ASSETS.mermaid.url);
      expect(scripts[0].getAttribute('integrity')).toBe(PINNED_ASSETS.mermaid.integrity);
      expect(scripts[0].getAttribute('crossorigin')).toBe('anonymous');
      expect(importModule).not.toHaveBeenCalled();
      expect(mermaid.initialize).toHaveBeenCalledWith({ startOnLoad: false, theme: 'default' });
      expect(mermaid.run).toHaveBeenCalledTimes(1);
      expect(document.querySelector('#supa-main-content .mermaid')?.getAttribute('data-mermaid-src')).toContain(
        'A --> B'
      );
    });

    it('keeps loading a custom .mjs Mermaid override as an ES module', async () => {
      const mermaid = fakeMermaid();
      const customUrl = 'https://example.org/vendor/mermaid.esm.min.mjs';
      document.body.setAttribute('data-supa-mermaid-url', customUrl);
      document.body.innerHTML = '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div></main>';
      const importModule = vi.fn(async () => ({ default: mermaid }));

      await initOptionalLibraries(importModule);

      expect(importModule).toHaveBeenCalledWith(customUrl);
      expect(headScripts()).toHaveLength(0);
      expect(mermaid.run).toHaveBeenCalledTimes(1);
    });

    it('loads a custom classic Mermaid override via <script> without integrity', async () => {
      const mermaid = fakeMermaid();
      const customUrl = '/vendor/mermaid/mermaid.min.js';
      simulateScriptExecution(() => {
        globals()['mermaid'] = mermaid;
      });
      document.body.setAttribute('data-supa-mermaid-url', customUrl);
      document.body.innerHTML = '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div></main>';

      await initOptionalLibraries(vi.fn(async () => ({})));

      const scripts = headScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].getAttribute('src')).toBe(customUrl);
      expect(scripts[0].hasAttribute('integrity')).toBe(false);
      expect(scripts[0].hasAttribute('crossorigin')).toBe(false);
      expect(mermaid.run).toHaveBeenCalledTimes(1);
    });

    it('loads the default KaTeX core, auto-render, and CSS with integrity in order', async () => {
      const renderMathInElement = vi.fn();
      simulateScriptExecution((src) => {
        if (src === PINNED_ASSETS.katexCore.url) {
          globals()['katex'] = {};
        } else if (src === PINNED_ASSETS.katexAutoRender.url && globals()['katex']) {
          globals()['renderMathInElement'] = renderMathInElement;
        }
      });
      document.body.innerHTML = '<main id="supa-main-content"><p>Energy $E = mc^2$ holds.</p></main>';

      await initOptionalLibraries(vi.fn(async () => ({})));

      const scripts = headScripts();
      expect(scripts.map((s) => s.getAttribute('src'))).toEqual([
        PINNED_ASSETS.katexCore.url,
        PINNED_ASSETS.katexAutoRender.url
      ]);
      expect(scripts.map((s) => s.getAttribute('integrity'))).toEqual([
        PINNED_ASSETS.katexCore.integrity,
        PINNED_ASSETS.katexAutoRender.integrity
      ]);
      scripts.forEach((s) => expect(s.getAttribute('crossorigin')).toBe('anonymous'));
      const link = headStylesheet();
      expect(link?.getAttribute('href')).toBe(PINNED_ASSETS.katexCss.url);
      expect(link?.getAttribute('integrity')).toBe(PINNED_ASSETS.katexCss.integrity);
      expect(link?.getAttribute('crossorigin')).toBe('anonymous');
      expect(renderMathInElement).toHaveBeenCalledWith(
        document.getElementById('supa-main-content'),
        expect.objectContaining({ throwOnError: false })
      );
    });

    it('loads custom KaTeX overrides without integrity (classic sibling core, or .mjs module)', async () => {
      const renderMathInElement = vi.fn();
      simulateScriptExecution((src) => {
        if (src.endsWith('/vendor/katex/katex.min.js')) {
          globals()['katex'] = {};
        } else if (src.endsWith('/auto-render.min.js') && globals()['katex']) {
          globals()['renderMathInElement'] = renderMathInElement;
        }
      });
      document.body.setAttribute('data-supa-katex-css-url', 'https://example.org/vendor/katex/katex.min.css');
      document.body.setAttribute(
        'data-supa-katex-js-url',
        'https://example.org/vendor/katex/contrib/auto-render.min.js'
      );
      document.body.innerHTML = '<main id="supa-main-content"><p>Energy $E = mc^2$ holds.</p></main>';

      await initOptionalLibraries(vi.fn(async () => ({})));

      const scripts = headScripts();
      expect(scripts.map((s) => s.getAttribute('src'))).toEqual([
        'https://example.org/vendor/katex/katex.min.js',
        'https://example.org/vendor/katex/contrib/auto-render.min.js'
      ]);
      scripts.forEach((s) => expect(s.hasAttribute('integrity')).toBe(false));
      const link = headStylesheet();
      expect(link?.getAttribute('href')).toBe('https://example.org/vendor/katex/katex.min.css');
      expect(link?.hasAttribute('integrity')).toBe(false);
      expect(renderMathInElement).toHaveBeenCalledTimes(1);

      // An ES module override keeps the original import() path.
      appended = [];
      const moduleRender = vi.fn();
      const moduleUrl = 'https://example.org/vendor/katex/contrib/auto-render.mjs';
      document.body.setAttribute('data-supa-katex-js-url', moduleUrl);
      document.body.innerHTML = '<main id="supa-main-content"><p>Energy $E = mc^2$ holds.</p></main>';
      const importModule = vi.fn(async () => ({ default: moduleRender }));

      await initOptionalLibraries(importModule);

      expect(importModule).toHaveBeenCalledWith(moduleUrl);
      expect(headScripts()).toHaveLength(0);
      expect(moduleRender).toHaveBeenCalledTimes(1);
    });

    it('retries a custom classic URL as an ES module when it defines no global, but never a pinned one', async () => {
      const mermaid = fakeMermaid();
      const customUrl = '/vendor/mermaid/mermaid.esm.js';
      document.body.setAttribute('data-supa-mermaid-url', customUrl);
      document.body.innerHTML = '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div></main>';
      const importModule = vi.fn(async () => ({ default: mermaid }));

      await initOptionalLibraries(importModule);

      expect(headScripts().map((s) => s.getAttribute('src'))).toEqual([customUrl]);
      expect(importModule).toHaveBeenCalledWith(new URL(customUrl, document.baseURI).href);
      expect(mermaid.run).toHaveBeenCalledTimes(1);

      // The pinned default must only ever run through the SRI-checked <script>.
      appended = [];
      document.body.removeAttribute('data-supa-mermaid-url');
      document.body.innerHTML = '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div></main>';
      const pinnedImport = vi.fn(async () => ({ default: fakeMermaid() }));

      await initOptionalLibraries(pinnedImport);

      expect(headScripts().map((s) => s.getAttribute('src'))).toEqual([PINNED_ASSETS.mermaid.url]);
      expect(pinnedImport).not.toHaveBeenCalled();
    });

    it('swallows script errors (such as SRI mismatches) without rendering', async () => {
      const mermaid = fakeMermaid();
      const renderMathInElement = vi.fn();
      simulateScriptFailure(PINNED_ASSETS.mermaid.url, PINNED_ASSETS.katexCore.url);
      simulateScriptExecution((src) => {
        if (src === PINNED_ASSETS.mermaid.url) {
          globals()['mermaid'] = mermaid;
        } else if (src === PINNED_ASSETS.katexAutoRender.url) {
          globals()['renderMathInElement'] = renderMathInElement;
        }
      });
      document.body.innerHTML =
        '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div><p>Energy $E = mc^2$.</p></main>';
      const importModule = vi.fn(async () => ({}));

      await expect(initOptionalLibraries(importModule)).resolves.toBeUndefined();

      // The failed core aborts KaTeX before auto-render is even requested.
      expect(headScripts().map((s) => s.getAttribute('src'))).toEqual([
        PINNED_ASSETS.mermaid.url,
        PINNED_ASSETS.katexCore.url
      ]);
      expect(importModule).not.toHaveBeenCalled();
      expect(mermaid.run).not.toHaveBeenCalled();
      expect(renderMathInElement).not.toHaveBeenCalled();
    });

    it('keeps html[data-supa-ready] unset while a loader is pending and sets it after a failed load', async () => {
      simulateScriptPending(PINNED_ASSETS.mermaid.url);
      document.documentElement.removeAttribute(SUPA_READY_ATTRIBUTE);
      document.body.innerHTML =
        '<main id="supa-main-content"><div class="mermaid">flowchart LR\n  A --> B</div></main>';

      let settled = false;
      const ready = initSupaSkin().then(() => {
        settled = true;
      });
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      const mermaidScript = headScripts().find((s) => s.getAttribute('src') === PINNED_ASSETS.mermaid.url);
      expect(mermaidScript).toBeDefined();
      expect(settled).toBe(false);
      expect(document.documentElement.hasAttribute(SUPA_READY_ATTRIBUTE)).toBe(false);

      // Browsers report network failures and SRI mismatches as `error`.
      mermaidScript?.dispatchEvent(new Event('error'));

      await expect(ready).resolves.toBeUndefined();
      expect(document.documentElement.getAttribute(SUPA_READY_ATTRIBUTE)).toBe('true');
    });

    it('skips the KaTeX core only when window.katex is the real KaTeX API', async () => {
      const renderMathInElement = vi.fn();
      simulateScriptExecution((src) => {
        if (src === PINNED_ASSETS.katexCore.url) {
          globals()['katex'] = { render: vi.fn() };
        } else if (src === PINNED_ASSETS.katexAutoRender.url) {
          globals()['renderMathInElement'] = renderMathInElement;
        }
      });
      globals()['katex'] = { render: vi.fn() };
      document.body.innerHTML = '<main id="supa-main-content"><p>Energy $E = mc^2$ holds.</p></main>';

      await initOptionalLibraries(vi.fn(async () => ({})));

      expect(headScripts().map((s) => s.getAttribute('src'))).toEqual([PINNED_ASSETS.katexAutoRender.url]);
      expect(renderMathInElement).toHaveBeenCalledTimes(1);

      // Browsers expose `<h2 id="katex">` as `window.katex`; that must not count.
      appended = [];
      globals()['katex'] = document.createElement('h2');
      document.body.innerHTML = '<main id="supa-main-content"><p>Energy $E = mc^2$ holds.</p></main>';

      await initOptionalLibraries(vi.fn(async () => ({})));

      expect(headScripts().map((s) => s.getAttribute('src'))).toEqual([
        PINNED_ASSETS.katexCore.url,
        PINNED_ASSETS.katexAutoRender.url
      ]);
      expect(renderMathInElement).toHaveBeenCalledTimes(2);
    });

    it('loads nothing when the page has no diagrams or math', async () => {
      document.body.innerHTML = '<main id="supa-main-content"><p>Plain prose that costs 5 dollars.</p></main>';
      const importModule = vi.fn(async () => ({}));

      await initOptionalLibraries(importModule);

      expect(headScripts()).toHaveLength(0);
      expect(headStylesheet()).toBeUndefined();
      expect(importModule).not.toHaveBeenCalled();
    });
  });

  describe('Bundled Third-Party License Coverage', () => {
    it('attributes bundler module ids to the innermost npm package', () => {
      expect(packageNameFromModuleId('/repo/node_modules/bootstrap/js/dist/tooltip.js')).toBe('bootstrap');
      expect(packageNameFromModuleId('/repo/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs')).toBe(
        '@floating-ui/dom'
      );
      expect(
        packageNameFromModuleId('/repo/node_modules/@floating-ui/dom/node_modules/@floating-ui/utils/dist/x.mjs')
      ).toBe('@floating-ui/utils');
      expect(packageNameFromModuleId('C:\\repo\\node_modules\\vanilla-calendar-pro\\index.mjs')).toBe(
        'vanilla-calendar-pro'
      );
      expect(packageNameFromModuleId('/repo/node_modules/highlight.js/lib/core.js?commonjs-es-import')).toBe(
        'highlight.js'
      );
      expect(packageNameFromModuleId('/repo/src/main/frontend/ts/index.ts')).toBeNull();
      expect(packageNameFromModuleId('\0vite/preload-helper.js')).toBeNull();
    });

    it('resolves only installed packages from Sass @use/@forward/@import specifiers', () => {
      const scss = [
        '@use "sass:math";',
        '@use "bootstrap/scss/bootstrap";',
        "@use 'bootstrap-icons/font/bootstrap-icons.scss' with ($bootstrap-icons-font-dir: 'fonts');",
        '@forward "variables";',
        '@import "./layout";',
        '@use "pkg:@scope/theme/index";'
      ].join('\n');
      const specifiers = sassModuleSpecifiers(scss);
      expect(specifiers).toEqual([
        'sass:math',
        'bootstrap/scss/bootstrap',
        'bootstrap-icons/font/bootstrap-icons.scss',
        'variables',
        './layout',
        'pkg:@scope/theme/index'
      ]);
      const installed = new Set(['bootstrap', 'bootstrap-icons', '@scope/theme']);
      const packages = specifiers.map((s) => packageNameFromSassSpecifier(s, (name) => installed.has(name)));
      expect(packages).toEqual([null, 'bootstrap', 'bootstrap-icons', null, null, '@scope/theme']);
    });

    it('reports bundled packages missing from the manifest, sorted and de-duplicated', () => {
      expect(findUnlicensedPackages(['bootstrap', '@floating-ui/core', 'left-pad', 'left-pad', 'a-pkg'])).toEqual([
        'a-pkg',
        'left-pad'
      ]);
      expect(findUnlicensedPackages(BUNDLED_LICENSES.map((entry) => entry.name))).toEqual([]);
    });

    it('lists Bootstrap 6 peer dependencies and points every entry at an installed LICENSE file', () => {
      const names = BUNDLED_LICENSES.map((entry) => entry.name);
      for (const peer of ['vanilla-calendar-pro', '@floating-ui/dom', '@floating-ui/core', '@floating-ui/utils']) {
        expect(names).toContain(peer);
      }
      const outputs = BUNDLED_LICENSES.map((entry) => entry.outputFileName);
      expect(new Set(outputs).size).toBe(outputs.length);
      for (const entry of BUNDLED_LICENSES) {
        expect(entry.outputFileName).toMatch(/^LICENSE-[a-z0-9.-]+\.txt$/);
        expect(existsSync(resolve(process.cwd(), 'node_modules', entry.name, 'LICENSE'))).toBe(true);
      }
    });
  });
});

describe('WCAG contrast audit (scripts/contrast-audit.ts)', () => {
  it('matches the unquoted palette selectors Dart Sass emits on <html>', () => {
    const attributes = { 'data-supa-palette': 'modus', 'data-bs-theme': 'dark' };
    expect(matchRootSelector('[data-supa-palette=modus]', attributes)).toBe(100);
    expect(matchRootSelector('[data-supa-palette="modus"]', attributes)).toBe(100);
    expect(matchRootSelector(':root[data-bs-theme=dark]', attributes)).toBe(200);
    expect(matchRootSelector('[data-supa-palette=modus-tinted]', attributes)).toBeNull();
    expect(matchRootSelector(':host', attributes)).toBeNull();
    expect(matchRootSelector('[data-supa-palette] .alert', attributes)).toBeNull();
  });

  it('collects <html> custom properties by cascade order and skips @media and element rules', () => {
    const css = parseCss(`
      :root, :host { --fg: #111111; --bg: #ffffff; }
      [data-supa-palette=furo] { --fg: #222222; }
      [data-supa-palette=modus] { --fg: #000000; }
      :root, [data-supa-palette] { --link: var(--fg); }
      @media (prefers-contrast: more) { :root { --fg: #ff0000; } }
      .alert { --fg: #00ff00; }
    `);
    const tokens = collectRootTokens(css, { 'data-supa-palette': 'modus', 'data-bs-theme': 'light' });
    expect(tokens.get('--fg')).toBe('#000000');
    expect(tokens.get('--bg')).toBe('#ffffff');
    expect(tokens.get('--link')).toBe('var(--fg)');
  });

  it('resolves light-dark(), var() chains and fallbacks, and reports undefined properties as null', () => {
    const tokens = new Map([
      ['--brand', 'light-dark(#0031a9, #79a8ff)'],
      ['--alias', 'var(--brand)']
    ]);
    expect(toHex(resolveColor('var(--alias)', tokens, 'light')!)).toBe('#0031a9');
    expect(toHex(resolveColor('var(--alias)', tokens, 'dark')!)).toBe('#79a8ff');
    expect(toHex(resolveColor('var(--missing, #123456)', tokens, 'dark')!)).toBe('#123456');
    expect(resolveColor('var(--missing)', tokens, 'dark')).toBeNull();
  });

  it('mixes in OKLCH exactly as Chromium paints it', () => {
    // Expected values are canvas pixels read back from Playwright Chromium.
    const none = new Map<string, string>();
    expect(toHex(resolveColor('color-mix(in oklch, #000 16%, oklch(60% 0.02 245deg))', none, 'light')!)).toBe(
      '#5d666e'
    );
    // Chromium drops the hue of the near-neutral #fbf7f0, so the tint keeps the blue's hue
    // instead of swinging to orange along the shorter hue arc.
    expect(toHex(resolveColor('color-mix(in oklch, #0031a9 12%, #fbf7f0)', none, 'light')!)).toBe('#d5e1f6');
  });

  it('alpha-composites a translucent title bar over the surface underneath', () => {
    const none = new Map<string, string>();
    const bar = resolveColor('rgba(56, 139, 253, 0.14)', none, 'dark')!;
    const page = resolveColor('#131416', none, 'dark')!;
    expect(toHex(compositeOver(bar, page))).toBe('#182536');
  });

  it('fails a title-bar link below the palette target and treats an undefined layer as transparent', () => {
    const surfaces: SurfaceSpec[] = [
      {
        surface: 'admonition title bar (note, seealso)',
        layers: [
          'var(--color-background-primary)',
          'var(--color-admonition-background)',
          'var(--supa-admonition-note-bg)'
        ],
        foregrounds: [
          { label: 'title link', color: 'var(--color-brand-content)', role: 'text' },
          { label: 'icon', color: 'var(--supa-admonition-note-accent)', role: 'non-text' }
        ]
      }
    ];
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#000000'],
      ['--color-brand-content', '#79a8ff'],
      ['--supa-admonition-note-accent', '#00bcff'],
      ['--supa-admonition-note-bg', '#0f2537']
    ]);
    const before = auditContrast(tokens, 'modus', 'dark', surfaces);
    expect(before.checked).toBe(2);
    expect(before.violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (dark): title link var(--color-brand-content) " +
        '(#79a8ff) on admonition title bar (note, seealso) (#0f2537) has contrast 6.61:1 (minimum 7.0:1).'
    ]);

    tokens.set('--supa-admonition-note-bg', '#091f31');
    expect(auditContrast(tokens, 'modus', 'dark', surfaces).violations).toEqual([]);

    tokens.set('--supa-admonition-note-bg', '#0f2537');
    tokens.set('--supa-wcag-level', '"AA"');
    expect(auditContrast(tokens, 'furo', 'dark', surfaces).violations).toEqual([]);
  });

  it('mixes in sRGB with premultiplied alpha, as the sidebar tint paints', () => {
    // Expected value is the color axe-core read back from Playwright Chromium for modus dark's
    // current-page link: the 12% brand tint laid over the sidebar's #1e1e1e.
    const none = new Map<string, string>();
    const tint = resolveColor('color-mix(in srgb, #00bcff 12%, transparent)', none, 'dark')!;
    expect(tint.a).toBeCloseTo(0.12);
    expect(toHex(compositeOver(tint, resolveColor('#1e1e1e', none, 'dark')!))).toBe('#1a3139');
    expect(toHex(resolveColor('color-mix(in srgb, #000000, #ffffff)', none, 'light')!)).toBe('#808080');
  });

  it('resolves relative oklch(from ...) colors as Chromium derives button states', () => {
    // Expected values are the colors axe-core read back from Playwright Chromium for a toggled
    // `.btn-outline.theme-secondary.active` in modus dark (Bootstrap's gray-600, darkened).
    const tokens = new Map([['--gray-600', 'color-mix(in oklch, #000 16%, oklch(60% .02 245))']]);
    const darken = (color: string): string => `oklch(from ${color} calc(l * .9) calc(c * 1.15) h)`;
    expect(toHex(resolveColor(darken('var(--gray-600)'), tokens, 'dark')!)).toBe('#4e5861');
    expect(toHex(resolveColor(darken('#ffffff'), tokens, 'dark')!)).toBe('#dedede');
    expect(resolveColor(darken('var(--missing)'), tokens, 'dark')).toBeNull();
    expect(() => resolveColor('oklch(from #fff calc(l * c * 2) c h)', tokens, 'dark')).toThrow(
      /Unsupported calc\(\)/
    );
  });

  it('declares the sidebar, search, and Bootstrap theme surfaces with the target they promise', () => {
    const named = (prefix: string): SurfaceSpec[] =>
      SURFACE_AUDITS.filter((surface: SurfaceSpec) => surface.surface.startsWith(prefix));
    // Modus dark with the default navigation tokens: brand blue on the hover surface and on
    // the current-page tint laid over the sidebar misses 7:1.
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#000000'],
      ['--color-background-secondary', '#1e1e1e'],
      ['--color-background-hover', '#2d2d2d'],
      ['--color-foreground-primary', '#ffffff'],
      ['--color-brand-primary', '#00bcff'],
      ['--supa-nav-hover-fg', 'var(--color-brand-primary)'],
      ['--supa-nav-active-fg', 'var(--color-brand-primary)'],
      ['--supa-nav-active-bg', 'color-mix(in srgb, var(--color-brand-primary) 12%, transparent)']
    ]);
    expect(auditContrast(tokens, 'modus', 'dark', named('sidebar')).violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (dark): link var(--supa-nav-hover-fg) " +
        '(#00bcff) on sidebar link, hovered (#2d2d2d) has contrast 6.32:1 (minimum 7.0:1).',
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (dark): link var(--supa-nav-active-fg) " +
        '(#00bcff) on sidebar current page (.supa-nav-link.active) (#1a3139) has contrast 6.25:1 ' +
        '(minimum 7.0:1).'
    ]);
    // The modus overrides in _variables.scss: main text on hover, brand tint mixed into the page.
    tokens.set('--supa-nav-hover-fg', 'var(--color-foreground-primary)');
    tokens.set(
      '--supa-nav-active-bg',
      'color-mix(in srgb, var(--color-brand-primary) 12%, var(--color-background-primary))'
    );
    const fixed = auditContrast(tokens, 'modus', 'dark', named('sidebar'));
    expect(fixed.checked).toBe(3);
    expect(fixed.violations).toEqual([]);
    expect(named('search result, active').length).toBe(1);
    expect(named('search match highlight').length).toBe(2);
    for (const theme of ['primary', 'accent', 'success', 'info', 'warning', 'danger', 'secondary', 'inverse']) {
      expect(named(`.theme-${theme} `).map((surface: SurfaceSpec) => surface.surface)).toEqual([
        `.theme-${theme} solid fill`,
        `.theme-${theme} outline button toggled on`,
        `.theme-${theme} outline, text, and link`,
        `.theme-${theme} subtle fill`,
        `.theme-${theme} subtle fill, emphasized text`,
        `.theme-${theme} solid button hovered`,
        `.theme-${theme} solid button toggled on`,
        `.theme-${theme} outline button hovered`,
        `.theme-${theme} subtle button hovered`,
        `.theme-${theme} subtle button toggled on`,
        `.theme-${theme} text button hovered`,
        `.theme-${theme} text button toggled on`,
        `.theme-${theme} link hovered`,
        `.theme-${theme} chip hovered`,
        `.theme-${theme} muted fill, emphasized text`,
        `.theme-${theme} selected chip hovered`
      ]);
    }
  });

  it('marks disabled pagination links as disabled, which Doxia strips from raw HTML', () => {
    // What Doxia renders for `<li class="page-item disabled"><a class="page-link" href="#"
    // aria-disabled="true" tabindex="-1">`: the attributes that exempt it from contrast are gone.
    const root = document.createElement('div');
    root.innerHTML = `
      <ul class="pagination">
        <li class="page-item disabled"><a class="page-link" href="#null">Previous</a></li>
        <li class="page-item active"><a class="page-link" href="#null">1</a></li>
        <li class="page-item"><span class="page-link disabled">Next</span></li>
        <li class="page-item disabled"><a class="page-link" href="#null" tabindex="0">Kept</a></li>
      </ul>`;
    markDisabledPageLinks(root);
    const [previous, current, next, kept] = Array.from(root.querySelectorAll<HTMLElement>('.page-link'));
    expect(previous?.getAttribute('aria-disabled')).toBe('true');
    expect(previous?.getAttribute('tabindex')).toBe('-1');
    expect(current?.hasAttribute('aria-disabled')).toBe(false);
    expect(current?.hasAttribute('tabindex')).toBe(false);
    expect(next?.getAttribute('aria-disabled')).toBe('true');
    expect(next?.hasAttribute('tabindex')).toBe(false);
    expect(kept?.getAttribute('tabindex')).toBe('0');
  });

  it('fades a translucent element toward what lies beneath, as a hovered selected chip paints', () => {
    // Bootstrap's `.chip.active:hover { opacity: .9 }` on modus light's info fill. #196285 is the
    // fill axe read back from Playwright Chromium for that chip on components.html.
    const surfaces: SurfaceSpec[] = [
      {
        surface: '.theme-info selected chip hovered',
        layers: ['var(--color-background-primary)', 'var(--info-bg)'],
        foregrounds: [{ label: 'text', color: 'var(--info-contrast)', role: 'text' }],
        opacity: 'var(--fade, .9)'
      }
    ];
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#ffffff'],
      ['--info-bg', '#005077'],
      ['--info-contrast', '#ffffff']
    ]);
    expect(auditContrast(tokens, 'modus', 'light', surfaces).violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (light): text var(--info-contrast) " +
        '(#ffffff) on .theme-info selected chip hovered (#196285) at 90% opacity has contrast ' +
        '6.76:1 (minimum 7.0:1).'
    ]);
    tokens.set('--fade', '1');
    expect(auditContrast(tokens, 'modus', 'light', surfaces).violations).toEqual([]);
    expect(resolveOpacity('65%', tokens)).toBe(0.65);
    expect(resolveOpacity('1.5', tokens)).toBe(1);
    expect(() => resolveOpacity('var(--missing)', tokens)).toThrow(/undefined custom property/);
  });

  it('audits unthemed buttons and chips on the --bg-* steps Bootstrap falls back to', () => {
    const unthemed = SURFACE_AUDITS.filter((surface: SurfaceSpec) => surface.surface.startsWith('unthemed'));
    expect(unthemed.map((surface: SurfaceSpec) => surface.surface)).toEqual([
      'unthemed button, chip, or badge (--bg-2)',
      'unthemed button or chip, hovered or pressed (--supa-bg-active)'
    ]);
    // Modus dark as 0.1.3 shipped it: `--bg-3` is the border gray, under white body text.
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#000000'],
      ['--bg-2', '#282828'],
      ['--supa-bg-active', '#646464'],
      ['--fg-body', '#ffffff']
    ]);
    expect(auditContrast(tokens, 'modus', 'dark', unthemed).violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (dark): text var(--fg-body) " +
        '(#ffffff) on unthemed button or chip, hovered or pressed (--supa-bg-active) (#646464) ' +
        'has contrast 5.92:1 (minimum 7.0:1).'
    ]);
    // The modus palettes set `--supa-bg-active` to Modus Vivendi's bg-active.
    tokens.set('--supa-bg-active', 'light-dark(#9f9f9f, #535353)');
    expect(auditContrast(tokens, 'modus', 'dark', unthemed).violations).toEqual([]);
  });

  it('moves modus muted fills toward the page, where accent text keeps 7:1', () => {
    const chip = SURFACE_AUDITS.filter((surface: SurfaceSpec) => surface.surface === '.theme-success chip hovered');
    // Modus light's success chip on components.html, hovered.
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#ffffff'],
      ['--supa-admonition-tip-accent', '#005a00'],
      ['--success-fg', 'var(--supa-admonition-tip-accent)'],
      ['--success-bg-subtle', '#e8f6e8'],
      // The bridge's tint, which axe measured at 5.78:1 on the rendered chip
      [
        '--success-bg-muted',
        'color-mix(in oklch, var(--supa-admonition-tip-accent) 22%, var(--color-background-primary))'
      ]
    ]);
    expect(auditContrast(tokens, 'modus', 'light', chip).violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (light): text var(--success-fg) " +
        '(#005a00) on .theme-success chip hovered (#c9d9c7) has contrast 5.80:1 (minimum 7.0:1).'
    ]);
    tokens.set(
      '--success-bg-muted',
      'color-mix(in srgb, var(--success-bg-subtle) 50%, var(--color-background-primary))'
    );
    expect(auditContrast(tokens, 'modus', 'light', chip)).toEqual({ checked: 1, violations: [] });
    // Why sRGB: modus light's info fill (#ebf6fa) is near-neutral, so in OKLCH it and white both
    // lack a hue and the mix turns faintly pink (#fdf8f9, as Playwright Chromium paints it). In
    // sRGB it stays light blue.
    const none = new Map<string, string>();
    expect(toHex(resolveColor('color-mix(in oklch, #ebf6fa 50%, #ffffff)', none, 'light')!)).toBe('#fdf8f9');
    const blue = resolveColor('color-mix(in srgb, #ebf6fa 50%, #ffffff)', none, 'light')!;
    expect(blue.b).toBeGreaterThan(blue.r);
  });

  it('keeps the resting text of hovered and toggled-on text buttons in dark polarity', () => {
    const [hovered] = SURFACE_AUDITS.filter(
      (surface: SurfaceSpec) => surface.surface === '.theme-primary text button hovered'
    );
    const text: string = hovered?.foregrounds[0]?.color ?? '';
    // Modus-tinted dark's primary text button on components.html: Bootstrap's `l * .95` text
    // (#72a3fa) measured 6.51:1 on the subtle fill.
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--color-background-primary', '#0d0e1c'],
      ['--primary-fg', '#82b0ff'],
      ['--primary-bg-subtle', '#1a1e34']
    ]);
    expect(toHex(resolveColor(text, tokens, 'dark')!)).toBe('#82b0ff');
    expect(auditContrast(tokens, 'modus-tinted', 'dark', [hovered!])).toEqual({ checked: 1, violations: [] });
    // Light polarity keeps Bootstrap's darkening, which raises contrast on a light fill.
    tokens.set('--primary-fg', '#0031a9');
    expect(toHex(resolveColor(text, tokens, 'light')!)).toBe(
      toHex(resolveColor('oklch(from #0031a9 calc(l * 0.95) calc(c * 1.1) h)', tokens, 'light')!)
    );
  });

  it('audits the Datepicker calendar, whose days outside the month are muted rather than faded', () => {
    const calendar = SURFACE_AUDITS.filter((surface: SurfaceSpec) => surface.surface.startsWith('Datepicker'));
    expect(calendar.map((surface: SurfaceSpec) => surface.surface)).toEqual([
      'Datepicker calendar',
      'Datepicker day, month, or year, hovered',
      'Datepicker today',
      'Datepicker selection'
    ]);
    // Modus dark's calendar on components.html, where axe read Bootstrap's 50% fade of a day
    // outside the month as #808080 on #000000 (5.31:1).
    const tokens = new Map([
      ['--supa-wcag-level', '"AAA"'],
      ['--bg-body', '#000000'],
      ['--bg-1', '#1e1e1e'],
      ['--bg-2', '#282828'],
      ['--fg-body', '#ffffff'],
      ['--fg-1', '#ffffff'],
      ['--fg-3', 'var(--color-foreground-muted)'],
      ['--color-foreground-muted', '#adadad'],
      ['--primary-bg', '#00bcff'],
      ['--primary-contrast', '#000000']
    ]);
    const faded: SurfaceSpec = {
      surface: 'Datepicker day outside the month, faded',
      layers: ['var(--bg-body)', 'transparent'],
      foregrounds: [{ label: 'day', color: 'var(--fg-body)', role: 'text' }],
      opacity: '.5'
    };
    expect(auditContrast(tokens, 'modus', 'dark', [faded]).violations).toEqual([
      "WCAG 2.2 AAA text contrast violation in palette 'modus' (dark): day var(--fg-body) (#808080) " +
        'on Datepicker day outside the month, faded (#000000) at 50% opacity has contrast 5.28:1 ' +
        '(minimum 7.0:1).'
    ]);
    // The skin keeps those days opaque and colors them with the muted text.
    expect(auditContrast(tokens, 'modus', 'dark', calendar)).toEqual({ checked: 8, violations: [] });
  });
});
