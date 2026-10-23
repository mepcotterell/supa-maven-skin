export type AdmonitionType = 'note' | 'tip' | 'important' | 'warning' | 'caution';
export type BootstrapThemeName =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'light'
  | 'dark';

interface AdmonitionMeta {
  type: AdmonitionType;
  defaultTitle: string;
  iconSvg: string;
}

const ADMONITION_META: Record<AdmonitionType, AdmonitionMeta> = {
  note: {
    type: 'note',
    defaultTitle: 'Note',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  },
  tip: {
    type: 'tip',
    defaultTitle: 'Tip',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"></path></svg>'
  },
  important: {
    type: 'important',
    defaultTitle: 'Important',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="11"></line><line x1="12" y1="14" x2="12.01" y2="14"></line></svg>'
  },
  warning: {
    type: 'warning',
    defaultTitle: 'Warning',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
  },
  caution: {
    type: 'caution',
    defaultTitle: 'Caution',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  }
};

const GFM_ALERT_REGEX = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]+([^\n]*))?(?:\n|$)/i;
const GFM_BS_ALERT_REGEX =
  /^\s*\[!ALERT:(primary|secondary|success|info|warning|danger|light|dark)(?:[ \t]+(dismissible))?\](?:[ \t]+([^\n]*))?(?:\n|$)/i;

export const TAB_SYNC_STORAGE_KEY = 'furo-tab-sync';

/**
 * Classifies table columns into `.furo-table-col-compact` (single-line identifier/value
 * columns) and `.furo-table-col-prose` (multi-sentence description columns) so tables
 * maintain balanced proportions without breaking inline `<code>` identifiers mid-word.
 */
function classifyTableColumns(table: HTMLTableElement): void {
  const bodyRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  const rows =
    bodyRows.length > 0
      ? bodyRows
      : Array.from(table.querySelectorAll<HTMLTableRowElement>('tr')).filter(
          (tr) => tr.querySelectorAll('td').length > 0
        );
  if (rows.length === 0) {
    return;
  }

  const headerCells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>('thead tr:first-child th, tr:first-child th')
  );
  const colCount = rows.reduce((max, tr) => Math.max(max, tr.children.length), 0);
  if (colCount < 2) {
    return;
  }

  const colMeta: Array<{ isCompact: boolean; isProse: boolean }> = [];

  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const cells = rows
      .map((tr) => tr.children[colIdx] as HTMLElement | undefined)
      .filter((td): td is HTMLElement => Boolean(td && td.tagName === 'TD'));

    if (cells.length === 0) {
      colMeta.push({ isCompact: false, isProse: false });
      continue;
    }

    let maxLen = 0;
    let hasProseCell = false;
    let allCompactCells = true;

    for (const td of cells) {
      const text = (td.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text.length > maxLen) {
        maxLen = text.length;
      }
      if (text.length > 45 && text.includes(' ')) {
        hasProseCell = true;
      }

      const childCodes = td.querySelectorAll('code');
      const isSingleCodeOnly =
        childCodes.length === 1 &&
        (childCodes[0].textContent ?? '').trim() === text &&
        text.length <= 40;
      const spaceCount = (text.match(/ /g) ?? []).length;
      const hasLineBreak = td.querySelector('br') !== null;
      const isShortLiteral = !hasLineBreak && text.length <= 24 && spaceCount <= 2;
      const isCompactLineBreak =
        hasLineBreak &&
        td.innerHTML.split(/<br\s*\/?>/i).every((segment) => {
          const lineText = segment
            .replace(/<[^>]*>/g, '')
            .replace(/&[a-z0-9#]+;/gi, 'x')
            .replace(/\s+/g, ' ')
            .trim();
          const lineSpaces = (lineText.match(/ /g) ?? []).length;
          return lineText.length <= 28 && lineSpaces <= 5;
        });

      if (!isSingleCodeOnly && !isShortLiteral && !isCompactLineBreak) {
        allCompactCells = false;
      }
    }

    colMeta.push({
      isCompact: allCompactCells && !hasProseCell && maxLen > 0,
      isProse: hasProseCell
    });
  }

  const hasAnyProseColumn = colMeta.some((c) => c.isProse);
  if (!hasAnyProseColumn) {
    return;
  }

  colMeta.forEach((meta, colIdx) => {
    const className = meta.isProse
      ? 'furo-table-col-prose'
      : meta.isCompact
        ? 'furo-table-col-compact'
        : null;
    if (!className) {
      return;
    }
    headerCells[colIdx]?.classList.add(className);
    rows.forEach((tr) => {
      const cell = tr.children[colIdx] as HTMLElement | undefined;
      if (cell && cell.tagName === 'TD') {
        cell.classList.add(className);
      }
    });
  });
}

