/**
 * ui.js
 * Drawer, settings, messages, image viewer, terminal view
 */

const AiraUI = {
  FIXED_AVATAR: 'Avatar/neutral.png',

  els: {},
  term: {},

  init() {
    this.els = {
      drawer: document.getElementById('drawer'),
      overlay: document.getElementById('overlay'),
      messages: document.getElementById('messages'),
      userInput: document.getElementById('userInput'),
      sendBtn: document.getElementById('sendBtn'),
      engineStatusVal: document.getElementById('engineStatusVal'),
      settingsModal: document.getElementById('settingsModal'),
      cfgName: document.getElementById('cfgName'),
      cfgApiKeys: document.getElementById('cfgApiKeys')
    };

    this.term = {
      view: document.getElementById('terminalView'),
      scroll: document.getElementById('termScroll'),
      input: document.getElementById('termInput'),
      runBtn: document.getElementById('termRunBtn'),
      cpu: document.getElementById('termCpu'),
      ram: document.getElementById('termRam'),
      disk: document.getElementById('termDisk'),
      task: document.getElementById('termTask'),
      fill: document.getElementById('termProgressFill'),
      openBtn: document.getElementById('openTerminalBtn'),
      closeBtn: document.getElementById('closeTerminalBtn')
    };

    this.bindDrawer();
    this.bindSettings();
    this.bindInput();
    this.bindTerminal();
    this.ensureImageViewer();
  },

  bindDrawer() {
    const { drawer, overlay } = this.els;

    document.getElementById('openDrawer').onclick = () => {
      drawer.classList.add('open');
      overlay.classList.add('visible');
    };

    document.getElementById('closeDrawer').onclick = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('visible');
    };

    overlay.onclick = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('visible');
    };
  },

  bindSettings() {
    const { settingsModal, drawer, overlay } = this.els;

    document.getElementById('openSettingsBtn').onclick = () => {
      settingsModal.classList.add('active');
      drawer.classList.remove('open');
      overlay.classList.remove('visible');
    };

    const close = () => settingsModal.classList.remove('active');
    document.getElementById('closeSettingsBtn').onclick = close;
    document.getElementById('cancelSettingsBtn').onclick = close;

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      };
    });
  },

  bindInput() {
    const { userInput } = this.els;
    userInput.oninput = () => {
      userInput.style.height = 'auto';
      userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    };
  },

  bindTerminal() {
    const t = this.term;
    if (!t.view) return;

    if (t.openBtn) {
      t.openBtn.onclick = () => this.openTerminal();
    }
    if (t.closeBtn) {
      t.closeBtn.onclick = () => this.closeTerminal();
    }

    if (t.runBtn) {
      t.runBtn.onclick = () => this.onTerminalRun();
    }
    if (t.input) {
      t.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.onTerminalRun();
        }
      });
    }
  },

  openTerminal() {
    if (!this.term.view) return;
    this.term.view.classList.add('open');
    if (this.term.openBtn) this.term.openBtn.classList.add('term-active');
    if (this.term.input) this.term.input.focus();
  },

  closeTerminal() {
    if (!this.term.view) return;
    this.term.view.classList.remove('open');
    if (this.term.openBtn) this.term.openBtn.classList.remove('term-active');
  },

  termWrite(text, kind) {
    if (!this.term.scroll) return;
    const line = document.createElement('div');
    line.className = 'term-line';

    if (kind === 'cmd') {
      line.innerHTML = `<span class="meta">$</span> <span class="cmd"></span>`;
      line.querySelector('.cmd').textContent = text;
    } else if (kind === 'ok') {
      line.innerHTML = `<span class="ok"></span>`;
      line.querySelector('.ok').textContent = text;
    } else if (kind === 'err') {
      line.innerHTML = `<span class="err"></span>`;
      line.querySelector('.err').textContent = text;
    } else if (kind === 'meta') {
      line.innerHTML = `<span class="meta"></span>`;
      line.querySelector('.meta').textContent = text;
    } else {
      line.textContent = text;
    }

    this.term.scroll.appendChild(line);
    this.term.scroll.scrollTop = this.term.scroll.scrollHeight;
  },

  termClear() {
    if (!this.term.scroll) return;
    this.term.scroll.innerHTML = '';
    this.termWrite('# Aira · Termux bridge', 'meta');
    this.termWrite('# Session ready', 'meta');
    this.termWrite(' ');
    this.setTermProgress(0, 'Ready');
  },

  setTermProgress(pct, label) {
    if (this.term.fill) {
      this.term.fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    if (label && this.term.task) {
      this.term.task.textContent = label;
    }
  },

  setTermStats(cpu, ram, disk) {
    if (cpu != null && this.term.cpu) this.term.cpu.textContent = cpu;
    if (ram != null && this.term.ram) this.term.ram.textContent = ram;
    if (disk != null && this.term.disk) this.term.disk.textContent = disk;
  },

  onTerminalRun() {
    const input = this.term.input;
    if (!input) return;
    const cmd = input.value.trim();
    if (!cmd) return;

    this.termWrite(cmd, 'cmd');
    this.setTermProgress(20, 'Running…');

    // Preview only — real Termux bridge later
    setTimeout(() => this.setTermProgress(60, 'Running…'), 200);
    setTimeout(() => {
      this.termWrite('// Termux bridge not connected yet', 'meta');
      this.termWrite(' ');
      this.setTermProgress(100, 'Done');
      setTimeout(() => this.setTermProgress(0, 'Ready'), 700);
    }, 600);

    input.value = '';
    input.focus();

    // Hook for future: window.AiraChat / AiraAccess.runTermux(cmd)
    if (window.AiraChat && typeof window.AiraChat.onTerminalCommand === 'function') {
      window.AiraChat.onTerminalCommand(cmd);
    }
  },

  setEngineStatus(text, ok) {
    const el = this.els.engineStatusVal;
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#34d399' : 'var(--text-secondary)';
  },

  setCompanionName(name) {
    document.querySelectorAll('.character-name, .header-name').forEach(el => {
      el.textContent = name;
    });
  },

  addMessage(text, isUser = false) {
    const msg = document.createElement('div');
    msg.className = 'message ' + (isUser ? 'user' : 'ai');

    if (!isUser) {
      const av = document.createElement('img');
      av.className = 'message-avatar';
      av.src = this.FIXED_AVATAR;
      av.alt = 'Aira';
      msg.appendChild(av);
    }

    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    meta.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    wrap.appendChild(meta);

    msg.appendChild(wrap);
    this.els.messages.appendChild(msg);
    this.els.messages.scrollTop = this.els.messages.scrollHeight;
  },

  addImageMessage(imageSrc, caption) {
    const msg = document.createElement('div');
    msg.className = 'message ai';

    const av = document.createElement('img');
    av.className = 'message-avatar';
    av.src = this.FIXED_AVATAR;
    av.alt = 'Aira';
    msg.appendChild(av);

    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';

    if (caption) {
      const cap = document.createElement('div');
      cap.className = 'bubble';
      cap.textContent = caption;
      wrap.appendChild(cap);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble image-bubble';

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Aira';
    img.onclick = () => this.openImageViewer(imageSrc);
    img.onerror = () => {
      bubble.innerHTML = '';
      bubble.className = 'bubble';
      bubble.textContent = 'Photo load nahi hui.';
    };

    bubble.appendChild(img);
    wrap.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    meta.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    wrap.appendChild(meta);

    msg.appendChild(wrap);
    this.els.messages.appendChild(msg);
    this.els.messages.scrollTop = this.els.messages.scrollHeight;
  },

  showTyping() {
    const el = document.createElement('div');
    el.className = 'message ai';
    el.id = 'typingIndicator';
    el.innerHTML = `
      <img class="message-avatar" src="${this.FIXED_AVATAR}" alt="Aira" />
      <div class="bubble-wrap">
        <div class="typing"><span></span><span></span><span></span></div>
      </div>`;
    this.els.messages.appendChild(el);
    this.els.messages.scrollTop = this.els.messages.scrollHeight;
  },

  hideTyping() {
    const t = document.getElementById('typingIndicator');
    if (t) t.remove();
  },

  clearMessages() {
    this.els.messages.innerHTML = '';
  },

  ensureImageViewer() {
    if (document.getElementById('imageViewer')) return;

    const viewer = document.createElement('div');
    viewer.id = 'imageViewer';
    viewer.className = 'image-viewer';
    viewer.innerHTML = `
      <button class="viewer-close" type="button" aria-label="Close">×</button>
      <img id="imageViewerImg" src="" alt="Full" />
    `;
    document.body.appendChild(viewer);

    viewer.querySelector('.viewer-close').onclick = () => this.closeImageViewer();
    viewer.onclick = (e) => {
      if (e.target === viewer) this.closeImageViewer();
    };
  },

  openImageViewer(src) {
    const viewer = document.getElementById('imageViewer');
    const img = document.getElementById('imageViewerImg');
    if (!viewer || !img) return;
    img.src = src;
    img.style.transform = 'scale(1)';
    viewer.classList.add('active');
  },

  closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    if (viewer) viewer.classList.remove('active');
  }
};

window.AiraUI = AiraUI;
