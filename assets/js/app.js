/* ================================================
   DIGITALCRON PETROBRAS — Core App Engine
   JS Principal | v1.0
   ================================================ */

'use strict';

// ── Namespace ───────────────────────────────────────
const DC = window.DC = {};

/* ═══════════════════════════════════════════════════
   1. STORAGE ENGINE
   ═══════════════════════════════════════════════════ */
DC.Storage = {
  PREFIX: 'dc_petrobras_',

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  getAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.PREFIX)) {
        const cleanKey = key.replace(this.PREFIX, '');
        data[cleanKey] = DC.Storage.get(cleanKey);
      }
    }
    return data;
  },

  export() {
    const data = this.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digitalcron_progresso_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    DC.Toast.show('Progresso exportado com sucesso!', 'success');
  },

  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          Object.entries(data).forEach(([k, v]) => this.set(k, v));
          DC.Toast.show('Progresso importado com sucesso!', 'success');
          resolve(data);
        } catch {
          DC.Toast.show('Erro ao importar arquivo.', 'error');
          reject(new Error('Invalid JSON'));
        }
      };
      reader.readAsText(file);
    });
  }
};

/* ═══════════════════════════════════════════════════
   2. USER PROFILE & PROGRESS
   ═══════════════════════════════════════════════════ */
