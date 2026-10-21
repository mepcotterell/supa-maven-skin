# Bootstrap 6 Components Showcase

**Maven Furo Skin** bundles the complete **Bootstrap 6 (`6.0.0-alpha.1`)** component library and all **20 interactive JavaScript plugins**, automatically isolating Bootstrap components from `.prose` typography rules and bridging Furo's adaptive Light/Dark color tokens.

Site authors can use standard Bootstrap 6 HTML markup, declarative Markdown shorthands (`> [!ALERT:theme]`, `.furo-accordion`, `.furo-stepper`), or Velocity helper macros (`#bsAlert`, `#bsBadge`, `#bsCard`).

---

## 1. Actions & Buttons

Bootstrap 6 replaces legacy per-color button classes with composable `.theme-*` utilities (`theme-primary`, `theme-secondary`, `theme-success`, `theme-info`, `theme-warning`, `theme-danger`, `theme-light`, `theme-dark`) paired with surface variants (`.btn-solid` / `.btn`, `.btn-outline`, `.btn-subtle`, `.btn-text`, `.btn-link`), sizes (`.btn-xs`, `.btn-sm`, `.btn-lg`), and `.btn-group` toolbars.

### Semantic Theme Variants (Solid, Outline, Subtle, Text)

<div class="furo-component-preview not-prose">
  <div class="mb-3">
    <div class="small fw-semibold text-body-secondary mb-2">Solid Buttons (.btn .btn-solid .theme-*)</div>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-solid theme-primary">Primary</button>
      <button type="button" class="btn btn-solid theme-secondary">Secondary</button>
      <button type="button" class="btn btn-solid theme-success">Success</button>
      <button type="button" class="btn btn-solid theme-info">Info</button>
      <button type="button" class="btn btn-solid theme-warning">Warning</button>
      <button type="button" class="btn btn-solid theme-danger">Danger</button>
      <button type="button" class="btn btn-solid theme-light">Light</button>
      <button type="button" class="btn btn-solid theme-dark">Dark</button>
    </div>
  </div>
  <div class="mb-3">
    <div class="small fw-semibold text-body-secondary mb-2">Outline Buttons (.btn .btn-outline .theme-*)</div>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-outline theme-primary">Primary</button>
      <button type="button" class="btn btn-outline theme-secondary">Secondary</button>
      <button type="button" class="btn btn-outline theme-success">Success</button>
      <button type="button" class="btn btn-outline theme-info">Info</button>
      <button type="button" class="btn btn-outline theme-warning">Warning</button>
      <button type="button" class="btn btn-outline theme-danger">Danger</button>
    </div>
  </div>
  <div class="mb-3">
    <div class="small fw-semibold text-body-secondary mb-2">Subtle &amp; Text Variants (.btn-subtle / .btn-text / .btn-link)</div>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <button type="button" class="btn btn-subtle theme-primary">Subtle Primary</button>
      <button type="button" class="btn btn-subtle theme-success">Subtle Success</button>
      <button type="button" class="btn btn-subtle theme-danger">Subtle Danger</button>
      <button type="button" class="btn btn-text theme-primary">Text Button</button>
      <button type="button" class="btn btn-link">Link Button</button>
    </div>
  </div>
  <div>
    <div class="small fw-semibold text-body-secondary mb-2">Sizes, Button Groups &amp; Toggle State (data-bs-toggle="button")</div>
    <div class="d-flex flex-wrap gap-3 align-items-center">
      <button type="button" class="btn btn-xs btn-solid theme-primary">Extra Small (.btn-xs)</button>
      <button type="button" class="btn btn-sm btn-solid theme-primary">Small (.btn-sm)</button>
      <button type="button" class="btn btn-solid theme-primary">Default</button>
      <button type="button" class="btn btn-lg btn-solid theme-primary">Large (.btn-lg)</button>
      <button type="button" class="btn btn-outline theme-primary" data-bs-toggle="button" aria-pressed="false">Toggle Button</button>
      <div class="btn-group" role="group" aria-label="Release channel group">
        <button type="button" class="btn btn-outline theme-secondary active">Stable</button>
        <button type="button" class="btn btn-outline theme-secondary">RC</button>
        <button type="button" class="btn btn-outline theme-secondary">Snapshot</button>
      </div>
    </div>
  </div>
</div>

---

## 2. Badges, Avatars, Chips & Indicators

Bootstrap 6 introduces first-class **Avatars** (`.avatar`, `.avatar-stack`, `.avatar-status`), **Chips** (`.chip`, `.chip-input` with `[data-bs-chips]`), and composable **Badges** (`.badge`, `.badge-subtle`, `.badge-outline`), alongside **Progress**, **Spinners**, and **Placeholders**.

