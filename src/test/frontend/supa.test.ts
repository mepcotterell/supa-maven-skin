/**
 * @fileoverview Unit test suite for Supa Maven Skin frontend TypeScript modules.
 */

import Combobox from 'bootstrap/js/dist/combobox.js';
import Dialog from 'bootstrap/js/dist/dialog.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseCss } from 'postcss';
import { compile, compileString } from 'sass-embedded';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BUNDLED_LICENSES,
  findUnlicensedPackages,
  packageNameFromModuleId,
  packageNameFromSassSpecifier,
  sassModuleSpecifiers
} from '../../../scripts/bundled-licenses';
import {
  checkReleaseMetadata,
  checkReleaseReady,
  CI_MISSING_GRACE_MS,
  CI_POLL_INTERVAL_MS,
  CI_WAIT_TIMEOUT_MS,
  type CiRun,
  type CiWaitOptions,
  type ReleaseMetadata,
  waitForCiSuccess
} from '../../../scripts/check-release-ready';
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
  collectTemplates,
  lintVelocity,
  type VelocityTemplate
} from '../../../scripts/lint-velocity';
import {
  BootstrapPlugins,
  initBootstrapComponents,
  initComponentExamples,
  initLazyWidgets,
  isolateBootstrapComponentsFromProse,
  LAZY_WIDGETS,
  type LazyWidget,
  Menu,
  nameMonthButtonByText,
  Tooltip
} from '../../main/frontend/ts/bootstrap-components';
import { enhanceCodeBlocks } from '../../main/frontend/ts/code';
import * as doxiaModule from '../../main/frontend/ts/doxia';
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
  restoreDocumentationChannels,
  syncScrollRegionFocus,
  TAB_SYNC_STORAGE_KEY,
  transformBootstrapIcons,
  transformGfmAdmonitions
} from '../../main/frontend/ts/doxia';
import {
  Drawer,
  initBackToTop,
  initDrawers,
  initSupaSkin,
  SIDEBAR_INLINE_EM,
  SUPA_READY_ATTRIBUTE,
  TOC_INLINE_EM
} from '../../main/frontend/ts/index';
import { fillLabel, getLabel, LABEL_DEFAULTS, warnUnknownLabels } from '../../main/frontend/ts/labels';
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
  getPaletteName,
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
            <select class="supa-palette-select" data-supa-palette-select="true" aria-label="Color scheme">
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
      for (const { id } of SUPA_PALETTES) {
        applyPalette(id);
        const visibleText = trigger.textContent!.replace(/\s+/g, ' ').trim();
        expect(visibleText).toBe(getPaletteName(id));
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
          LABEL_DEFAULTS[meta.titleKey]
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

    it.each([
      ['JSON null', 'null'],
      ['a JSON array', '["Java"]'],
      ['a JSON string', '"Java"'],
      ['not JSON', '{not json']
    ])('ignores a saved tab choice that is %s', (_name, saved) => {
      window.localStorage.setItem(TAB_SYNC_STORAGE_KEY, saved);
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-tabs" data-tab-group="lang">
          <div data-tab="Java">Java code</div>
          <div data-tab="Kotlin">Kotlin code</div>
        </div>
      `;

      expect(() => initContentTabs(container)).not.toThrow();
      const tabButtons = container.querySelectorAll<HTMLButtonElement>('.supa-tab-btn');
      expect(tabButtons.length).toBe(2);
      expect(tabButtons[0].classList.contains('active')).toBe(true);

      // A later choice still persists, replacing the malformed value with a valid one.
      tabButtons[1].click();
      expect(JSON.parse(window.localStorage.getItem(TAB_SYNC_STORAGE_KEY) ?? 'null')).toEqual({
        lang: 'Kotlin'
      });
    });

    it('skips saved tab choices that are not strings and keeps the valid ones', () => {
      window.localStorage.setItem(
        TAB_SYNC_STORAGE_KEY,
        JSON.stringify({ first: 123, second: 'Kotlin', third: null })
      );
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-tabs" data-tab-group="first">
          <div data-tab="Java">Java code</div>
          <div data-tab="Kotlin">Kotlin code</div>
        </div>
        <div class="supa-tabs" data-tab-group="second">
          <div data-tab="Java">Java code</div>
          <div data-tab="Kotlin">Kotlin code</div>
        </div>
      `;

      expect(() => initContentTabs(container)).not.toThrow();
      const groups = container.querySelectorAll<HTMLElement>('.supa-tabs');
      expect(groups[0].querySelector('.supa-tab-btn.active')?.textContent).toBe('Java');
      expect(groups[1].querySelector('.supa-tab-btn.active')?.textContent).toBe('Kotlin');
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

    it('marks the last active .supa-stepper step with aria-current="step"', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ol class="supa-stepper" title="2">
          <li>One</li><li>Two</li><li>Three</li>
        </ol>
        <ol class="supa-stepper">
          <li>One</li><li class="active">Two</li><li>Three</li>
        </ol>
        <ol class="supa-stepper" data-active-step="3">
          <li>One</li><li>Two</li><li aria-current="location">Three</li>
        </ol>
        <ol class="supa-stepper" data-active-step="0">
          <li>One</li><li>Two</li>
        </ol>
      `;

      initBootstrapSteppers(container);

      const current = Array.from(container.querySelectorAll('.supa-stepper')).map((list) =>
        Array.from(list.children).map((li) => li.getAttribute('aria-current'))
      );
      // Only the last active step is current; earlier active steps are completed, not current.
      expect(current[0]).toEqual([null, 'step', null]);
      expect(current[1]).toEqual([null, 'step', null]);
      // An author's own aria-current is kept, and a stepper with no active step has no current one.
      expect(current[2]).toEqual([null, null, 'location']);
      expect(current[3]).toEqual([null, null]);
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

    describe('documentation channels, whose aria-* attributes Doxia strips from raw HTML', () => {
      it('names the navigation from its title and marks the .active link as the current page', () => {
        // What Doxia renders for the recipe: `title`, `id`, and `class` survive; `aria-*` does not.
        const root = document.createElement('div');
        root.innerHTML = `
          <nav class="supa-documentation-channels" title=" Documentation channels ">
            <a href="index.html">Project home</a>
            <a href="guide.html" class="active">Guide</a>
            <details class="documentation-version-picker"><summary>Version: 2.x</summary>
              <ul><li><a href="v1/guide.html">1.x</a></li></ul>
            </details>
          </nav>`;
        restoreDocumentationChannels(root);
        const nav = root.querySelector('nav')!;
        expect(nav.getAttribute('aria-label')).toBe('Documentation channels');
        // The name moves to aria-label, so hovering a link no longer shows the landmark's tooltip.
        expect(nav.hasAttribute('title')).toBe(false);
        const current = Array.from(root.querySelectorAll('[aria-current]'));
        expect(current.map((el) => [el.textContent, el.getAttribute('aria-current')])).toEqual([['Guide', 'page']]);
      });

      it('accepts the .documentation-channels alias and keeps ARIA that reached the page', () => {
        const root = document.createElement('div');
        root.innerHTML = `
          <nav class="documentation-channels" title="Tooltip" aria-label="Kanäle">
            <a href="index.html" class="active" aria-current="true">Start</a>
          </nav>
          <nav class="documentation-channels" title="" aria-labelledby="channels-heading">
            <a href="a.html">A</a>
          </nav>
          <nav class="documentation-channels"><a href="b.html">B</a></nav>
          <p><a href="c.html" class="active">Outside</a></p>`;
        restoreDocumentationChannels(root);
        const [labelled, referenced, bare] = Array.from(root.querySelectorAll('nav'));
        expect(labelled?.getAttribute('aria-label')).toBe('Kanäle');
        expect(labelled?.getAttribute('title')).toBe('Tooltip');
        expect(labelled?.querySelector('a')?.getAttribute('aria-current')).toBe('true');
        expect(referenced?.hasAttribute('aria-label')).toBe(false);
        expect(bare?.hasAttribute('aria-label')).toBe(false);
        // Only a link the author marked inside the navigation becomes current; no URL is compared.
        expect(root.querySelector('p a')?.hasAttribute('aria-current')).toBe(false);
        expect(root.querySelector('a[href="b.html"]')?.hasAttribute('aria-current')).toBe(false);
      });

      it('restores the channels outside the article when the skin initializes', async () => {
        document.body.innerHTML = `
          <nav class="supa-documentation-channels" title="Channels"><a href="x.html" class="active">X</a></nav>
          <main id="supa-main-content"><p>Body</p></main>`;
        await initSupaSkin();
        const nav = document.querySelector('nav')!;
        expect(nav.getAttribute('aria-label')).toBe('Channels');
        expect(nav.querySelector('a')?.getAttribute('aria-current')).toBe('page');
      });
    });
  });

  describe('Bootstrap 6 Plugins, Drawers & .prose Isolation', () => {
    /**
     * Simulates a viewport for the drawers' breakpoint queries: `innerWidth`, and a `matchMedia`
     * that evaluates `(width >= <n>em)` as a browser does, where 1em is the browser's default font
     * size. Every other query does not match, so a drawer threshold written another way fails.
     *
     * @param width - Viewport width, in CSS px.
     * @param defaultFontPx - Browser's default font size, in CSS px.
     */
    const stubViewport = (width: number, defaultFontPx = 16): void => {
      vi.stubGlobal('innerWidth', width);
      vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
        const minEm = /^\(width >= (\d+(?:\.\d+)?)em\)$/.exec(query);
        return {
          matches: minEm !== null && width >= Number(minEm[1]) * defaultFontPx,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined
        } as unknown as MediaQueryList;
      });
    };

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
      expect(permalink.getAttribute('data-bs-title')).toBe('Permalink to Section Heading');
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

    it('keeps later enhancers and data-supa-ready running when one enhancer throws, logging its name', async () => {
      document.body.innerHTML = `
        <main id="supa-main-content">
          <pre><code class="language-java">int x = 1;</code></pre>
        </main>
      `;
      document.documentElement.removeAttribute(SUPA_READY_ATTRIBUTE);
      const failure = new Error('doxia exploded');
      vi.spyOn(doxiaModule, 'initDoxiaEnhancements').mockImplementation(() => {
        throw failure;
      });
      const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      try {
        await expect(initSupaSkin()).resolves.toBeUndefined();

        expect(logged).toHaveBeenCalledWith(expect.stringContaining('initDoxiaEnhancements'), failure);
        // initCodeBlocks runs after the failed enhancer, and the page is still marked ready.
        expect(document.querySelectorAll('.supa-copy-btn').length).toBeGreaterThan(0);
        expect(document.documentElement.getAttribute(SUPA_READY_ATTRIBUTE)).toBe('true');
      } finally {
        vi.restoreAllMocks();
      }
    });

    it.each(['supaTocDrawer', 'supaSidebarDrawer'])('keeps section focus after %s link closes, leaving dismissal focus alone', async (id) => {
      document.body.innerHTML = `
        <button id="trigger">Open</button>
        <dialog id="${id}" class="drawer"><a class="nav-link supa-nav-link" href="#usage">Usage</a></dialog>
        <main id="supa-main-content"><h2 id="usage">Usage</h2><a href="#next">Continue</a></main>`;
      stubViewport(390);
      initDrawers();
      const drawer = document.getElementById(id) as HTMLDialogElement;
      const trigger = document.getElementById('trigger')!;
      const heading = document.getElementById('usage')!;
      const instance = Drawer.getOrCreateInstance(drawer);
      const hide = vi.spyOn(instance, 'hide').mockImplementation(() => {
        drawer.removeAttribute('open');
        return Promise.resolve();
      });
      // Bootstrap installs its restoration callback when the trigger opens the drawer.
      drawer.addEventListener('hidden.bs.drawer', () => trigger.focus());
      drawer.querySelector('a')!.addEventListener('click', (event) => event.preventDefault());
      try {
        drawer.setAttribute('open', '');
        drawer.querySelector<HTMLAnchorElement>('a')!.click();
        expect(hide).toHaveBeenCalledOnce();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
        expect(document.activeElement).toBe(heading);
        expect(heading.getAttribute('tabindex')).toBe('-1');
        // A later Escape/backdrop dismissal must not reuse the previous destination.
        drawer.setAttribute('open', '');
        instance.hide();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
        expect(document.activeElement).toBe(trigger);
        // Bootstrap can decline a close during its opening transition or on a prevented hide.
        hide.mockResolvedValue(undefined);
        drawer.setAttribute('open', '');
        drawer.querySelector<HTMLAnchorElement>('a')!.click();
        await Promise.resolve();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
        expect(document.activeElement).toBe(trigger);
        hide.mockRejectedValue(new Error('Hide rejected'));
        drawer.querySelector<HTMLAnchorElement>('a')!.click();
        await Promise.resolve();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
        expect(document.activeElement).toBe(trigger);
      } finally {
        hide.mockRestore();
        instance.dispose();
        vi.unstubAllGlobals();
      }
    });

    describe('drawer link focus edge cases', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;

      beforeEach(() => {
        happyDOM.setURL('https://example.org/docs/guide.html');
      });

      afterEach(() => {
        happyDOM.setURL(originalUrl);
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      });

      /**
       * Renders a drawer holding one link, plus an opener and a destination heading, and initializes
       * the drawers with `hide()` replaced by a stub that closes the dialog.
       *
       * @param id - Drawer ID, `supaTocDrawer` or `supaSidebarDrawer`.
       * @param href - Link `href` as authored.
       * @param innerWidth - Viewport width to simulate.
       * @param headingAttributes - Extra attributes for the destination heading.
       * @param defaultFontPx - Browser's default font size to simulate.
       * @returns The elements involved and the `hide()` stub.
       */
      const mount = (id: string, href: string, innerWidth = 390, headingAttributes = '', defaultFontPx = 16) => {
        document.body.innerHTML = `
          <button id="trigger">Open</button>
          <dialog id="${id}" class="drawer"><a class="nav-link supa-nav-link" href="${href}">Usage</a></dialog>
          <main id="supa-main-content"><h2 id="usage" ${headingAttributes}>Usage</h2></main>`;
        stubViewport(innerWidth, defaultFontPx);
        initDrawers();
        const drawer = document.getElementById(id) as HTMLDialogElement;
        const link = drawer.querySelector('a') as HTMLAnchorElement;
        const instance = Drawer.getOrCreateInstance(drawer);
        const hide = vi.spyOn(instance, 'hide').mockImplementation(() => {
          drawer.removeAttribute('open');
          return Promise.resolve();
        });
        // Bootstrap's data API restores the opener once the drawer has hidden.
        const trigger = document.getElementById('trigger')!;
        drawer.addEventListener('hidden.bs.drawer', () => trigger.focus());
        link.addEventListener('click', (event) => event.preventDefault());
        return { drawer, link, trigger, heading: document.getElementById('usage')!, hide, instance };
      };

      /**
       * Opens the drawer, activates its link, and lets the drawer finish hiding.
       *
       * @param drawer - Drawer under test.
       * @param link - Link inside it.
       */
      const activateAndHide = async (drawer: HTMLDialogElement, link: HTMLAnchorElement): Promise<void> => {
        drawer.setAttribute('open', '');
        link.click();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
      };

      it('keeps an authored tabindex on the destination while moving focus to it', async () => {
        const { drawer, link, heading, instance } = mount('supaTocDrawer', '#usage', 390, 'tabindex="0"');
        await activateAndHide(drawer, link);
        expect(document.activeElement).toBe(heading);
        expect(heading.getAttribute('tabindex')).toBe('0');
        instance.dispose();
      });

      it('focuses a same-page destination named by an absolute URL with a fragment', async () => {
        const { drawer, link, heading, instance } = mount(
          'supaTocDrawer',
          'https://example.org/docs/guide.html#usage'
        );
        await activateAndHide(drawer, link);
        expect(document.activeElement).toBe(heading);
        instance.dispose();
      });

      it.each([
        ['another page of the site', 'other.html#usage'],
        ['another origin', 'https://elsewhere.example/docs/guide.html#usage'],
        ['the same page with another query', 'guide.html?lang=fr#usage']
      ])('leaves focus on the opener for a link to %s', async (_label, href) => {
        const { drawer, link, trigger, heading, hide, instance } = mount('supaTocDrawer', href);
        await activateAndHide(drawer, link);
        expect(hide).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(trigger);
        expect(heading.hasAttribute('tabindex')).toBe(false);
        instance.dispose();
      });

      it('closes the drawer and leaves focus alone when the destination does not exist', async () => {
        const { drawer, link, trigger, hide, instance } = mount('supaSidebarDrawer', '#missing');
        await activateAndHide(drawer, link);
        expect(hide).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(trigger);
        instance.dispose();
      });

      it('does not focus a destination that left the document before the drawer hid', async () => {
        const { drawer, link, trigger, heading, instance } = mount('supaTocDrawer', '#usage');
        const focus = vi.spyOn(heading, 'focus');
        drawer.setAttribute('open', '');
        link.click();
        heading.remove();
        drawer.dispatchEvent(new Event('hidden.bs.drawer'));
        await Promise.resolve();
        expect(focus).not.toHaveBeenCalled();
        expect(heading.hasAttribute('tabindex')).toBe(false);
        expect(document.activeElement).toBe(trigger);
        instance.dispose();
      });

      describe('when Bootstrap throws while hiding', () => {
        /**
         * Mounts a drawer whose `hide()` throws synchronously and whose `close()` is observable.
         *
         * @param href - Link `href` as authored.
         * @returns The mounted elements and the `close()` stub.
         */
        const mountThrowing = (href: string) => {
          const mounted = mount('supaTocDrawer', href);
          mounted.hide.mockImplementation(() => {
            throw new Error('Bootstrap Drawer unavailable');
          });
          const close = vi.fn(() => mounted.drawer.removeAttribute('open'));
          mounted.drawer.close = close;
          return { ...mounted, close };
        };

        it('closes the dialog natively and focuses the destination without waiting for hidden', async () => {
          const { drawer, link, heading, close, instance } = mountThrowing('#usage');
          drawer.setAttribute('open', '');
          link.click();
          expect(close).toHaveBeenCalledOnce();
          await Promise.resolve();
          expect(document.activeElement).toBe(heading);
          expect(heading.getAttribute('tabindex')).toBe('-1');
          instance.dispose();
        });

        it('removes the pending listener so a later dismissal does not refocus the destination', async () => {
          const { drawer, link, trigger, close, instance } = mountThrowing('#usage');
          drawer.setAttribute('open', '');
          link.click();
          await Promise.resolve();
          expect(close).toHaveBeenCalledOnce();
          trigger.focus();
          drawer.dispatchEvent(new Event('hidden.bs.drawer'));
          await Promise.resolve();
          expect(document.activeElement).toBe(trigger);
          instance.dispose();
        });

        it('still focuses the destination when the dialog has no close()', async () => {
          const { drawer, link, heading } = mountThrowing('#usage');
          // Bootstrap's dispose() needs close(), so this test leaves its instance to the next reset.
          (drawer as { close?: unknown }).close = undefined;
          drawer.setAttribute('open', '');
          link.click();
          await Promise.resolve();
          expect(document.activeElement).toBe(heading);
        });

        it('focuses nothing for a cross-page link', async () => {
          const { drawer, link, trigger, heading, close, instance } = mountThrowing('other.html#usage');
          drawer.setAttribute('open', '');
          link.click();
          await Promise.resolve();
          expect(close).toHaveBeenCalledOnce();
          expect(document.activeElement).not.toBe(heading);
          expect(heading.hasAttribute('tabindex')).toBe(false);
          expect(trigger.isConnected).toBe(true);
          instance.dispose();
        });
      });

      describe('viewport breakpoints', () => {
        // The drawers switch at em widths, as the stylesheet does: 64em (lg) and 80em (xl) are
        // 1024 and 1280 px at the 16 px default font, and twice that at 32 px, where a 1280 px
        // window lays out as a 640 px one, with both columns in drawers.
        it.each([
          ['supaTocDrawer', 1279, 16, true],
          ['supaTocDrawer', 1280, 16, false],
          ['supaSidebarDrawer', 1023, 16, true],
          ['supaSidebarDrawer', 1024, 16, false],
          ['supaTocDrawer', 2559, 32, true],
          ['supaTocDrawer', 2560, 32, false],
          ['supaSidebarDrawer', 2047, 32, true],
          ['supaSidebarDrawer', 2048, 32, false],
          ['supaTocDrawer', 1440, 32, true],
          ['supaSidebarDrawer', 1440, 32, true]
        ])('%s at %ipx with a %ipx default font closes on link activation: %s', async (id, width, fontPx, closes) => {
          const { drawer, link, hide, instance } = mount(id, '#usage', width, '', fontPx);
          drawer.setAttribute('open', '');
          link.click();
          expect(hide).toHaveBeenCalledTimes(closes ? 1 : 0);
          await Promise.resolve();
          instance.dispose();
        });

        it.each([
          ['supaTocDrawer', 1279, true],
          ['supaTocDrawer', 1280, false],
          ['supaSidebarDrawer', 1023, true],
          ['supaSidebarDrawer', 1024, false]
        ])('%s without matchMedia at innerWidth %i closes on link activation: %s', async (id, width, closes) => {
          const { drawer, link, hide, instance } = mount(id, '#usage', width);
          vi.stubGlobal('matchMedia', undefined);
          drawer.setAttribute('open', '');
          link.click();
          expect(hide).toHaveBeenCalledTimes(closes ? 1 : 0);
          await Promise.resolve();
          instance.dispose();
        });

        it('asks for the lg and xl widths that the stylesheet switches the columns at', () => {
          const css = compileString(
            '@use "breakpoints"; a { lg: breakpoints.$lg; xl: breakpoints.$xl; }',
            { loadPaths: [resolve('src/main/frontend/scss')] }
          ).css;
          expect(css).toContain(`lg: ${SIDEBAR_INLINE_EM}em;`);
          expect(css).toContain(`xl: ${TOC_INLINE_EM}em;`);
        });

        it.each(['supaTocDrawer', 'supaSidebarDrawer'])('%s does not hide a drawer that is not open', (id) => {
          const { link, hide, instance } = mount(id, '#usage', 390);
          link.click();
          expect(hide).not.toHaveBeenCalled();
          instance.dispose();
        });
      });

      describe('inline sidebar links', () => {
        const restoration = history.scrollRestoration;

        // happy-dom sets history.scrollRestoration to 'manual' when it follows a fragment link,
        // and the TOC tests that follow read it.
        afterEach(() => {
          history.scrollRestoration = restoration;
        });

        /**
         * Renders the inline sidebar (from `lg` up) with one link to a heading of this page and
         * lets the browser follow the link, unlike `mount()`.
         *
         * @param href - Link `href` as authored.
         * @returns The link, the heading, and a later control.
         */
        const mountInline = (href: string) => {
          document.body.innerHTML = `
            <dialog id="supaSidebarDrawer" class="drawer drawer-start supa-sidebar-drawer" open><a class="supa-nav-link" href="${href}">Usage</a></dialog>
            <main id="supa-main-content"><h2 id="usage">Usage</h2><a id="later" href="#next">Later</a></main>`;
          stubViewport(1440);
          initDrawers();
          return {
            link: document.querySelector<HTMLAnchorElement>('#supaSidebarDrawer a')!,
            heading: document.getElementById('usage')!,
            later: document.getElementById('later')!
          };
        };

        /** Waits for the timer that runs after the browser has followed the link. */
        const afterNavigation = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

        it('moves focus to the heading a same-page link leads to, where the browser would leave <body>', async () => {
          const { link, heading } = mountInline('guide.html#usage');
          link.focus();
          link.click();
          // Focusable before the browser follows the link, so the browser can focus it itself
          expect(heading.getAttribute('tabindex')).toBe('-1');
          (document.activeElement as HTMLElement | null)?.blur();
          await afterNavigation();
          expect(document.activeElement).toBe(heading);
        });

        it('leaves focus alone after a modified click, a cancelled click, or a link to another page', async () => {
          let { link, heading } = mountInline('#usage');
          link.focus();
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await afterNavigation();
          expect(document.activeElement).toBe(link);
          expect(heading.hasAttribute('tabindex')).toBe(false);

          ({ link } = mountInline('#usage'));
          link.addEventListener('click', (event) => event.preventDefault());
          link.focus();
          link.click();
          await afterNavigation();
          expect(document.activeElement).toBe(link);

          ({ link, heading } = mountInline('other.html#usage'));
          link.focus();
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          await afterNavigation();
          expect(heading.hasAttribute('tabindex')).toBe(false);
        });

        it('keeps focus a reader moved before the timer ran', async () => {
          const { link, heading, later } = mountInline('#usage');
          link.focus();
          link.click();
          later.focus();
          await afterNavigation();
          expect(document.activeElement).toBe(later);
          expect(heading.getAttribute('tabindex')).toBe('-1');
        });
      });
    });

    it('configures left #supaSidebarDrawer (.drawer-start) and right #supaTocDrawer (.drawer-end) with body scrolling and backdrop options', () => {
      document.body.innerHTML = `
        <dialog class="drawer drawer-start supa-sidebar-drawer"
                id="supaSidebarDrawer"
                data-bs-scroll="true"
                data-bs-backdrop="false"
                tabindex="-1"></dialog>
        <dialog class="drawer drawer-end supa-toc-drawer"
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

    it('names a calendar month button by its text, and keeps the label of a button without text', () => {
      const cell = document.createElement('div');
      cell.innerHTML = '<button type="button" aria-label="January" data-vc-months-month="0">Jan</button>';
      nameMonthButtonByText(cell);
      const button = cell.querySelector('button')!;
      expect(button.hasAttribute('aria-label')).toBe(false);
      expect(button.textContent).toBe('Jan');

      // The month button itself, not its cell.
      const own = document.createElement('button');
      own.setAttribute('aria-label', 'February');
      own.setAttribute('data-vc-months-month', '1');
      own.textContent = 'Feb';
      nameMonthButtonByText(own);
      expect(own.hasAttribute('aria-label')).toBe(false);

      // Without text, the label is the button's only name.
      const blank = document.createElement('div');
      blank.innerHTML = '<button type="button" aria-label="March" data-vc-months-month="2"> </button>';
      nameMonthButtonByText(blank);
      expect(blank.querySelector('button')?.getAttribute('aria-label')).toBe('March');

      // Anything but a month button, such as a year, is left alone.
      const year = document.createElement('div');
      year.innerHTML = '<button type="button" aria-label="2026" data-vc-years-year="2026">2026</button>';
      nameMonthButtonByText(year);
      expect(year.querySelector('button')?.getAttribute('aria-label')).toBe('2026');
    });

    it('names the month buttons of every lazily loaded Datepicker by their text, in each month view and locale', async () => {
      // The calendar labels a month with `button.ariaLabel = 'January'`. Browsers reflect that
      // property to `aria-label`; happy-dom does not, so it would leave no label to check.
      const nativeAriaLabel = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabel');
      Object.defineProperty(Element.prototype, 'ariaLabel', {
        configurable: true,
        get(this: Element): string | null {
          return this.getAttribute('aria-label');
        },
        set(this: Element, value: string | null) {
          if (value === null) {
            this.removeAttribute('aria-label');
          } else {
            this.setAttribute('aria-label', value);
          }
        }
      });
      try {
        document.body.innerHTML = `
          <input type="text" id="dpEnglish" data-bs-toggle="datepicker" value="2026-10-20" />
          <input type="text" id="dpGerman" data-bs-toggle="datepicker" data-bs-locale="de-DE" value="2026-10-20" />
        `;
        await initLazyWidgets(document.body);
        const Datepicker = BootstrapPlugins.Datepicker!;
        expect(Datepicker.Default.vcpOptions.onCreateMonthEls).toBeTypeOf('function');

        /**
         * Opens a field's calendar with a click, as a reader does (the calendar is built after the
         * first one), after closing every other picker.
         *
         * @param input - Field with a Datepicker.
         * @returns The field's shown calendar.
         */
        const open = async (input: HTMLElement): Promise<HTMLElement> => {
          for (const other of document.querySelectorAll('input')) {
            await Datepicker.getInstance(other)?.hide();
          }
          input.click();
          return vi.waitFor(() => {
            const shown = document.querySelectorAll<HTMLElement>(
              '[data-vc="calendar"]:not([data-vc-calendar-hidden])'
            );
            expect(shown).toHaveLength(1);
            return shown[0];
          });
        };
        /**
         * Lists the month buttons of a calendar's month view as text and label.
         *
         * @param calendar - Calendar showing its month view.
         * @returns Each month button's text and `aria-label`.
         */
        const months = (calendar: HTMLElement): Array<{ text: string; label: string | null }> => {
          expect(calendar.getAttribute('data-vc-type')).toBe('month');
          return Array.from(calendar.querySelectorAll('[data-vc-months-month]'), (el) => ({
            text: el.textContent ?? '',
            label: el.getAttribute('aria-label')
          }));
        };

        // Without the skin's hook (a picker given its own `vcpOptions` replaces the defaults whole),
        // the calendar shows short names and labels the buttons with long ones.
        const replaced = document.createElement('input');
        replaced.type = 'text';
        replaced.value = '2026-10-20';
        document.body.appendChild(replaced);
        Datepicker.getOrCreateInstance(replaced, { vcpOptions: {} });
        const unhooked = await open(replaced);
        unhooked.querySelector<HTMLElement>('[data-vc="month"]')!.click();
        expect(months(unhooked).slice(0, 2)).toEqual([
          { text: 'Jan', label: 'January' },
          { text: 'Feb', label: 'February' }
        ]);

        const english = await open(document.getElementById('dpEnglish')!);
        english.querySelector<HTMLElement>('[data-vc="month"]')!.click();
        const unlabelledEnglish = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
          (text) => ({ text, label: null })
        );
        expect(months(english)).toEqual(unlabelledEnglish);
        // The calendar draws the month view anew after the year view, and after a new selection.
        english.querySelector<HTMLElement>('[data-vc="year"]')!.click();
        expect(english.getAttribute('data-vc-type')).toBe('year');
        expect(english.querySelector('[data-vc-years-year="2026"]')?.getAttribute('aria-label')).toBe('2026');
        english.querySelector<HTMLElement>('[data-vc="month"]')!.click();
        expect(months(english)).toEqual(unlabelledEnglish);
        Datepicker.getInstance(document.getElementById('dpEnglish')!)!.setSelectedDates(['2026-03-05']);
        english.querySelector<HTMLElement>('[data-vc="month"]')!.click();
        expect(months(english)).toEqual(unlabelledEnglish);

        const german = await open(document.getElementById('dpGerman')!);
        german.querySelector<HTMLElement>('[data-vc="month"]')!.click();
        const shortGerman = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'UTC' });
        expect(months(german)).toEqual(
          Array.from({ length: 12 }, (_, month) => ({
            text: shortGerman.format(Date.UTC(2026, month, 1)),
            label: null
          }))
        );
      } finally {
        if (nativeAriaLabel) {
          Object.defineProperty(Element.prototype, 'ariaLabel', nativeAriaLabel);
        } else {
          Reflect.deleteProperty(Element.prototype, 'ariaLabel');
        }
      }
    });

    it('scrolls back to the top smoothly only while the reader allows motion, asking at each click', () => {
      const motion = { allowed: false };
      vi.stubGlobal(
        'matchMedia',
        (query: string): MediaQueryList =>
          ({
            matches: query === '(prefers-reduced-motion: no-preference)' && motion.allowed,
            media: query
          }) as MediaQueryList
      );
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      try {
        initBackToTop();
        const button = document.querySelector<HTMLButtonElement>('.supa-back-to-top')!;
        button.click();
        // The reader turns the reduced-motion setting off while the page is open
        motion.allowed = true;
        button.click();
        expect(scrollTo.mock.calls).toEqual([
          [{ top: 0, behavior: 'instant' }],
          [{ top: 0, behavior: 'smooth' }]
        ]);
      } finally {
        scrollTo.mockRestore();
        vi.unstubAllGlobals();
      }
    });

    it('scrolls to the URL heading again only after setting html[data-supa-ready]', async () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const readyAtEachScroll: boolean[] = [];
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {
        readyAtEachScroll.push(document.documentElement.hasAttribute(SUPA_READY_ATTRIBUTE));
      });
      happyDOM.setURL('https://example.org/docs/guide.html#usage');
      document.body.innerHTML =
        '<main id="supa-main-content"><h1>Guide</h1><h2>Install</h2><h2>Usage</h2></main>';
      document.documentElement.removeAttribute(SUPA_READY_ATTRIBUTE);
      try {
        await initSupaSkin();
        expect(readyAtEachScroll).toEqual([false, true]);
      } finally {
        scrollSpy.mockRestore();
        happyDOM.setURL(originalUrl);
      }
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

    it('keeps each permalink label out of its heading name, and the link focusable and named', async () => {
      // axe-core's accessible-name computation stands in for the browser's; a11y-check.ts checks
      // Chromium's accessibility tree on the rendered self-site.
      const { default: axe } = await import('axe-core');
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h2>Full <code>site.xml</code> Example</h2>
          <h3><span lang="ja">概要</span></h3>
          <h4 aria-label="Author name">Own Label</h4>
          <h2 id="supa-heading-text-full-sitexml-example">Text</h2>
        </main>
      `;
      const article = document.getElementById('supa-main-content')!;
      prepareHeadings(article, true, '#');
      // A second run leaves the headings as the first one did
      prepareHeadings(article, true, '#');
      const headings = Array.from(article.querySelectorAll<HTMLElement>('h2, h3, h4'));
      axe.setup(document);
      try {
        expect(headings.map((h) => axe.commons.text.accessibleText(h))).toEqual([
          'Full site.xml Example',
          '概要',
          'Author name',
          'Text'
        ]);
        headings.forEach((heading) => {
          const permalinks = heading.querySelectorAll<HTMLAnchorElement>('.supa-headerlink');
          expect(permalinks).toHaveLength(1);
          const permalink = permalinks[0];
          // Still inside the heading, so it stays where it was on screen and in the Tab order
          expect(heading.lastElementChild).toBe(permalink);
          expect(permalink.hasAttribute('aria-hidden')).toBe(false);
          expect(permalink.tabIndex).toBe(0);
          const text = heading.textContent!.slice(0, -1).trim();
          expect(axe.commons.text.accessibleText(permalink)).toBe(`Permalink to ${text}`);
        });
      } finally {
        axe.teardown();
      }
      // The heading's text keeps its language wrapper, and no id repeats
      expect(headings[1].querySelector('[lang="ja"]')?.textContent).toBe('概要');
      const ids = Array.from(document.querySelectorAll('[id]'), (el) => el.id);
      expect(new Set(ids).size).toBe(ids.length);
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

    it('scrolls to the URL heading again once settled, unless the reader moved or the fragment names nothing', async () => {
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
       * @param hash - URL fragment, including the leading `#`, or `''` for none.
       * @returns The second scroll to the fragment's heading, which initSupaSkin() runs once ready.
       */
      const open = (hash: string): (() => Promise<void>) => {
        scrolledTo.length = 0;
        happyDOM.setURL(`https://example.org/docs/guide.html${hash}`);
        document.body.innerHTML = `
          <main id="supa-main-content"><h1>Handbuch</h1><h2>Einleitung</h2><h2>Überblick</h2></main>
          <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
        `;
        return initTocAndScrollSpy();
      };

      try {
        // Nothing interrupted: the same lookup as the first scroll finds the heading again
        let landAgain = open('#%C3%BCberblick');
        expect(scrolledTo).toEqual(['überblick']);
        await landAgain();
        expect(scrolledTo).toEqual(['überblick', 'überblick']);

        // A reader who scrolled, touched, clicked, or pressed a key since the page opened stays put
        for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
          landAgain = open('#einleitung');
          document.querySelector('main h2')!.dispatchEvent(new Event(type, { bubbles: true }));
          await landAgain();
          expect(scrolledTo, type).toEqual(['einleitung']);
        }

        // A fragment changed in place to one that names nothing, or whose heading is gone
        landAgain = open('#einleitung');
        happyDOM.setURL('https://example.org/docs/guide.html#gone');
        await landAgain();
        expect(scrolledTo).toEqual(['einleitung']);
        landAgain = open('#einleitung');
        document.getElementById('einleitung')!.remove();
        await landAgain();
        expect(scrolledTo).toEqual(['einleitung']);

        // A page opened without a fragment is not scrolled at all
        landAgain = open('');
        await landAgain();
        expect(scrolledTo).toEqual([]);
      } finally {
        scrollSpy.mockRestore();
        happyDOM.setURL(originalUrl);
      }
    });

    it('waits for the load event and web fonts before scrolling to the URL heading again', async () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const scrolledTo: string[] = [];
      const scrollSpy = vi
        .spyOn(Element.prototype, 'scrollIntoView')
        .mockImplementation(function (this: Element) {
          scrolledTo.push(this.id);
        });
      // happy-dom has finished loading and has no FontFaceSet; stand in for a browser whose page
      // is ready before its images, a late stylesheet, and that stylesheet's fonts have loaded
      let readyState: DocumentReadyState = 'interactive';
      Object.defineProperty(document, 'readyState', { get: () => readyState, configurable: true });
      let fontsLoaded = (): void => undefined;
      const fontsReady = new Promise<void>((resolveFonts) => {
        fontsLoaded = resolveFonts;
      });
      Object.defineProperty(document, 'fonts', { value: { ready: fontsReady }, configurable: true });
      const tick = (): Promise<void> => new Promise((resolveTick) => setTimeout(resolveTick, 0));

      try {
        happyDOM.setURL('https://example.org/docs/guide.html#usage');
        document.body.innerHTML =
          '<main id="supa-main-content"><h1>Guide</h1><h2>Install</h2><h2>Usage</h2></main>';
        const landed = initTocAndScrollSpy()();
        await tick();
        expect(scrolledTo).toEqual(['usage']);

        readyState = 'complete';
        window.dispatchEvent(new Event('load'));
        await tick();
        expect(scrolledTo).toEqual(['usage']);

        fontsLoaded();
        await landed;
        expect(scrolledTo).toEqual(['usage', 'usage']);
      } finally {
        Reflect.deleteProperty(document, 'readyState');
        Reflect.deleteProperty(document, 'fonts');
        scrollSpy.mockRestore();
        happyDOM.setURL(originalUrl);
      }
    });

    it('leaves TOC link scrolls to the stylesheet under reduced motion, asking at each click', () => {
      // happy-dom computes no default styles, so state the ones ScrollSpy reads: visible headings,
      // and a <body> that does not scroll itself, which makes the window the scroller
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Guide</h1><h2 style="visibility: visible">Install</h2><h2 style="visibility: visible">Usage</h2>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      document.body.style.overflowY = 'visible';
      const motion = { allowed: false };
      // Bootstrap's ScrollSpy asks the global matchMedia, as the browser's own is
      vi.stubGlobal(
        'matchMedia',
        (query: string): MediaQueryList =>
          ({ matches: query === '(prefers-reduced-motion: reduce)' && !motion.allowed, media: query }) as MediaQueryList
      );
      // happy-dom lays nothing out: give the headings a box so ScrollSpy tracks them
      const rects = vi
        .spyOn(Element.prototype, 'getClientRects')
        .mockReturnValue([new DOMRect(0, 0, 100, 20)] as unknown as DOMRectList);
      const behaviors: Array<ScrollBehavior | undefined> = [];
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation((options?: ScrollToOptions | number) => {
        behaviors.push(typeof options === 'object' ? options.behavior : undefined);
      });

      try {
        initTocAndScrollSpy();
        // ...and a place further down the page, so a click has somewhere to scroll
        Object.defineProperty(document.getElementById('usage'), 'offsetTop', { value: 800 });
        const link = document.querySelector<HTMLAnchorElement>('#supaTocNav a[href="#usage"]')!;
        link.click();
        // The reader turns the reduced-motion setting off while the page is open
        motion.allowed = true;
        link.click();
        // 'auto' takes <html>'s scroll-behavior, which is smooth only without reduced motion
        expect(behaviors).toEqual(['auto', 'smooth']);
      } finally {
        document.body.removeAttribute('style');
        scrollTo.mockRestore();
        rects.mockRestore();
        vi.unstubAllGlobals();
      }
    });

    it('focuses a smooth TOC scroll\'s heading when it settles, unless the reader moved focus meanwhile', () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      happyDOM.setURL('https://example.org/docs/guide.html');
      document.body.innerHTML = `
        <main id="supa-main-content">
          <h1>Guide</h1><h2 style="visibility: visible">Install</h2><h2 style="visibility: visible">Usage</h2>
          <button type="button" id="later">Later</button>
        </main>
        <aside class="supa-toc-column"><nav id="supaTocNav"></nav></aside>
      `;
      document.body.style.overflowY = 'visible';
      vi.stubGlobal('matchMedia', (query: string): MediaQueryList =>
        ({ matches: false, media: query }) as MediaQueryList);
      const rects = vi
        .spyOn(Element.prototype, 'getClientRects')
        .mockReturnValue([new DOMRect(0, 0, 100, 20)] as unknown as DOMRectList);
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

      try {
        initTocAndScrollSpy();
        const usage = document.getElementById('usage')!;
        Object.defineProperty(usage, 'offsetTop', { value: 800 });
        const link = document.querySelector<HTMLAnchorElement>('#supaTocNav a[href="#usage"]')!;
        const later = document.getElementById('later')!;

        // The reader stays put: Bootstrap's settle writes the fragment and focuses the heading
        link.focus();
        link.click();
        expect(window.location.hash).toBe('');
        document.dispatchEvent(new Event('scrollend'));
        expect(window.location.hash).toBe('#usage');
        expect(document.activeElement).toBe(usage);

        // The reader tabs on while the page is still scrolling: the fragment lands, focus stays
        happyDOM.setURL('https://example.org/docs/guide.html');
        link.focus();
        link.click();
        later.focus();
        document.dispatchEvent(new Event('scrollend'));
        expect(window.location.hash).toBe('#usage');
        expect(document.activeElement).toBe(later);

        // The settle is one-shot: a later unrelated scroll moves nothing
        link.focus();
        document.dispatchEvent(new Event('scrollend'));
        expect(document.activeElement).toBe(link);
      } finally {
        document.body.removeAttribute('style');
        scrollTo.mockRestore();
        rects.mockRestore();
        vi.unstubAllGlobals();
        happyDOM.setURL(originalUrl);
      }
    });

    it('leaves the reader where the browser restores them on a reload or a Back, unless the site restores nothing', async () => {
      const happyDOM = (window as unknown as { happyDOM: { setURL: (url: string) => void } })
        .happyDOM;
      const originalUrl = window.location.href;
      const scrolledTo: string[] = [];
      const scrollSpy = vi
        .spyOn(Element.prototype, 'scrollIntoView')
        .mockImplementation(function (this: Element) {
          scrolledTo.push(this.id);
        });
      let navigationType: NavigationTimingType = 'navigate';
      const entries = vi
        .spyOn(performance, 'getEntriesByType')
        .mockImplementation((type: string) =>
          type === 'navigation' ? ([{ type: navigationType }] as unknown as PerformanceEntryList) : []
        );
      const restoration = history.scrollRestoration;
      /**
       * Opens the page at a fragment the way `type` names, and runs both scrolls to its heading.
       *
       * @param type - How the reader reached the page.
       * @returns The headings scrolled to.
       */
      const open = async (type: NavigationTimingType): Promise<string[]> => {
        scrolledTo.length = 0;
        navigationType = type;
        happyDOM.setURL('https://example.org/docs/guide.html#usage');
        document.body.innerHTML =
          '<main id="supa-main-content"><h1>Guide</h1><h2>Install</h2><h2>Usage</h2></main>';
        await initTocAndScrollSpy()();
        return [...scrolledTo];
      };

      try {
        expect(await open('navigate')).toEqual(['usage', 'usage']);
        expect(await open('reload')).toEqual([]);
        expect(await open('back_forward')).toEqual([]);
        // A site that restores scroll positions itself leaves the skin to land on the heading
        history.scrollRestoration = 'manual';
        expect(await open('reload')).toEqual(['usage', 'usage']);
      } finally {
        history.scrollRestoration = restoration;
        entries.mockRestore();
        scrollSpy.mockRestore();
        happyDOM.setURL(originalUrl);
      }
    });

    describe('the browser\'s last try at the fragment after the load event', () => {
      const happyDOM = (): { setURL: (url: string) => void } =>
        (window as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM;
      let originalUrl = '';
      let navigationType: NavigationTimingType = 'navigate';
      let readyState: DocumentReadyState = 'interactive';
      const tick = (): Promise<void> => new Promise((resolveTick) => setTimeout(resolveTick, 0));

      beforeEach(() => {
        originalUrl = window.location.href;
        vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);
        vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) =>
          type === 'navigation' ? ([{ type: navigationType }] as unknown as PerformanceEntryList) : []
        );
        // happy-dom lays nothing out: #usage sits at the top of the viewport, where a scroll to it
        // lands it, at scrollY 6000, and every other element far below
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
          return new DOMRect(0, this.id === 'usage' ? 6000 - window.scrollY : 9999, 100, 20);
        });
        // happy-dom has finished loading; stand in for a page whose load event is still to come
        Object.defineProperty(document, 'readyState', { get: () => readyState, configurable: true });
      });

      afterEach(() => {
        Reflect.deleteProperty(document, 'readyState');
        window.scrollTo(0, 0);
        vi.restoreAllMocks();
        happyDOM().setURL(originalUrl);
      });

      /**
       * Opens the page at `#usage` the way `type` names, lets `beforeLoad` run, fires the load
       * event, lets `afterLoad` run, and then scrolls to `browserScroll`: by default where Firefox
       * puts #usage when it tries the fragment once more right after the load event, now that the
       * skin has given the heading its id.
       *
       * @param type - How the reader reached the page.
       * @param beforeLoad - What happens between the skin's start and the load event.
       * @param afterLoad - What happens between the load event and the scroll.
       * @param browserScroll - Where the page scrolls after the load event.
       * @returns The scroll position once the skin has had its turn after the load event.
       */
      const open = async (
        type: NavigationTimingType,
        beforeLoad: () => void,
        afterLoad: () => void = () => undefined,
        browserScroll = 6000
      ): Promise<number> => {
        navigationType = type;
        readyState = 'interactive';
        window.scrollTo(0, 0);
        happyDOM().setURL('https://example.org/docs/guide.html#usage');
        document.body.innerHTML = `
          <main id="supa-main-content"><h1>Guide</h1><h2>Install</h2><h2>Usage</h2>
            <p><a id="to-install" href="#install">Install</a> <a id="to-usage" href="#usage">Usage</a></p>
          </main>`;
        // The skin's TOC links scroll themselves, as an in-page link with a smooth scroll does
        document.querySelectorAll('main a').forEach((link) => {
          link.addEventListener('click', (event) => event.preventDefault());
        });
        const landAgain = initTocAndScrollSpy();
        beforeLoad();
        readyState = 'complete';
        window.dispatchEvent(new Event('load'));
        afterLoad();
        window.scrollTo(0, browserScroll);
        await tick();
        const scrollY = window.scrollY;
        // The skin's own second scroll to the heading is a mocked scrollIntoView(), which moves nothing
        await landAgain();
        return scrollY;
      };

      /**
       * Follows an in-page link the way a pointer does, and leaves its smooth scroll under way.
       *
       * @param id - Id of the link.
       * @param at - Where the smooth scroll has got to by the load event.
       */
      const follow = (id: string, at: number): void => {
        const link = document.getElementById(id)!;
        link.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        window.scrollTo(0, at);
      };

      it('keeps a reader who moved or was restored where they are', async () => {
        // The browser put the reader back where they were before a reload or a Back
        expect(await open('reload', () => window.scrollTo(0, 3000))).toBe(3000);
        expect(await open('back_forward', () => window.scrollTo(0, 3000))).toBe(3000);
        // The reader scrolled away from the heading before the page had loaded
        expect(
          await open('navigate', () => {
            window.dispatchEvent(new Event('wheel'));
            window.scrollTo(0, 2400);
          })
        ).toBe(2400);
        // ...or followed a link to another heading, whose scroll had ended by the load event
        expect(await open('navigate', () => follow('to-install', 2000))).toBe(2000);
        // Nobody moved: the browser's scroll to the heading stands
        expect(await open('navigate', () => window.scrollTo(0, 5000))).toBe(6000);
      });

      it('never undoes a scroll the reader or the browser is still making', async () => {
        // The reader's own input after the load event is theirs to keep
        expect(
          await open(
            'reload',
            () => window.scrollTo(0, 3000),
            () => window.dispatchEvent(new Event('keydown'))
          )
        ).toBe(6000);
        // A link followed before the load event, whose smooth scroll is still on its way
        expect(await open('navigate', () => follow('to-install', 2000), undefined, 2100)).toBe(2100);
        // ...and one to the URL's own heading, which the browser's scroll is right to finish
        expect(await open('navigate', () => follow('to-usage', 2000))).toBe(6000);
        // A Back or Forward to another fragment after the load event
        expect(
          await open(
            'reload',
            () => window.scrollTo(0, 3000),
            () => window.dispatchEvent(new HashChangeEvent('hashchange'))
          )
        ).toBe(6000);
        expect(
          await open(
            'reload',
            () => window.scrollTo(0, 3000),
            () => window.dispatchEvent(new PopStateEvent('popstate'))
          )
        ).toBe(6000);
      });

      it('stops listening for reader input on every path', async () => {
        const listening = new Set<EventListenerOrEventListenerObject>();
        const add = window.addEventListener.bind(window);
        const remove = window.removeEventListener.bind(window);
        vi.spyOn(window, 'addEventListener').mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'wheel') {
              listening.add(listener);
            }
            add(type, listener, options);
          }
        );
        vi.spyOn(window, 'removeEventListener').mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
            if (type === 'wheel') {
              listening.delete(listener);
            }
            remove(type, listener, options);
          }
        );

        // The page had already loaded when the skin started
        navigationType = 'navigate';
        readyState = 'complete';
        happyDOM().setURL('https://example.org/docs/guide.html#usage');
        document.body.innerHTML = '<main id="supa-main-content"><h1>Guide</h1><h2>Usage</h2></main>';
        await initTocAndScrollSpy()();
        expect(listening.size, 'already loaded').toBe(0);

        // Reader input after the load event, on a reload and on a first visit
        await open(
          'reload',
          () => window.scrollTo(0, 3000),
          () => window.dispatchEvent(new Event('keydown'))
        );
        expect(listening.size, 'reload, input after load').toBe(0);
        await open(
          'navigate',
          () => window.dispatchEvent(new Event('wheel')),
          () => window.dispatchEvent(new Event('keydown'))
        );
        expect(listening.size, 'first visit, input after load').toBe(0);
      });
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
          expect(btn.getAttribute('aria-label')).not.toBe('Copy code');
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
        expect(btn.getAttribute('aria-label')).toBe('Copy code');
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
          expect(btn.getAttribute('aria-label')).not.toBe('Copy code');
        });

        expectCopiedState(btn);
        expect(document.activeElement).not.toBe(btn);
        expect(document.activeElement).toBe(document.body);
      });
    });
  });

  describe('Client-Side Search Indexing, Filtering & Highlighting', () => {
    describe('search combobox active result', () => {
      const shortcutListeners: EventListenerOrEventListenerObject[] = [];

      beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
        document.body.innerHTML = `
          <nav class="supa-sidebar-tree">
            <a class="supa-nav-link" href="alpha.html">Guide Alpha</a>
            <a class="supa-nav-link" href="beta.html">Guide Beta</a>
          </nav>
          <dialog id="supaSearchDialog" open>
            <input id="supaSearchInput" role="combobox" aria-controls="supaSearchResults"
                   aria-autocomplete="list" aria-expanded="false" />
            <div id="supaSearchStatus"></div>
            <div id="supaSearchResults" role="listbox"></div>
          </dialog>`;
        // initSearch() never removes its document-level shortcut listener, so a test would
        // otherwise also trigger the listeners of every earlier test's detached dialog.
        const addListener = document.addEventListener.bind(document);
        vi.spyOn(document, 'addEventListener').mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'keydown') {
              shortcutListeners.push(listener);
            }
            addListener(type, listener, options);
          }
        );
        initSearch();
      });

      afterEach(() => {
        shortcutListeners.splice(0).forEach((listener) => document.removeEventListener('keydown', listener));
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      });

      /**
       * Types a query through the search input's public event interface.
       * @param query - Query to render.
       * @returns The focused search input.
       */
      const search = (query: string): HTMLInputElement => {
        const input = document.getElementById('supaSearchInput') as HTMLInputElement;
        input.focus();
        input.value = query;
        input.dispatchEvent(new Event('input'));
        return input;
      };

      /**
       * Checks that visual selection and the input describe the same option.
       * @param input - Search input retaining keyboard focus.
       * @param index - Expected active option position.
       */
      const expectActive = (input: HTMLInputElement, index: number): void => {
        const options = Array.from(document.querySelectorAll<HTMLAnchorElement>('[role="option"]'));
        const active = options[index];
        expect(active.id).not.toBe('');
        expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
        expect(input.getAttribute('aria-activedescendant')).toBe(active.id);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(options.filter((option) => option.getAttribute('aria-selected') === 'true')).toEqual([active]);
        expect(options.filter((option) => option.classList.contains('is-active'))).toEqual([active]);
        expect(options.every((option) => option.tabIndex === 0)).toBe(true);
        expect(document.activeElement).toBe(input);
      };

      it('exposes initial selection and wraps ArrowDown and ArrowUp without moving focus', () => {
        const input = search('guide');
        expectActive(input, 0);
        for (const [key, index] of [['ArrowDown', 1], ['ArrowDown', 0], ['ArrowUp', 1]] as const) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key }));
          expectActive(input, index);
        }
        const click = vi.fn((event: Event) => event.preventDefault());
        document.querySelectorAll('[role="option"]')[1].addEventListener('click', click);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(click).toHaveBeenCalledOnce();
      });

      it('ignores keys that confirm IME composition', () => {
        const input = search('guide');
        const options = Array.from(document.querySelectorAll<HTMLAnchorElement>('[role="option"]'));
        const click = vi.fn((event: Event) => event.preventDefault());
        options.forEach((option) => option.addEventListener('click', click));
        const composing: KeyboardEventInit[] = [{ isComposing: true }, { keyCode: 229 }];
        for (const init of composing) {
          for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) {
            const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init });
            input.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(false);
            expectActive(input, 0);
          }
        }
        expect(click).not.toHaveBeenCalled();
        const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
        input.dispatchEvent(arrow);
        expect(arrow.defaultPrevented).toBe(true);
        expectActive(input, 1);
        const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
        input.dispatchEvent(enter);
        expect(enter.defaultPrevented).toBe(true);
        expect(click).toHaveBeenCalledOnce();
      });

      it('resynchronizes expanded state when a dialog with retained results reopens', () => {
        const input = search('guide');
        expectActive(input, 0);
        const dialog = document.getElementById('supaSearchDialog')!;
        dialog.dispatchEvent(new Event('close'));
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(dialog.querySelectorAll('[role="option"]')).toHaveLength(2);
        dialog.dispatchEvent(new Event('shown.bs.dialog'));
        expectActive(input, 0);
        dialog.dispatchEvent(new Event('hidden.bs.dialog'));
        expect(input.getAttribute('aria-expanded')).toBe('false');
      });

      describe('while the dialog is closed', () => {
        /**
         * Closes the dialog as the browser does before it fires `close`.
         * @returns The search dialog.
         */
        const closeDialog = (): HTMLDialogElement => {
          const dialog = document.getElementById('supaSearchDialog') as HTMLDialogElement;
          dialog.removeAttribute('open');
          return dialog;
        };

        it.each(['close', 'hidden.bs.dialog'])('drops the active option after %s', (eventName) => {
          const input = search('guide');
          expectActive(input, 0);
          closeDialog().dispatchEvent(new Event(eventName));
          expect(input.getAttribute('aria-expanded')).toBe('false');
          expect(input.hasAttribute('aria-activedescendant')).toBe(false);
          expect(document.querySelectorAll('[role="option"]')).toHaveLength(2);
        });

        it('does not restore the active option when results re-render while closed', async () => {
          let finishFetch!: (value: Response) => void;
          const response = new Promise<Response>((resolve) => {
            finishFetch = resolve;
          });
          vi.stubGlobal('fetch', vi.fn(() => response));
          const input = search('guide');
          closeDialog().dispatchEvent(new Event('close'));
          input.dispatchEvent(new Event('input'));
          expect(input.hasAttribute('aria-activedescendant')).toBe(false);
          finishFetch({ ok: true, text: async () => '<title>Guide Remote</title><main id="supa-main-content"><h2>Guide Remote</h2></main>' } as Response);
          await vi.waitFor(() => expect(document.getElementById('supaSearchStatus')?.textContent).toBe('Results: 4'));
          expect(input.hasAttribute('aria-activedescendant')).toBe(false);
          expect(input.getAttribute('aria-expanded')).toBe('false');
        });

        it('restores the active option when Bootstrap reopens the dialog', () => {
          const input = search('guide');
          const dialog = closeDialog();
          dialog.dispatchEvent(new Event('close'));
          dialog.setAttribute('open', '');
          dialog.dispatchEvent(new Event('shown.bs.dialog'));
          expectActive(input, 0);
        });

        it('restores the active option when the showModal fallback reopens the dialog', () => {
          const input = search('guide');
          const dialog = closeDialog() as HTMLDialogElement;
          dialog.dispatchEvent(new Event('close'));
          vi.spyOn(Dialog, 'getOrCreateInstance').mockImplementation(() => {
            throw new Error('Bootstrap Dialog unavailable');
          });
          dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          expect(dialog.showModal).toHaveBeenCalledOnce();
          expectActive(input, 0);
        });
      });

      it('clears selection for no matches and an empty query, then selects the new query', () => {
        const input = search('guide');
        const alphaId = document.querySelector('[href="alpha.html"][role="option"]')?.id;
        for (const query of ['zzzz-no-match', '']) {
          search(query);
          expect(input.hasAttribute('aria-activedescendant')).toBe(false);
          expect(input.getAttribute('aria-expanded')).toBe('false');
          expect(document.querySelector('[aria-selected="true"]')).toBeNull();
        }
        search('beta');
        expectActive(input, 0);
        search('alpha');
        expectActive(input, 0);
        expect(document.querySelector('[role="option"]')?.id).toBe(alphaId);
      });

      describe('keydown with no results', () => {
        it.each([
          ['an empty query', ''],
          ['a query without matches', 'zzzz-no-match']
        ])('leaves ArrowDown, ArrowUp, and Enter to the browser for %s', (_label, query) => {
          const input = search(query);
          for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) {
            const event = new KeyboardEvent('keydown', { key, cancelable: true });
            input.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(false);
          }
          expect(input.hasAttribute('aria-activedescendant')).toBe(false);
          expect(input.getAttribute('aria-expanded')).toBe('false');
          expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
        });
      });

      describe('option IDs', () => {
        it('skips an ID that an element elsewhere on the page already uses', () => {
          document.body.insertAdjacentHTML(
            'beforeend',
            '<span id="supa-search-option-0"></span><span id="supa-search-option-1"></span>'
          );
          const input = search('guide');
          const ids = Array.from(document.querySelectorAll('[role="option"]')).map((option) => option.id);
          expect(ids).toHaveLength(2);
          expect(new Set(ids).size).toBe(2);
          expect(ids).toEqual(['supa-search-option-2', 'supa-search-option-3']);
          expect(document.querySelectorAll('#supa-search-option-0, #supa-search-option-1')).toHaveLength(2);
          expectActive(input, 0);
        });

        it('keeps a destination ID after a colliding element appears and the results re-render', () => {
          search('guide');
          const alphaId = document.querySelector('[href="alpha.html"][role="option"]')!.id;
          document.body.insertAdjacentHTML('beforeend', '<span id="supa-search-option-9"></span>');
          search('beta');
          search('guide');
          expect(document.querySelector('[href="alpha.html"][role="option"]')!.id).toBe(alphaId);
          const ids = Array.from(document.querySelectorAll('[role="option"]')).map((option) => option.id);
          expect(ids).not.toContain('supa-search-option-9');
          expect(new Set(ids).size).toBe(ids.length);
        });
      });

      describe('the / and Ctrl/Cmd+K shortcuts', () => {
        /**
         * Presses a shortcut on `target`, as a reader does.
         * @param init - Key and modifiers of the press.
         * @param target - Element receiving the key press.
         * @returns The dispatched event.
         */
        const press = (init: KeyboardEventInit, target: EventTarget = document.body): KeyboardEvent => {
          const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
          target.dispatchEvent(event);
          return event;
        };
        const slash: KeyboardEventInit = { key: '/' };
        // Both shortcuts open the dialog through one path, so each behavior is checked for each.
        const shortcuts: Array<[string, KeyboardEventInit]> = [
          ['/', slash],
          ['Ctrl+K', { key: 'k', ctrlKey: true }],
          ['Cmd+K', { key: 'k', metaKey: true }]
        ];

        /**
         * Closes the dialog as the browser does before it fires `close`.
         * @returns The search dialog.
         */
        const closeDialog = (): HTMLDialogElement => {
          const dialog = document.getElementById('supaSearchDialog') as HTMLDialogElement;
          dialog.removeAttribute('open');
          dialog.dispatchEvent(new Event('close'));
          return dialog;
        };

        afterEach(() => {
          vi.useRealTimers();
        });

        it.each(shortcuts)('%s opens the dialog through Bootstrap and focuses the input once it is shown', (_name, init) => {
          vi.useFakeTimers();
          const dialog = closeDialog();
          const show = vi.spyOn(Dialog.getOrCreateInstance(dialog), 'show').mockResolvedValue(undefined);
          dialog.showModal = vi.fn();
          const input = document.getElementById('supaSearchInput') as HTMLInputElement;
          const event = press(init);
          expect(event.defaultPrevented).toBe(true);
          expect(show).toHaveBeenCalledOnce();
          expect(dialog.showModal).not.toHaveBeenCalled();
          expect(document.activeElement).not.toBe(input);
          vi.advanceTimersByTime(50);
          expect(document.activeElement).toBe(input);
        });

        it.each(shortcuts)('%s opens the dialog with showModal() and restores the retained results when Bootstrap fails', (_name, init) => {
          vi.useFakeTimers();
          const input = search('guide');
          const dialog = closeDialog();
          vi.spyOn(Dialog, 'getOrCreateInstance').mockImplementation(() => {
            throw new Error('Bootstrap Dialog unavailable');
          });
          dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
          input.blur();
          const event = press(init);
          expect(event.defaultPrevented).toBe(true);
          expect(dialog.showModal).toHaveBeenCalledOnce();
          vi.advanceTimersByTime(50);
          // expectActive() also checks that the input has focus.
          expectActive(input, 0);
        });

        it.each(shortcuts)('%s tolerates a dialog without showModal() when Bootstrap fails', (_name, init) => {
          const dialog = closeDialog();
          vi.spyOn(Dialog, 'getOrCreateInstance').mockImplementation(() => {
            throw new Error('Bootstrap Dialog unavailable');
          });
          (dialog as { showModal?: unknown }).showModal = undefined;
          expect(() => press(init)).not.toThrow();
          expect(dialog.hasAttribute('open')).toBe(false);
        });

        it.each(shortcuts)('%s starts indexing the site for the first search', async (_name, init) => {
          // An index that an earlier test cached in sessionStorage would make the fetch unnecessary.
          window.sessionStorage.clear();
          const fetchMock = vi.fn(async () => ({ ok: false }));
          vi.stubGlobal('fetch', fetchMock);
          const dialog = closeDialog();
          vi.spyOn(Dialog.getOrCreateInstance(dialog), 'show').mockResolvedValue(undefined);
          press(init);
          await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        });

        it('does nothing while the dialog is already open', () => {
          const dialog = document.getElementById('supaSearchDialog') as HTMLDialogElement;
          const show = vi.spyOn(Dialog.getOrCreateInstance(dialog), 'show').mockResolvedValue(undefined);
          dialog.showModal = vi.fn();
          const event = press(slash);
          expect(event.defaultPrevented).toBe(false);
          expect(show).not.toHaveBeenCalled();
          expect(dialog.showModal).not.toHaveBeenCalled();
        });

        it.each([
          ['an input', '<input id="field" />'],
          ['a textarea', '<textarea id="field"></textarea>'],
          ['a contenteditable element', '<div id="field" contenteditable="true">text</div>']
        ])('does not open the dialog while typing in %s', (_label, markup) => {
          document.body.insertAdjacentHTML('beforeend', markup);
          const field = document.getElementById('field') as HTMLElement;
          const dialog = closeDialog();
          const show = vi.spyOn(Dialog.getOrCreateInstance(dialog), 'show').mockResolvedValue(undefined);
          dialog.showModal = vi.fn();
          const event = press(slash, field);
          expect(event.defaultPrevented).toBe(false);
          expect(show).not.toHaveBeenCalled();
          expect(dialog.showModal).not.toHaveBeenCalled();
          // The same press on the page itself opens it, so the field was what suppressed it.
          press(slash);
          expect(show).toHaveBeenCalledOnce();
        });
      });

      it('resynchronizes selection after asynchronous indexing rerenders the current query', async () => {
        let finishFetch!: (value: Response) => void;
        const response = new Promise<Response>((resolve) => {
          finishFetch = resolve;
        });
        vi.stubGlobal('fetch', vi.fn(() => response));
        const input = search('guide');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        finishFetch({ ok: true, text: async () => '<title>Guide Remote</title><main id="supa-main-content"><h2>Guide Remote</h2></main>' } as Response);
        await vi.waitFor(() => expect(document.getElementById('supaSearchStatus')?.textContent).toBe('Results: 4'));
        expectActive(input, 0);
      });
    });

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

    it('highlights query terms in raw text, so entity names in the query never match escaped characters', () => {
      const html = highlightQueryTerms('A < B & C', 'lt amp');
      // The text itself holds no "lt" or "amp", so nothing is marked and the text stays escaped.
      expect(html).toBe('A &lt; B &amp; C');

      const div = document.createElement('div');
      div.innerHTML = highlightQueryTerms('Salt <b> & amp', 'lt amp');
      expect(div.textContent).toBe('Salt <b> & amp');
      expect(Array.from(div.querySelectorAll('mark')).map((m) => m.textContent)).toEqual(['lt', 'amp']);
      expect(div.querySelector('b')).toBeNull();
      expect(highlightQueryTerms('a&b', 'a&')).toBe(
        '<mark class="supa-search-mark">a&amp;</mark>b'
      );
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

  describe('Translatable Interface Labels', () => {
    /**
     * Sets the `data-supa-label-*` attributes site.vm emits on `<body>` for overridden labels.
     *
     * @param labels - Kebab-case key (without the prefix) to value.
     */
    const setLabels = (labels: Record<string, string>): void => {
      for (const [key, value] of Object.entries(labels)) {
        document.body.setAttribute(`data-supa-label-${key}`, value);
      }
    };

    afterEach(() => {
      for (const attr of Array.from(document.body.attributes)) {
        if (
          attr.name.startsWith('data-supa-label-') ||
          attr.name === 'data-supa-unknown-labels' ||
          attr.name === 'data-supa-markup-labels'
        ) {
          document.body.removeAttribute(attr.name);
        }
      }
      document.documentElement.removeAttribute('lang');
      vi.restoreAllMocks();
    });

    it('keeps the same keys, English text, placeholders, and Set by as #supaLabelDefaults and the configuration.md table', () => {
      const macros = readFileSync(
        resolve(process.cwd(), 'src/main/resources/META-INF/maven/site-macros.vm'),
        'utf8'
      );
      const velocity = new Map<string, { english: string; script: boolean }>();
      for (const [, key, english, script] of macros.matchAll(
        /^#supaDefineLabel\( '(\w+)' '([^']*)' (true|false) \)$/gm
      )) {
        expect(velocity.has(key)).toBe(false);
        velocity.set(key, { english, script: script === 'true' });
      }
      // Every key the scripts read is marked true in Velocity, with the same English text
      const scriptLabels = [...velocity].filter(([, label]) => label.script);
      expect(Object.fromEntries(scriptLabels.map(([key, label]) => [key, label.english]))).toEqual({
        ...LABEL_DEFAULTS
      });

      const reference = readFileSync(resolve(process.cwd(), 'src/site/markdown/configuration.md'), 'utf8');
      const start = reference.indexOf('\n### Labels\n');
      const end = reference.indexOf('\n### ', start + 1);
      expect(start).toBeGreaterThan(-1);
      const rows = new Map<string, { english: string; placeholders: string; setBy: string }>();
      for (const [, key, english, placeholders, setBy] of reference
        .slice(start, end)
        .matchAll(/^\| `(\w+)` \| `([^`]*)` \|(.*?)\|.*?\| (template|script|both) \|$/gm)) {
        expect(rows.has(key)).toBe(false);
        rows.set(key, { english, placeholders, setBy });
      }
      expect([...rows.keys()].sort()).toEqual([...velocity.keys()].sort());

      /**
       * Lists the distinct `{name}` placeholders in a string.
       *
       * @param text - A label or a table cell.
       * @returns The placeholder names, sorted.
       */
      const placeholdersOf = (text: string): string[] =>
        [...new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1]))].sort();
      for (const [key, { english, script }] of velocity) {
        const row = rows.get(key)!;
        expect(row.english, key).toBe(english);
        // The Placeholders cell names each placeholder first, as `{name}`: its description
        expect(placeholdersOf(row.placeholders.replace(/:[^;]*/g, '')), key).toEqual(placeholdersOf(english));
        expect(row.setBy === 'template', key).toBe(!script);
      }
    });

    it('returns the English default with its placeholders filled when the page overrides nothing', () => {
      expect(getLabel('copyCode')).toBe('Copy code');
      expect(getLabel('searchResultCount', { count: 3 })).toBe('Results: 3');
      expect(getLabel('searchNoResults', { query: 'maven' })).toBe('No results for “maven”');
      expect(getLabel('tabFallback', { n: 1 })).toBe('Tab 1');
    });

    it('reads an override from its kebab-case data-supa-label-* attribute and fills its placeholders', () => {
      setLabels({
        'search-no-results': 'Keine Treffer für „{query}“',
        'color-scheme-modus-tinted': 'Modus getönt',
        'admonition-see-also': 'Siehe auch'
      });
      expect(getLabel('searchNoResults', { query: 'maven' })).toBe('Keine Treffer für „maven“');
      expect(getLabel('colorSchemeModusTinted')).toBe('Modus getönt');
      expect(getLabel('admonitionSeeAlso')).toBe('Siehe auch');
      // A key the page does not override stays English
      expect(getLabel('searchHint')).toBe(LABEL_DEFAULTS.searchHint);
    });

    it('falls back to English for an empty or blank override, so no control loses its name', () => {
      setLabels({ 'back-to-top': '', 'copy-code': '   ' });
      expect(getLabel('backToTop')).toBe('Back to top');
      expect(getLabel('copyCode')).toBe('Copy code');
    });

    it('fills placeholders like #supaFillLabel: an empty value drops it with the space before it', () => {
      expect(fillLabel('Permalink to {heading}', { heading: '' })).toBe('Permalink to');
      expect(fillLabel('{count} Treffer', { count: 0 })).toBe('0 Treffer');
      expect(fillLabel('A {x} and {x}', { x: 'b' })).toBe('A b and b');
      // A placeholder without a value stays visible, so a translator's typo is noticed
      expect(fillLabel('Results: {cuont}', { count: 2 })).toBe('Results: {cuont}');
      expect(fillLabel('{constructor}', {})).toBe('{constructor}');
      // A value is inserted as written, never re-scanned for placeholders
      expect(fillLabel('Search: {query}', { query: '{count}' })).toBe('Search: {count}');
    });

    it('warns once about the unknown <labels> keys site.vm lists in data-supa-unknown-labels', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(warnUnknownLabels()).toBe(false);
      expect(warn).not.toHaveBeenCalled();

      document.body.setAttribute('data-supa-unknown-labels', 'serchPlaceholder otherTypo');
      expect(warnUnknownLabels()).toBe(true);
      expect(warnUnknownLabels()).toBe(false);
      await initSupaSkin();
      const labelWarnings = warn.mock.calls.filter((call) => String(call[0]).includes('<labels>'));
      expect(labelWarnings).toHaveLength(1);
      expect(labelWarnings[0][0]).toContain('serchPlaceholder, otherTypo');
    });

    it('sets overridden labels as text, never as HTML', () => {
      const markup = '<img src="x" onerror="window.__supaXss = true">';
      setLabels({ 'back-to-top': markup, 'code-hide': markup });
      initBackToTop();
      const backToTop = document.querySelector<HTMLButtonElement>('.supa-back-to-top')!;
      expect(backToTop.querySelector('img')).toBeNull();
      expect(backToTop.querySelector('span')!.textContent).toBe(markup);
      expect(backToTop.getAttribute('aria-label')).toBe(markup);
      expect(backToTop.getAttribute('data-bs-title')).toBe(markup);

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-component-preview"><button class="btn">Demo</button></div>
        <pre><code class="language-html">&lt;button&gt;Demo&lt;/button&gt;</code></pre>`;
      document.body.appendChild(container);
      enhanceCodeBlocks(container, false, true);
      initComponentExamples(container);
      const toggle = container.querySelector<HTMLButtonElement>('.supa-component-code-toggle')!;
      expect(toggle.querySelector('img')).toBeNull();
      expect(toggle.textContent).toBe(markup);
    });

    it('uses one label per control for its visible text, name, and tooltip', () => {
      setLabels({ 'back-to-top': 'Nach oben', 'code-show': 'Code zeigen', 'code-hide': 'Code verbergen' });
      initBackToTop();
      const backToTop = document.querySelector<HTMLButtonElement>('.supa-back-to-top')!;
      expect(backToTop.textContent).toBe('Nach oben');
      expect(backToTop.getAttribute('aria-label')).toBe('Nach oben');
      expect(backToTop.getAttribute('data-bs-title')).toBe('Nach oben');

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="supa-component-preview"><button class="btn">Demo</button></div>
        <pre><code class="language-html">&lt;button&gt;Demo&lt;/button&gt;</code></pre>`;
      document.body.appendChild(container);
      enhanceCodeBlocks(container, false, true);
      initComponentExamples(container);
      const toggle = container.querySelector<HTMLButtonElement>('.supa-component-code-toggle')!;
      // The visible text names the toggle, so it carries no tooltip that could disagree with it
      expect(toggle.textContent).toBe('Code verbergen');
      expect(toggle.hasAttribute('data-bs-title')).toBe(false);
      toggle.click();
      expect(toggle.textContent).toBe('Code zeigen');
    });

    it('translates the color-scheme and theme triggers and keeps the shown scheme name in the trigger name', () => {
      document.body.innerHTML = `
        <button type="button" class="supa-palette-btn" data-bs-toggle="menu">
          <span data-supa-palette-label="true">Furo (AA)</span>
        </button>
        <button type="button" class="supa-theme-toggle-btn" data-bs-toggle="menu" data-supa-theme-trigger="true"></button>
        <button type="button" data-supa-theme-toggle="true"></button>`;
      setLabels({
        'color-scheme-trigger': 'Farbschema: {name}',
        'color-scheme-modus-tinted': 'Modus getönt',
        'theme-trigger': 'Farbmodus: {mode}',
        'theme-auto': 'Automatisch',
        'theme-dark': 'Dunkel'
      });
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({ matches: query.includes('dark'), media: query, addEventListener: () => undefined }) as unknown as MediaQueryList
      );

      initTheme();
      applyPalette('modus-tinted');
      const palette = document.querySelector<HTMLButtonElement>('.supa-palette-btn')!;
      // The skin appends the WCAG level; sites cannot change it
      expect(palette.textContent!.trim()).toBe('Modus getönt (AAA)');
      expect(palette.getAttribute('aria-label')).toBe('Farbschema: Modus getönt (AAA)');
      expect(palette.getAttribute('data-bs-title')).toBe('Farbschema: Modus getönt (AAA)');

      // A translation without {name} still names the trigger with the text it shows (WCAG 2.5.3)
      setLabels({ 'color-scheme-trigger': 'Farbschema' });
      applyPalette('furo');
      expect(palette.getAttribute('aria-label')).toBe('Farbschema Furo (AA)');

      applyThemeMode('auto');
      const theme = document.querySelector<HTMLButtonElement>('[data-supa-theme-trigger]')!;
      expect(theme.getAttribute('aria-label')).toBe('Farbmodus: Automatisch (Dunkel)');
      expect(theme.getAttribute('data-bs-title')).toBe('Farbmodus: Automatisch (Dunkel)');
      applyThemeMode('light');
      expect(theme.getAttribute('aria-label')).toBe('Farbmodus: Light');
      // A site's own [data-supa-theme-toggle] button shares the trigger's label
      const toggle = document.querySelector<HTMLButtonElement>('[data-supa-theme-toggle]')!;
      expect(toggle.getAttribute('aria-label')).toBe('Farbmodus: Light');
    });

    it('translates admonition titles, the dismiss button, and the tab and accordion fallbacks', () => {
      setLabels({
        'admonition-note': 'Hinweis',
        'alert-dismiss': 'Schließen',
        'tab-fallback': 'Reiter {n}',
        'accordion-fallback': 'Abschnitt {n}'
      });
      const container = document.createElement('div');
      container.innerHTML = `
        <blockquote><p>[!NOTE]\nBody</p></blockquote>
        <blockquote><p>[!TIP] Own title\nBody</p></blockquote>
        <blockquote><p>[!WARNING]\nBody</p></blockquote>
        <blockquote><p>[!ALERT:primary dismissible] Heads up</p><p>Body</p></blockquote>
        <div class="supa-tabs"><div><p>One</p></div><div><p>Two</p></div></div>
        <div class="supa-accordion"><div data-accordion=""><p>One</p></div><div title="Named"><p>Two</p></div></div>`;
      transformGfmAdmonitions(container);
      initContentTabs(container);
      initBootstrapAccordions(container);

      const titles = Array.from(container.querySelectorAll('.supa-admonition-title span')).map(
        (span) => span.textContent
      );
      expect(titles).toEqual(['Hinweis', 'Own title', 'Warning']);
      expect(container.querySelector('.btn-close')!.getAttribute('aria-label')).toBe('Schließen');
      expect(
        Array.from(container.querySelectorAll('.supa-tab-btn')).map((btn) => btn.textContent)
      ).toEqual(['Reiter 1', 'Reiter 2']);
      expect(container.querySelector('.supa-accordion')!.textContent).toContain('Abschnitt 1');
      expect(container.querySelector('.supa-accordion')!.textContent).not.toContain('Section 1');
    });

    it('translates the copy button states and heading permalinks', async () => {
      setLabels({ 'copy-code': 'Code kopieren', 'copy-copied': 'Kopiert!', permalink: 'Link zu „{heading}“' });
      const article = document.createElement('article');
      article.innerHTML = '<h2>Einführung</h2><pre><code class="language-bash">mvn site</code></pre>';
      document.body.appendChild(article);

      prepareHeadings(article, true, '#');
      const permalink = article.querySelector<HTMLAnchorElement>('.supa-headerlink')!;
      expect(permalink.getAttribute('aria-label')).toBe('Link zu „Einführung“');
      expect(permalink.getAttribute('data-bs-title')).toBe('Link zu „Einführung“');

      enhanceCodeBlocks(article, false, true);
      const copy = article.querySelector<HTMLButtonElement>('.supa-copy-btn')!;
      expect(copy.getAttribute('aria-label')).toBe('Code kopieren');
      expect(copy.getAttribute('data-bs-title')).toBe('Code kopieren');
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true
      });
      copy.click();
      await vi.waitFor(() => expect(copy.getAttribute('aria-label')).toBe('Kopiert!'));
      expect(copy.getAttribute('data-bs-title')).toBe('Kopiert!');
    });

    it('translates the search status, badges, and generic section names', () => {
      setLabels({
        'search-hint': 'Tippen, um zu suchen.',
        'search-result-count': 'Treffer: {count}',
        'search-no-results': 'Nichts gefunden für „{query}“',
        'search-badge-section': 'Abschnitt',
        'search-section-current': 'Diese Seite'
      });
      document.body.innerHTML = `
        <main id="supa-main-content"><h2 id="installation">Installation</h2></main>
        <dialog id="supaSearchDialog">
          <input id="supaSearchInput" />
          <div id="supaSearchStatus"></div>
          <div id="supaSearchResults"></div>
        </dialog>`;
      initSearch();
      const input = document.getElementById('supaSearchInput') as HTMLInputElement;
      const status = document.getElementById('supaSearchStatus')!;
      const type = (query: string): void => {
        input.value = query;
        input.dispatchEvent(new Event('input'));
      };

      type('installation');
      expect(status.textContent).toBe('Treffer: 1');
      const result = document.querySelector('.supa-search-result-item')!;
      expect(result.querySelector('.supa-search-result-badge')!.textContent).toBe('Abschnitt');
      expect(result.querySelector('.supa-search-result-title')!.textContent).toBe(
        'Diese Seite › Installation'
      );

      type('  zzz  ');
      expect(status.textContent).toBe('Nichts gefunden für „zzz“');
      type('');
      expect(status.textContent).toBe('Tippen, um zu suchen.');
    });

    it('defaults the Datepicker locale to <html lang>, which data-bs-locale still overrides', async () => {
      const widget = LAZY_WIDGETS.find((candidate) => candidate.name === 'Datepicker')!;
      await widget.load();
      const Datepicker = BootstrapPlugins.Datepicker!;
      const original = Datepicker.Default.locale;
      try {
        document.documentElement.lang = 'pt-BR';
        await widget.load();
        expect(Datepicker.Default.locale).toBe('pt-BR');

        // A malformed tag would make Intl throw in every picker, so it is ignored
        Datepicker.Default.locale = original;
        document.documentElement.lang = 'pt_BR!';
        await widget.load();
        expect(Datepicker.Default.locale).toBe(original);

        document.documentElement.lang = 'fr';
        await widget.load();
        document.body.innerHTML = `
          <input type="text" id="dpPage" data-bs-toggle="datepicker" />
          <input type="text" id="dpOwn" data-bs-toggle="datepicker" data-bs-locale="de-DE" />`;
        const config = (id: string): { locale: string } =>
          (
            Datepicker.getOrCreateInstance(document.getElementById(id)!) as unknown as {
              _config: { locale: string };
            }
          )._config;
        expect(config('dpPage').locale).toBe('fr');
        expect(config('dpOwn').locale).toBe('de-DE');
      } finally {
        Datepicker.Default.locale = original;
      }
    });

    it('warns once about the labels site.vm lists in data-supa-markup-labels for containing markup', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      document.body.setAttribute('data-supa-markup-labels', 'pageNext backToTop');
      expect(warnUnknownLabels()).toBe(true);
      expect(warnUnknownLabels()).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('contain markup were ignored');
      expect(warn.mock.calls[0][0]).toContain('pageNext, backToTop');
      // A key with markup never reaches the scripts, so its label stays English
      expect(getLabel('backToTop')).toBe('Back to top');
    });
  });
});

describe('forced-colors range tracks', () => {
  it('removes author shadows from both vendor tracks in compiled forced-colors CSS', () => {
    // Compile the source directly so this guard never depends on a prior Vite build.
    const css = parseCss(compile(resolve('src/main/frontend/scss/_forced-colors.scss')).css);
    const shadows = new Map<string, string>();
    css.walkAtRules('media', media => {
      if (media.params !== '(forced-colors: active)') {
        return;
      }
      media.walkRules(rule => {
        rule.walkDecls('box-shadow', declaration => {
          shadows.set(rule.selector, declaration.value);
        });
      });
    });
    expect(shadows.get('.form-range-input::-webkit-slider-runnable-track')).toBe('none');
    expect(shadows.get('.form-range-input::-moz-range-track')).toBe('none');
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
        `.theme-${theme} solid fill (including card caps and checked switch knobs)`,
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

  it('audits tooltips with the tokens and fade Bootstrap 6 paints them with', () => {
    const tooltips = SURFACE_AUDITS.filter((surface: SurfaceSpec) => surface.surface.startsWith('tooltip'));
    expect(tooltips.map((surface: SurfaceSpec) => surface.surface)).toEqual([
      'tooltip over --color-background-primary',
      'tooltip over --color-background-secondary'
    ]);
    // The entries spell out Bootstrap's `.tooltip` tokens as the root tokens they read, so they
    // must follow the Bootstrap release the skin bundles.
    const bootstrap = readFileSync(resolve(process.cwd(), 'node_modules/bootstrap/scss/_tooltip.scss'), 'utf8');
    const token = (name: string): string | undefined =>
      bootstrap.match(new RegExp(`--tooltip-${name}:\\s*([^,\\n]+),`))?.[1]?.trim();
    for (const surface of tooltips) {
      expect(surface.layers.at(-1)).toBe(token('bg'));
      expect(surface.foregrounds).toEqual([{ label: 'text', color: token('color'), role: 'text' }]);
      expect(surface.opacity).toBe(token('opacity'));
    }
    // A tooltip whose text and fill were left the same color must fail the audit.
    const tokens = new Map([
      ['--supa-wcag-level', '"AA"'],
      ['--color-background-primary', '#ffffff'],
      ['--color-background-secondary', '#f8f9fb'],
      ['--fg-body', '#111827'],
      ['--bg-body', '#111827']
    ]);
    expect(auditContrast(tokens, 'furo', 'light', tooltips).violations).toHaveLength(2);
    tokens.set('--bg-body', '#ffffff');
    expect(auditContrast(tokens, 'furo', 'light', tooltips)).toEqual({ checked: 2, violations: [] });
  });
});

describe('release preflight (scripts/check-release-ready.ts)', () => {
  const CHANGELOG = [
    '# Changelog',
    '',
    '## [Unreleased]',
    '',
    '## [0.2.10] - 2026-12-01',
    '',
    '## [0.2.1] - 2026-11-20',
    '',
    '### Fixed',
    '',
    '- Something.',
    ''
  ].join('\n');

  /**
   * Builds release metadata for a tag that matches its release.
   *
   * @param overrides - Fields to replace.
   * @returns The metadata to check.
   */
  const release = (overrides: Partial<ReleaseMetadata> = {}): ReleaseMetadata => ({
    ref: 'refs/tags/v0.2.1',
    pomVersion: '0.2.1',
    changelog: CHANGELOG,
    ...overrides
  });

  it('passes a v* tag that matches a released POM version with a dated changelog heading', () => {
    expect(checkReleaseMetadata(release())).toEqual([]);
  });

  it('rejects a run on a branch, including a dispatch on a branch named like a tag', () => {
    for (const ref of ['refs/heads/main', 'refs/heads/v0.2.1', 'refs/tags/0.2.1', 'refs/tags/v', '']) {
      const errors = checkReleaseMetadata(release({ ref }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('v*');
      expect(errors[0]).toContain('workflow_dispatch');
    }
  });

  it('rejects a tag whose version differs from project.version', () => {
    const errors = checkReleaseMetadata(release({ ref: 'refs/tags/v0.2.2', pomVersion: '0.2.1' }));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('v0.2.2');
    expect(errors[0]).toContain('0.2.1');
    expect(errors[0]).toContain('project.version');
    // The changelog is checked against the tag's version, which has no heading here.
    expect(errors[1]).toContain('## [0.2.2] - YYYY-MM-DD');
  });

  it('rejects a SNAPSHOT version even when the tag matches it', () => {
    const errors = checkReleaseMetadata(
      release({
        ref: 'refs/tags/v0.2.1-SNAPSHOT',
        pomVersion: '0.2.1-SNAPSHOT',
        changelog: `${CHANGELOG}\n## [0.2.1-SNAPSHOT] - 2026-11-20\n`
      })
    );
    expect(errors).toEqual([expect.stringContaining('SNAPSHOT')]);
  });

  it('rejects a changelog without the dated heading for the version', () => {
    const changelogs = [
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', '## [Unreleased-0.2.1]'),
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', '## [0.2.1]'),
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', '## [0.2.1] - TBD'),
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', '### [0.2.1] - 2026-11-20'),
      // A heading for 0.2.10, and a version whose dots would match any character as a pattern.
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', ''),
      CHANGELOG.replace('## [0.2.1] - 2026-11-20', '## [0x2y1] - 2026-11-20')
    ];
    for (const changelog of changelogs) {
      const errors = checkReleaseMetadata(release({ changelog }));
      expect(errors).toEqual([expect.stringContaining('## [0.2.1] - YYYY-MM-DD')]);
    }
  });

  it('reports every failed check at once', () => {
    const errors = checkReleaseMetadata(
      release({ ref: 'refs/tags/v0.3.0', pomVersion: '0.3.0-SNAPSHOT', changelog: '## [Unreleased]\n' })
    );
    expect(errors).toHaveLength(3);
  });
});

