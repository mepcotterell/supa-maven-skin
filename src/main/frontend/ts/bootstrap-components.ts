import Alert from 'bootstrap/js/dist/alert.js';
import Button from 'bootstrap/js/dist/button.js';
import Carousel from 'bootstrap/js/dist/carousel.js';
import Chips from 'bootstrap/js/dist/chips.js';
import Collapse from 'bootstrap/js/dist/collapse.js';
import Combobox from 'bootstrap/js/dist/combobox.js';
import Datepicker from 'bootstrap/js/dist/datepicker.js';
import Dialog from 'bootstrap/js/dist/dialog.js';
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
 * Selector matching top-level Bootstrap 6 component containers that should be
 * isolated from `.prose` typography rules (list bullets, link underlines, heading margins).
 */
export const BOOTSTRAP_COMPONENT_ISOLATION_SELECTOR = [
  '.accordion',
  '.alert',
  '.avatar',
  '.avatar-stack',
  '.breadcrumb',
  '.btn-group',
  '.btn-toolbar',
  '.card',
  '.card-group',
  '.carousel',
  '.chip',
  '.chip-input',
  '.combobox',
  '.datepicker',
  '.dialog',
  '.drawer',
  '.dropdown',
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
  '.stepper',
  '.stepper-overflow',
  '.strength',
  '.toast',
  '.toast-container'
].join(', ');

/**
 * Automatically adds `.not-prose` to Bootstrap 6 component containers inside `.furo-article`
 * so `.prose` list/heading/link styles never conflict with component layout.
 */
export function isolateBootstrapComponentsFromProse(container: ParentNode = document): void {
  const elements = container.querySelectorAll<HTMLElement>(BOOTSTRAP_COMPONENT_ISOLATION_SELECTOR);
  elements.forEach((el) => {
    if (!el.classList.contains('not-prose')) {
      el.classList.add('not-prose');
    }
  });
}

/**
 * Initializes all 20 Bootstrap 6 interactive JS components and declarative helpers
 * within the given root container, and exposes `window.bootstrap`.
 */
export function initBootstrapComponents(root: ParentNode = document): void {
  if (typeof window !== 'undefined') {
    window.bootstrap = BootstrapPlugins;
  }

  isolateBootstrapComponentsFromProse(root);

  // 1. Tooltips ([data-bs-toggle="tooltip"])
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach((el) => {
    try {
      Tooltip.getOrCreateInstance(el);
    } catch {
      // Ignore in non-layout test environments
    }
  });

  // 2. Popovers ([data-bs-toggle="popover"])
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="popover"]').forEach((el) => {
    try {
      Popover.getOrCreateInstance(el);
    } catch {
      // Ignore in non-layout test environments
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
      const targetSelector = trigger.getAttribute('data-furo-toast-target');
      if (!targetSelector) {
        return;
      }
      const toastEl = document.querySelector<HTMLElement>(targetSelector);
      if (toastEl) {
        Toast.getOrCreateInstance(toastEl).show();
      }
    });
  });

  // 4. Combobox ([data-bs-toggle="combobox"])
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="combobox"]').forEach((el) => {
    try {
      Combobox.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 5. Datepicker ([data-bs-toggle="datepicker"])
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="datepicker"]').forEach((el) => {
    try {
      Datepicker.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 6. Chips ([data-bs-chips])
  root.querySelectorAll<HTMLElement>('[data-bs-chips]').forEach((el) => {
    try {
      Chips.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 7. OTP Input ([data-bs-otp])
  root.querySelectorAll<HTMLElement>('[data-bs-otp]').forEach((el) => {
    try {
      OtpInput.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 8. Range Slider (.form-range)
  root.querySelectorAll<HTMLElement>('.form-range').forEach((el) => {
    try {
      Range.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 9. Password / Token Strength Meter ([data-bs-strength])
  root.querySelectorAll<HTMLElement>('[data-bs-strength]').forEach((el) => {
    try {
      Strength.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 10. NavOverflow (.nav-overflow, [data-bs-toggle="nav-overflow"])
  root
    .querySelectorAll<HTMLElement>('.nav-overflow, [data-bs-toggle="nav-overflow"]')
    .forEach((el) => {
      try {
        NavOverflow.getOrCreateInstance(el);
      } catch {
        // Ignore
      }
    });

  // 11. Carousel ([data-bs-ride="carousel"])
  root.querySelectorAll<HTMLElement>('.carousel').forEach((el) => {
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
