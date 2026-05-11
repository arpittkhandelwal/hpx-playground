/* ── Canvas particle background ──────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random(),
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 120 }, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${p.a * 0.5})`;
      ctx.fill();
    });
    // draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,255,${(1 - dist/80) * 0.12})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init(); draw();
})();

/* ── State ─────────────────────────────────────────────────────────── */
let monacoEditor = null;
let activeExample = null;
let threads = 4;
let isRunning = false;

/* ── Threads stepper ─────────────────────────────────────────────── */
const threadsVal = document.getElementById('threads-val');
document.getElementById('threads-dec').onclick = () => {
  threads = Math.max(1, threads - 1);
  threadsVal.textContent = threads;
};
document.getElementById('threads-inc').onclick = () => {
  threads = Math.min(16, threads + 1);
  threadsVal.textContent = threads;
};

/* ── Monaco Editor ────────────────────────────────────────────────── */
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  monaco.editor.defineTheme('hpx-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',   foreground: '00d4ff', fontStyle: 'bold' },
      { token: 'comment',   foreground: '4b6080', fontStyle: 'italic' },
      { token: 'string',    foreground: '00ff88' },
      { token: 'number',    foreground: 'f59e0b' },
      { token: 'type',      foreground: 'a78bfa' },
      { token: 'delimiter', foreground: '94a3b8' },
    ],
    colors: {
      'editor.background':          '#080c14',
      'editor.foreground':          '#e2e8f0',
      'editor.lineHighlightBackground': '#0d1320',
      'editorLineNumber.foreground':'#2a3f60',
      'editorLineNumber.activeForeground': '#00d4ff',
      'editor.selectionBackground': '#1e3a5f',
      'editorCursor.foreground':    '#00d4ff',
      'editor.findMatchBackground': '#1a3a5c',
      'editorGutter.background':    '#080c14',
      'scrollbarSlider.background': '#1e2d4566',
    },
  });

  monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
    value: window.HPX_EXAMPLES[0].items[0].code,
    language: 'cpp',
    theme: 'hpx-dark',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: true, scale: 1 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'off',
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderLineHighlight: 'all',
    padding: { top: 12, bottom: 12 },
  });

  // Cmd/Ctrl+Enter → Run
  monacoEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    () => runCode()
  );

  // Load from URL hash if present
  loadFromHash();

  // Build sidebar
  buildSidebar();

  // Set first example active
  setActiveExample(HPX_EXAMPLES[0].items[0]);

  // Check runtime status
  fetchStatus();
});

/* ── Sidebar builder ──────────────────────────────────────────────── */
function buildSidebar(filter = '') {
  const nav = document.getElementById('example-nav');
  nav.innerHTML = '';
  const fl = filter.toLowerCase();

  HPX_EXAMPLES.forEach(group => {
    const items = group.items.filter(it =>
      !fl || it.label.toLowerCase().includes(fl));
    if (!items.length) return;

    const cat = document.createElement('div');
    cat.className = 'eg-category';

    const header = document.createElement('div');
    header.className = 'eg-cat-header open';
    header.innerHTML = `<span class="eg-cat-arrow">▶</span>${group.category}`;
    header.onclick = () => {
      header.classList.toggle('open');
    };

    const list = document.createElement('div');
    list.className = 'eg-cat-items';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'eg-item' + (activeExample?.id === item.id ? ' active' : '');
      el.dataset.id = item.id;
      el.innerHTML = `<span class="eg-item-icon">${item.icon}</span>${item.label}`;
      el.onclick = () => {
        monacoEditor.setValue(item.code);
        setActiveExample(item);
        clearOutput();
      };
      list.appendChild(el);
    });

    cat.appendChild(header);
    cat.appendChild(list);
    nav.appendChild(cat);
  });
}