### Badges (Solid, Subtle, Outline & Pill)

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap gap-2 mb-3">
    <span class="badge theme-primary">Primary</span>
    <span class="badge theme-secondary">Secondary</span>
    <span class="badge theme-success">Success</span>
    <span class="badge theme-info">Info</span>
    <span class="badge theme-warning">Warning</span>
    <span class="badge theme-danger">Danger</span>
  </div>
  <div class="d-flex flex-wrap gap-2">
    <span class="badge badge-subtle theme-primary">Subtle Primary</span>
    <span class="badge badge-subtle theme-success">Subtle Success</span>
    <span class="badge badge-subtle theme-warning">Subtle Warning</span>
    <span class="badge badge-subtle theme-danger">Subtle Danger</span>
    <span class="badge badge-outline theme-primary">Outline Primary</span>
    <span class="badge badge-outline theme-info">Outline Info</span>
    <span class="badge badge-lg rounded-pill theme-primary">Large Pill Badge</span>
  </div>
</div>

### Avatars, Sizes, Status Dots & Avatar Stacks

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap gap-4 align-items-center">
    <div class="d-flex align-items-center gap-2">
      <span class="avatar avatar-xs theme-primary">XS</span>
      <span class="avatar avatar-sm theme-secondary">SM</span>
      <span class="avatar theme-success">MC<span class="avatar-status status-online"></span></span>
      <span class="avatar avatar-lg avatar-subtle theme-info">BS<span class="avatar-status status-busy"></span></span>
      <span class="avatar avatar-xl avatar-subtle theme-warning">XL<span class="avatar-status status-away"></span></span>
    </div>
    <div class="avatar-stack">
      <span class="avatar theme-primary" title="Lead Maintainer">MC</span>
      <span class="avatar theme-success" title="Release Bot">RB</span>
      <span class="avatar theme-info" title="Docs Reviewer">DR</span>
      <span class="avatar avatar-subtle theme-secondary">+4</span>
    </div>
  </div>
</div>

### Interactive Chips & Chip Input (`[data-bs-chips]`)

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap gap-2 mb-3">
    <span class="chip active theme-primary">maven-site-plugin</span>
    <span class="chip theme-success">doxia-2.0</span>
    <span class="chip theme-info">bootstrap-6</span>
    <span class="chip theme-warning">typescript</span>
  </div>
  <label class="form-label small fw-semibold text-body-secondary">Interactive Chip Input (Type a tag and press comma or Enter):</label>
  <div class="chip-input" data-bs-chips="true" data-bs-placeholder="Add topic tag...">
    <span class="chip">furo-skin</span>
    <span class="chip">bootstrap-6</span>
    <input type="text" class="form-ghost" placeholder="Add topic tag..." aria-label="Add topic tag" />
  </div>
</div>

### Progress Bars, Spinners & Skeleton Placeholders

<div class="furo-component-preview not-prose">
  <div class="row g-4 align-items-center">
    <div class="col-md-6">
      <div class="small fw-semibold text-body-secondary mb-2">Progress Bars</div>
      <div class="progress mb-2" role="progressbar" aria-label="Build completion" aria-valuenow="78" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar theme-primary" style="width: 78%">78%</div>
      </div>
      <div class="progress" role="progressbar" aria-label="Test coverage" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar progress-bar-striped progress-bar-animated theme-success" style="width: 92%">92% Coverage</div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="small fw-semibold text-body-secondary mb-2">Spinners &amp; Placeholders</div>
      <div class="d-flex align-items-center gap-3 mb-2">
        <div class="spinner-border spinner-border-sm theme-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        <div class="spinner-border theme-success" role="status"><span class="visually-hidden">Loading...</span></div>
        <div class="spinner-grow spinner-grow-sm theme-info" role="status"><span class="visually-hidden">Loading...</span></div>
        <div class="spinner-grow theme-warning" role="status"><span class="visually-hidden">Loading...</span></div>
      </div>
      <p class="placeholder-glow mb-0">
        <span class="placeholder col-7"></span>
        <span class="placeholder col-4"></span>
      </p>
    </div>
  </div>
</div>

---

## 3. Alerts, Overlays, Dialogs, Drawers & Toasts

In addition to Furo's `> [!NOTE]` admonitions, site authors can use native Bootstrap 6 `.alert` components (via HTML or the `> [!ALERT:theme dismissible]` Markdown shorthand), native HTML5 `<dialog class="dialog">` modals, `<dialog class="drawer">` off-canvas sheets, `.toast` notifications, **Tooltips**, and **Popovers**.