/**
 * Normalizes Doxia tables (`table.bodyTable` and article tables) into responsive
 * Bootstrap 6 tables, and cleans up Doxia inline list-style attributes on Bootstrap lists.
 */
export function normalizeDoxiaTables(container: HTMLElement): void {
  const tables = container.querySelectorAll<HTMLTableElement>('table');
  tables.forEach((table) => {
    if (table.closest('.not-prose') && !table.classList.contains('bodyTable')) {
      return;
    }
    table.classList.remove('bodyTable', 'bodyTableBorder');
    table.classList.add('table', 'table-hover');
    classifyTableColumns(table);

    if (!table.parentElement?.classList.contains('furo-table-responsive')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'furo-table-responsive not-prose';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

  // Strip Doxia's automatic `style="list-style-type: decimal;"` from Bootstrap <ol> components
  container
    .querySelectorAll<HTMLElement>('ol.breadcrumb, ol.stepper, ol.furo-stepper, ol.list-group')
    .forEach((ol) => {
      ol.style.removeProperty('list-style-type');
    });
}

/**
 * Transforms GitHub-Flavored Markdown blockquote alerts (`> [!NOTE]`, `> [!TIP]`,
 * `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) into Furo admonition cards,
 * and `> [!ALERT:primary dismissible] Title` into native Bootstrap 6 `.alert` components.
 */
export function transformGfmAdmonitions(container: HTMLElement): void {
  const blockquotes = container.querySelectorAll<HTMLQuoteElement>('blockquote');
  blockquotes.forEach((blockquote) => {
    const firstParagraph = blockquote.querySelector<HTMLParagraphElement>('p:first-child');
    const targetEl = firstParagraph ?? blockquote;
    const rawText = targetEl.innerHTML;

    // 1. Check for Bootstrap 6 alert shorthand: > [!ALERT:primary dismissible] Title
    const bsMatch = rawText.match(GFM_BS_ALERT_REGEX);
    if (bsMatch) {
      const theme = bsMatch[1].toLowerCase() as BootstrapThemeName;
      const isDismissible = Boolean(bsMatch[2]);
      const customHeading = bsMatch[3]?.trim();

      const remainingHtml = rawText.slice(bsMatch[0].length).trim();
      if (firstParagraph) {
        if (remainingHtml.length > 0) {
          firstParagraph.innerHTML = remainingHtml;
        } else {
          firstParagraph.remove();
        }
      } else {
        blockquote.innerHTML = remainingHtml ? `<p>${remainingHtml}</p>` : '';
      }

      const alertEl = document.createElement('div');
      alertEl.className = `alert theme-${theme} not-prose my-3`;
      alertEl.setAttribute('role', 'alert');

      const contentWrap = document.createElement('div');
      contentWrap.className = 'flex-grow-1';
      if (customHeading) {
        const headingEl = document.createElement('div');
        headingEl.className = 'alert-heading fw-semibold mb-1';
        headingEl.textContent = customHeading;
        contentWrap.appendChild(headingEl);
      }
      while (blockquote.firstChild) {
        contentWrap.appendChild(blockquote.firstChild);
      }
      alertEl.appendChild(contentWrap);

      if (isDismissible) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close ms-auto';
        closeBtn.setAttribute('data-bs-dismiss', 'alert');
        closeBtn.setAttribute('aria-label', 'Close');
        alertEl.appendChild(closeBtn);
      }

      blockquote.replaceWith(alertEl);
      return;
    }

    // 2. Check for Furo Admonition: > [!NOTE] Title
    const match = rawText.match(GFM_ALERT_REGEX);
    if (!match) {
      return;
    }

    const rawKind = match[1].toLowerCase() as AdmonitionType;
    const customTitle = match[2]?.trim();
    const meta = ADMONITION_META[rawKind] ?? ADMONITION_META.note;
    const titleText = customTitle && customTitle.length > 0 ? customTitle : meta.defaultTitle;

    const remainingHtml = rawText.slice(match[0].length).trim();
    if (firstParagraph) {
      if (remainingHtml.length > 0) {
        firstParagraph.innerHTML = remainingHtml;
      } else {
        firstParagraph.remove();
      }
    } else {
      blockquote.innerHTML = remainingHtml ? `<p>${remainingHtml}</p>` : '';
    }

    const admonition = document.createElement('div');
    admonition.className = `furo-admonition admonition-${meta.type} not-prose`;
    admonition.setAttribute('role', 'note');

    const titleEl = document.createElement('p');
    titleEl.className = 'furo-admonition-title';
    titleEl.innerHTML = `${meta.iconSvg}<span></span>`;
    const span = titleEl.querySelector('span');
    if (span) {
      span.textContent = titleText;
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'furo-admonition-body';
    while (blockquote.firstChild) {
      bodyEl.appendChild(blockquote.firstChild);
    }

    admonition.appendChild(titleEl);
    admonition.appendChild(bodyEl);
    blockquote.replaceWith(admonition);
  });
}

function inferPanelTabLabel(panel: HTMLElement, index: number): string {
  const explicit = (panel.getAttribute('data-tab') || panel.getAttribute('title'))?.trim();
  if (explicit) {
    return explicit;
  }
  const codeEl = panel.querySelector('code');
  if (codeEl) {
    const cls = codeEl.className;
    if (/language-(?:markdown|md)\b/i.test(cls)) {
      return 'Markdown Shorthand';
    }
    if (/language-(?:velocity|vm)\b/i.test(cls)) {
      return 'Velocity Macro (.md.vm)';
    }
    if (/language-html\b/i.test(cls)) {
      return 'Markdown + HTML';
    }
  }
  return `Tab ${index + 1}`;
}

/**
 * Enhances `.furo-tabs` containers with `<div data-tab="Label">` or `<div title="Label">`
 * panels into accessible ARIA tablists (`sphinx-inline-tabs` equivalent) that synchronize
 * active tab selection across the entire site via `localStorage`.
 */
export function initContentTabs(container: HTMLElement): void {
  const tabContainers = Array.from(container.querySelectorAll<HTMLElement>('.furo-tabs'));
  if (tabContainers.length === 0) {
    return;
  }

  let storedPrefs: Record<string, string> = {};
  try {
    const raw = window.localStorage?.getItem(TAB_SYNC_STORAGE_KEY);
    if (raw) {
      storedPrefs = JSON.parse(raw) as Record<string, string>;
    }
  } catch {
    // Ignore storage read errors
  }

  const allTabGroups: Array<{
    groupKey: string;
    activateLabel: (label: string, persist?: boolean) => void;
  }> = [];

  tabContainers.forEach((tabBox, boxIndex) => {
    if (tabBox.hasAttribute('data-furo-tabs-ready')) {
      return;
    }
    const explicitPanels = Array.from(tabBox.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && (el.hasAttribute('data-tab') || el.hasAttribute('title'))
    );
    const rawPanels =
      explicitPanels.length > 0
        ? explicitPanels
        : Array.from(tabBox.children).filter(
            (el): el is HTMLElement =>
              el instanceof HTMLElement &&
              el.tagName === 'DIV' &&
              !el.classList.contains('furo-tab-list')
          );
    if (rawPanels.length === 0) {
      return;
    }

    tabBox.setAttribute('data-furo-tabs-ready', 'true');
    tabBox.classList.add('not-prose');
    const groupKey =
      tabBox.getAttribute('data-tab-group') ||
      tabBox.getAttribute('title') ||
      `tab-group-${boxIndex}`;
    tabBox.removeAttribute('title');

    const tabList = document.createElement('div');
    tabList.className = 'furo-tab-list';
    tabList.setAttribute('role', 'tablist');

    const buttons: HTMLButtonElement[] = [];
    const panels: HTMLElement[] = [];

    const activateLabel = (targetLabel: string, persist = false) => {
      const normalized = targetLabel.trim().toLowerCase();
      const matchIdx = buttons.findIndex(
        (btn) => (btn.getAttribute('data-tab-label') || '').toLowerCase() === normalized
      );
      if (matchIdx < 0) {
        return;
      }

      buttons.forEach((btn, idx) => {
        const isSelected = idx === matchIdx;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.tabIndex = isSelected ? 0 : -1;
      });

      const isCodeCollapsed = Boolean(tabBox.closest('.furo-component-example.is-code-collapsed'));
      panels.forEach((panel, idx) => {
        const isSelected = idx === matchIdx;
        panel.classList.toggle('active', isSelected);
        panel.hidden = isCodeCollapsed ? true : !isSelected;
      });

      if (persist) {
        try {
          storedPrefs[groupKey] = targetLabel.trim();
          window.localStorage?.setItem(TAB_SYNC_STORAGE_KEY, JSON.stringify(storedPrefs));
        } catch {
          // Ignore storage write errors
        }
        allTabGroups.forEach((g) => {
          if (g.groupKey === groupKey) {
            g.activateLabel(targetLabel, false);
          }
        });
      }
    };

    rawPanels.forEach((panel, panelIdx) => {
      const label = inferPanelTabLabel(panel, panelIdx);
      panel.removeAttribute('title');
      const tabId = `furo-tab-${boxIndex}-${panelIdx}`;
      const panelId = `furo-tabpanel-${boxIndex}-${panelIdx}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = tabId;
      btn.className = 'furo-tab-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', panelId);
      btn.setAttribute('data-tab-label', label);
      btn.textContent = label;

      btn.addEventListener('click', () => {
        activateLabel(label, true);
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const delta = e.key === 'ArrowRight' ? 1 : -1;
          const nextIdx = (panelIdx + delta + buttons.length) % buttons.length;
          const nextBtn = buttons[nextIdx];
          if (nextBtn) {
            nextBtn.focus();
            activateLabel(nextBtn.getAttribute('data-tab-label') || '', true);
          }
        }
      });

      panel.id = panelId;
      panel.classList.add('furo-tab-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);

      buttons.push(btn);
      panels.push(panel);
      tabList.appendChild(btn);
    });

    tabBox.insertBefore(tabList, rawPanels[0]);
    allTabGroups.push({ groupKey, activateLabel });

    const savedLabel = storedPrefs[groupKey];
    const initialLabel =
      savedLabel &&
      buttons.some(
        (b) => (b.getAttribute('data-tab-label') || '').toLowerCase() === savedLabel.toLowerCase()
      )
        ? savedLabel
        : buttons[0]?.getAttribute('data-tab-label') || '';

    activateLabel(initialLabel, false);
  });
}

/**
 * Transforms declarative `.furo-accordion` containers (`<div data-accordion="Title">` or `<div title="Title">`)
 * into native Bootstrap 6 `<details class="accordion-item">` + `<summary class="accordion-header">` accordions.
 */
export function initBootstrapAccordions(container: HTMLElement): void {
  const accordions = Array.from(container.querySelectorAll<HTMLElement>('.furo-accordion'));
  accordions.forEach((accBox, boxIdx) => {
    if (accBox.hasAttribute('data-furo-accordion-ready')) {
      return;
    }
    const rawItems = Array.from(accBox.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        (el.hasAttribute('data-accordion') || el.hasAttribute('title'))
    );
    if (rawItems.length === 0) {
      return;
    }

    accBox.setAttribute('data-furo-accordion-ready', 'true');
    const accId = accBox.id || `furo-accordion-${boxIdx}`;
    accBox.id = accId;
    accBox.classList.add('accordion', 'not-prose');
    if (accBox.getAttribute('data-flush') === 'true' || accBox.classList.contains('flush')) {
      accBox.classList.add('accordion-flush');
    }
    const alwaysOpen =
      accBox.getAttribute('data-always-open') === 'true' ||
      accBox.classList.contains('always-open');

    const hasExplicitOpen = rawItems.some(
      (el) =>
        el.getAttribute('data-open') === 'true' ||
        el.classList.contains('open') ||
        el.classList.contains('show')
    );

    rawItems.forEach((itemEl, itemIdx) => {
      const title =
        (itemEl.getAttribute('data-accordion') || itemEl.getAttribute('title'))?.trim() ||
        `Section ${itemIdx + 1}`;
      itemEl.removeAttribute('title');
      const isOpen =
        itemEl.getAttribute('data-open') === 'true' ||
        itemEl.classList.contains('open') ||
        itemEl.classList.contains('show') ||
        (itemIdx === 0 && !hasExplicitOpen);

      const details = document.createElement('details');
      details.className = 'accordion-item';
      if (!alwaysOpen) {
        details.setAttribute('name', accId);
      }
      if (isOpen) {
        details.open = true;
      }

      const summary = document.createElement('summary');
      summary.className = 'accordion-header fw-semibold';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      summary.appendChild(titleSpan);
      summary.insertAdjacentHTML(
        'beforeend',
        '<svg class="accordion-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 5 8 11 14 5"></polyline></svg>'
      );

      const body = document.createElement('div');
      body.className = 'accordion-body';
      while (itemEl.firstChild) {
        body.appendChild(itemEl.firstChild);
      }

      details.appendChild(summary);
      details.appendChild(body);
      itemEl.replaceWith(details);
    });
  });
}

/**
 * Transforms declarative `<ol class="furo-stepper" data-active-step="2">` (or `title="2"` / `<li class="active">`)
 * lists into Bootstrap 6 `.stepper.stepper-horizontal` components.
 */
export function initBootstrapSteppers(container: HTMLElement): void {
  const steppers = Array.from(container.querySelectorAll<HTMLElement>('.furo-stepper'));
  steppers.forEach((stepperEl) => {
    if (stepperEl.hasAttribute('data-furo-stepper-ready')) {
      return;
    }
    stepperEl.setAttribute('data-furo-stepper-ready', 'true');
    stepperEl.style.removeProperty('list-style-type');
    stepperEl.classList.add('stepper', 'not-prose');
    if (
      stepperEl.getAttribute('data-orientation') !== 'vertical' &&
      !stepperEl.classList.contains('stepper-vertical')
    ) {
      stepperEl.classList.add('stepper-horizontal');
    }

    const attrStep = stepperEl.getAttribute('data-active-step') || stepperEl.getAttribute('title');
    stepperEl.removeAttribute('title');
    const items = Array.from(stepperEl.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === 'LI'
    );
    const hasExplicitActiveLi = items.some((li) => li.classList.contains('active'));
    const activeStep = attrStep ? Number.parseInt(attrStep, 10) : hasExplicitActiveLi ? 0 : 1;

    items.forEach((li, idx) => {
      li.classList.add('stepper-item');
      if (!hasExplicitActiveLi && idx + 1 <= activeStep) {
        li.classList.add('active');
      }
    });
  });
}

const BI_SHORTCODE_REGEX = /:bi-([a-z0-9-]+)(?:\s+([a-zA-Z0-9_:\s-]+?))?:/g;

/**
 * Transforms Markdown Bootstrap Icon shortcodes (`:bi-<icon-name>:` or
 * `:bi-<icon-name> <extra-classes>:`) in text nodes into `<i class="bi bi-..." aria-hidden="true"></i>`,
 * skipping code blocks and inline `<code>` elements.
 */
export function transformBootstrapIcons(container: HTMLElement): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    if (
      parent &&
      !parent.closest('code, pre, script, style, textarea, kbd, samp') &&
      textNode.nodeValue &&
      textNode.nodeValue.includes(':bi-')
    ) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const raw = textNode.nodeValue || '';
    BI_SHORTCODE_REGEX.lastIndex = 0;
    if (!BI_SHORTCODE_REGEX.test(raw)) {
      return;
    }
    BI_SHORTCODE_REGEX.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BI_SHORTCODE_REGEX.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(raw.slice(lastIndex, match.index)));
      }
      const iconName = match[1].trim();
      const extraClasses = match[2]?.trim() || '';
      const iconEl = document.createElement('i');
      iconEl.className = extraClasses ? `bi bi-${iconName} ${extraClasses}` : `bi bi-${iconName}`;
      iconEl.setAttribute('aria-hidden', 'true');
      fragment.appendChild(iconEl);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < raw.length) {
      fragment.appendChild(document.createTextNode(raw.slice(lastIndex)));
    }

    textNode.replaceWith(fragment);
  });
}

export function initDoxiaEnhancements(
  root: HTMLElement | null = document.getElementById('furo-main-content')
): void {
  if (!root) {
    return;
  }
  normalizeDoxiaTables(root);
  transformGfmAdmonitions(root);
  initContentTabs(root);
  initBootstrapAccordions(root);
  initBootstrapSteppers(root);
  transformBootstrapIcons(root);
}
