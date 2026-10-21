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
 * Normalizes Doxia tables (`table.bodyTable` and article tables) into responsive
 * Bootstrap 6 tables, and enhances Maven report summary badges where applicable.
 */
export function normalizeDoxiaTables(container: HTMLElement): void {
  const tables = container.querySelectorAll<HTMLTableElement>('table');
  tables.forEach((table) => {
    if (table.closest('.not-prose') && !table.classList.contains('bodyTable')) {
      return;
    }
    table.classList.remove('bodyTable', 'bodyTableBorder');
    table.classList.add('table', 'table-hover');

    if (!table.parentElement?.classList.contains('furo-table-responsive')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'furo-table-responsive not-prose';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
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

/**
 * Enhances `.furo-tabs` containers with `<div data-tab="Label">` panels into
 * accessible ARIA tablists (`sphinx-inline-tabs` equivalent) that synchronize
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
    const rawPanels = Array.from(tabBox.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-tab')
    );
    if (rawPanels.length === 0) {
      return;
    }

    tabBox.setAttribute('data-furo-tabs-ready', 'true');
    tabBox.classList.add('not-prose');
    const groupKey = tabBox.getAttribute('data-tab-group') || 'default';

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

      panels.forEach((panel, idx) => {
        const isSelected = idx === matchIdx;
        panel.classList.toggle('active', isSelected);
        panel.hidden = !isSelected;
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
      const label = panel.getAttribute('data-tab')?.trim() || `Tab ${panelIdx + 1}`;
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
 * Transforms declarative `.furo-accordion` containers (`<div data-accordion="Title">...</div>`)
 * into full Bootstrap 6 `.accordion` components with `Collapse` data-bs attributes.
 */
export function initBootstrapAccordions(container: HTMLElement): void {
  const accordions = Array.from(container.querySelectorAll<HTMLElement>('.furo-accordion'));
  accordions.forEach((accBox, boxIdx) => {
    if (accBox.hasAttribute('data-furo-accordion-ready')) {
      return;
    }
    const rawItems = Array.from(accBox.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-accordion')
    );
    if (rawItems.length === 0) {
      return;
    }

    accBox.setAttribute('data-furo-accordion-ready', 'true');
    const accId = accBox.id || `furo-accordion-${boxIdx}`;
    accBox.id = accId;
    accBox.classList.add('accordion', 'not-prose');
    if (accBox.getAttribute('data-flush') === 'true') {
      accBox.classList.add('accordion-flush');
    }
    const alwaysOpen = accBox.getAttribute('data-always-open') === 'true';

    rawItems.forEach((itemEl, itemIdx) => {
      const title = itemEl.getAttribute('data-accordion')?.trim() || `Section ${itemIdx + 1}`;
      const isOpen =
        itemEl.getAttribute('data-open') === 'true' ||
        (itemIdx === 0 && !rawItems.some((el) => el.getAttribute('data-open') === 'true'));
      const headingId = `${accId}-heading-${itemIdx}`;
      const collapseId = `${accId}-collapse-${itemIdx}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'accordion-item';

      const header = document.createElement('h3');
      header.className = 'accordion-header';
      header.id = headingId;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `accordion-button${isOpen ? '' : ' collapsed'}`;
      btn.setAttribute('data-bs-toggle', 'collapse');
      btn.setAttribute('data-bs-target', `#${collapseId}`);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.setAttribute('aria-controls', collapseId);
      btn.textContent = title;
      header.appendChild(btn);

      const collapse = document.createElement('div');
      collapse.id = collapseId;
      collapse.className = `accordion-collapse collapse${isOpen ? ' show' : ''}`;
      collapse.setAttribute('aria-labelledby', headingId);
      if (!alwaysOpen) {
        collapse.setAttribute('data-bs-parent', `#${accId}`);
      }

      const body = document.createElement('div');
      body.className = 'accordion-body';
      while (itemEl.firstChild) {
        body.appendChild(itemEl.firstChild);
      }

      collapse.appendChild(body);
      wrapper.appendChild(header);
      wrapper.appendChild(collapse);
      itemEl.replaceWith(wrapper);
    });
  });
}

/**
 * Transforms declarative `<ol class="furo-stepper" data-active-step="2">` lists
 * into Bootstrap 6 `.stepper` components.
 */
export function initBootstrapSteppers(container: HTMLElement): void {
  const steppers = Array.from(container.querySelectorAll<HTMLElement>('.furo-stepper'));
  steppers.forEach((stepperEl) => {
    if (stepperEl.hasAttribute('data-furo-stepper-ready')) {
      return;
    }
    stepperEl.setAttribute('data-furo-stepper-ready', 'true');
    stepperEl.classList.add('stepper', 'not-prose');
    if (stepperEl.getAttribute('data-orientation') !== 'vertical') {
      stepperEl.classList.add('md:stepper-horizontal');
    }

    const activeStep = Number.parseInt(stepperEl.getAttribute('data-active-step') || '1', 10);
    const items = Array.from(stepperEl.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === 'LI'
    );
    items.forEach((li, idx) => {
      li.classList.add('stepper-item');
      if (idx + 1 <= activeStep) {
        li.classList.add('active');
      }
    });
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
}