describe('release CI gate (scripts/check-release-ready.ts)', () => {
  const SHA = '7941f0e82e058c499b17e6cb34104d815d6850d6';
  const MINUTE = 60_000;

  /**
   * Builds a `ci.yml` push run on `main` for the release commit.
   *
   * @param status - The run's status.
   * @param conclusion - The run's conclusion once completed.
   * @param overrides - Fields to replace.
   * @returns The run.
   */
  const run = (status: string, conclusion: string | null = null, overrides: Partial<CiRun> = {}): CiRun => ({
    id: 42216636871,
    url: 'https://github.com/mepcotterell/supa-maven-skin/actions/runs/42216636871',
    headSha: SHA,
    headBranch: 'main',
    event: 'push',
    status,
    conclusion,
    ...overrides
  });

  /**
   * Builds wait options whose lookup returns the given results in turn (repeating the last) and
   * whose clock only moves when the gate sleeps.
   *
   * @param results - What each lookup returns.
   * @param overrides - Options to replace.
   * @returns The options, the lookup calls, and the fake clock.
   */
  const scripted = (results: CiRun[][], overrides: Partial<CiWaitOptions> = {}) => {
    const clock = { now: 0 };
    const calls: string[] = [];
    const options: CiWaitOptions = {
      sha: SHA,
      lookup: async (sha: string): Promise<CiRun[]> => {
        calls.push(sha);
        return results[Math.min(calls.length, results.length) - 1] ?? [];
      },
      sleep: async (ms: number): Promise<void> => {
        clock.now += ms;
      },
      now: (): number => clock.now,
      log: (): void => {},
      ...overrides
    };
    return { options, calls, clock };
  };

  it('waits at most an hour, polling every 30 seconds, and two minutes for a missing run', () => {
    expect(CI_WAIT_TIMEOUT_MS).toBe(60 * MINUTE);
    expect(CI_POLL_INTERVAL_MS).toBe(30_000);
    expect(CI_MISSING_GRACE_MS).toBe(2 * MINUTE);
  });

  it('passes at once when the commit already has a successful push run on main', async () => {
    const { options, calls, clock } = scripted([[run('completed', 'success')]]);
    expect(await waitForCiSuccess(options)).toBeNull();
    expect(calls).toEqual([SHA]);
    expect(clock.now).toBe(0);
  });

  it('waits for a queued or running run, then passes when it succeeds', async () => {
    const { options, calls, clock } = scripted([
      [run('queued')],
      [run('in_progress')],
      [run('in_progress')],
      [run('completed', 'success')]
    ]);
    expect(await waitForCiSuccess(options)).toBeNull();
    expect(calls).toHaveLength(4);
    expect(clock.now).toBe(3 * CI_POLL_INTERVAL_MS);
  });

  it('fails on a run that failed, was cancelled, or did not succeed', async () => {
    for (const conclusion of ['failure', 'cancelled', 'timed_out', 'startup_failure', 'skipped', 'action_required']) {
      const { options } = scripted([[run('in_progress')], [run('completed', conclusion)]]);
      const message = await waitForCiSuccess(options);
      expect(message).toContain(conclusion);
      expect(message).toContain(SHA);
      expect(message).toContain('/actions/runs/42216636871');
    }
  });

  it('fails when no run exists for the commit, after a short grace for one being created', async () => {
    const { options, calls, clock } = scripted([[]]);
    const message = await waitForCiSuccess(options);
    expect(message).toContain(SHA);
    expect(message).toContain('No ci.yml push run on main');
    expect(clock.now).toBe(CI_MISSING_GRACE_MS);
    expect(calls).toHaveLength(CI_MISSING_GRACE_MS / CI_POLL_INTERVAL_MS + 1);
  });

  it('ignores runs for another commit, branch, or event', async () => {
    const { options } = scripted([
      [
        run('completed', 'success', { headSha: 'a291ad4dac489b319adbdd326a284fe7842072bd' }),
        run('completed', 'success', { event: 'pull_request' }),
        run('completed', 'success', { event: 'workflow_dispatch' }),
        run('completed', 'success', { headBranch: 'v0.2.0' }),
        run('completed', 'success', { headBranch: null })
      ]
    ]);
    expect(await waitForCiSuccess(options)).toContain('No ci.yml push run on main');
  });

  it('waits for a run that appears during the grace period', async () => {
    const { options } = scripted([[], [], [run('queued')], [run('completed', 'success')]]);
    expect(await waitForCiSuccess(options)).toBeNull();
  });

  it('passes when any matching run succeeded, and waits while one is still running', async () => {
    const failed = run('completed', 'failure', { id: 1, url: 'https://example.test/1' });
    const { options, calls } = scripted([
      [failed, run('in_progress')],
      [failed, run('completed', 'success')]
    ]);
    expect(await waitForCiSuccess(options)).toBeNull();
    expect(calls).toHaveLength(2);
  });

  it('fails once the run is still unfinished after the time limit', async () => {
    const { options, calls, clock } = scripted([[run('in_progress')]]);
    const message = await waitForCiSuccess(options);
    expect(message).toContain('in_progress');
    expect(message).toContain('60 minutes');
    expect(clock.now).toBe(CI_WAIT_TIMEOUT_MS);
    expect(calls).toHaveLength(CI_WAIT_TIMEOUT_MS / CI_POLL_INTERVAL_MS + 1);
  });

  it('never sleeps past the time limit', async () => {
    const { options, clock } = scripted([[run('in_progress')]], { timeoutMs: 45_000, intervalMs: 30_000 });
    expect(await waitForCiSuccess(options)).toContain('in_progress');
    expect(clock.now).toBe(45_000);
  });

  it('fails when the run lookup fails', async () => {
    const { options } = scripted([], {
      lookup: async (): Promise<CiRun[]> => {
        throw new Error('HTTP 403: Resource not accessible by integration');
      }
    });
    expect(await waitForCiSuccess(options)).toContain('HTTP 403');
  });

  it('rejects a SHA that is not a full commit SHA without looking up runs', async () => {
    for (const sha of ['', '7941f0e', `${SHA}\n`, 'refs/heads/main']) {
      const { options, calls } = scripted([[run('completed', 'success', { headSha: sha })]], { sha });
      expect(await waitForCiSuccess(options)).toContain('full commit SHA');
      expect(calls).toEqual([]);
    }
  });

  it('checks the tag, version, and changelog before waiting for CI', async () => {
    const changelog = '## [0.2.1] - 2026-11-20\n';
    const ready = scripted([[run('completed', 'success')]]);
    expect(
      await checkReleaseReady({ ...ready.options, ref: 'refs/tags/v0.2.1', pomVersion: '0.2.1', changelog })
    ).toEqual([]);
    expect(ready.calls).toEqual([SHA]);

    const mistagged = scripted([[run('completed', 'success')]]);
    const errors = await checkReleaseReady({
      ...mistagged.options,
      ref: 'refs/heads/main',
      pomVersion: '0.2.1',
      changelog
    });
    expect(errors).toEqual([expect.stringContaining('v*')]);
    expect(mistagged.calls).toEqual([]);

    const failed = scripted([[run('completed', 'failure')]]);
    expect(
      await checkReleaseReady({ ...failed.options, ref: 'refs/tags/v0.2.1', pomVersion: '0.2.1', changelog })
    ).toEqual([expect.stringContaining('failure')]);
  });
});

