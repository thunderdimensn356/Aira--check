/**
 * chat.js
 * + writeMode + live + click/type + memory train + yt search chain
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
    'self/exercise.jpg', 'self/image.jpg', 'self/modern_look.png',
    'self/modern_look2.png', 'self/neutral.png', 'self/nuteral.png',
    'self/rani_dress.png', 'self/ready.png'
  ],

  SELF_CAPTIONS: [
    'Yeh rahi main ✨', 'Aise dikhti hoon aaj.', 'Bas yahi look abhi.',
    'Pakad liya camera 😄', 'Yeh lo, meri ek photo.', 'Soft wala mood aaj.',
    'Ready look — kaisi lagi?', 'Hidden folder se nikaali 😌'
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
      t.includes('show yourself') || t.includes('show me yourself') ||
      t.includes('apni photo') || t.includes('apni tasveer') ||
      t.includes('how do you look') || t.includes('dikhao apni') ||
      t.includes('your photo') || t.includes('your picture') ||
      t.includes('selfie') || t.includes('dikha khud') ||
      t.includes('kaisi dikhti') || t.includes('doosari image')
    );
  },

  isLookAtScreenRequest(text) {
    const raw = (text || '').trim();
    if (!raw) return false;
    const t = raw.toLowerCase();
    const looksLikeOpenOnly =
      (t.includes('open') || t.includes('kholo') || t.includes('khol')) &&
      !t.includes('dekh') && !t.includes('screen') && !t.includes('look') &&
      !t.includes('bata') && !raw.includes('देख') && !raw.includes('स्क्रीन');
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
    for (let i = 0; i < en.length; i++) if (t.includes(en[i])) return true;
    if (t === 'dekh' || t === 'look' || t === 'see') return true;

    const hi = [
      'स्क्रीन', 'स्क्रिन', 'स्क्रीनशॉट', 'देख के बता', 'देख के बोल', 'देखो क्या',
      'क्या दिख', 'क्या चल', 'क्या खुला', 'कौन सा ऐप', 'कौनसा ऐप', 'कौन सा एप',
      'डिस्प्ले', 'क्या दिख रहा', 'क्या चल रहा'
    ];
    for (let j = 0; j < hi.length; j++) if (raw.includes(hi[j])) return true;
    return false;
  },

  wantsLookToo(cmd) {
    const t = (cmd || '').toLowerCase();
    return (
      t.includes('screen') || t.includes('dekh') || t.includes('look') ||
      t.includes('bata') || t.includes('describe') ||
      t.includes('स्क्रीन') || t.includes('देख')
    );
  },

  resolveAppPackage(cmd) {
    const t = (cmd || '').toLowerCase().trim();

    if (t === 'yt' || t.includes('youtube') || /\byt\b/.test(t)) {
      if (
        t.includes('open') || t.includes('kholo') || t.includes('khol') ||
        t === 'yt' || t === 'youtube' || t.includes('youtube')
      ) {
        return { name: 'YouTube', pkg: this.APP_PACKAGES.youtube };
      }
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
      if (key === 'yt' || key === 'youtube') continue;
      if (
        t === key || t === 'open ' + key || t === key + ' kholo' || t === key + ' open' ||
        t.includes('open ' + key) || t.includes(key + ' kholo') || t.includes(key + ' khol')
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
      const msg = app.name + ' open nahi ho paya.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
    }
    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  /** YouTube in-app search chain (hybrid click + type) */
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
      const msg = 'YouTube open nahi hua.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      btn.disabled = false;
      return;
    }

    await new Promise((r) => setTimeout(r, 2200));

    // hybrid: memory → text → bounds
    let clicked = await AiraAccess.clickTarget('search', ytPkg);
    if (!clicked) clicked = await AiraAccess.clickByText('Search');
    if (!clicked) {
      const center = await AiraAccess.findCenterByText('Search');
      if (center) clicked = await AiraAccess.clickAt(center.x, center.y);
    }

    if (!clicked) {
      const msg =
        'Search button nahi mila. YT kholo, phir sikhao: "dhyan rakhana search at X Y" (X Y = screen pixels).';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      btn.disabled = false;
      return;
    }

    await new Promise((r) => setTimeout(r, 700));
    const typed = await AiraAccess.typeText(q);
    if (!typed) {
      const msg = 'Search box mein type nahi hua. Box focus karke phir try.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      btn.disabled = false;
      return;
    }

    // try submit
    await new Promise((r) => setTimeout(r, 400));
    await AiraAccess.clickByText('Search');

    const msg = 'Search try kar diya: ' + q;
    AiraUI.addMessage(msg, false);
    this.speak(msg);
    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  parseApiKeys(rawText) {
    if (!rawText) return [];
    const keys = [];
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let line of lines) {
      let key = line;
      if (line.includes('=')) key = line.substring(line.indexOf('=') + 1).trim();
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
        try { await this.modelRotator.init(this.apiKeys[0]); } catch (e) { console.error(e); }
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
      try { await this.modelRotator.init(this.apiKeys[0]); } catch (e) { console.error(e); }
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
    } else if (action === 'GO_HOME') await AiraAccess.goHome();
    else if (action === 'GO_BACK') await AiraAccess.goBack();
    else if (action === 'OPEN_NOTIFICATIONS') await AiraAccess.openNotifications();
    else if (action === 'OPEN_RECENTS') await AiraAccess.openRecents();
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

    let langBlock = '\n\nREPLY LANGUAGE / SCRIPT:\n';
    if (this.writeMode === 'hindi') {
      langBlock += '- Hindi mode: Devanagari Hindi only.\n';
    } else if (this.writeMode === 'english') {
      langBlock += '- English mode: clear English only.\n';
    } else {
      langBlock += '- Default Hinglish (Roman). Example: "Haan bilkul, abhi kar deti hoon."\n';
    }
    return base + timeBlock + langBlock;
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
            `https://generativelanguage.googleapis.com/v1beta/models/\( {model}:generateContent?key= \){encodeURIComponent(apiKey)}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: this.getSystemPromptWithTime() }] },
              contents: this.conversationHistory.slice(-10)
            })
          });
          let data;
          try { data = await response.json(); } catch (e) {
            throw new Error(`Invalid API response (${response.status})`);
          }
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { text: data.candidates[0].content.parts[0].text.trim() };
          }
          const errMsg = data?.error?.message || `HTTP ${response.status}`;
          if (response.status === 503 || /high demand|overloaded|unavailable/i.test(errMsg)) {
            this.modelRotator.next(); continue;
          }
          if (response.status === 429 || /quota|rate limit|resource_exhausted/i.test(errMsg)) break;
          if (response.status === 404 || /not found|not supported/i.test(errMsg)) {
            this.modelRotator.next(); continue;
          }
          if ([400, 401, 403].includes(response.status) &&
              /api key|permission|unauthorized|forbidden/i.test(errMsg)) break;
          return { error: errMsg };
        } catch (err) {
          console.error(err);
          this.modelRotator.next();
        }
      }
      this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
      this.modelRotator.reset();
    }
    return { error: 'All API keys and models failed. Please try again later.' };
  },

  async callGeminiVision(base64Jpeg, userText) {
    if (this.apiKeys.length === 0) {
      return { error: 'No API key configured. Open Settings → API.' };
    }
    const prompt = (userText && userText.trim()) || 'Describe what is on the screen.';
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{
                  text: this.getSystemPromptWithTime() +
                    '\n\nYou can see a screenshot. Describe accurately. Do not invent UI.'
                }]
              },
              contents: [{
                role: 'user',
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }
                ]
              }]
            })
          });
          let data;
          try { data = await response.json(); } catch (e) {
            throw new Error(`Invalid API response (${response.status})`);
          }
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { text: data.candidates[0].content.parts[0].text.trim() };
          }
          const errMsg = data?.error?.message || `HTTP ${response.status}`;
          if (response.status === 503 || /high demand|overloaded|not found|not supported/i.test(errMsg)) {
            this.modelRotator.next(); continue;
          }
          if (response.status === 429 || /quota/i.test(errMsg)) break;
          return { error: errMsg };
        } catch (err) {
          console.error(err);
          this.modelRotator.next();
        }
      }
      this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
      this.modelRotator.reset();
    }
    return { error: 'Vision request failed on all keys/models.' };
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
        msg = 'Accessibility ON karo (Settings → Accessibility → Aira), phir try karo.';
      } else if (shot.error === 'android11-required') {
        msg = 'Screenshot ke liye Android 11+ chahiye.';
      } else if (shot.error) msg = 'Screenshot fail: ' + shot.error;
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
        parts: [{ text: '[Screen share] ' + (userText || 'What is on my screen?') }]
      });
      this.conversationHistory.push({ role: 'model', parts: [{ text: result.text }] });
    } else {
      AiraUI.addMessage('Error: ' + (result.error || 'Vision failed'), false);
    }
    this.updateEngineState();
    btn.disabled = false;
    AiraUI.els.userInput.focus();
  },

  async handleFastPath(cmd) {
    const input = AiraUI.els.userInput;
    const btn = AiraUI.els.sendBtn;

    // --- Memory train ---
    if (cmd === 'yaad dikhao' || cmd === 'memory dikhao' || cmd.includes('kya yaad')) {
      input.value = '';
      const sum = (window.AiraMemory && AiraMemory.summary)
        ? AiraMemory.summary()
        : 'Memory module nahi mila (aira_memory.js).';
      AiraUI.addMessage(sum, false);
      return true;
    }

    // dhyan rakhana search at 980 80
    {
      const mAt = cmd.match(
        /dhyan\s+rakh(?:ana|na|o)?\s+(\w+)\s+at\s+(\d+)\s+(\d+)/i
      );
      if (mAt && window.AiraMemory) {
        input.value = '';
        const label = mAt[1];
        const x = parseInt(mAt[2], 10);
        const y = parseInt(mAt[3], 10);
        const app = (label.toLowerCase() === 'search')
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
          ? ('Yaad rakha: ' + label + ' @(' + x + ',' + y + ')')
          : 'Yaad nahi rakh payi.';
        AiraUI.addMessage(msg, false);
        this.speak(msg);
        return true;
      }
    }

    // dhyan rakhana search  (auto bounds if Search visible)
    if (
      window.AiraMemory &&
      (cmd.startsWith('dhyan rakh') || cmd.startsWith('dhyan rakho'))
    ) {
      const rest = cmd.replace(/^dhyan\s+rakh(?:ana|na|o)?\s*/i, '').trim();
      if (rest && !rest.includes(' at ')) {
        input.value = '';
        const label = rest.split(/\s+/)[0] || 'search';
        const center = await AiraAccess.findCenterByText(
          label === 'search' ? 'Search' : label
        );
        if (center) {
          AiraMemory.remember({
            label: label,
            app: label.toLowerCase() === 'search' ? this.APP_PACKAGES.youtube : '*',
            x: center.x,
            y: center.y,
            matchText: label === 'search' ? 'Search' : label,
            note: 'auto bounds'
          });
          const msg = 'Yaad rakha (auto): ' + label + ' @(' + center.x + ',' + center.y + ')';
          AiraUI.addMessage(msg, false);
          this.speak(msg);
        } else {
          const msg =
            'Screen pe "' + label + '" nahi mila. Manual: dhyan rakhana search at 980 80';
          AiraUI.addMessage(msg, false);
          this.speak(msg);
        }
        return true;
      }
    }

    // --- YT search chain ---
    {
      let q = null;
      let m =
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

    // write language
    if (
      cmd.includes('hindi mein likh') || cmd.includes('hindi mai likh') ||
      cmd.includes('hindi me likh') || cmd.includes('हिंदी में लिख') || cmd === 'hindi mode'
    ) {
      input.value = '';
      this.writeMode = 'hindi';
      localStorage.setItem('aira_write_mode', 'hindi');
      const msg = 'Theek hai — ab Hindi mein likhungi.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }
    if (
      cmd.includes('english mein likh') || cmd.includes('english mai likh') ||
      cmd.includes('english me likh') || cmd.includes('in english') || cmd === 'english mode'
    ) {
      input.value = '';
      this.writeMode = 'english';
      localStorage.setItem('aira_write_mode', 'english');
      const msg = 'Okay — I will write in English now.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }
    if (
      cmd.includes('hinglish mein likh') || cmd.includes('hinglish mai likh') ||
      cmd.includes('hinglish me likh') || cmd.includes('roman mein likh') || cmd === 'hinglish mode'
    ) {
      input.value = '';
      this.writeMode = 'hinglish';
      localStorage.setItem('aira_write_mode', 'hinglish');
      const msg = 'Theek — ab Hinglish mein likhungi.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }

    // stay live
    if (
      cmd === 'stay live' || cmd === 'live on' || cmd === 'live' ||
      cmd.includes('sunte raho') || cmd.includes('sunti raho') ||
      cmd.includes('stay live') || cmd.includes('live mode')
    ) {
      input.value = '';
      const r = AiraAccess.startLive();
      let msg;
      if (r.ok) msg = 'Live mode ON. Ab doosri app kholo — main sun rahi hoon. Band: "live band".';
      else if (r.error === 'need-overlay-permission') {
        msg = 'Display over other apps ON karo (settings khul gayi), phir phir se "stay live" bolo.';
      } else {
        msg = 'Live start nahi hua: ' + (r.error || 'unknown') + '. Naya APK / permission check karo.';
      }
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }
    if (
      cmd === 'live band' || cmd === 'stop live' || cmd === 'live off' ||
      cmd.includes('live band') || cmd.includes('suna band') || cmd.includes('sunna band')
    ) {
      input.value = '';
      AiraAccess.stopLive();
      const msg = 'Live mode OFF.';
      AiraUI.addMessage(msg, false);
      this.speak(msg);
      return true;
    }

    // click (hybrid)
    {
      let clickTarget = null;
      const c = cmd.trim();
      let m =
        c.match(/^click\s+(.+)$/i) ||
        c.match(/^(.+?)\s+pe\s+click(?:\s+karo)?$/i) ||
        c.match(/^(.+?)\s+par\s+click(?:\s+karo)?$/i) ||
        c.match(/^(.+?)\s+dabao$/i) ||
        c.match(/^dabao\s+(.+)$/i) ||
        c.match(/^(.+?)\s+pe\s+dabao$/i) ||
        c.match(/^(.+?)\s+par\s+dabao$/i);
      if (m && m[1]) clickTarget = m[1].replace(/["']/g, '').trim();
      if (clickTarget && clickTarget.length > 0 && clickTarget.length < 40) {
        input.value = '';
        btn.disabled = true;
        try {
          const ok = await AiraAccess.clickTarget(clickTarget);
          const msg = ok
            ? '"' + clickTarget + '" pe click kar diya.'
            : '"' + clickTarget + '" nahi mila. Train: dhyan rakhana ' + clickTarget + ' at X Y';
          AiraUI.addMessage(msg, false);
          this.speak(msg);
        } catch (e) {
          AiraUI.addMessage('Click fail ho gaya.', false);
          this.speak('Click fail ho gaya.');
        }
        btn.disabled = false;
        input.focus();
        return true;
      }
    }

    // type
    {
      let typeTextVal = null;
      const c = cmd.trim();
      let m =
        c.match(/^type\s+(.+)$/i) ||
        c.match(/^likh(?:o|e)?\s*[:\-]?\s*(.+)$/i) ||
        c.match(/^yahan\s+likh(?:o|e)?\s*[:\-]?\s*(.+)$/i) ||
        c.match(/^write\s+(.+)$/i);
      if (m && m[1]) typeTextVal = m[1].trim();
      if (typeTextVal && typeTextVal.length > 0) {
        input.value = '';
        btn.disabled = true;
        try {
          const ok = await AiraAccess.typeText(typeTextVal);
          const msg = ok
            ? 'Type kar diya: ' + typeTextVal
            : 'Type nahi hua. Pehle input box pe focus karo.';
          AiraUI.addMessage(msg, false);
          this.speak(msg);
        } catch (e) {
          AiraUI.addMessage('Type fail ho gaya.', false);
          this.speak('Type fail ho gaya.');
        }
        btn.disabled = false;
        input.focus();
        return true;
      }
    }

    // open app (skip if "search" in cmd for yt)
    if (!(cmd.includes('search') && (cmd.includes('yt') || cmd.includes('youtube')))) {
      const app = this.resolveAppPackage(cmd);
      if (app) {
        const wantsOpen =
          cmd.includes('open') || cmd.includes('kholo') || cmd.includes('khol') ||
          cmd === 'yt' || cmd === 'youtube' || cmd === 'pw' ||
          cmd === app.name.toLowerCase() || cmd.includes('youtube') ||
          cmd.includes(app.name.toLowerCase());
        if (wantsOpen) {
          input.value = '';
          await this.openAppByName(app, this.wantsLookToo(cmd));
          return true;
        }
      }
    }

    if (
      cmd === 'open terminal' || cmd === 'terminal kholo' || cmd === 'terminal open' ||
      cmd === 'terminal' || cmd === 'shell kholo' || cmd === 'termux kholo'
    ) {
      input.value = '';
      AiraUI.openTerminal();
      AiraUI.addMessage('Terminal open kar diya.', false);
      this.speak('Terminal open kar diya.');
      return true;
    }

    if (cmd === 'go home' || cmd === 'home') {
      input.value = '';
      btn.disabled = true;
      try {
        const ok = await AiraAccess.goHome();
        const msg = ok ? 'Home pe le aayi.' : 'Home nahi ja payi. Accessibility check karo.';
        AiraUI.addMessage(msg, false);
        this.speak(msg);
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
        const msg = ok ? 'Back kar diya.' : 'Back nahi ho paya.';
        AiraUI.addMessage(msg, false);
        this.speak(msg);
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
        const msg = ok ? 'Notifications open kiye.' : 'Notifications nahi khul paye.';
        AiraUI.addMessage(msg, false);
        this.speak(msg);
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
        const msg = ok ? 'Recents open kiye.' : 'Recents nahi khul paye.';
        AiraUI.addMessage(msg, false);
        this.speak(msg);
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
    this.conversationHistory.push({ role: 'user', parts: [{ text }] });
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
      this.conversationHistory.push({ role: 'model', parts: [{ text: result.text }] });
    } else {
      if (this.isShowYourselfRequest(text)) {
        const photo = this.pickRandomSelfPhoto();
        if (photo) {
          const cap = this.pickRandomCaption();
          AiraUI.addImageMessage(photo, cap);
          this.speak(cap);
        } else {
          AiraUI.addMessage('Error: ' + (result.error || 'Something went wrong'), false);
        }
      } else {
        if (this.conversationHistory[this.conversationHistory.length - 1]?.role === 'user') {
          this.conversationHistory.pop();
        }
        AiraUI.addMessage('Error: ' + (result.error || 'Something went wrong'), false);
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
        AiraUI.addMessage("Hi, I'm Aira. How can I support you today?", false);
      }
    };
  }
};

window.AiraChat = AiraChat;
