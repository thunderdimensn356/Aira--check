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