describe('Velocity linter (scripts/lint-velocity.ts)', () => {
  /** Skin macros the pages below call, as in site-macros.vm. */
  const MACROS: VelocityTemplate = {
    path: 'src/main/resources/META-INF/maven/site-macros.vm',
    content: [
      '#macro( bi $name $extraClasses $ariaLabel )',
      '<i class="bi bi-$name"></i>##',
      '#end',
      '#macro( bsCardGridEnd )',
      '</div>',
      '#end',
      '#macro( supaFillLabel $labelHtml $placeholder $valueHtml )',
      '#set( $supaFilled = $labelHtml )',
      '#end',
      ''
    ].join('\n')
  };

  /**
   * Lints a template next to {@link MACROS}.
   *
   * @param path - The template's path.
   * @param lines - The template's lines.
   * @returns The violations found.
   */
  const lint = (path: string, lines: string[]): string[] =>
    lintVelocity([MACROS, { path, content: `${lines.join('\n')}\n` }]).violations;

  it('passes valid templates, including nested calls inside arguments', () => {
    expect(
      lint('src/main/resources/META-INF/maven/site.vm', [
        '<!DOCTYPE html>',
        '#if( $a.b( $c ) && $d )',
        '#supaFillLabel( $esc.html( $supaLabels.get( "x" ) ) \'years\' "a, b" )',
        '#elseif( $e )',
        '#bi( "book" "" "" )',
        '#else',
        '#bsCardGridEnd()',
        '#end'
      ])
    ).toEqual([]);
  });

  it('reports a call to a macro no template defines', () => {
    expect(lint('src/site/markdown/index.md.vm', ['#bsCardGridEnds()'])).toEqual([
      expect.stringMatching(/^src\/site\/markdown\/index\.md\.vm:1: .*#bsCardGridEnds/)
    ]);
  });

  it('reports a macro call with the wrong number of arguments', () => {
    const violations = lint('src/main/resources/META-INF/maven/site.vm', [
      '<!DOCTYPE html>',
      '#bi( "book" "" )',
      '#supaFillLabel( $esc.html( $x ) \'years\' $y $z )'
    ]);
    expect(violations).toEqual([
      expect.stringMatching(/site\.vm:2: .*#bi.* 3 .* 2/),
      expect.stringMatching(/site\.vm:3: .*#supaFillLabel.* 3 .* 4/)
    ]);
  });

  it('ignores escaped directives and macro calls', () => {
    expect(
      lint('src/site/markdown/index.md.vm', [
        'Close a block with \\#end, or call \\#bi( "book" ).',
        // An escaped backslash before a directive leaves the directive in force
        '\\\\#if( $y )',
        '#end'
      ])
    ).toEqual([]);
  });

  it('reports an #elseif without a condition', () => {
    expect(
      lint('src/site/markdown/index.md.vm', ['#if( $a )', 'a', '#elseif()', 'b', '#elseif', 'c', '#end'])
    ).toEqual([
      expect.stringMatching(/index\.md\.vm:3: #elseif .*empty/),
      expect.stringMatching(/index\.md\.vm:5: #elseif .*empty/)
    ]);
  });

  it('does not let a ## comment open a #* block comment', () => {
    expect(lint('src/site/markdown/index.md.vm', ['## a comment that mentions #*', '#if( $a )', '#* a block comment *#'])).toEqual([
      expect.stringMatching(/index\.md\.vm:2: Unclosed #if/)
    ]);
  });

  it('checks .md.vm pages, skipping #[[ ]]# text and Markdown whitespace', () => {
    expect(
      lint('src/site/markdown/index.md.vm', [
        '# Title',
        '',
        '#[[##]]# Section #[[#if( $not.a.directive )]]#',
        'A line break  ',
        '\tindented code with #',
        '#bi( "book" "" "" )'
      ])
    ).toEqual([]);
    expect(lint('src/site/markdown/index.md.vm', ['#if( $a )', 'unclosed'])).toEqual([
      expect.stringMatching(/index\.md\.vm:1: Unclosed #if/)
    ]);
  });

  it('lints the repository templates and Velocity pages without violations', () => {
    const templates = collectTemplates(resolve(import.meta.dirname, '../../..'));
    const paths = templates.map((template) => template.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'src/main/resources/META-INF/maven/site.vm',
        'src/main/resources/META-INF/maven/site-macros.vm',
        'src/site/markdown/index.md.vm',
        'src/it/options-site/src/site/markdown/macros.md.vm',
        'src/it/sample-site/src/site/markdown/alerts.md.vm'
      ])
    );
    expect(lintVelocity(templates).violations).toEqual([]);
  });
});