### Markdown Shorthand Bootstrap 6 Alerts (`> [!ALERT:theme dismissible]`)

> [!ALERT:primary dismissible] Maven Central Release Available
> Version `0.1.0-SNAPSHOT` is ready for staging with full Doxia 2.0 and Bootstrap 6 component support.

> [!ALERT:success] Build Verification Passed
> All unit tests (`vitest`) and Maven Invoker integration tests (`verify.bsh`) succeeded with zero warnings.

> [!ALERT:warning dismissible] Experimental Bootstrap 6 Alpha API
> Pin `bootstrap@6.0.0-alpha.1` in `package.json` when extending custom SCSS tokens.

### Interactive Overlays: Dialog Modal, Drawer Sheet, Live Toast, Tooltips & Popovers

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap gap-2 align-items-center">
    <button type="button" class="btn btn-solid theme-primary" data-bs-toggle="dialog" data-bs-target="#demoModalDialog">Open Modal Dialog</button>
    <button type="button" class="btn btn-outline theme-primary" data-bs-toggle="drawer" data-bs-target="#demoRightDrawer">Open Right Drawer</button>
    <button type="button" class="btn btn-subtle theme-success" data-furo-toast-target="#demoLiveToast">Trigger Live Toast</button>
    <button type="button" class="btn btn-outline theme-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Tooltip powered by Floating UI in Bootstrap 6">Hover for Tooltip</button>
    <button type="button" class="btn btn-outline theme-info" data-bs-toggle="popover" data-bs-placement="top" data-bs-title="Bootstrap 6 Popover" data-bs-content="Popovers and Tooltips are automatically initialized by Maven Furo Skin on page load.">Click for Popover</button>
  </div>
  <dialog class="dialog" id="demoModalDialog" aria-labelledby="demoModalDialogTitle">
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="dialog-title fw-semibold" id="demoModalDialogTitle">Bootstrap 6 Native &lt;dialog&gt; Modal</div>
        <button type="button" class="btn-close" data-bs-dismiss="dialog" aria-label="Close"></button>
      </div>
      <div class="dialog-body">
        <p>Bootstrap 6 replaces legacy <code>div.modal</code> overlays with the native HTML5 <code>&lt;dialog class="dialog"&gt;</code> element, providing built-in top-layer rendering and focus trapping.</p>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-subtle theme-secondary" data-bs-dismiss="dialog">Cancel</button>
        <button type="button" class="btn btn-solid theme-primary" data-bs-dismiss="dialog">Confirm Action</button>
      </div>
    </div>
  </dialog>
  <dialog class="drawer drawer-end drawer-sheet" id="demoRightDrawer" aria-labelledby="demoRightDrawerTitle">
    <div class="drawer-header">
      <div class="drawer-title fw-semibold" id="demoRightDrawerTitle">Inspector Drawer</div>
      <button type="button" class="btn-close" data-bs-dismiss="drawer" aria-label="Close"></button>
    </div>
    <div class="drawer-body">
      <p>Drawers also use native <code>&lt;dialog class="drawer"&gt;</code> elements and support start, end, top, and bottom placements.</p>
    </div>
  </dialog>
  <div class="toast-container position-fixed bottom-0 end-0 p-3">
    <div id="demoLiveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="me-auto">Maven Furo Skin</strong>
        <small>Just now</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">Site assets compiled and bundled successfully!</div>
    </div>
  </div>
</div>

---

## 4. Navigation, Menus, Tabs, Breadcrumbs, Pagination & Steppers

Bootstrap 6 unifies dropdowns and context menus into the new **Menu** component (`[data-bs-toggle="menu"]`), adds **NavOverflow** for responsive horizontal tabs, and introduces the **Stepper** workflow indicator.