DC.User = {
  defaults: {
    name: 'Candidato',
    initials: 'CA',
    createdAt: null,
    totalStudyMinutes: 0,
    sessionsCount: 0,
    streak: 0,
    lastStudyDate: null,
    favorites: [],
    notes: {}
  },

  get() {
    const stored = DC.Storage.get('user', {});
    return { ...this.defaults, ...stored };
  },

  update(data) {
    const current = this.get();
    DC.Storage.set('user', { ...current, ...data });
  },

  updateStreak() {
    const user = this.get();
    const today = new Date().toDateString();
    const last = user.lastStudyDate;

    if (last === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const newStreak = last === yesterday.toDateString() ? user.streak + 1 : 1;
    this.update({ streak: newStreak, lastStudyDate: today });
    return newStreak;
  },

  addFavorite(id) {
    const user = this.get();
    if (!user.favorites.includes(id)) {
      user.favorites.push(id);
      this.update({ favorites: user.favorites });
    }
  },

  removeFavorite(id) {
    const user = this.get();
    user.favorites = user.favorites.filter(f => f !== id);
    this.update({ favorites: user.favorites });
  },

  toggleFavorite(id) {
    const user = this.get();
    if (user.favorites.includes(id)) {
      this.removeFavorite(id);
      return false;
    } else {
      this.addFavorite(id);
      return true;
    }
  },

  saveNote(topicId, text) {
    const user = this.get();
    user.notes[topicId] = { text, updatedAt: new Date().toISOString() };
    this.update({ notes: user.notes });
  }
};

/* ═══════════════════════════════════════════════════
   3. PROGRESS TRACKING
   ═══════════════════════════════════════════════════ */
DC.Progress = {
  getAll() {
    return DC.Storage.get('progress', {});
  },

  getTopic(topicId) {
    const all = this.getAll();
    return all[topicId] || { done: false, score: null, completedAt: null, attempts: 0 };
  },

  setTopic(topicId, data) {
    const all = this.getAll();
    all[topicId] = { ...this.getTopic(topicId), ...data };
    DC.Storage.set('progress', all);
  },

  markDone(topicId) {
    this.setTopic(topicId, { done: true, completedAt: new Date().toISOString() });
    DC.Progress.updateGlobal();
  },

  saveQuizResult(topicId, score, total) {
    const topic = this.getTopic(topicId);
    this.setTopic(topicId, {
      score,
      total,
      pct: Math.round((score / total) * 100),
      attempts: (topic.attempts || 0) + 1,
      lastQuizAt: new Date().toISOString()
    });
    DC.Progress.updateGlobal();
  },

  getGlobal() {
    return DC.Storage.get('globalProgress', {
      totalTopics: 0,
      doneTopics: 0,
      avgScore: 0,
      bySubject: {}
    });
  },

  updateGlobal() {
    // Recalculate from all progress
    const all = this.getAll();
    const keys = Object.keys(all);
    const done = keys.filter(k => all[k].done).length;
    const scores = keys.filter(k => all[k].score !== null).map(k => all[k].pct || 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    DC.Storage.set('globalProgress', {
      totalTopics: keys.length,
      doneTopics: done,
      avgScore: avg,
      updatedAt: new Date().toISOString()
    });

    // Dispatch event for dashboard updates
    window.dispatchEvent(new CustomEvent('dc:progress-updated'));
  },

  getSubjectProgress(subjectId, topics) {
    const all = this.getAll();
    const done = topics.filter(t => all[`${subjectId}_${t}`]?.done).length;
    return { done, total: topics.length, pct: topics.length ? Math.round((done / topics.length) * 100) : 0 };
  }
};

/* ═══════════════════════════════════════════════════
   4. STUDY TIMER
   ═══════════════════════════════════════════════════ */
DC.StudyTimer = {
  _startTime: null,
  _interval: null,

  start() {
    this._startTime = Date.now();
    if (!this._interval) {
      this._interval = setInterval(() => this._tick(), 60000); // every minute
    }
    DC.User.updateStreak();
  },

  stop() {
    if (this._startTime) {
      const minutes = Math.round((Date.now() - this._startTime) / 60000);
      if (minutes > 0) {
        const user = DC.User.get();
        DC.User.update({
          totalStudyMinutes: (user.totalStudyMinutes || 0) + minutes,
          sessionsCount: (user.sessionsCount || 0) + 1
        });
      }
      this._startTime = null;
    }
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  },

  _tick() {
    const user = DC.User.get();
    DC.User.update({ totalStudyMinutes: (user.totalStudyMinutes || 0) + 1 });
    window.dispatchEvent(new CustomEvent('dc:timer-tick'));
  },

  getElapsed() {
    if (!this._startTime) return 0;
    return Math.round((Date.now() - this._startTime) / 60000);
  }
};

/* ═══════════════════════════════════════════════════
   5. POMODORO
   ═══════════════════════════════════════════════════ */
DC.Pomodoro = {
  WORK_MINS: 25,
  BREAK_MINS: 5,
  LONG_BREAK_MINS: 15,

  _state: 'idle',   // idle, work, break, longbreak
  _timer: null,
  _remaining: 0,
  _session: 0,
  _listeners: [],

  get state() { return this._state; },

  onTick(cb) { this._listeners.push(cb); },

  _notify() {
    this._listeners.forEach(cb => cb({
      state: this._state,
      remaining: this._remaining,
      session: this._session,
      total: this._state === 'work' ? this.WORK_MINS * 60 : this.BREAK_MINS * 60
    }));
  },

  start() {
    if (this._timer) return;
    this._state = 'work';
    this._remaining = this.WORK_MINS * 60;
    DC.StudyTimer.start();
    this._tick();
  },

  pause() {
    clearTimeout(this._timer);
    this._timer = null;
  },

  resume() {
    if (!this._timer && this._state !== 'idle') this._tick();
  },

  reset() {
    this.pause();
    this._state = 'idle';
    this._remaining = 0;
    this._session = 0;
    DC.StudyTimer.stop();
    this._notify();
  },

  _tick() {
    this._notify();
    if (this._remaining <= 0) {
      this._advance();
      return;
    }
    this._remaining--;
    this._timer = setTimeout(() => this._tick(), 1000);
  },

  _advance() {
    clearTimeout(this._timer);
    this._timer = null;

    if (this._state === 'work') {
      this._session++;
      const isLong = this._session % 4 === 0;
      this._state = isLong ? 'longbreak' : 'break';
      this._remaining = (isLong ? this.LONG_BREAK_MINS : this.BREAK_MINS) * 60;
      DC.Notification.show('Pomodoro! Hora do intervalo 🎉', 'success');
      DC.StudyTimer.stop();
    } else {
      this._state = 'work';
      this._remaining = this.WORK_MINS * 60;
      DC.Notification.show('Intervalo terminou! Foco! 🚀', 'info');
      DC.StudyTimer.start();
    }

    this._tick();
  }
};

/* ═══════════════════════════════════════════════════
   6. THEME
   ═══════════════════════════════════════════════════ */
DC.Theme = {
  get() { return DC.Storage.get('theme', 'dark'); },
  set(theme) {
    DC.Storage.set('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this._updateBtn(theme);
  },
  toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  init() { this.set(this.get()); },
  _updateBtn(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? DC.Icons.sun : DC.Icons.moon;
  }
};

/* ═══════════════════════════════════════════════════
   7. SIDEBAR
   ═══════════════════════════════════════════════════ */
DC.Sidebar = {
  _collapsed: false,

  init() {
    this._collapsed = DC.Storage.get('sidebar_collapsed', false);
    this._apply();
    this._bindEvents();
    this._setActiveLink();
    this._initSubmenus();
  },

  toggle() {
    this._collapsed = !this._collapsed;
    DC.Storage.set('sidebar_collapsed', this._collapsed);
    this._apply();
  },

  _apply() {
    const sidebar  = document.querySelector('.sidebar');
    const content  = document.querySelector('.main-content');
    const navbar   = document.querySelector('.navbar');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed', this._collapsed);
    content?.classList.toggle('sidebar-collapsed', this._collapsed);
    navbar?.classList.toggle('sidebar-collapsed', this._collapsed);
  },

  _bindEvents() {
    const toggle = document.querySelector('.sidebar-toggle');
    toggle?.addEventListener('click', () => this.toggle());

    // Mobile hamburger
    const hamburger = document.getElementById('mobile-menu-btn');
    hamburger?.addEventListener('click', () => this.mobileToggle());
  },

  mobileToggle() {
    const sidebar = document.querySelector('.sidebar');
    const hasOverlay = document.querySelector('.sidebar-overlay');

    if (hasOverlay) {
      hasOverlay.remove();
      sidebar?.classList.remove('mobile-open');
    } else {
      sidebar?.classList.add('mobile-open');
      const overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', () => this.mobileToggle());
      document.body.appendChild(overlay);
    }
  },

  _setActiveLink() {
    const current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item, .nav-submenu-item').forEach(el => {
      const href = el.getAttribute('href') || '';
      if (href.includes(current) && current !== '') {
        el.classList.add('active');
        // Open parent submenu
        const submenu = el.closest('.nav-submenu');
        if (submenu) {
          submenu.classList.add('open');
          const parent = submenu.previousElementSibling;
          if (parent) parent.classList.add('open');
        }
      }
    });
  },

  _initSubmenus() {
    document.querySelectorAll('.nav-item[data-submenu]').forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-submenu');
        const submenu = document.getElementById(targetId);
        if (!submenu) return;
        const isOpen = submenu.classList.contains('open');
        // Close all
        document.querySelectorAll('.nav-submenu.open').forEach(sm => sm.classList.remove('open'));
        document.querySelectorAll('.nav-item.open').forEach(it => it.classList.remove('open'));
        // Toggle
        if (!isOpen) {
          submenu.classList.add('open');
          item.classList.add('open');
        }
      });
    });
  }
};

