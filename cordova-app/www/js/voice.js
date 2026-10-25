/**
 * voice.js — TTS (Aira bole) + baad mein STT
 */
const AiraVoice = {
  enabled: false,
  speaking: false,

  init() {
    try {
      const v = localStorage.getItem('aira_voice_on');
      this.enabled = v === '1';
    } catch (e) {
      this.enabled = false;
    }
    this.updateToggleUI();
  },

  isSupported() {
    return typeof window.speechSynthesis !== 'undefined';
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
    return this.enabled;
  },

  updateToggleUI() {
    const btn = document.getElementById('voiceToggleBtn');
    if (!btn) return;
    btn.classList.toggle('active', this.enabled);
    btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    btn.title = this.enabled ? 'Voice ON' : 'Voice OFF';
  },

  stop() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.speaking = false;
  },

  /**
   * Aira ka text bolo (voice OFF ho to kuch mat karo)
   */
  speak(text) {
    if (!this.enabled) return;
    if (!text || !String(text).trim()) return;
    if (!this.isSupported()) {
      console.warn('TTS not supported in this WebView');
      return;
    }

    this.stop();

    const clean = String(text)
      .replace(/\[\[ACTION:[^\]]+\]\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'hi-IN';
    u.rate = 1.0;
    u.pitch = 1.0;

    u.onstart = () => { this.speaking = true; };
    u.onend = () => { this.speaking = false; };
    u.onerror = () => { this.speaking = false; };

    // thoda delay — Android WebView voices load ke liye
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn('speak failed', e);
        this.speaking = false;
      }
    }, 80);
  }
};

window.AiraVoice = AiraVoice;
