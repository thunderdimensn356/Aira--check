/**
 * aira_accessibility.js
 * Bridge between Aira UI and native Accessibility Service
 */

const AiraAccess = {
  isAvailable() {
    return !!(window.AiraNative && typeof window.AiraNative.openApp === "function");
  },

  openApp(packageName) {
    if (!this.isAvailable()) {
      console.warn("Aira Accessibility not available");
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

  async searchInChrome(query) {
    const opened = await this.openApp("com.android.chrome");
    if (!opened) return false;
    await new Promise((r) => setTimeout(r, 1500));
    await this.clickByText("Search");
    await new Promise((r) => setTimeout(r, 500));
    return await this.typeText(query);
  }
};

window.AiraAccess = AiraAccess;

// --- Termux bridge (window.AiraTermux from MainActivity) ---
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