/* ═══════════════════════════════════════════════════
   8. QUIZ ENGINE
   ═══════════════════════════════════════════════════ */
DC.Quiz = {
  render(containerId, questions, topicId) {
    const container = document.getElementById(containerId);
    if (!container || !questions?.length) return;

    let current = 0;
    let answered = new Array(questions.length).fill(null);
    let score = 0;
    let submitted = false;

    container.innerHTML = this._buildUI(questions);

    const nav   = container.querySelector('.quiz-nav');
    const score_el = container.querySelector('.quiz-score-display');
    const submit = container.querySelector('.quiz-submit');
    const result = container.querySelector('.quiz-result');

    this._renderQuestion(container, questions, current, answered);

    container.addEventListener('click', (e) => {
      // Option selection
      const opt = e.target.closest('.quiz-option[data-index]');
      if (opt && !submitted) {
        const q = parseInt(opt.closest('.quiz-question').dataset.q);
        if (answered[q] !== null) return;
        answered[q] = parseInt(opt.dataset.index);
        this._selectOption(container, q, answered[q]);
        this._updateProgress(container, answered, questions.length);
        if (answered.every(a => a !== null)) {
          submit.disabled = false;
          submit.classList.remove('btn-ghost');
          submit.classList.add('btn-primary');
        }
      }

      // Submit
      if (e.target === submit || submit?.contains(e.target)) {
        if (answered.some(a => a === null)) {
          DC.Toast.show('Responda todas as questões!', 'info');
          return;
        }
        submitted = true;
        score = 0;
        questions.forEach((q, i) => {
          if (answered[i] === q.answer) score++;
          this._revealAnswer(container, i, answered[i], q.answer, q.explanation);
        });
        submit.style.display = 'none';
        result.style.display = 'block';
        const pct = Math.round((score / questions.length) * 100);
        result.innerHTML = this._buildResult(score, questions.length, pct);

        if (topicId) DC.Progress.saveQuizResult(topicId, score, questions.length);
      }
    });
  },

  _buildUI(questions) {
    const qs = questions.map((q, i) => `
      <div class="quiz-question animate-fade-up delay-${Math.min(i + 1, 6)}" data-q="${i}">
        <div class="quiz-question-num">Questão ${i + 1} de ${questions.length}</div>
        <div class="quiz-question-text">${q.question}</div>
        <div class="quiz-options">
          ${q.options.map((opt, j) => `
            <div class="quiz-option" data-index="${j}" data-q="${i}">
              <span class="quiz-option-letter">${String.fromCharCode(65 + j)}</span>
              <span>${opt}</span>
            </div>
          `).join('')}
        </div>
        <div class="quiz-feedback" style="display:none"></div>
      </div>
    `).join('');

    return `
      <div class="quiz-header mb-20">
        <div class="quiz-progress-bar">
          <div class="quiz-progress-text text-small text-muted mb-8">0 de ${questions.length} respondidas</div>
          <div class="progress-bar">
            <div class="progress-fill quiz-fill" style="width:0%"></div>
          </div>
        </div>
      </div>
      <div class="quiz-container">${qs}</div>
      <div class="quiz-actions flex gap-12 mt-24">
        <button class="btn btn-ghost quiz-submit" disabled>Verificar Respostas</button>
      </div>
      <div class="quiz-result" style="display:none; margin-top:20px"></div>
    `;
  },

  _renderQuestion(container, questions, idx, answered) {},

  _selectOption(container, qIdx, optIdx) {
    const q = container.querySelector(`.quiz-question[data-q="${qIdx}"]`);
    q?.querySelectorAll('.quiz-option').forEach((opt, i) => {
      opt.classList.toggle('selected', i === optIdx);
    });
  },

  _revealAnswer(container, qIdx, selected, correct, explanation) {
    const q = container.querySelector(`.quiz-question[data-q="${qIdx}"]`);
    q?.querySelectorAll('.quiz-option').forEach((opt, i) => {
      if (i === correct) opt.classList.add('correct');
      else if (i === selected && selected !== correct) opt.classList.add('wrong');
    });
    const fb = q?.querySelector('.quiz-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.className = `quiz-feedback ${selected === correct ? 'correct' : 'wrong'}`;
      fb.innerHTML = selected === correct
        ? `✅ <strong>Correto!</strong> ${explanation || ''}`
        : `❌ <strong>Incorreto.</strong> ${explanation || ''} <br><small>Resposta: ${String.fromCharCode(65 + correct)}</small>`;
    }
  },

  _updateProgress(container, answered, total) {
    const done = answered.filter(a => a !== null).length;
    const pct = Math.round((done / total) * 100);
    const bar = container.querySelector('.quiz-fill');
    const txt = container.querySelector('.quiz-progress-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `${done} de ${total} respondidas`;
  },

  _buildResult(score, total, pct) {
    const color = pct >= 70 ? 'green' : pct >= 50 ? 'orange' : 'red';
    const msg = pct >= 70 ? '🎉 Ótimo desempenho! Continue assim.' : pct >= 50 ? '📚 Bom esforço! Revise os erros.' : '💪 Revise o conteúdo e tente novamente.';
    return `
      <div class="card card-glow">
        <div class="flex-center" style="flex-direction:column; gap:12px; padding:8px 0">
          <div style="font-size:2.5rem; font-weight:900; color:var(--${color})">${pct}%</div>
          <div style="font-size:1rem; font-weight:600; color:var(--text-primary)">${score}/${total} questões corretas</div>
          <div class="progress-bar" style="width:100%; max-width:300px">
            <div class="progress-fill ${color}" style="width:${pct}%"></div>
          </div>
          <p style="text-align:center">${msg}</p>
        </div>
      </div>
    `;
  }
};

/* ═══════════════════════════════════════════════════
   9. TOAST
   ═══════════════════════════════════════════════════ */
DC.Toast = {
  show(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

DC.Notification = DC.Toast; // alias

/* ═══════════════════════════════════════════════════
   10. CHECKLIST
   ═══════════════════════════════════════════════════ */
DC.Checklist = {
  init(containerId, topicId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stored = DC.Storage.get(`checklist_${topicId}`, {});

    container.innerHTML = `
      <div class="checklist">
        ${items.map((item, i) => {
          const key = `item_${i}`;
          const done = stored[key] || false;
          return `
            <div class="checklist-item ${done ? 'done' : ''}" data-key="${key}">
              <div class="checklist-checkbox">
                ${done ? '<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' : ''}
              </div>
              <span class="checklist-label">${item}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="flex gap-8 mt-12">
        <span class="text-small text-muted" id="cl_count_${topicId}">
          ${Object.values(stored).filter(Boolean).length}/${items.length} completos
        </span>
      </div>
    `;

    container.querySelectorAll('.checklist-item').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        const isDone = el.classList.toggle('done');
        stored[key] = isDone;
        DC.Storage.set(`checklist_${topicId}`, stored);

        const cb = el.querySelector('.checklist-checkbox');
        cb.innerHTML = isDone
          ? '<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
          : '';

        const count = document.getElementById(`cl_count_${topicId}`);
        if (count) count.textContent = `${Object.values(stored).filter(Boolean).length}/${items.length} completos`;

        if (Object.values(stored).filter(Boolean).length === items.length) {
          DC.Progress.markDone(topicId);
          DC.Toast.show('Tópico concluído! 🎉', 'success');
        }
      });
    });
  }
};

/* ═══════════════════════════════════════════════════
   11. SEARCH
   ═══════════════════════════════════════════════════ */
DC.Search = {
  INDEX: [
    { title: 'Dashboard', url: 'dashboard.html', tags: ['início', 'home', 'progresso'] },
    { title: 'Língua Portuguesa', url: 'materias/portugues/index.html', tags: ['português', 'gramática', 'crase', 'concordância'] },
    { title: 'Língua Inglesa', url: 'materias/ingles/index.html', tags: ['inglês', 'reading', 'grammar'] },
    { title: 'Arquitetura de Dados', url: 'materias/arquitetura-dados/index.html', tags: ['sql', 'nosql', 'etl', 'data lake', 'modelagem'] },
    { title: 'Engenharia de Software', url: 'materias/engenharia-software/index.html', tags: ['scrum', 'kanban', 'ágil', 'requisitos', 'testes'] },
    { title: 'Segurança da Informação', url: 'materias/seguranca/index.html', tags: ['firewall', 'lgpd', 'iso27001', 'criptografia'] },
    { title: 'Lógica Matemática', url: 'materias/logica/index.html', tags: ['proposições', 'conjuntos', 'raciocínio'] },
    { title: 'UX & Design Thinking', url: 'materias/ux/index.html', tags: ['ux', 'ui', 'design thinking', 'mvp'] },
    { title: 'Business Intelligence', url: 'materias/bi/index.html', tags: ['bi', 'olap', 'data warehouse', 'dashboard'] },
    { title: 'Simulados', url: 'simulados.html', tags: ['questões', 'prova', 'exercícios'] },
    { title: 'Entendendo a Cesgranrio', url: 'banca.html', tags: ['cesgranrio', 'banca', 'estratégia'] },
  ],

  query(q) {
    if (!q || q.length < 2) return [];
    const lower = q.toLowerCase();
    return this.INDEX.filter(item =>
      item.title.toLowerCase().includes(lower) ||
      item.tags.some(t => t.includes(lower))
    );
  },

  init(inputId, resultsId) {
    const input   = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input) return;

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = input.value.trim();
        const hits = this.query(q);
        if (!results) return;
        if (!q || !hits.length) { results.style.display = 'none'; return; }
        results.style.display = 'block';
        results.innerHTML = hits.map(h => `
          <a href="${h.url}" class="search-result-item">
            <span class="search-result-title">${h.title}</span>
          </a>
        `).join('');
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && results && !results.contains(e.target)) {
        if (results) results.style.display = 'none';
      }
    });
  }
};

/* ═══════════════════════════════════════════════════
   12. ICONS (inline SVG helpers)
   ═══════════════════════════════════════════════════ */
DC.Icons = {
  sun:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  check:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
};

/* ═══════════════════════════════════════════════════
   13. ACCORDION
   ═══════════════════════════════════════════════════ */
DC.Accordion = {
  init(container) {
    container = container || document;
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        const body = item.querySelector('.accordion-body');
        const isOpen = item.classList.contains('open');

        item.classList.toggle('open', !isOpen);
        body?.classList.toggle('open', !isOpen);
      });
    });
  }
};

/* ═══════════════════════════════════════════════════
   14. TABS
   ═══════════════════════════════════════════════════ */
DC.Tabs = {
  init(container) {
    container = container || document;
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.tab-group') || btn.parentElement;
        const target = btn.dataset.tab;

        group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const panels = document.querySelectorAll(`.tab-panel[data-tab="${target}"], [data-panel="${target}"]`);
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        panels.forEach(p => p.classList.add('active'));
      });
    });
  }
};

/* ═══════════════════════════════════════════════════
   15. APP INIT
   ═══════════════════════════════════════════════════ */
DC.init = function() {
  DC.Theme.init();
  DC.Sidebar.init();
  DC.Accordion.init();
  DC.Tabs.init();
  DC.Search.init('global-search', 'search-results');
  DC.StudyTimer.start();

  // Theme toggle button
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn?.addEventListener('click', () => DC.Theme.toggle());

  // Export/Import buttons
  document.getElementById('export-btn')?.addEventListener('click', () => DC.Storage.export());
  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });

  document.getElementById('import-file')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) DC.Storage.import(file).then(() => location.reload());
  });

  // Stop timer on page leave
  window.addEventListener('beforeunload', () => DC.StudyTimer.stop());

  // Update user initials
  const user = DC.User.get();
  document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name);
  document.querySelectorAll('.user-initials').forEach(el => el.textContent = user.initials);
  document.querySelectorAll('.user-streak').forEach(el => el.textContent = user.streak);

  console.log('%c⚡ DigitalCron Petrobras v1.0', 'color: #8B5CF6; font-size: 14px; font-weight: bold;');
};

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => DC.init());