### Menus (`[data-bs-toggle="menu"]`), Nav Pills & Underline Tabs

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap gap-4 align-items-center justify-content-between mb-4">
    <div class="position-relative d-inline-block">
      <button type="button" class="btn btn-solid theme-primary" data-bs-toggle="menu" aria-expanded="false"> Artifact Actions &#9662; </button>
      <ul class="menu">
        <li class="menu-header">Maven Coordinates</li>
        <li><button type="button" class="menu-item">Copy pom.xml Snippet</button></li>
        <li><button type="button" class="menu-item">Download Javadoc JAR</button></li>
        <li><hr class="menu-divider" /></li>
        <li><button type="button" class="menu-item text-danger">Deprecate Version</button></li>
      </ul>
    </div>
    <ul class="nav nav-pills" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#bsTabMaven" type="button" role="tab" aria-selected="true">Maven</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#bsTabGradle" type="button" role="tab" aria-selected="false">Gradle</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#bsTabSbt" type="button" role="tab" aria-selected="false">sbt</button>
      </li>
    </ul>
  </div>
  <div class="tab-content p-3 rounded border bg-body-tertiary">
    <div class="tab-pane fade show active" id="bsTabMaven" role="tabpanel">Configure <code>maven-site-plugin</code> 3.21.0+ in your <code>pom.xml</code> and run <code>mvn site</code>.</div>
    <div class="tab-pane fade" id="bsTabGradle" role="tabpanel">Publish the skin JAR to Maven Local or Maven Central for multi-project consumption.</div>
    <div class="tab-pane fade" id="bsTabSbt" role="tabpanel">Consume Doxia-compatible site descriptors across JVM build tools.</div>
  </div>
</div>

### Multi-Step Workflow Stepper (`.furo-stepper` Shorthand & `.stepper`)

Authors can write a simple `<ol class="furo-stepper" title="3">` ordered list and have it enhanced into a responsive horizontal Bootstrap 6 `.stepper`:

<div class="furo-component-preview not-prose">
  <ol class="furo-stepper" title="3">
    <li class="active">Compile SCSS &amp; TypeScript</li>
    <li class="active">Package Skin JAR</li>
    <li class="active">Run Invoker Site ITs</li>
    <li>Publish to git.cotterell.dev</li>
  </ol>
</div>

### Breadcrumbs & Pagination

<div class="furo-component-preview not-prose">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
    <nav aria-label="Breadcrumb demo">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a href="index.html">Docs</a></li>
        <li class="breadcrumb-item"><a href="kitchen-sink.html">Showcase</a></li>
        <li class="breadcrumb-item active" aria-current="page">Bootstrap 6 Components</li>
      </ol>
    </nav>
    <nav aria-label="Pagination demo">
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item disabled"><a class="page-link" href="#">Previous</a></li>
        <li class="page-item active" aria-current="page"><a class="page-link" href="#">1</a></li>
        <li class="page-item"><a class="page-link" href="#">2</a></li>
        <li class="page-item"><a class="page-link" href="#">3</a></li>
        <li class="page-item"><a class="page-link" href="#">Next</a></li>
      </ul>
    </nav>
  </div>
</div>

---

## 5. Containers & Disclosure: Accordions, Cards, List Groups & Carousel

### Declarative `.furo-accordion` Shorthand

Wrap `<div title="Question Title">` items inside `<div class="furo-accordion">` to generate a full Bootstrap 6 `.accordion` with `Collapse` transitions and zero blank-line issues:

<div class="furo-accordion">
  <div title="How does Maven Furo Skin isolate Bootstrap components from .prose?" class="open">
    <p><code>initBootstrapComponents()</code> automatically adds <code>.not-prose</code> to top-level Bootstrap component containers and applies CSS guardrails in <code>_bootstrap-furo.scss</code> so lists, links, and headings inside components never inherit article prose styles.</p>
  </div>
  <div title="Are all 20 Bootstrap 6 JavaScript plugins available globally?">
    <p>Yes! All 20 Bootstrap 6 plugins (<code>Alert</code>, <code>Button</code>, <code>Carousel</code>, <code>Chips</code>, <code>Collapse</code>, <code>Combobox</code>, <code>Datepicker</code>, <code>Dialog</code>, <code>Drawer</code>, <code>Menu</code>, <code>NavOverflow</code>, <code>OtpInput</code>, <code>Popover</code>, <code>Range</code>, <code>ScrollSpy</code>, <code>Strength</code>, <code>Tab</code>, <code>Toast</code>, <code>Toggler</code>, and <code>Tooltip</code>) are bundled and exposed on <code>window.bootstrap</code>.</p>
  </div>
  <div title="Can I use Velocity macros in .md.vm pages?">
    <p>Yes. <code>site-macros.vm</code> provides <code>#bsAlert</code>, <code>#bsBadge</code>, and <code>#bsCard</code> macros for Doxia pages rendered through Velocity.</p>
  </div>
</div>

### Cards & Actionable List Groups

