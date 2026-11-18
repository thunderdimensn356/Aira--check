/**
 * aira_accessibility.js
 * Bridge: a11y + screenshot + live + cursor + vision grid + snap
 */

const AiraAccess = {
  _screenshotWaiter: null,
  _screenshotTimeout: null,
  _live: false,
  onLiveText: null,

  /** Last gridded / raw shot pixel size (for 0–1000 → screen). */
  _lastShotW: 0,
  _lastShotH: 0,

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

  findNextClickable(dir, fromX, fromY) {
    if (!this.isAvailable()) return Promise.resolve(null);
    try {
      if (typeof window.AiraNative.findNextClickable !== 'function') {
        return Promise.resolve(null);
      }
      const s = window.AiraNative.findNextClickable(
        dir || '',
        fromX | 0,
        fromY | 0
      );
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

  async snapCursor(dir) {
    const p = this.getCursorPosition();
    const next = await this.findNextClickable(dir, p.x, p.y);
    if (!next) {
      return { ok: false, error: 'none' };
    }
    this.setCursorPosition(next.x, next.y);
    return { ok: true, x: next.x, y: next.y };
  },

  async clickTarget(label, appPackage) {
    const lab = (label || '').trim();
    if (!lab) return false;

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

    if (await this.clickByText(lab)) return true;

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

  /**
   * Capture screen then draw 0–1000 coordinate grid for Gemini Vision.
   * Returns { ok, base64, width, height, error }.
   */
  async captureScreenWithGrid() {
    const shot = await this.captureScreen();
    if (!shot.ok || !shot.base64) {
      return { ok: false, base64: null, width: 0, height: 0, error: shot.error || 'capture-fail' };
    }
    try {
      const gridded = await this.addCoordinateGrid(shot.base64);
      return gridded;
    } catch (e) {
      console.error('grid', e);
      // fallback: raw shot
      return { ok: true, base64: shot.base64, width: this._lastShotW, height: this._lastShotH, error: null, gridded: false };
    }
  },

  /**
   * Draw axis + 0–1000 grid on JPEG base64. Stores shot size for visionToScreen.
   */
  addCoordinateGrid(base64Jpeg) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          self._lastShotW = w;
          self._lastShotH = h;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // semi-transparent grid every 100 units (0–1000 space)
          ctx.save();
          ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
          ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 400));
          const fontPx = Math.max(12, Math.round(Math.min(w, h) / 45));
          ctx.font = 'bold ' + fontPx + 'px monospace';
          ctx.textBaseline = 'top';

          for (let g = 0; g <= 1000; g += 100) {
            const px = (g / 1000) * w;
            const py = (g / 1000) * h;

            // vertical
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();

            // horizontal
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();

            // labels
            const label = String(g);
            ctx.fillText(label, Math.min(px + 3, w - fontPx * 3), 4);
            if (g > 0) {
              ctx.fillText(label, 4, Math.min(py + 3, h - fontPx - 4));
            }
          }

          // origin + axes emphasis
          ctx.strokeStyle = 'rgba(255, 80, 80, 0.85)';
          ctx.lineWidth = ctx.lineWidth + 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(w, 0);
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText('0,0', 6, 6);
          ctx.fillText('1000,0', w - fontPx * 5, 6);
          ctx.fillText('0,1000', 6, h - fontPx - 6);
          ctx.fillText('1000,1000', w - fontPx * 7, h - fontPx - 6);
          ctx.restore();

          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
          resolve({
            ok: true,
            base64: b64,
            width: w,
            height: h,
            error: null,
            gridded: true
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () {
        reject(new Error('image-load-failed'));
      };
      // native returns raw base64 without prefix
      img.src = 'data:image/jpeg;base64,' + base64Jpeg;
    });
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

  // ─── Cursor ─────────────────────────────────────────────

  showCursor() {
    if (!window.AiraNative || typeof window.AiraNative.showCursor !== 'function') {
      return { ok: false, error: 'no-native' };
    }
    if (!this.canDrawOverlays()) {
      this.openOverlaySettings();
      return { ok: false, error: 'need-overlay-permission' };
    }
    try {
      const ok = !!window.AiraNative.showCursor();
      return { ok: ok, error: ok ? null : 'show-failed' };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  hideCursor() {
    try {
      if (window.AiraNative && typeof window.AiraNative.hideCursor === 'function') {
        window.AiraNative.hideCursor();
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  isCursorVisible() {
    try {
      if (window.AiraNative && typeof window.AiraNative.isCursorVisible === 'function') {
        return !!window.AiraNative.isCursorVisible();
      }
    } catch (e) {}
    return false;
  },

  moveCursor(dx, dy) {
    try {
      if (window.AiraNative && typeof window.AiraNative.moveCursor === 'function') {
        return !!window.AiraNative.moveCursor(dx | 0, dy | 0);
      }
    } catch (e) {}
    return false;
  },

  setCursorPosition(x, y) {
    try {
      if (window.AiraNative && typeof window.AiraNative.setCursorPosition === 'function') {
        return !!window.AiraNative.setCursorPosition(x | 0, y | 0);
      }
    } catch (e) {}
    return false;
  },

  getCursorPosition() {
    try {
      if (window.AiraNative && typeof window.AiraNative.getCursorPosition === 'function') {
        const s = window.AiraNative.getCursorPosition() || '0,0';
        const p = s.split(',');
        return { x: parseInt(p[0], 10) || 0, y: parseInt(p[1], 10) || 0 };
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  },

  cursorClickLeft() {
    try {
      if (window.AiraNative && typeof window.AiraNative.cursorClickLeft === 'function') {
        return !!window.AiraNative.cursorClickLeft();
      }
    } catch (e) {}
    return false;
  },

  cursorClickRight() {
    try {
      if (window.AiraNative && typeof window.AiraNative.cursorClickRight === 'function') {
        return !!window.AiraNative.cursorClickRight();
      }
    } catch (e) {}
    return false;
  },

  // ─── Vision / screen helpers ────────────────────────────

  getScreenSize() {
    // Prefer last screenshot pixel size (matches vision image)
    if (this._lastShotW > 0 && this._lastShotH > 0) {
      return { w: this._lastShotW, h: this._lastShotH };
    }
    const w = Math.max(
      window.screen && window.screen.width ? window.screen.width : 0,
      window.innerWidth || 0,
      1080
    );
    const h = Math.max(
      window.screen && window.screen.height ? window.screen.height : 0,
      window.innerHeight || 0,
      1920
    );
    return { w: w, h: h };
  },

  /**
   * 0–1000 grid → device / shot pixels.
   * Prefer _lastShotW/H so click matches screenshot scale.
   */
  visionToScreen(nx, ny) {
    const size = this.getScreenSize();
    let x = Number(nx);
    let y = Number(ny);
    if (isNaN(x) || isNaN(y)) return null;

    if (x >= 0 && x <= 1000 && y >= 0 && y <= 1000) {
      x = Math.round((x / 1000) * size.w);
      y = Math.round((y / 1000) * size.h);
    } else {
      x = Math.round(x);
      y = Math.round(y);
    }
    x = Math.max(0, Math.min(size.w - 1, x));
    y = Math.max(0, Math.min(size.h - 1, y));
    return { x: x, y: y };
  },

  parseVisionCoords(text) {
    if (!text) return null;
    const raw = String(text);

    let m = raw.match(/\{[\s\S]*?\}/);
    if (m) {
      try {
        const obj = JSON.parse(m[0]);
        const x = obj.x != null ? obj.x : obj.nx;
        const y = obj.y != null ? obj.y : obj.ny;
        if (x != null && y != null) {
          return this.visionToScreen(x, y);
        }
      } catch (e) {}
    }

    m = raw.match(/x\s*[:=]\s*(\d+)\s*[,;\s]+y\s*[:=]\s*(\d+)/i);
    if (m) {
      return this.visionToScreen(parseInt(m[1], 10), parseInt(m[2], 10));
    }
    return null;
  },

  async moveCursorTo(x, y) {
    return this.setCursorPosition(x, y);
  },

  async clickScreen(x, y) {
    if (this.isCursorVisible()) {
      this.setCursorPosition(x, y);
      await new Promise(function (r) { setTimeout(r, 80); });
      if (window.AiraNative && typeof window.AiraNative.cursorClickLeft === 'function') {
        try {
          return !!window.AiraNative.cursorClickLeft();
        } catch (e) {}
      }
    }
    return await this.clickAt(x, y);
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
    await new Promise(function (r) { setTimeout(r, 1500); });
    await this.clickByText('Search');
    await new Promise(function (r) { setTimeout(r, 500); });
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