function setActiveExample(item) {
  activeExample = item;
  document.querySelectorAll('.eg-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === item.id));
  renderDocs(item.doc);
}

document.getElementById('example-search').oninput = function () {
  buildSidebar(this.value);
};

/* ── Docs renderer ────────────────────────────────────────────────── */
function renderDocs(doc) {
  if (!doc) return;
  const body = document.getElementById('docs-body');
  body.innerHTML = `
    <div class="doc-card fade-in">
      <div class="tag">${doc.tag || 'HPX'}</div>
      <h3>${doc.title}</h3>
      <p>${doc.body}</p>
      ${doc.snippet ? `<pre>${escapeHtml(doc.snippet)}</pre>` : ''}
      ${doc.link ? `<a class="doc-link" href="${doc.link}" target="_blank">📖 Official Docs ↗</a>` : ''}
    </div>
    <div class="doc-card">
      <div class="tag">HPX Links</div>
      <h3>Resources</h3>
      <p>
        <a class="doc-link" href="https://hpx.dev" target="_blank">🌐 hpx.dev</a><br>
        <a class="doc-link" href="https://github.com/STEllAR-GROUP/hpx" target="_blank">⚙ GitHub Repo</a><br>
        <a class="doc-link" href="https://hpx.dev/docs/latest/api/" target="_blank">📘 API Reference</a>
      </p>
    </div>`;
}

/* ── Runtime status ───────────────────────────────────────────────── */
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const badge = document.getElementById('runtime-badge');
    const label = document.getElementById('runtime-label');
    if (data.hpx) {
      badge.className = 'runtime-badge hpx-live';
      label.textContent = 'HPX Runtime';
    } else {
      badge.className = 'runtime-badge wandbox';
      label.textContent = 'Wandbox (C++)';
    }
    renderInfoTab(data);
  } catch {
    document.getElementById('runtime-label').textContent = 'Offline';
  }
}

function renderInfoTab(data) {
  document.getElementById('info-content').innerHTML = `
    <div class="info-section">
      <h4>Runtime Mode</h4>
      <p>${data.hpx
        ? '✅ <strong>HPX Native</strong> — Code is compiled and executed with the full HPX runtime.'
        : '⚠️ <strong>Wandbox Fallback</strong> — HPX runtime not found. Code runs with GCC + Boost as std:: equivalents.'}</p>
    </div>
    <div class="info-section">
      <h4>HPX Library Path</h4>
      <p><code>${data.lib || 'N/A'}</code></p>
    </div>
    <div class="info-section">
      <h4>Include Path</h4>
      <p><code>${data.include || 'N/A'}</code></p>
    </div>
    <div class="info-section">
      <h4>What is HPX?</h4>
      <p>HPX is a C++ Standard Library for Concurrency and Parallelism. It implements all of the C++17/20 parallel algorithms, adds futures, async tasks, channels, and distributed computing support, and integrates with the <strong>ParalleX</strong> execution model for maximum efficiency.</p>
    </div>`;
}

/* ── Run code ─────────────────────────────────────────────────────── */
document.getElementById('btn-run').onclick = runCode;

async function runCode() {
  if (isRunning) return;
  isRunning = true;

  const btn = document.getElementById('btn-run');
  btn.classList.add('loading');
  btn.querySelector('.run-label').textContent = 'Running…';

  switchTab('console');
  showSpinner();

  const code = monacoEditor.getValue();

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, threads }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderOutput(data);
    updateMetrics(data);
  } catch (err) {
    renderError(`Network error: ${err.message}`);
  } finally {
    isRunning = false;
    btn.classList.remove('loading');
    btn.querySelector('.run-label').textContent = 'Run';
  }
}

/* ── Output rendering ─────────────────────────────────────────────── */
function showSpinner() {
  const out = document.getElementById('console-output');
  out.innerHTML = `
    <div class="console-spinner">
      <div class="spinner-dots">
        <span></span><span></span><span></span>
      </div>
      Compiling &amp; running…
    </div>`;
}

function renderOutput(data) {
  const out = document.getElementById('console-output');
  out.innerHTML = '';

  const addLine = (text, cls = 'stdout') => {
    if (!text) return;
    text.split('\n').forEach((ln, i) => {
      if (!ln && i === text.split('\n').length - 1) return;
      const div = document.createElement('div');
      div.className = `console-line ${cls} fade-in`;
      div.innerHTML = `<span class="line-prefix">${cls === 'stderr' ? '✖' : '›'}</span>${escapeHtml(ln)}`;
      out.appendChild(div);
    });
  };

  if (data.note) addLine(`ℹ ${data.note}`, 'dim');

  if (data.compileMs) addLine(`Compiled in ${data.compileMs} ms`, 'info');

  if (data.stderr && !data.ok) {
    addLine('── Compiler / Runtime Error ──', 'warn');
    addLine(data.stderr, 'stderr');
  } else {
    if (data.stdout) addLine(data.stdout, 'stdout');
    if (data.stderr) addLine(data.stderr, 'stderr');
    if (!data.stdout && !data.stderr)
      addLine('(no output)', 'dim');
    addLine(`Exited ${data.ok ? '✔ OK' : '✖ non-zero'}${data.runMs ? '  •  ' + data.runMs + ' ms' : ''}`, 'info');
  }
}

