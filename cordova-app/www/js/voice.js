/**
 * voice.js — TTS (AiraTts) + STT (AiraStt)
 *
 * Mic button:
 *  - OFF → tap = Voice ON (+ "Voice on")
 *  - ON  → tap = sunna shuru / band
 *  - long-press = Voice OFF
 */
const AiraVoice = {
  enabled: false,
  speaking: false,
  listening: false,

  init() {
    try {
      this.enabled = localStorage.getItem('aira_voice_on') === '1';
    } catch (e) {
      this.enabled = false;
    }
    this.updateToggleUI();
    this.bindMicButton();
  },

  hasTts() {
    return !!(window.AiraTts && typeof window.AiraTts.speak === 'function');
  },

  hasStt() {
    return !!(window.AiraStt && typeof window.AiraStt.startListening === 'function');
  },

  hasWebTts() {
    return typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
  },

  bindMicButton() {
    const btn = document.getElementById('voiceToggleBtn');
    if (!btn) return;

    let longTimer = null;
    let longFired = false;

    btn.onclick = null;

    btn.addEventListener('pointerdown', (e) => {
      longFired = false;
      longTimer = setTimeout(() => {
        longFired = true;
        this.setEnabled(false);
        this.stopListening();
      }, 650);
    });

    btn.addEventListener('pointerup', (e) => {
      if (longTimer) clearTimeout(longTimer);
      longTimer = null;
      if (longFired) return;
      this.onMicTap();
    });

    btn.addEventListener('pointerleave', () => {
      if (longTimer) clearTimeout(longTimer);
      longTimer = null;
    });
  },

  onMicTap() {
    if (!this.enabled) {
      this.setEnabled(true);
      if (this.hasTts() || this.hasWebTts()) {
        this.speak('Voice on. Mic se bolne ke liye dobara dabao.');
      } else {
        alert('TTS nahi mila. Naya APK install karo.');
      }
      return;
    }

    if (this.listening) {
      this.stopListening();
      return;
    }

    this.startListening();
  },

  setEnabled(on) {
    this.enabled = !!on;
    try {
      localStorage.setItem('aira_voice_on', this.enabled ? '1' : '0');
    } catch (e) {}
    if (!this.enabled) {
      this.stop();
      this.stopListening();
    }
    this.updateToggleUI();
  },

  updateToggleUI() {
    const btn = document.getElementById('voiceToggleBtn');
    if (!btn) return;

    btn.classList.toggle('active', this.enabled);
    btn.classList.toggle('listening', this.listening);
    btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');

    if (this.listening) {
      btn.title = 'Listening… (tap to stop)';
      btn.style.color = '#34d399';
      btn.style.background = 'rgba(52, 211, 153, 0.2)';
    } else if (this.enabled) {
      btn.title = 'Voice ON — tap to speak, long-press OFF';
      btn.style.color = '#a78bfa';
      btn.style.background = 'rgba(167, 139, 250, 0.2)';
    } else {
      btn.title = 'Voice OFF';
      btn.style.color = '';
      btn.style.background = '';
    }
  },

  stop() {
    try {
      if (this.hasTts()) window.AiraTts.stop();
    } catch (e) {}
    if (this.hasWebTts()) {
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

    if (this.hasTts()) {
      try {
        window.AiraTts.speak(clean);
        this.speaking = true;
        return;
      } catch (e) {
        console.warn('Native TTS failed', e);
      }
    }

    if (!this.hasWebTts()) return;

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'hi-IN';
    u.onend = () => { this.speaking = false; };
    u.onerror = () => { this.speaking = false; };
    this.speaking = true;
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch (e) { this.speaking = false; }
    }, 50);
  },

  startListening() {
    if (!this.hasStt()) {
      alert('Mic engine nahi mila. Naya APK (AiraStt) install karo.');
      return;
    }
    try {
      window.AiraStt.startListening();
    } catch (e) {
      console.warn(e);
      alert('Mic start nahi hua: ' + (e.message || e));
    }
  },

  stopListening() {
    this.listening = false;
    this.updateToggleUI();
    try {
      if (this.hasStt()) window.AiraStt.stopListening();
    } catch (e) {}
  },

  // --- callbacks from native AiraSttBridge ---

  onSttStart() {
    this.listening = true;
    this.updateToggleUI();
  },

  onSttEnd() {
    this.listening = false;
    this.updateToggleUI();
  },

  onSttError(code) {
    this.listening = false;
    this.updateToggleUI();
    console.warn('[STT]', code);
    if (code === 'mic-permission') {
      alert('Mic permission do: Settings → Apps → Aira → Microphone');
    }
  },

  onSttResult(text) {
    this.listening = false;
    this.updateToggleUI();

    text = (text || '').trim();
    if (!text) return;

    const input = document.getElementById('userInput');
    if (input) {
      input.value = text;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    if (window.AiraChat && typeof AiraChat.sendMessage === 'function') {
      AiraChat.sendMessage();
    }
  }
};

window.AiraVoice = AiraVoice;
