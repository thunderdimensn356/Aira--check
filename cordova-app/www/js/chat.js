/**
 * chat.js
 * Gemini + voice + screenshot + open app + open&look + stay-live (Step 6)
 */

const AiraChat = {
  conversationHistory: [],
  apiKeys: [],
  currentKeyIndex: 0,
  modelRotator: null,

  APP_PACKAGES: {
    youtube: 'com.google.android.youtube',
    yt: 'com.google.android.youtube',
    chrome: 'com.android.chrome',
    whatsapp: 'com.whatsapp',
    settings: 'com.android.settings',
    camera: 'com.android.camera',
    gallery: 'com.google.android.apps.photos',
    photos: 'com.google.android.apps.photos',
    gmail: 'com.google.android.gm',
    maps: 'com.google.android.apps.maps',
    instagram: 'com.instagram.android',
    facebook: 'com.facebook.katana',
    twitter: 'com.twitter.android',
    x: 'com.twitter.android',
    telegram: 'org.telegram.messenger',
    playstore: 'com.android.vending',
    'play store': 'com.android.vending',
    spotify: 'com.spotify.music',
    music: 'com.spotify.music'
  },

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

    if (window.AiraAccess) {
      AiraAccess.onLiveText = (text) => {
        this.handleLiveUtterance(text);
      };
    }

    this.loadSettings().then(() => {
      AiraUI.addMessage("Hi, I'm Aira. How can I support you today?", false);
    });
  },

  onScreenshotReady() {
    if (window.AiraAccess && typeof AiraAccess.onScreenshotReady === 'function') {
      AiraAccess.onScreenshotReady();
    }
  },

  async handleLiveUtterance(text) {
    text = (text || '').trim();
    if (!text || text.length < 2) return;

    const input = AiraUI.els.userInput;
    if (input) {
      input.value = text;
      input.style.height = 'auto';
    }

    await this.sendMessage();
  },

  speak(text) {
    if (window.AiraVoice && typeof AiraVoice.speak === 'function') {
      AiraVoice.speak(text);
    }
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

  isLookAtScreenRequest(text) {
    const raw = (text || '').trim();

    if (!raw) return false;

    const t = raw.toLowerCase();

    const looksLikeOpenOnly =
      (t.includes('open') || t.includes('kholo') || t.includes('khol')) &&
      !t.includes('dekh') &&
      !t.includes('screen') &&
      !t.includes('look') &&
      !t.includes('bata') &&
      !raw.includes('देख') &&
      !raw.includes('स्क्रीन');

    if (looksLikeOpenOnly) return false;

    const en = [
      'screen pe', 'screen par', 'screen per',
      'on my screen', 'on the screen', 'on screen',
      'look at screen', 'look at my screen', 'describe screen',
      'what is on my screen', "what's on my screen", 'whats on my screen',
      'what do you see', 'what can you see',
      'screenshot', 'screen dekho', 'screen dekh',
      'dekh ke bata', 'dekh ke bol', 'dekho kya',
      'kya dikh', 'kya dikha', 'kya chal raha', 'kya chal rha',
      'konsa app', 'kaun sa app', 'kaunsa app', 'which app',
      'kya khula', 'kya open hai', 'kya chal raha hai',
      'display pe', 'display par',
      'ye kya hai screen', 'ab kya hai'
    ];

    for (let i = 0; i < en.length; i++) {
      if (t.includes(en[i])) return true;
    }

    if (t === 'dekh' || t === 'look' || t === 'see') return true;

    const hi = [
      'स्क्रीन', 'स्क्रिन', 'स्क्रीनशॉट',
      'देख के बता', 'देख के बोल', 'देखो क्या',
      'क्या दिख', 'क्या चल', 'क्या खुला',
      'कौन सा ऐप', 'कौनसा ऐप', 'कौन सा एप',
      'डिस्प्ले', 'क्या दिख रहा', 'क्या चल रहा'
    ];

    for (let j = 0; j < hi.length; j++) {
      if (raw.includes(hi[j])) return true;
    }

    return false;
  },

  wantsLookToo(cmd) {
    const t = (cmd || '').toLowerCase();

    return (
      t.includes('screen') ||
      t.includes('dekh') ||
      t.includes('look') ||
      t.includes('bata') ||
      t.includes('describe') ||
      t.includes('स्क्रीन') ||
      t.includes('देख')
    );
  },

  resolveAppPackage(cmd) {
    const t = (cmd || '').toLowerCase().trim();

    if (t === 'yt' || t.includes('youtube') || /\byt\b/.test(t)) {
      if (
        t.includes('open') ||
        t.includes('kholo') ||
        t.includes('khol') ||
        t === 'yt' ||
        t === 'youtube' ||
        t.includes('youtube')
      ) {
        return {
          name: 'YouTube',
          pkg: this.APP_PACKAGES.youtube
        };
      }
    }

    const entries = Object.keys(this.APP_PACKAGES);

    for (let i = 0; i < entries.length; i++) {
      const key = entries[i];

      if (key === 'yt' || key === 'youtube') continue;

      if (
        t === key ||
        t === 'open ' + key ||
        t === key + ' kholo' ||
        t === key + ' open' ||
        t.includes('open ' + key) ||
        t.includes(key + ' kholo') ||
        t.includes(key + ' khol')
      ) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);

        return {
          name: label,
          pkg: this.APP_PACKAGES[key]
        };
      }
    }

    return null;
  },

  async openAppByName(app, alsoLook) {
    const btn = AiraUI.els.sendBtn;
    btn.disabled = true;

    try {
      const ok = await AiraAccess.openApp(app.pkg);

      const msg = ok
        ? app.name + ' open kar diya.'
        : app.name + ' nahi khul paya. App install / Accessibility check karo.';

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      if (ok && alsoLook) {
        await new Promise(function (r) {
          setTimeout(r, 2200);
        });

        await this.handleLookAtScreen(
          app.name + ' open hai. Screen par ab kya dikh raha hai? Short mein batao.'
        );
      }
    } catch (e) {
      const msg = app.name + ' open nahi ho paya.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
    }

    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  parseApiKeys(rawText) {
    if (!rawText) return [];

    const keys = [];

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

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

      AiraUI.setEngineStatus(
        `Keys: ${this.apiKeys.length} | ${model}`,
        true
      );
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

      AiraUI.addMessage(
        `System: ${this.apiKeys.length} API key(s) saved.`,
        false
      );
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

      if (photo) {
        AiraUI.addImageMessage(photo, null);
      }

      return;
    }

    if (action === 'OPEN_TERMINAL') {
      AiraUI.openTerminal();
      return;
    }

    if (action.startsWith('OPEN_APP:')) {
      const pkg = action.replace('OPEN_APP:', '').trim();

      if (pkg) {
        await AiraAccess.openApp(pkg);
      }
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
    const base =
      (window.AIRA_PERSONA && AIRA_PERSONA.getPrompt())
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
      return {
        error: 'No API key configured. Open Settings → API.'
      };
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
            throw new Error(
              `Invalid API response (${response.status})`
            );
          }

          if (
            response.ok &&
            data.candidates?.[0]?.content?.parts?.[0]?.text
          ) {
            return {
              text: data.candidates[0].content.parts[0].text.trim()
            };
          }

          const errMsg =
            data?.error?.message || `HTTP ${response.status}`;

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

          return {
            error: errMsg
          };
        } catch (err) {
          console.error(
            `Request failed for model ${model}:`,
            err
          );

          this.modelRotator.next();
        }
      }

      this.currentKeyIndex =
        (this.currentKeyIndex + 1) % totalKeys;

      this.modelRotator.reset();
    }

    return {
      error: 'All API keys and models failed. Please try again later.'
    };
  },

  async callGeminiVision(base64Jpeg, userText) {
    if (this.apiKeys.length === 0) {
      return {
        error: 'No API key configured. Open Settings → API.'
      };
    }

    const prompt =
      (userText && userText.trim()) ||
      'Describe what is on the screen. Be clear and helpful. Reply in the same language the user used if possible.';

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
                    text:
                      this.getSystemPromptWithTime() +
                      '\n\nYou can see a screenshot of the user device. Describe accurately. Do not invent UI that is not visible.'
                  }
                ]
              },

              contents: [
                {
                  role: 'user',

                  parts: [
                    {
                      text: prompt
                    },

                    {
                      inline_data: {
                        mime_type: 'image/jpeg',
                        data: base64Jpeg
                      }
                    }
                  ]
                }
              ]
            })
          });

          let data;

          try {
            data = await response.json();
          } catch (e) {
            throw new Error(
              `Invalid API response (${response.status})`
            );
          }

          if (
            response.ok &&
            data.candidates?.[0]?.content?.parts?.[0]?.text
          ) {
            return {
              text: data.candidates[0].content.parts[0].text.trim()
            };
          }

          const errMsg =
            data?.error?.message || `HTTP ${response.status}`;

          console.warn(
            'Vision error',
            model,
            errMsg
          );

          if (
            response.status === 503 ||
            /high demand/i.test(errMsg) ||
            /overloaded/i.test(errMsg) ||
            /not found/i.test(errMsg) ||
            /not supported/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (
            response.status === 429 ||
            /quota/i.test(errMsg)
          ) {
            break;
          }

          return {
            error: errMsg
          };
        } catch (err) {
          console.error(err);
          this.modelRotator.next();
        }
      }

      this.currentKeyIndex =
        (this.currentKeyIndex + 1) % totalKeys;

      this.modelRotator.reset();
    }

    return {
      error: 'Vision request failed on all keys/models.'
    };
  },

  async handleLookAtScreen(userText) {
    const btn = AiraUI.els.sendBtn;

    btn.disabled = true;
    AiraUI.showTyping();

    const shot = await AiraAccess.captureScreen();

    if (!shot.ok || !shot.base64) {
      AiraUI.hideTyping();

      let msg = 'Screenshot nahi le payi.';

      if (shot.error === 'no-service') {
        msg =
          'Accessibility ON karo (Settings → Accessibility → Aira), phir try karo.';
      } else if (shot.error === 'android11-required') {
        msg =
          'Screenshot ke liye Android 11+ chahiye.';
      } else if (shot.error) {
        msg =
          'Screenshot fail: ' + shot.error;
      }

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      btn.disabled = false;
      return;
    }

    const result =
      await this.callGeminiVision(
        shot.base64,
        userText
      );

    AiraUI.hideTyping();

    if (result.text) {
      AiraUI.addMessage(
        result.text,
        false
      );

      this.speak(result.text);

      this.conversationHistory.push({
        role: 'user',

        parts: [
          {
            text:
              '[Screen share] ' +
              (userText || 'What is on my screen?')
          }
        ]
      });

      this.conversationHistory.push({
        role: 'model',

        parts: [
          {
            text: result.text
          }
        ]
      });
    } else {
      const msg =
        'Error: ' +
        (result.error || 'Vision failed');

      AiraUI.addMessage(
        msg,
        false
      );
    }

    this.updateEngineState();

    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  async handleFastPath(cmd) {
    const input = AiraUI.els.userInput;
    const btn = AiraUI.els.sendBtn;

    // Step 6: stay live
    if (
      cmd === 'stay live' ||
      cmd === 'live on' ||
      cmd === 'live' ||
      cmd.includes('sunte raho') ||
      cmd.includes('sunti raho') ||
      cmd.includes('stay live') ||
      cmd.includes('live mode')
    ) {
      input.value = '';

      const r = AiraAccess.startLive();

      let msg;

      if (r.ok) {
        msg =
          'Live mode ON. Ab doosri app kholo — main sun rahi hoon. Band: "live band".';
      } else if (r.error === 'need-overlay-permission') {
        msg =
          'Display over other apps ON karo (settings khul gayi), phir phir se "stay live" bolo.';
      } else {
        msg =
          'Live start nahi hua: ' +
          (r.error || 'unknown') +
          '. Naya APK / permission check karo.';
      }

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      return true;
    }

    if (
      cmd === 'live band' ||
      cmd === 'stop live' ||
      cmd === 'live off' ||
      cmd.includes('live band') ||
      cmd.includes('suna band') ||
      cmd.includes('sunna band')
    ) {
      input.value = '';

      AiraAccess.stopLive();

      const msg = 'Live mode OFF.';

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      return true;
    }

    // Step 3 + 4: open app, optional screen look
    const app = this.resolveAppPackage(cmd);

    if (app) {
      const wantsOpen =
        cmd.includes('open') ||
        cmd.includes('kholo') ||
        cmd.includes('khol') ||
        cmd === 'yt' ||
        cmd === 'youtube' ||
        cmd === app.name.toLowerCase() ||
        cmd.includes('youtube') ||
        cmd.includes(app.name.toLowerCase());

      if (wantsOpen) {
        input.value = '';

        const alsoLook =
          this.wantsLookToo(cmd);

        await this.openAppByName(
          app,
          alsoLook
        );

        return true;
      }
    }

    if (
      cmd === 'open terminal' ||
      cmd === 'terminal kholo' ||
      cmd === 'terminal open' ||
      cmd === 'terminal' ||
      cmd === 'shell kholo' ||
      cmd === 'termux kholo'
    ) {
      input.value = '';

      AiraUI.openTerminal();

      const msg =
        'Terminal open kar diya.';

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      return true;
    }

    if (
      cmd === 'go home' ||
      cmd === 'home'
    ) {
      input.value = '';
      btn.disabled = true;

      try {
        const ok =
          await AiraAccess.goHome();

        const msg = ok
          ? 'Home pe le aayi.'
          : 'Home nahi ja payi. Accessibility check karo.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      } catch (e) {
        const msg =
          'Home action nahi chal paya.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      }

      btn.disabled = false;
      input.focus();

      return true;
    }

    if (
      cmd === 'go back' ||
      cmd === 'back'
    ) {
      input.value = '';
      btn.disabled = true;

      try {
        const ok =
          await AiraAccess.goBack();

        const msg = ok
          ? 'Back kar diya.'
          : 'Back nahi ho paya.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      } catch (e) {
        const msg =
          'Back action nahi chal paya.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      }

      btn.disabled = false;
      input.focus();

      return true;
    }

    if (
      cmd === 'open notifications' ||
      cmd === 'notifications'
    ) {
      input.value = '';
      btn.disabled = true;

      try {
        const ok =
          await AiraAccess.openNotifications();

        const msg = ok
          ? 'Notifications open kiye.'
          : 'Notifications nahi khul paye.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      } catch (e) {
        const msg =
          'Notifications open nahi ho paye.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      }

      btn.disabled = false;
      input.focus();

      return true;
    }

    if (
      cmd === 'open recents' ||
      cmd === 'recents'
    ) {
      input.value = '';
      btn.disabled = true;

      try {
        const ok =
          await AiraAccess.openRecents();

        const msg = ok
          ? 'Recents open kiye.'
          : 'Recents nahi khul paye.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
      } catch (e) {
        const msg =
          'Recents open nahi ho paye.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
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

    AiraUI.addMessage(
      text,
      true
    );

    const cmd =
      text.toLowerCase().trim();

    if (
      await this.handleFastPath(cmd)
    ) {
      return;
    }

    if (
      this.isLookAtScreenRequest(text)
    ) {
      input.value = '';
      input.style.height = 'auto';

      await this.handleLookAtScreen(
        text
      );

      return;
    }

    input.value = '';
    input.style.height = 'auto';
    btn.disabled = true;

    AiraUI.showTyping();

    this.conversationHistory.push({
      role: 'user',
      parts: [{ text }]
    });

    const result =
      await this.callGemini();

    AiraUI.hideTyping();

    if (result.text) {
      let reply = result.text;

      const actionMatch =
        reply.match(
          /\[\[ACTION:([^\]]+)\]\]/
        );

      let action = null;

      if (actionMatch) {
        action =
          actionMatch[1].trim();

        reply =
          reply.replace(
            /\[\[ACTION:[^\]]+\]\]/g,
            ''
          ).trim();
      }

      if (reply) {
        AiraUI.addMessage(
          reply,
          false
        );

        this.speak(reply);
      }

      if (action) {
        if (
          action === 'SHOW_SELF'
        ) {
          const photo =
            this.pickRandomSelfPhoto();

          if (photo) {
            AiraUI.addImageMessage(
              photo,
              null
            );
          }
        } else if (
          action === 'OPEN_TERMINAL'
        ) {
          AiraUI.openTerminal();
        } else {
          await this.runDeviceAction(
            action
          );
        }
      }

      this.conversationHistory.push({
        role: 'model',

        parts: [
          {
            text: result.text
          }
        ]
      });
    } else {
      if (
        this.isShowYourselfRequest(text)
      ) {
        const photo =
          this.pickRandomSelfPhoto();

        if (photo) {
          const cap =
            this.pickRandomCaption();

          AiraUI.addImageMessage(
            photo,
            cap
          );

          this.speak(cap);
        } else {
          AiraUI.addMessage(
            'Error: ' +
              (result.error ||
                'Something went wrong'),
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
          'Error: ' +
            (result.error ||
              'Something went wrong'),
          false
        );
      }
    }

    this.updateEngineState();

    btn.disabled = false;
    input.focus();
  },

  bindSend() {
    AiraUI.els.sendBtn.onclick =
      () => this.sendMessage();

    AiraUI.els.userInput.onkeydown =
      (e) => {
        if (
          e.key === 'Enter' &&
          !e.shiftKey
        ) {
          e.preventDefault();
          this.sendMessage();
        }
      };
  },

  bindClear() {
    document.getElementById(
      'clearChatBtn'
    ).onclick = () => {
      if (
        confirm('Clear all messages?')
      ) {
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
