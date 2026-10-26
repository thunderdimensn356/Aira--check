/**
 * voice.js — native AiraTts pehle, warna Web Speech
 */
const AiraVoice = {
  enabled: false,
  speaking: false,

  init() {
    try {
      this.enabled = localStorage.getItem('aira_voice_on') === '1';
    } catch (e) {
      this.enabled = false;
    }
    this.updateToggleUI();
  },

  hasNative() {
    return !!(window.AiraTts && typeof window.AiraTts.speak === 'function');
  },

  hasWeb() {
    return typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
  },

  isSupported() {
    return this.hasNative() || this.hasWeb();
  },

  setEnabled(on) {
    this.enabled = !!on;
    try {
      localStorage.setItem('aira_voice_on', this.enabled ? '1' : '0');
    } catch (e) {}
    if (!this.enabled) this.stop();
    this.updateToggleUI();
  },

  toggle() {
    this.setEnabled(!this.enabled);

    if (this.enabled) {
      if (this.hasNative()) {
        this.speak('Voice on');
        return this.enabled;
      }
      if (this.hasWeb()) {
        this.speak('Voice on');
        return this.enabled;
      }
      alert('Native TTS nahi mila. Naya APK install karo (AiraTts).');
    }

    return this.enabled;
  },

  updateToggleUI() {
    const btn = document.getElementById('voiceToggleBtn');
    if (!btn) return;
    btn.classList.toggle('active', this.enabled);
    btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    btn.title = this.enabled ? 'Voice ON' : 'Voice OFF';
    if (this.enabled) {
      btn.style.color = '#a78bfa';
      btn.style.background = 'rgba(167, 139, 250, 0.2)';
    } else {
      btn.style.color = '';
      btn.style.background = '';
    }
  },

  stop() {
    try {
      if (this.hasNative()) window.AiraTts.stop();
    } catch (e) {}
    if (this.hasWeb()) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.speaking = false;
  },

  speak(text) {
    if (!this.enabled) return;
    if (!text || !String(text).trim()) return;

    const clean = String(text)
      .replace(/\[\[ACTION:[^\]]+\]\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;

    this.stop();

    if (this.hasNative()) {
      try {
        window.AiraTts.speak(clean);
        this.speaking = true;
        return;
      } catch (e) {
        console.warn('Native TTS failed', e);
      }
    }

    if (!this.hasWeb()) return;

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'hi-IN';
    u.onend = () => { this.speaking = false; };
    u.onerror = () => { this.speaking = false; };
    this.speaking = true;
    setTimeout(function () {
      try { window.speechSynthesis.speak(u); } catch (e) { AiraVoice.speaking = false; }
    }, 50);
  }
};

window.AiraVoice = AiraVoice;
