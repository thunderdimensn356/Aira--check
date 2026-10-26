/**
 * aira_accessibility.js
 * Bridge between Aira UI and native Accessibility Service
 */

const AiraAccess = {
  _screenshotWaiter: null,

  isAvailable() {
    return !!(window.AiraNative && typeof window.AiraNative.openApp === 'function');
  },

  openApp(packageName) {
    if (!this.isAvailable()) {
      console.warn('Aira Accessibility not available');
      return Promise.resolve(false);
    }
    try {
      return Promise.resolve(!!window.AiraNative.openApp(packageName));
    } catch (e) {
      console.error(e);
      return Promise.resolve(false);
    }
  },

  clickByText(text) {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.clickByText(text));
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  typeText(text) {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.typeText(text));
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  goHome() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.goHome());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  goBack() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.goBack());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  openNotifications() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.openNotifications());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  openRecents() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.openRecents());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  /**
   * Screenshot (Android 11+, Accessibility ON).
   * Returns { ok, base64, error }
   */
  captureScreen() {
    return new Promise((resolve) => {
      if (!window.AiraNative || typeof window.AiraNative.captureScreen !== 'function') {
        resolve({ ok: false, error: 'no-native' });
        return;
      }

      this._screenshotWaiter = resolve;

      // safety timeout
      const t = setTimeout(() => {
        if (this._screenshotWaiter) {
          this._screenshotWaiter({ ok: false, error: 'timeout' });
          this._screenshotWaiter = null;
        }
      }, 12000);

      this._screenshotTimeout = t;

      try {
        window.AiraNative.captureScreen();
      } catch (e) {
        clearTimeout(t);
        this._screenshotWaiter = null;
        resolve({ ok: false, error: e.message || String(e) });
      }
    });
  },

  /** Called from native after capture finishes */
  onScreenshotReady() {
    if (this._screenshotTimeout) {
      clearTimeout(this._screenshotTimeout);
      this._screenshotTimeout = null;
    }

    const resolve = this._screenshotWaiter;
    this._screenshotWaiter = null;
    if (!resolve) return;

    try {
      const err = window.AiraNative.getLastScreenshotError
        ? window.AiraNative.getLastScreenshotError()
        : '';
      const b64 = window.AiraNative.getLastScreenshot
        ? window.AiraNative.getLastScreenshot()
        : '';

      if (b64 && b64.length > 100) {
        resolve({ ok: true, base64: b64, error: null });
      } else {
        resolve({ ok: false, base64: null, error: err || 'empty' });
      }
    } catch (e) {
      resolve({ ok: false, base64: null, error: e.message || String(e) });
    }
  },

  async searchInChrome(query) {
    const opened = await this.openApp('com.android.chrome');
    if (!opened) return false;
    await new Promise((r) => setTimeout(r, 1500));
    await this.clickByText('Search');
    await new Promise((r) => setTimeout(r, 500));
    return await this.typeText(query);
  }
};

window.AiraAccess = AiraAccess;

// Native may call AiraChat.onScreenshotReady — forward to AiraAccess
window.AiraChat = window.AiraChat || {};
const _prevReady = window.AiraChat.onScreenshotReady;
window.AiraChat.onScreenshotReady = function () {
  if (window.AiraAccess && AiraAccess.onScreenshotReady) {
    AiraAccess.onScreenshotReady();
  }
  if (typeof _prevReady === 'function') _prevReady();
};

// --- Termux bridge ---
window.AiraTermuxBridge = {
  async run(cmd, timeoutMs) {
    timeoutMs = timeoutMs || 20000;

    if (!window.AiraTermux || typeof window.AiraTermux.runCommand !== 'function') {
      return {
        ok: false,
        error: 'Termux bridge not available (native missing or APK not rebuilt)'
      };
    }

    try {
      var startRaw = window.AiraTermux.runCommand(cmd);
      var start = JSON.parse(startRaw);
      if (!start.ok) return start;

      var t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        await new Promise(function (r) { setTimeout(r, 350); });

        var raw = window.AiraTermux.readOutput();
        var res = JSON.parse(raw);
        if (!res.ok) return res;

        if (res.ready) {
          var out = (res.output || '').replace(/\n?__AIRA_EXIT__:\d+\s*$/m, '').trimEnd();
          return { ok: true, output: out };
        }
      }

      return { ok: false, error: 'timeout waiting for Termux output' };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
};
