/**
 * voice.js — TTS toggle + speak
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
    console.log('[AiraVoice] init, supported=', this.isSupported(), 'enabled=', this.enabled);
  },

  isSupported() {
    return typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
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
      if (!this.isSupported()) {
        alert('Is device/WebView par TTS support nahi. Native voice baad mein.');
        return this.enabled;
      }
      this.speak('Voice on');
    }

    return this.enabled;
  },

  updateToggleUI() {
    const btn = document.getElementById('voiceToggleBtn');
    if (!btn) return;

    btn.classList.toggle('active', this.enabled);
    btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    btn.title = this.enabled ? 'Voice ON' : 'Voice OFF';

    // CSS na ho to bhi dikhe
    if (this.enabled) {
      btn.style.color = '#a78bfa';
      btn.style.background = 'rgba(167, 139, 250, 0.2)';
    } else {
      btn.style.color = '';
      btn.style.background = '';
    }
  },

  stop() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.speaking = false;
  },

  speak(text) {
    if (!this.enabled) return;
    if (!text || !String(text).trim()) return;

    if (!this.isSupported()) {
      console.warn('[AiraVoice] TTS not supported');
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
    u.rate = 1;
    u.pitch = 1;

    u.onstart = () => { this.speaking = true; };
    u.onend = () => { this.speaking = false; };
    u.onerror = (ev) => {
      this.speaking = false;
      console.warn('[AiraVoice] speak error', ev);
    };

    const run = () => {
      try {
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn('[AiraVoice] speak failed', e);
      }
    };

    // Android: voices kabhi late load
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.onvoiceschanged = null;
        run();
      };
      setTimeout(run, 300);
    } else {
      setTimeout(run, 50);
    }
  }
};

window.AiraVoice = AiraVoice;
