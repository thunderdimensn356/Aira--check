/**
 * aira_memory.js
 * Hybrid memory: teach Aira UI targets (e.g. YT search icon)
 * Storage: localStorage key aira_ui_memory
 *
 * Record shape:
 * {
 *   id: "youtube_search",
 *   app: "com.google.android.youtube",   // package or "*"
 *   label: "search",                     // semantic name
 *   matchText: "Search",                 // optional accessibility text/desc
 *   x: 980,                              // optional screen px (center)
 *   y: 80,
 *   note: "magnifying glass top right",
 *   updatedAt: 1234567890
 * }
 */

const AiraMemory = {
  KEY: 'aira_ui_memory',

  _load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('AiraMemory load', e);
      return [];
    }
  },

  _save(list) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(list || []));
      return true;
    } catch (e) {
      console.warn('AiraMemory save', e);
      return false;
    }
  },

  list() {
    return this._load();
  },

  /** Find by semantic label (+ optional app package) */
  find(label, appPackage) {
    const q = (label || '').toLowerCase().trim();
    if (!q) return null;
    const list = this._load();
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const lab = (r.label || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      if (lab !== q && id !== q && !lab.includes(q) && !q.includes(lab)) continue;
      if (appPackage && r.app && r.app !== '*' && r.app !== appPackage) continue;
      best = r;
      if (appPackage && r.app === appPackage) return r;
    }
    return best;
  },

  /**
   * Remember / update a target
   * @param {object} rec - { id?, app, label, matchText?, x?, y?, note? }
   */
  remember(rec) {
    if (!rec || !rec.label) return { ok: false, error: 'label-required' };

    const list = this._load();
    const id =
      rec.id ||
      ((rec.app || 'any') + '_' + rec.label)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/_+/g, '_');

    const row = {
      id: id,
      app: rec.app || '*',
      label: String(rec.label).trim(),
      matchText: rec.matchText ? String(rec.matchText).trim() : '',
      x: typeof rec.x === 'number' ? rec.x : null,
      y: typeof rec.y === 'number' ? rec.y : null,
      note: rec.note ? String(rec.note) : '',
      updatedAt: Date.now()
    };

    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) list[idx] = row;
    else list.push(row);

    this._save(list);
    return { ok: true, record: row };
  },

  forget(labelOrId) {
    const q = (labelOrId || '').toLowerCase().trim();
    if (!q) return { ok: false };
    let list = this._load();
    const before = list.length;
    list = list.filter((r) => {
      const lab = (r.label || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      return lab !== q && id !== q;
    });
    this._save(list);
    return { ok: true, removed: before - list.length };
  },

  clear() {
    this._save([]);
    return { ok: true };
  },

  /** Human summary for chat */
  summary() {
    const list = this._load();
    if (!list.length) return 'Koi UI memory nahi hai.';
    return list
      .map((r, i) => {
        const pos =
          r.x != null && r.y != null ? ` @(\( {r.x}, \){r.y})` : '';
        return `\( {i + 1}. [ \){r.app}] \( {r.label} \){pos}${r.note ? ' — ' + r.note : ''}`;
      })
      .join('\n');
  }
};

window.AiraMemory = AiraMemory;