<div class="furo-component-preview not-prose">
  <div class="row g-3">
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Skin Architecture</span>
          <span class="badge badge-subtle theme-primary">v0.1.0</span>
        </div>
        <div class="card-body">
          <div class="card-title h5">Three-Column Furo Layout</div>
          <p class="card-text text-body-secondary">Sticky 280px navigation sidebar, 48rem centered prose article, and 240px ScrollSpy table of contents.</p>
          <a href="configuration.html" class="btn btn-sm btn-solid theme-primary">View Configuration</a>
        </div>
        <div class="card-footer small text-body-secondary">Updated via frontend-maven-plugin</div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="list-group">
        <a href="index.html" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">Overview &amp; Quick Start</div>
            <small class="text-body-secondary">Configure maven-site-plugin 3.21.0</small>
          </div>
          <span class="badge rounded-pill theme-primary">Guide</span>
        </a>
        <a href="configuration.html" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">Custom site.xml Options</div>
            <small class="text-body-secondary">Light/Dark palettes, KaTeX, Mermaid</small>
          </div>
          <span class="badge rounded-pill badge-subtle theme-success">12 Options</span>
        </a>
        <a href="kitchen-sink.html" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">Kitchen Sink Showcase</div>
            <small class="text-body-secondary">Typography, Admonitions, Code &amp; Diagrams</small>
          </div>
          <span class="badge rounded-pill badge-subtle theme-info">Demo</span>
        </a>
      </div>
    </div>
  </div>
</div>

---

## 6. Forms & Bootstrap 6 Rich Input Widgets

Bootstrap 6 adds native interactive widgets for **Combobox** (`[data-bs-toggle="combobox"]`), **Datepicker** (`[data-bs-toggle="datepicker"]`), **OTP Input** (`[data-bs-otp]`), **Range Slider** (`.form-range`), and **Password Strength Meter** (`[data-bs-strength]`), alongside standard `.form-control`, `.form-select`, `.form-check`, `.form-switch`, and `.input-group`.

<div class="furo-component-preview not-prose">
  <div class="row g-4">
    <div class="col-md-6">
      <label class="form-label fw-semibold">Searchable Combobox (data-bs-toggle="combobox")</label>
      <div class="dropdown mb-3">
        <button type="button" class="form-control combobox-toggle" data-bs-toggle="combobox" aria-expanded="false">
          <span class="combobox-value">Apache Maven 3.9+</span>
        </button>
        <div class="menu w-100">
          <div class="combobox-search">
            <input type="text" class="form-control form-control-sm combobox-search-input" placeholder="Filter build tools..." aria-label="Filter build tools" />
          </div>
          <button type="button" class="menu-item selected" data-bs-value="maven">Apache Maven 3.9+</button>
          <button type="button" class="menu-item" data-bs-value="maven4">Apache Maven 4.0</button>
          <button type="button" class="menu-item" data-bs-value="doxia2">Maven Doxia 2.0</button>
          <button type="button" class="menu-item" data-bs-value="vite">Vite + TypeScript</button>
        </div>
      </div>
      <label class="form-label fw-semibold" for="demoDatepickerInput">Calendar Datepicker (data-bs-toggle="datepicker")</label>
      <input type="text" id="demoDatepickerInput" class="form-control mb-3" data-bs-toggle="datepicker" placeholder="Select release date..." value="2026-10-20" />
      <label class="form-label fw-semibold">Switches &amp; Checks</label>
      <div class="form-check form-switch mb-2">
        <input class="form-check-input" type="checkbox" role="switch" id="switchCopyBtn" checked="checked" />
        <label class="form-check-label" for="switchCopyBtn">Enable code block copy button</label>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="switchMermaid" checked="checked" />
        <label class="form-check-label" for="switchMermaid">Lazy-load Mermaid &amp; KaTeX</label>
      </div>
    </div>
    <div class="col-md-6">
      <label class="form-label fw-semibold">6-Digit OTP Verification Input (data-bs-otp)</label>
      <div class="otp mb-3" data-bs-otp="true" data-bs-length="6">
        <input type="text" class="otp-input" maxlength="6" value="428190" aria-label="One-time verification code" />
      </div>
      <label class="form-label fw-semibold" for="demoRangeInput">Enhanced Range Slider (.form-range)</label>
      <div class="form-range mb-3" data-bs-bubble="true">
        <input type="range" id="demoRangeInput" class="form-range-input" min="0" max="100" value="75" aria-label="Sidebar width scale" />
      </div>
      <label class="form-label fw-semibold" for="demoStrengthInput">Token / Password Strength Meter (data-bs-strength)</label>
      <input type="password" id="demoStrengthInput" class="form-control" value="FuroBootstrap6!2026" aria-label="Sample token input" />
      <div class="strength" data-bs-strength="strong" data-bs-input="#demoStrengthInput">
        <span class="strength-segment active"></span>
        <span class="strength-segment active"></span>
        <span class="strength-segment active"></span>
        <span class="strength-segment active"></span>
      </div>
      <small class="strength-text">Strong</small>
    </div>
  </div>
</div>
