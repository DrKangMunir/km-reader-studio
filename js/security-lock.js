// KM-Reader Studio Security & Anti-Inspection Lockdown Module
// Protects intellectual property by preventing code inspection, source viewing, and debugging

(function () {
  'use strict';

  // 1. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Intercept and Block Inspection Keyboard Shortcuts
  window.addEventListener('keydown', function (e) {
    // F12 (DevTools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Picker)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      // Allow internal app save triggers if needed, but block browser save-page
      var target = e.target;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }, { capture: true });

  // 3. Clear Console Object in Production
  if (typeof window.console !== 'undefined') {
    var noop = function () {};
    ['debug', 'clear', 'info'].forEach(function (method) {
      window.console[method] = noop;
    });
  }

  // 4. Anti-Tamper & Environment Lock
  Object.defineProperty(window, '_KM_PROTECTED_', {
    value: true,
    writable: false,
    configurable: false
  });
})();
