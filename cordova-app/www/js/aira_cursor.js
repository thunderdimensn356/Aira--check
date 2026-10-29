/**
 * aira_cursor.js
 * Simple on-screen cursor (WebView overlay).
 * For native apps over Aira, real pointer needs system overlay — yeh Aira UI ke andar demo + future hook.
 * clickAt still does the real tap; cursor is visual feedback when we know x,y.
 */

const AiraCursor = {
  el: null,
  visible: false,

  ensure() {
    if (this.el) return this.el;
    const d = document.createElement('div');
    d.id = 'airaCursor';
    d.setAttribute('aria-hidden', 'true');
    Object.assign(d.style, {
      position: 'fixed',
      width: '22px',
      height: '22px',
      marginLeft: '-4px',
      marginTop: '-2px',
      borderRadius: '50% 50% 50% 0',
      transform: 'rotate(-45deg)',
      background: 'linear-gradient(135deg, #c4b5fd, #7c3aed)',
      boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 4px 12px rgba(124,58,237,0.45)',
      zIndex: '99999',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'left 0.25s ease, top 0.25s ease, opacity 0.15s ease',
      left: '0px',
      top: '0px'
    });
    document.body.appendChild(d);
    this.el = d;
    return d;
  },

  show(x, y) {
    const el = this.ensure();
    el.style.left = (x || 0) + 'px';
    el.style.top = (y || 0) + 'px';
    el.style.opacity = '1';
    this.visible = true;
  },

  moveTo(x, y) {
    const el = this.ensure();
    if (!this.visible) {
      el.style.transition = 'none';
      el.style.left = (x || 0) + 'px';
      el.style.top = (y || 0) + 'px';
      el.style.opacity = '1';
      this.visible = true;
      // force reflow then animate next moves
      void el.offsetWidth;
      el.style.transition = 'left 0.25s ease, top 0.25s ease, opacity 0.15s ease';
    } else {
      el.style.left = (x || 0) + 'px';
      el.style.top = (y || 0) + 'px';
    }
  },

  hide() {
    if (!this.el) return;
    this.el.style.opacity = '0';
    this.visible = false;
  },

  /** Move then optional pause (ms) */
  async pointAt(x, y, holdMs) {
    this.moveTo(x, y);
    await new Promise((r) => setTimeout(r, holdMs || 280));
  }
};

window.AiraCursor = AiraCursor;