function renderError(msg) {
  const out = document.getElementById('console-output');
  out.innerHTML = `<div class="console-line stderr fade-in"><span class="line-prefix">✖</span>${escapeHtml(msg)}</div>`;
}

function clearOutput() {
  const out = document.getElementById('console-output');
  out.innerHTML = `<div class="console-placeholder"><span class="ph-icon">⚡</span><p>Press <kbd>Run</kbd> to execute</p></div>`;
  ['m-compile','m-run','m-threads','m-status'].forEach(id =>
    document.getElementById(id).textContent = '—');
  document.getElementById('pb-fill').style.width = '0%';
  document.getElementById('pb-hint').textContent = 'Run code to see metrics';
}

/* ── Metrics update ───────────────────────────────────────────────── */
function updateMetrics(data) {
  document.getElementById('m-compile').textContent = data.compileMs ? data.compileMs + ' ms' : '—';
  document.getElementById('m-run').textContent     = data.runMs     ? data.runMs     + ' ms' : '—';
  document.getElementById('m-threads').textContent = threads;
  document.getElementById('m-status').textContent  = data.ok ? '✔ 0' : '✖ non-zero';
  document.getElementById('m-status').style.color  = data.ok ? 'var(--accent2)' : 'var(--danger)';

  if (data.runMs) {
    const pct = Math.min(100, Math.max(5, threads * 15));
    document.getElementById('pb-fill').style.width = pct + '%';
    document.getElementById('pb-hint').textContent =
      `~${threads}× potential speedup with ${threads} thread${threads > 1 ? 's' : ''}`;
  }
}

/* ── Output tabs ──────────────────────────────────────────────────── */
document.querySelectorAll('.out-tab').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

function switchTab(name) {
  document.querySelectorAll('.out-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `tab-${name}`));
}

/* ── Output collapse ──────────────────────────────────────────────── */
document.getElementById('btn-collapse-out').onclick = () => {
  document.getElementById('output-panel').classList.toggle('collapsed');
};

/* ── Toolbar buttons ──────────────────────────────────────────────── */
document.getElementById('btn-clear').onclick = () => {
  monacoEditor.setValue('');
  monacoEditor.focus();
};

document.getElementById('btn-clear-out').onclick = clearOutput;

document.getElementById('btn-copy-out').onclick = () => {
  const text = document.getElementById('console-output').innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Output copied!'));
};

document.getElementById('btn-close-docs').onclick = () => {
  document.getElementById('sidebar-right').style.display = 'none';
};

/* ── Share ────────────────────────────────────────────────────────── */
document.getElementById('btn-share').onclick = () => {
  const code = monacoEditor.getValue();
  const encoded = btoa(unescape(encodeURIComponent(code)));
  const url = `${location.origin}${location.pathname}#code=${encoded}`;
  document.getElementById('share-url').value = url;
  document.getElementById('share-modal').hidden = false;
};

document.getElementById('modal-close').onclick = () =>
  document.getElementById('share-modal').hidden = true;

document.getElementById('btn-copy-share').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('share-url').value)
    .then(() => showToast('Link copied to clipboard!'));
};

document.getElementById('share-modal').onclick = function (e) {
  if (e.target === this) this.hidden = true;
};

function loadFromHash() {
  const hash = location.hash;
  if (hash.startsWith('#code=')) {
    try {
      const code = decodeURIComponent(escape(atob(hash.slice(6))));
      monacoEditor?.setValue(code);
    } catch {}
  }
}

/* ── Toast ────────────────────────────────────────────────────────── */
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ── Utilities ────────────────────────────────────────────────────── */
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
           .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
