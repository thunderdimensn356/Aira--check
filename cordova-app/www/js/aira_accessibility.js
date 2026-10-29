/**
 * aira_accessibility.js
 * Bridge: Accessibility + screenshot + stay-live + clickAt + hybrid target
 */

const AiraAccess = {
  _screenshotWaiter: null,
  _live: false,
  onLiveText: null,

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

  clickAt(x, y) {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      if (typeof window.AiraNative.clickAt !== 'function') {
        return Promise.resolve(false);
      }
      return Promise.resolve(!!window.AiraNative.clickAt(x | 0, y | 0));
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  findCenterByText(text) {
    if (!this.isAvailable()) return Promise.resolve(null);
    try {
      if (typeof window.AiraNative.findCenterByText !== 'function') {
        return Promise.resolve(null);
      }
      const s = window.AiraNative.findCenterByText(text || '');
      if (!s || s.indexOf(',') < 0) return Promise.resolve(null);
      const parts = s.split(',');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      if (isNaN(x) || isNaN(y)) return Promise.resolve(null);
      return Promise.resolve({ x: x, y: y });
    } catch (e) {
      return Promise.resolve(null);
    }
  },

  /**
   * Hybrid click:
   * 1) memory (label + optional app) → clickAt x,y
   * 2) clickByText(matchText or label)
   * 3) findCenterByText → clickAt
   */
  async clickTarget(label, appPackage) {
    const lab = (label || '').trim();
    if (!lab) return false;

    // 1) trained memory
    if (window.AiraMemory && typeof AiraMemory.find === 'function') {
      const rec = AiraMemory.find(lab, appPackage || null);
      if (rec && typeof rec.x === 'number' && typeof rec.y === 'number') {
        const ok = await this.clickAt(rec.x, rec.y);
        if (ok) return true;
      }
      if (rec && rec.matchText) {
        const ok2 = await this.clickByText(rec.matchText);
        if (ok2) return true;
      }
    }

    // 2) live text / description
    if (await this.clickByText(lab)) return true;

    // 3) bounds center then gesture
    const center = await this.findCenterByText(lab);
    if (center) {
      return await this.clickAt(center.x, center.y);
    }

    return false;
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

  captureScreen() {
    return new Promise((resolve) => {
      if (!window.AiraNative || typeof window.AiraNative.captureScreen !== 'function') {
        resolve({ ok: false, error: 'no-native' });
        return;
      }

      this._screenshotWaiter = resolve;

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

  canDrawOverlays() {
    try {
      if (window.AiraNative && typeof window.AiraNative.canDrawOverlays === 'function') {
        return !!window.AiraNative.canDrawOverlays();
      }
    } catch (e) {}
    return false;
  },

  openOverlaySettings() {
    try {
      if (window.AiraNative && typeof window.AiraNative.openOverlaySettings === 'function') {
        window.AiraNative.openOverlaySettings();
      }
    } catch (e) {
      console.warn(e);
    }
  },

  startLive() {
    if (!window.AiraNative || typeof window.AiraNative.startLive !== 'function') {
      return { ok: false, error: 'no-native' };
    }
    if (!this.canDrawOverlays()) {
      this.openOverlaySettings();
      return { ok: false, error: 'need-overlay-permission' };
    }
    try {
      const ok = !!window.AiraNative.startLive();
      this._live = ok;
      return { ok: ok, error: ok ? null : 'start-failed' };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  stopLive() {
    try {
      if (window.AiraNative && typeof window.AiraNative.stopLive === 'function') {
        window.AiraNative.stopLive();
      }
    } catch (e) {}
    this._live = false;
    return { ok: true };
  },

  isLive() {
    return !!this._live;
  },

  onLiveStt(event, text) {
    console.log('[LiveSTT]', event, text);
    if (event === 'final' && text && typeof this.onLiveText === 'function') {
      try {
        this.onLiveText(text);
      } catch (e) {
        console.error(e);
      }
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

window.AiraChat = window.AiraChat || {};
const _prevReady = window.AiraChat.onScreenshotReady;
window.AiraChat.onScreenshotReady = function () {
  if (window.AiraAccess && AiraAccess.onScreenshotReady) {
    AiraAccess.onScreenshotReady();
  }
  if (typeof _prevReady === 'function') _prevReady();
};

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
