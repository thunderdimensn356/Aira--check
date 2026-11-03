/**
 * chat.js
 * persist | YT search | Google open+search | click/type/live | cursor on/off
 */

const AiraChat = {
  conversationHistory: [],
  apiKeys: [],
  currentKeyIndex: 0,
  modelRotator: null,
  writeMode: 'hinglish',

  APP_PACKAGES: {
    youtube: 'com.google.android.youtube',
    yt: 'com.google.android.youtube',
    chrome: 'com.android.chrome',
    google: 'com.google.android.googlequicksearchbox',
    'google app': 'com.google.android.googlequicksearchbox',
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
    music: 'com.spotify.music',
    pw: 'xyz.penpencil.physicswala',
    'physics wallah': 'xyz.penpencil.physicswala',
    physicswallah: 'xyz.penpencil.physicswala',
    phonepe: 'com.phonepe.app',
    paytm: 'net.one97.paytm',
    gpay: 'com.google.android.apps.nbu.paisa.user',
    truecaller: 'com.truecaller',
    hotstar: 'in.startv.hotstar',
    jio: 'com.jio.media.ondemand',
    amazon: 'in.amazon.mShop.android.shopping',
    flipkart: 'com.flipkart.android',
    netflix: 'com.netflix.mediaclient'
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

    const wm = localStorage.getItem('aira_write_mode');
    if (wm === 'hindi' || wm === 'english' || wm === 'hinglish') {
      this.writeMode = wm;
    }

    if (window.AiraAccess) {
      AiraAccess.onLiveText = (text) => this.handleLiveUtterance(text);
    }

    this.loadSettings().then(() => this.restoreChat());
  },

  persistChat() {
    try {
      localStorage.setItem(
        'aira_chat_history',
        JSON.stringify(this.conversationHistory.slice(-40))
      );
    } catch (e) {}
  },

  restoreChat() {
    try {
      const raw = localStorage.getItem('aira_chat_history');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          this.conversationHistory = arr;
          if (typeof AiraUI.clearMessages === 'function') {
            AiraUI.clearMessages();
          }
          arr.forEach((m) => {
            const text = m.parts && m.parts[0] ? m.parts[0].text : '';
            if (!text || String(text).startsWith('[Screen share]')) return;
            AiraUI.addMessage(text, m.role === 'user');
          });
          return;
        }
      }
    } catch (e) {}
    AiraUI.addMessage("Hi, I'm Aira. How can I support you today?", false);
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
      'screen pe', 'screen par', 'screen per', 'on my screen', 'on the screen', 'on screen',
      'look at screen', 'look at my screen', 'describe screen',
      'what is on my screen', "what's on my screen", 'whats on my screen',
      'what do you see', 'what can you see', 'screenshot', 'screen dekho', 'screen dekh',
      'dekh ke bata', 'dekh ke bol', 'dekho kya', 'kya dikh', 'kya dikha',
      'kya chal raha', 'kya chal rha', 'konsa app', 'kaun sa app', 'kaunsa app', 'which app',
      'kya khula', 'kya open hai', 'kya chal raha hai', 'display pe', 'display par',
      'ye kya hai screen', 'ab kya hai'
    ];

    for (let i = 0; i < en.length; i++) {
      if (t.includes(en[i])) return true;
    }

    if (t === 'dekh' || t === 'look' || t === 'see') return true;

    const hi = [
      'स्क्रीन', 'स्क्रिन', 'स्क्रीनशॉट', 'देख के बता', 'देख के बोल', 'देखो क्या',
      'क्या दिख', 'क्या चल', 'क्या खुला', 'कौन सा ऐप', 'कौनसा ऐप', 'कौन सा एप',
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
        return { name: 'YouTube', pkg: this.APP_PACKAGES.youtube };
      }
    }

    if (
      (t === 'google' || t === 'open google' || t === 'google kholo' || t === 'google khol') &&
      !t.includes('chrome') &&
      !t.includes('search')
    ) {
      return { name: 'Google', pkg: this.APP_PACKAGES.google };
    }

    if (
      /\bgoogle\b/.test(t) &&
      (t.includes('open') || t.includes('kholo') || t.includes('khol')) &&
      !t.includes('chrome') &&
      !t.includes('search')
    ) {
      return { name: 'Google', pkg: this.APP_PACKAGES.google };
    }

    if (
      (t.includes('pw') || t.includes('physics wallah') || t.includes('physicswallah')) &&
      (t.includes('open') || t.includes('kholo') || t.includes('khol') || t === 'pw')
    ) {
      return { name: 'PW', pkg: this.APP_PACKAGES.pw };
    }

    const entries = Object.keys(this.APP_PACKAGES);

    for (let i = 0; i < entries.length; i++) {
      const key = entries[i];

      if (key === 'yt' || key === 'youtube' || key === 'google' || key === 'google app') {
        continue;
      }

      if (
        t === key ||
        t === 'open ' + key ||
        t === key + ' kholo' ||
        t === key + ' open' ||
        t.includes('open ' + key) ||
        t.includes(key + ' kholo') ||
        t.includes(key + ' khol')
      ) {
        return {
          name: key.charAt(0).toUpperCase() + key.slice(1),
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
        await new Promise((r) => setTimeout(r, 2200));
        await this.handleLookAtScreen(
          app.name + ' open hai. Screen par ab kya dikh raha hai? Short mein batao.'
        );
      }
    } catch (e) {
      AiraUI.addMessage(app.name + ' open nahi ho paya.', false);
      this.speak(app.name + ' open nahi ho paya.');
    }

    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  async youtubeSearch(query) {
    const btn = AiraUI.els.sendBtn;
    btn.disabled = true;

    const q = (query || '').trim();

    if (!q) {
      btn.disabled = false;
      return;
    }

    const ytPkg = this.APP_PACKAGES.youtube;
    AiraUI.addMessage('YouTube pe search: ' + q, false);

    const opened = await AiraAccess.openApp(ytPkg);

    if (!opened) {
      AiraUI.addMessage('YouTube open nahi hua.', false);
      this.speak('YouTube open nahi hua.');
      btn.disabled = false;
      return;
    }

    await new Promise((r) => setTimeout(r, 2000));

    const focusSearchField = async () => {
      let ok = await AiraAccess.clickByText('Search YouTube');

      if (!ok) {
        const c = await AiraAccess.findCenterByText('Search YouTube');
        if (c) ok = await AiraAccess.clickAt(c.x, c.y);
      }

      return ok;
    };

    let onSearchUi = await focusSearchField();

    if (!onSearchUi) {
      let clicked = await AiraAccess.clickTarget('search', ytPkg);

      if (!clicked) {
        const c = await AiraAccess.findCenterByText('Search YouTube');
        if (c) clicked = await AiraAccess.clickAt(c.x, c.y);
      }

      if (!clicked) clicked = await AiraAccess.clickByText('Search');

      if (!clicked) {
        const c2 = await AiraAccess.findCenterByText('Search');
        if (c2) clicked = await AiraAccess.clickAt(c2.x, c2.y);
      }

      if (!clicked) {
        AiraUI.addMessage('Search UI nahi khuli.', false);
        this.speak('Search UI nahi khuli.');
        btn.disabled = false;
        return;
      }

      await new Promise((r) => setTimeout(r, 1000));
      await focusSearchField();
    }

    await new Promise((r) => setTimeout(r, 400));

    const typed = await AiraAccess.typeText(q);

    if (!typed) {
      AiraUI.addMessage('Type nahi hua. Box pe: type ' + q, false);
      this.speak('Type nahi hua.');
      btn.disabled = false;
      return;
    }

    AiraUI.addMessage('Search type ho gaya: ' + q, false);
    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  async googleSearch(query) {
    const btn = AiraUI.els.sendBtn;
    btn.disabled = true;

    const q = (query || '').trim();

    if (!q) {
      btn.disabled = false;
      return;
    }

    AiraUI.addMessage('Google pe search: ' + q, false);

    let opened = await AiraAccess.openApp(this.APP_PACKAGES.google);
    let usedChrome = false;

    if (!opened) {
      opened = await AiraAccess.openApp(this.APP_PACKAGES.chrome);
      usedChrome = true;

      if (!opened) {
        AiraUI.addMessage('Google / Chrome open nahi hua.', false);
        this.speak('Open nahi hua.');
        btn.disabled = false;
        return;
      }

      AiraUI.addMessage('Google app nahi mili — Chrome use.', false);
    }

    await new Promise((r) => setTimeout(r, 2500));

    const tryFocus = async (label) => {
      let ok = await AiraAccess.clickByText(label);

      if (!ok) {
        const c = await AiraAccess.findCenterByText(label);
        if (c) ok = await AiraAccess.clickAt(c.x, c.y);
      }

      return ok;
    };

    let focused =
      (await tryFocus('Search or type URL')) ||
      (await tryFocus('Search Google')) ||
      (await tryFocus('Google Search')) ||
      (await tryFocus('Search'));

    if (!focused) {
      AiraUI.addMessage('Search box nahi mila. Bar pe: type ' + q, false);
      this.speak('Search box nahi mila.');
      btn.disabled = false;
      return;
    }

    await new Promise((r) => setTimeout(r, 800));

    const typed = await AiraAccess.typeText(q);

    if (!typed) {
      AiraUI.addMessage('Type nahi hua. Box pe: type ' + q, false);
      this.speak('Type nahi hua.');
      btn.disabled = false;
      return;
    }

    AiraUI.addMessage(
      (usedChrome ? 'Chrome' : 'Google') + ' search type: ' + q,
      false
    );

    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  parseApiKeys(rawText) {
    if (!rawText) return [];

    const keys = [];
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

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
      AiraUI.setEngineStatus(
        'Keys: ' + this.apiKeys.length + ' | ' + this.modelRotator.getCurrentModel(),
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
        'System: ' + this.apiKeys.length + ' API key(s) saved.',
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
      if (photo) AiraUI.addImageMessage(photo, null);
      return;
    }

    if (action === 'OPEN_TERMINAL') {
      AiraUI.openTerminal();
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
    const base =
      window.AIRA_PERSONA && AIRA_PERSONA.getPrompt()
        ? AIRA_PERSONA.getPrompt()
        : 'You are Aira, a helpful companion.';

    const now = new Date();

    const timeBlock =
      '\n\nCURRENT TIME:\nDay: ' +
      now.toLocaleDateString('en-IN', { weekday: 'long' }) +
      '\nDate: ' +
      now.toLocaleDateString('en-IN') +
      '\nTime: ' +
      now.toLocaleTimeString('en-IN') +
      '\n';

    let langBlock = '\n\nREPLY LANGUAGE / SCRIPT:\n';

    if (this.writeMode === 'hindi') {
      langBlock += '- Hindi Devanagari only.\n';
    } else if (this.writeMode === 'english') {
      langBlock += '- English only.\n';
    } else {
      langBlock += '- Default Hinglish (Roman).\n';
    }

    return base + timeBlock + langBlock;
  },

  // GEMINI TEXT API
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
          // FIXED API URL
          const url =
            'https://generativelanguage.googleapis.com/v1beta/models/' +
            encodeURIComponent(model) +
            ':generateContent?key=' +
            encodeURIComponent(apiKey);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: this.getSystemPromptWithTime() }]
              },
              contents: this.conversationHistory.slice(-10)
            })
          });

          let data;

          try {
            data = await response.json();
          } catch (e) {
            throw new Error('Invalid API response (' + response.status + ')');
          }

          if (
            response.ok &&
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text
          ) {
            return {
              text: data.candidates[0].content.parts[0].text.trim()
            };
          }

          const errMsg =
            (data && data.error && data.error.message) ||
            ('HTTP ' + response.status);

          if (
            response.status === 503 ||
            /high demand|overloaded|unavailable/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (
            response.status === 429 ||
            /quota|rate limit|resource_exhausted/i.test(errMsg)
          ) {
            break;
          }

          if (
            response.status === 404 ||
            /not found|not supported/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (
            [400, 401, 403].indexOf(response.status) !== -1 &&
            /api key|permission|unauthorized|forbidden/i.test(errMsg)
          ) {
            break;
          }

          return { error: errMsg };

        } catch (err) {
          console.error(err);
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

  // GEMINI VISION API
  async callGeminiVision(base64Jpeg, userText) {
    if (this.apiKeys.length === 0) {
      return { error: 'No API key configured. Open Settings → API.' };
    }

    const prompt =
      (userText && userText.trim()) ||
      'Describe what is on the screen.';

    const totalKeys = this.apiKeys.length;
    const totalModels = this.modelRotator.count() || 8;

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const apiKey = this.apiKeys[this.currentKeyIndex];

      for (let modelAttempt = 0; modelAttempt < totalModels; modelAttempt++) {
        const model = this.modelRotator.getCurrentModel();

        try {
          // FIXED API URL
          const url =
            'https://generativelanguage.googleapis.com/v1beta/models/' +
            encodeURIComponent(model) +
            ':generateContent?key=' +
            encodeURIComponent(apiKey);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{
                  text:
                    this.getSystemPromptWithTime() +
                    '\n\nYou can see a screenshot. Describe accurately. Do not invent UI.'
                }]
              },
              contents: [{
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Jpeg
                    }
                  }
                ]
              }]
            })
          });

          let data;

          try {
            data = await response.json();
          } catch (e) {
            throw new Error('Invalid API response (' + response.status + ')');
          }

          if (
            response.ok &&
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text
          ) {
            return {
              text: data.candidates[0].content.parts[0].text.trim()
            };
          }

          const errMsg =
            (data && data.error && data.error.message) ||
            ('HTTP ' + response.status);

          if (
            response.status === 503 ||
            /high demand|overloaded|not found|not supported/i.test(errMsg)
          ) {
            this.modelRotator.next();
            continue;
          }

          if (response.status === 429 || /quota/i.test(errMsg)) {
            break;
          }

          return { error: errMsg };

        } catch (err) {
          console.error(err);
          this.modelRotator.next();
        }
      }

      this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
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
        msg = 'Accessibility ON karo (Settings → Accessibility → Aira).';
      } else if (shot.error === 'android11-required') {
        msg = 'Screenshot ke liye Android 11+ chahiye.';
      } else if (shot.error) {
        msg = 'Screenshot fail: ' + shot.error;
      }

      AiraUI.addMessage(msg, false);
      this.speak(msg);

      btn.disabled = false;
      return;
    }

    const result = await this.callGeminiVision(shot.base64, userText);

    AiraUI.hideTyping();

    if (result.text) {
      AiraUI.addMessage(result.text, false);
      this.speak(result.text);

      this.conversationHistory.push({
        role: 'user',
        parts: [{
          text: '[Screen share] ' + (userText || 'What is on my screen?')
        }]
      });

      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: result.text }]
      });

      this.persistChat();

    } else {
      AiraUI.addMessage(
        'Error: ' + (result.error || 'Vision failed'),
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

    // CURSOR ON / OFF
    if (
      cmd === 'cursor on' ||
      cmd === 'cursor on karo' ||
      cmd === 'cursor dikhao' ||
      cmd === 'show cursor'
    ) {
      input.value = '';

      const r = AiraAccess.showCursor();
      let msg;

      if (r.ok) {
        msg = 'Cursor ON. Right = joystick, Left = L/R click.';
      } else if (r.error === 'need-overlay-permission') {
        msg = 'Display over other apps ON karo, phir "cursor on".';
      } else {
        msg = 'Cursor start nahi hua: ' + (r.error || 'unknown');
      }

      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }

    if (
      cmd === 'cursor off' ||
      cmd === 'cursor band' ||
      cmd === 'hide cursor' ||
      cmd === 'cursor hide'
    ) {
      input.value = '';
      AiraAccess.hideCursor();

      AiraUI.addMessage('Cursor OFF.', false);
      this.speak('Cursor OFF.');
      return true;
    }

    // YOUTUBE SEARCH
    {
      let q = null;

      const m =
        cmd.match(/^(?:yt|youtube)\s+pe\s+search\s+(?:karo\s+)?(.+)$/i) ||
        cmd.match(/^youtube\s+search\s*[:\-]?\s*(.+)$/i) ||
        cmd.match(/^yt\s+search\s*[:\-]?\s*(.+)$/i) ||
        cmd.match(/^search\s+on\s+youtube\s+(.+)$/i);

      if (m && m[1]) q = m[1].trim();

      if (q) {
        input.value = '';
        await this.youtubeSearch(q);
        return true;
      }
    }

    // GOOGLE SEARCH
    {
      let q = null;

      const m =
        cmd.match(/^(?:google)\s+pe\s+search\s+(?:karo\s+)?(.+)$/i) ||
        cmd.match(/^google\s+search\s*[:\-]?\s*(.+)$/i) ||
        cmd.match(/^open\s+google\s+search\s+(.+)$/i) ||
        cmd.match(/^search\s+on\s+google\s+(.+)$/i);

      if (m && m[1]) q = m[1].trim();

      if (q) {
        input.value = '';
        await this.googleSearch(q);
        return true;
      }
    }

    // OPEN GOOGLE
    if (
      cmd === 'open google' ||
      cmd === 'google kholo' ||
      cmd === 'google khol' ||
      cmd === 'google open'
    ) {
      input.value = '';
      btn.disabled = true;

      let ok = await AiraAccess.openApp(this.APP_PACKAGES.google);

      if (!ok) {
        ok = await AiraAccess.openApp(this.APP_PACKAGES.chrome);

        if (ok) {
          AiraUI.addMessage('Google app nahi mili — Chrome open.', false);
          this.speak('Chrome open.');
        } else {
          AiraUI.addMessage('Google / Chrome nahi khul paye.', false);
          this.speak('Open fail.');
        }
      } else {
        AiraUI.addMessage('Google open kar diya.', false);
        this.speak('Google open.');
      }

      btn.disabled = false;
      input.focus();
      return true;
    }

    // MEMORY SUMMARY
    if (
      cmd === 'yaad dikhao' ||
      cmd === 'memory dikhao' ||
      cmd.includes('kya yaad')
    ) {
      input.value = '';

      const sum =
        window.AiraMemory && AiraMemory.summary
          ? AiraMemory.summary()
          : 'Memory module nahi mila (aira_memory.js).';

      AiraUI.addMessage(sum, false);
      return true;
    }

    // REMEMBER COORDINATES
    {
      const mAt = cmd.match(
        /dhyan\s+rakh(?:ana|na|o)?\s+(\w+)\s+at\s+(\d+)\s+(\d+)/i
      );

      if (mAt && window.AiraMemory) {
        input.value = '';

        const label = mAt[1];
        const x = parseInt(mAt[2], 10);
        const y = parseInt(mAt[3], 10);

        const app =
          label.toLowerCase() === 'search'
            ? this.APP_PACKAGES.youtube
            : '*';

        const r = AiraMemory.remember({
          label: label,
          app: app,
          x: x,
          y: y,
          matchText: label === 'search' ? 'Search' : label,
          note: 'trained coords'
        });

        const msg = r.ok
          ? 'Yaad rakha: ' + label + ' @(' + x + ',' + y + ')'
          : 'Yaad nahi rakh payi.';

        AiraUI.addMessage(msg, false);
        this.speak(msg);
        return true;
      }
    }

    // AUTOMATIC MEMORY
    if (
      window.AiraMemory &&
      (cmd.startsWith('dhyan rakh') || cmd.startsWith('dhyan rakho'))
    ) {
      const rest = cmd.replace(/^dhyan\s+rakh(?:ana|na|o)?\s*/i, '').trim();

      if (rest && rest.indexOf(' at ') === -1) {
        input.value = '';

        const label = rest.split(/\s+/)[0] || 'search';

        const center = await AiraAccess.findCenterByText(
          label === 'search' ? 'Search' : label
        );

        if (center) {
          AiraMemory.remember({
            label: label,
            app: label.toLowerCase() === 'search'
              ? this.APP_PACKAGES.youtube
              : '*',
            x: center.x,
            y: center.y,
            matchText: label === 'search' ? 'Search' : label,
            note: 'auto bounds'
          });

          AiraUI.addMessage(
            'Yaad rakha (auto): ' + label + ' @(' + center.x + ',' + center.y + ')',
            false
          );

        } else {
          AiraUI.addMessage(
            'Screen pe "' + label + '" nahi mila.',
            false
          );
        }

        return true;
      }
    }

    // HINDI MODE
    if (
      cmd.includes('hindi mein likh') ||
      cmd.includes('hindi mai likh') ||
      cmd.includes('hindi me likh') ||
      cmd.includes('हिंदी में लिख') ||
      cmd === 'hindi mode'
    ) {
      input.value = '';
      this.writeMode = 'hindi';
      localStorage.setItem('aira_write_mode', 'hindi');

      AiraUI.addMessage('Theek hai — ab Hindi mein likhungi.', false);
      this.speak('Theek hai — ab Hindi mein likhungi.');
      return true;
    }

    // ENGLISH MODE
    if (
      cmd.includes('english mein likh') ||
      cmd.includes('english mai likh') ||
      cmd.includes('english me likh') ||
      cmd.includes('in english') ||
      cmd === 'english mode'
    ) {
      input.value = '';
      this.writeMode = 'english';
      localStorage.setItem('aira_write_mode', 'english');

      AiraUI.addMessage('Okay — I will write in English now.', false);
      this.speak('Okay — I will write in English now.');
      return true;
    }

    // HINGLISH MODE
    if (
      cmd.includes('hinglish mein likh') ||
      cmd.includes('hinglish mai likh') ||
      cmd.includes('hinglish me likh') ||
      cmd.includes('roman mein likh') ||
      cmd === 'hinglish mode'
    ) {
      input.value = '';
      this.writeMode = 'hinglish';
      localStorage.setItem('aira_write_mode', 'hinglish');

      AiraUI.addMessage('Theek — ab Hinglish mein likhungi.', false);
      this.speak('Theek — ab Hinglish mein likhungi.');
      return true;
    }

    // LIVE MODE ON
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
        msg = 'Live mode ON. Band: "live band".';
      } else if (r.error === 'need-overlay-permission') {
        msg = 'Display over other apps ON karo, phir "stay live".';
      } else {
        msg = 'Live start nahi hua: ' + (r.error || 'unknown');
      }

      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }

    // LIVE MODE OFF
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

      AiraUI.addMessage('Live mode OFF.', false);
      this.speak('Live mode OFF.');
      return true;
    }

    // CLICK COMMAND
    {
      let clickTarget = null;
      const c = cmd.trim();

      const m =
        c.match(/^click\s+(.+)$/i) ||
        c.match(/^(.+?)\s+pe\s+click(?:\s+karo)?$/i) ||
        c.match(/^(.+?)\s+par\s+click(?:\s+karo)?$/i) ||
        c.match(/^(.+?)\s+dabao$/i) ||
        c.match(/^dabao\s+(.+)$/i);

      if (m && m[1]) {
        clickTarget = m[1].replace(/["']/g, '').trim();
      }

      if (clickTarget && clickTarget.length > 0 && clickTarget.length < 40) {
        input.value = '';
        btn.disabled = true;

        try {
          const ok = await AiraAccess.clickTarget(clickTarget);

          const msg = ok
            ? '"' + clickTarget + '" pe click kar diya.'
            : '"' + clickTarget + '" nahi mila.';

          AiraUI.addMessage(msg, false);
          this.speak(msg);

        } catch (e) {
          AiraUI.addMessage('Click fail.', false);
        }

        btn.disabled = false;
        input.focus();
        return true;
      }
    }

    // TYPE COMMAND
    {
      let typeTextVal = null;
      const c = cmd.trim();

      const m =
        c.match(/^type\s+(.+)$/i) ||
        c.match(/^likh(?:o|e)?\s*[:\-]?\s*(.+)$/i) ||
        c.match(/^yahan\s+likh(?:o|e)?\s*[:\-]?\s*(.+)$/i) ||
        c.match(/^write\s+(.+)$/i);

      if (m && m[1]) {
        typeTextVal = m[1].trim();
      }

      if (typeTextVal) {
        input.value = '';
        btn.disabled = true;

        try {
          const ok = await AiraAccess.typeText(typeTextVal);

          AiraUI.addMessage(
            ok ? 'Type: ' + typeTextVal : 'Type nahi hua.',
            false
          );

        } catch (e) {
          AiraUI.addMessage('Type fail.', false);
        }

        btn.disabled = false;
        input.focus();
        return true;
      }
    }

    // OPEN APPS
    if (!(
      (cmd.includes('search') && (cmd.includes('yt') || cmd.includes('youtube'))) ||
      (cmd.includes('search') && cmd.includes('google'))
    )) {
      const app = this.resolveAppPackage(cmd);

      if (app) {
        const wantsOpen =
          cmd.includes('open') ||
          cmd.includes('kholo') ||
          cmd.includes('khol') ||
          cmd === 'yt' ||
          cmd === 'youtube' ||
          cmd === 'pw' ||
          cmd === 'google' ||
          cmd === app.name.toLowerCase() ||
          cmd.includes('youtube') ||
          cmd.includes(app.name.toLowerCase());

        if (wantsOpen) {
          input.value = '';
          await this.openAppByName(app, this.wantsLookToo(cmd));
          return true;
        }
      }
    }

    // OPEN TERMINAL
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
      AiraUI.addMessage('Terminal open kar diya.', false);
      return true;
    }

    // GO HOME
    if (cmd === 'go home' || cmd === 'home') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.goHome();
        AiraUI.addMessage(
          ok ? 'Home pe le aayi.' : 'Home nahi ja payi.',
          false
        );
      } catch (e) {}

      btn.disabled = false;
      return true;
    }

    // GO BACK
    if (cmd === 'go back' || cmd === 'back') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.goBack();
        AiraUI.addMessage(
          ok ? 'Back kar diya.' : 'Back nahi ho paya.',
          false
        );
      } catch (e) {}

      btn.disabled = false;
      return true;
    }

    // NOTIFICATIONS
    if (cmd === 'open notifications' || cmd === 'notifications') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.openNotifications();
        AiraUI.addMessage(
          ok ? 'Notifications open.' : 'Notifications nahi khule.',
          false
        );
      } catch (e) {}

      btn.disabled = false;
      return true;
    }

    // RECENTS
    if (cmd === 'open recents' || cmd === 'recents') {
      input.value = '';
      btn.disabled = true;

      try {
        const ok = await AiraAccess.openRecents();
        AiraUI.addMessage(
          ok ? 'Recents open.' : 'Recents nahi khule.',
          false
        );
      } catch (e) {}

      btn.disabled = false;
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

    if (await this.handleFastPath(cmd)) {
      this.persistChat();
      return;
    }

    if (this.isLookAtScreenRequest(text)) {
      input.value = '';
      input.style.height = 'auto';

      await this.handleLookAtScreen(text);
      return;
    }

    input.value = '';
    input.style.height = 'auto';
    btn.disabled = true;

    AiraUI.showTyping();

    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: text }]
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
        this.speak(reply);
      }

      if (action) {
        if (action === 'SHOW_SELF') {
          const photo = this.pickRandomSelfPhoto();
          if (photo) AiraUI.addImageMessage(photo, null);

        } else if (action === 'OPEN_TERMINAL') {
          AiraUI.openTerminal();

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
          const cap = this.pickRandomCaption();
          AiraUI.addImageMessage(photo, cap);
          this.speak(cap);
        } else {
          AiraUI.addMessage(
            'Error: ' + (result.error || 'fail'),
            false
          );
        }

      } else {
        if (
          this.conversationHistory.length &&
          this.conversationHistory[this.conversationHistory.length - 1].role === 'user'
        ) {
          this.conversationHistory.pop();
        }

        AiraUI.addMessage(
          'Error: ' + (result.error || 'fail'),
          false
        );
      }
    }

    this.persistChat();
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

        localStorage.removeItem('aira_chat_history');

        AiraUI.addMessage(
          "Hi, I'm Aira. How can I support you today?",
          false
        );
      }
    };
  }
};

window.AiraChat = AiraChat;
