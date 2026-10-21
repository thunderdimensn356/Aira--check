/**
 * chat.js
 * Gemini engine, API keys, device actions, show yourself
 * Depends on: persona.js, ui.js, model_rotator.js, aira_accessibility.js
 */

const AiraChat = {
  conversationHistory: [],
  apiKeys: [],
  currentKeyIndex: 0,
  modelRotator: null,

  SELF_PHOTOS: [
    'self/exercise.jpg',
    'self/image.jpg',
    'self/modern_look.png',
    'self/modern_look2.png',
    'self/neutral.png',
    'self/nuteral.png',
    'self/rani_dress.png',
    'self/ready.png'
  ],

  SELF_CAPTIONS: [
    'Yeh rahi main ✨',
    'Aise dikhti hoon aaj.',
    'Bas yahi look abhi.',
    'Pakad liya camera 😄',
    'Yeh lo, meri ek photo.',
    'Soft wala mood aaj.',
    'Ready look — kaisi lagi?',
    'Hidden folder se nikaali 😌'
  ],

  init() {
    this.modelRotator = new ModelRotator();
    this.bindSend();
    this.bindClear();
    this.bindSaveSettings();
    this.loadSettings().then(() => {
      AiraUI.addMessage("Hi, I'm Aira. How can I support you today?", false);
    });
  },

  pickRandomSelfPhoto() {
    if (!this.SELF_PHOTOS.length) return null;
    return this.SELF_PHOTOS[Math.floor(Math.random() * this.SELF_PHOTOS.length)];
  },

  pickRandomCaption() {
    return this.SELF_CAPTIONS[Math.floor(Math.random() * this.SELF_CAPTIONS.length)];
  },

  isShowYourselfRequest(text) {
    const t = (text || '').toLowerCase();
    return (
      t.includes('show yourself') ||
      t.includes('show me yourself') ||
      t.includes('apni photo') ||
      t.includes('apni tasveer') ||
      t.includes('how do you look') ||
      t.includes('dikhao apni') ||
      t.includes('your photo') ||
      t.includes('your picture') ||
      t.includes('selfie') ||
      t.includes('dikha khud') ||
      t.includes('kaisi dikhti') ||
      t.includes('doosari image')
    );
  },

  parseApiKeys(rawText) {
    if (!rawText) return [];
    const keys = [];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (let line of lines) {
      let key = line;
      if (line.includes('=')) {
        key = line.substring(line.indexOf('=') + 1).trim();
      }
      if (key) keys.push(key);
    }

    return keys;
  },

  updateEngineState() {
    if (this.apiKeys.length > 0) {
      const model = this.modelRotator.getCurrentModel();
      AiraUI.setEngineStatus(`Keys: ${this.apiKeys.length} | ${model}`, true);
    } else {
      AiraUI.setEngineStatus('No Key Configured', false);
    }
  },

  bindSaveSettings() {
    document.getElementById('saveSettingsBtn').onclick = async () => {
      const name = AiraUI.els.cfgName.value.trim() || 'Aira';
      AiraUI.setCompanionName(name);
      localStorage.setItem('aira_cfg_name', name);

      const rawKeys = AiraUI.els.cfgApiKeys.value;
      localStorage.setItem('aira_cfg_api', rawKeys);
      this.apiKeys = this.parseApiKeys(rawKeys);
      this.currentKeyIndex = 0;

      if (this.apiKeys.length > 0) {
        try {
          await this.modelRotator.init(this.apiKeys[0]);
        } catch (e) {
          console.error(e);
        }
      }

      this.updateEngineState();
      AiraUI.els.settingsModal.classList.remove('active');
      AiraUI.addMessage(`System: ${this.apiKeys.length} API key(s) saved.`, false);
    };
  },

  async loadSettings() {
    const name = localStorage.getItem('aira_cfg_name');

    if (name) {
      AiraUI.els.cfgName.value = name;
      AiraUI.setCompanionName(name);
    }

    const raw = localStorage.getItem('aira_cfg_api') || '';
    AiraUI.els.cfgApiKeys.value = raw;
    this.apiKeys = this.parseApiKeys(raw);

    if (this.apiKeys.length > 0) {
      try {
        await this.modelRotator.init(this.apiKeys[0]);
      } catch (e) {
        console.error(e);
      }
    }

    this.updateEngineState();
  },

  async runDeviceAction(action) {
    if (!action) return;

    if (action === 'SHOW_SELF') {
      const photo = this.pickRandomSelfPhoto();
      if (photo) AiraUI.addImageMessage(photo, null);
      return;
    }

    if (action.startsWith('OPEN_APP:')) {
      const pkg = action.replace('OPEN_APP:', '').trim();
      if (pkg) await AiraAccess.openApp(pkg);
    } else if (action === 'GO_HOME') {
      await AiraAccess.goHome();
    } else if (action === 'GO_BACK') {
      await AiraAccess.goBack();
    } else if (action === 'OPEN_NOTIFICATIONS') {
      await AiraAccess.openNotifications();
    } else if (action === 'OPEN_RECENTS') {
      await AiraAccess.openRecents();
    }
  },

  getSystemPromptWithTime() {
    const base = (window.AIRA_PERSONA && AIRA_PERSONA.getPrompt())
      ? AIRA_PERSONA.getPrompt()
      : 'You are Aira, a helpful companion.';

    const now = new Date();

    const timeBlock =
      `\n\nCURRENT TIME (use when user asks day/date):\n` +
      `Day: ${now.toLocaleDateString('en-IN', { weekday: 'long' })}\n` +
      `Date: ${now.toLocaleDateString('en-IN')}\n` +
      `Time: ${now.toLocaleTimeString('en-IN')}\n`;

    return base + timeBlock;
  },

  async callGemini() {
    if (this.apiKeys.length === 0) {
      return { error: 'No API key configured. Open Settings → API.' };
    }

    const totalKeys = this.apiKeys.length;
    const totalModels = this.modelRotator.count() || 8;

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const apiKey = this.apiKeys[this.currentKeyIndex];

      for (let modelAttempt = 0; modelAttempt < totalModels; modelAttempt++) {
        const model = this.modelRotator.getCurrentModel();

        try {
          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [
                  {
                    text: this.getSystemPromptWithTime()
                  }
                ]
              },
              contents: this.conversationHistory.slice(-10)
            })
          });

          let data;

          try {
            data = await response.json();
          } catch (e) {
            throw new Error(`Invalid API response (${response.status})`);
          }

          if (
            response.ok &&
            data.candidates?.[0]?.content?.parts?.[0]?.text
          ) {
            return {
              text: data.candidates[0].content.parts[0].text.trim()
            };
          }

          const errMsg = data?.error?.message || `HTTP ${response.status}`;

          console.warn(
            `Gemini error | key ${this.currentKeyIndex + 1} | model ${model}:`,
            errMsg
          );

          if (
            response.status === 503 ||
            /high demand/i.test(errMsg) ||
            /overloaded/i.test(errMsg) ||
            /unavailable/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (
            response.status === 429 ||
            /quota/i.test(errMsg) ||
            /rate limit/i.test(errMsg) ||
            /resource_exhausted/i.test(errMsg)
          ) {
            break;
          }

          if (
            response.status === 404 ||
            /not found/i.test(errMsg) ||
            /not supported/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403
          ) {
            if (
              /api key/i.test(errMsg) ||
              /permission/i.test(errMsg) ||
              /unauthorized/i.test(errMsg) ||
              /forbidden/i.test(errMsg)
            ) {
              break;
            }
          }

          return { error: errMsg };
        } catch (err) {
          console.error(`Request failed for model ${model}:`, err);
          this.modelRotator.next();
        }
      }

      this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
      this.modelRotator.reset();
    }

    return {
      error: 'All API keys and models failed. Please try again later.'
    };
  },

  async handleFastPath(cmd) {
    const input = AiraUI.els.userInput;
    const btn = AiraUI.els.sendBtn;

    if (cmd === 'open chrome' || cmd === 'chrome kholo') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.openApp('com.android.chrome');
        AiraUI.addMessage(
          ok
            ? 'Chrome open kar diya.'
            : 'Chrome nahi khul paya. Accessibility check karo.',
          false
        );
      } catch (e) {
        AiraUI.addMessage('Chrome open nahi ho paya.', false);
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    if (cmd === 'go home' || cmd === 'home') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.goHome();
        AiraUI.addMessage(
          ok
            ? 'Home pe le aayi.'
            : 'Home nahi ja payi. Accessibility check karo.',
          false
        );
      } catch (e) {
        AiraUI.addMessage('Home action nahi chal paya.', false);
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    if (cmd === 'go back' || cmd === 'back') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.goBack();
        AiraUI.addMessage(
          ok ? 'Back kar diya.' : 'Back nahi ho paya.',
          false
        );
      } catch (e) {
        AiraUI.addMessage('Back action nahi chal paya.', false);
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    if (cmd === 'open notifications' || cmd === 'notifications') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.openNotifications();
        AiraUI.addMessage(
          ok
            ? 'Notifications open kiye.'
            : 'Notifications nahi khul paye.',
          false
        );
      } catch (e) {
        AiraUI.addMessage('Notifications open nahi ho paye.', false);
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    if (cmd === 'open recents' || cmd === 'recents') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.openRecents();
        AiraUI.addMessage(
          ok
            ? 'Recents open kiye.'
            : 'Recents nahi khul paye.',
          false
        );
      } catch (e) {
        AiraUI.addMessage('Recents open nahi ho paye.', false);
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    return false;
  },

  async sendMessage() {
    const input = AiraUI.els.userInput;
    const btn = AiraUI.els.sendBtn;
    const text = input.value.trim();

    if (!text) return;

    AiraUI.addMessage(text, true);

    const cmd = text.toLowerCase().trim();

    if (await this.handleFastPath(cmd)) return;

    input.value = '';
    input.style.height = 'auto';
    btn.disabled = true;

    AiraUI.showTyping();

    this.conversationHistory.push({
      role: 'user',
      parts: [{ text }]
    });

    const result = await this.callGemini();

    AiraUI.hideTyping();

    if (result.text) {
      let reply = result.text;

      const actionMatch = reply.match(/\[\[ACTION:([^\]]+)\]\]/);
      let action = null;

      if (actionMatch) {
        action = actionMatch[1].trim();
        reply = reply.replace(/\[\[ACTION:[^\]]+\]\]/g, '').trim();
      }

      if (reply) {
        AiraUI.addMessage(reply, false);
      }

      if (action) {
        if (action === 'SHOW_SELF') {
          const photo = this.pickRandomSelfPhoto();

          if (photo) {
            AiraUI.addImageMessage(photo, null);
          }
        } else {
          await this.runDeviceAction(action);
        }
      }

      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: result.text }]
      });
    } else {
      if (this.isShowYourselfRequest(text)) {
        const photo = this.pickRandomSelfPhoto();

        if (photo) {
          AiraUI.addImageMessage(photo, this.pickRandomCaption());
        } else {
          AiraUI.addMessage(
            'Error: ' + (result.error || 'Something went wrong'),
            false
          );
        }
      } else {
        if (
          this.conversationHistory[
            this.conversationHistory.length - 1
          ]?.role === 'user'
        ) {
          this.conversationHistory.pop();
        }

        AiraUI.addMessage(
          'Error: ' + (result.error || 'Something went wrong'),
          false
        );
      }
    }

    this.updateEngineState();
    btn.disabled = false;
    input.focus();
  },

  bindSend() {
    AiraUI.els.sendBtn.onclick = () => this.sendMessage();

    AiraUI.els.userInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };
  },

  bindClear() {
    document.getElementById('clearChatBtn').onclick = () => {
      if (confirm('Clear all messages?')) {
        AiraUI.clearMessages();
        this.conversationHistory = [];

        AiraUI.addMessage(
          "Hi, I'm Aira. How can I support you today?",
          false
        );
      }
    };
  }
};

window.AiraChat = AiraChat;
