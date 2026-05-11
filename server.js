const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '500kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── HPX Configuration ─────────────────────────────────────────────
const HPX = {
  available: false,
  lib: '',
  include: '',
  includeFlags: '',
  cxx: process.env.CXX || 'g++',
  mode: 'wandbox',  // 'native' | 'wandbox'
};

async function detectHPX() {
  if (process.env.HPX_AVAILABLE === 'true') {
    HPX.available = true;
    HPX.lib = process.env.HPX_LIB || '/usr/local/lib';
    HPX.include = process.env.HPX_INCLUDE || '/usr/local/include';
    HPX.includeFlags = `-I${HPX.include}`;
    HPX.mode = 'native';
    console.log('[HPX] Forced native via env');
    return;
  }

  // Standard install locations
  const candidates = [
    { lib: '/usr/local/lib', include: '/usr/local/include' },
    { lib: '/usr/lib/x86_64-linux-gnu', include: '/usr/include' },
    { lib: '/opt/hpx/lib', include: '/opt/hpx/include' },
  ];
  for (const c of candidates) {
    for (const soname of ['libhpx.so', 'libhpx.dylib']) {
      try {
        await fs.access(path.join(c.lib, soname));
        Object.assign(HPX, {
          available: true, mode: 'native',
          lib: c.lib, include: c.include,
          includeFlags: `-I${c.include}`,
        });
        console.log(`[HPX] Native install at ${c.lib}`);
        return;
      } catch {}
    }
  }

  // Local build dirs — only usable if OS matches build OS
  const platform = os.platform();
  const repoRoot = path.resolve(__dirname, '..');
  const buildRoots = ['../build', '../build_release', '../build_local', '../build_docker', '../build_ci']
    .map(d => path.resolve(__dirname, d));

  for (const root of buildRoots) {
    try {
      const libDir = path.join(root, 'lib');
      const files = await fs.readdir(libDir);
      const hasSo    = files.some(f => f.startsWith('libhpx') && f.endsWith('.so'));
      const hasDylib = files.some(f => f.startsWith('libhpx') && f.endsWith('.dylib'));

      if (!hasSo && !hasDylib) continue;
      // Cross-OS builds won't work
      if (hasSo    && platform !== 'linux')  continue;
      if (hasDylib && platform !== 'darwin') continue;

      // Read include flags from the ninja build file
      let includeFlags = '';
      try {
        const ninja = await fs.readFile(path.join(root, 'build.ninja'), 'utf8');
        const match = ninja.match(/^  INCLUDES = (.+)$/m);
        if (match) {
          includeFlags = match[1]
            .replace(/-I\/hpx\/build_docker/g, `-I${root}`)
            .replace(/-I\/hpx\//g, `-I${repoRoot}/`)
            .replace(/-isystem \/hpx\//g, `-isystem ${repoRoot}/`);
          includeFlags += ` -I${repoRoot}/wrap/include`;
        }
      } catch {}

      if (!includeFlags) includeFlags = `-I${repoRoot}/wrap/include -I${root}`;

      Object.assign(HPX, {
        available: true, mode: 'native',
        lib: libDir, include: root,
        includeFlags,
      });
      console.log(`[HPX] Local build at ${root} (${platform})`);
      return;
    } catch {}
  }

  HPX.mode = 'wandbox';
  console.log('[HPX] No compatible native runtime — Wandbox fallback active');
}

// ── Native HPX compilation ─────────────────────────────────────────
async function runWithHPX(code, { threads = 2, timeoutMs = 25000 } = {}) {
  const id = crypto.randomBytes(8).toString('hex');
  const tmp = path.join(os.tmpdir(), `hpx_pg_${id}`);
  await fs.mkdir(tmp, { recursive: true });

  const src = path.join(tmp, 'main.cpp');
  const bin = path.join(tmp, 'prog');
  await fs.writeFile(src, code, 'utf8');

  const repoRoot = path.resolve(__dirname, '..');
  const extraInc = `-I${repoRoot}/wrap/include`;

  const compileCmd = [
    HPX.cxx, '-std=c++17 -O2',
    HPX.includeFlags, extraInc,
    src,
    `-L${HPX.lib} -lhpx -lhpx_init`,
    `-Wl,-rpath,${HPX.lib}`,
    `-o ${bin}`,
  ].join(' ');

  return new Promise(resolve => {
    const t0 = Date.now();
    exec(compileCmd, { timeout: 60000 }, (ce, _, cstderr) => {
      const compileMs = Date.now() - t0;
      if (ce) {
        fs.rm(tmp, { recursive: true }).catch(() => {});
        return resolve({ ok: false, stage: 'compile', stderr: cstderr, compileMs });
      }
      const t1 = Date.now();
      exec(`${bin} --hpx:threads=${threads}`, { timeout: timeoutMs, cwd: tmp },
        (re, stdout, stderr) => {
          const runMs = Date.now() - t1;
          fs.rm(tmp, { recursive: true }).catch(() => {});
          resolve({ ok: !re || re.code === 0, stage: 'run', stdout, stderr, compileMs, runMs });
        });
    });
  });
}

// ── Wandbox fallback ───────────────────────────────────────────────
async function runWithWandbox(code, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'gcc-head',
        code,
        options: 'boost-1.83.0-gcc-head,warning',
        'compiler-option-raw': '-std=c++17 -O2 -pthread',
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const j = await res.json();
    return {
      ok: j.status === '0',
      stage: 'wandbox',
      stdout: j.program_output || '',
      stderr: (j.compiler_error || '') + (j.program_error || ''),
      compileMs: null, runMs: null,
      note: '⚠ Running via Wandbox (GCC + Boost). Select "Wandbox-compatible" examples from the sidebar, or deploy with Docker for full HPX support.',
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false, stage: 'wandbox',
      stderr: `Wandbox unreachable: ${err.message}`,
    };
  }
}

// ── Routes ─────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  res.json({ hpx: HPX.available, mode: HPX.mode, lib: HPX.lib, include: HPX.include });
});

app.post('/api/run', async (req, res) => {
  const { code, threads } = req.body;
  if (!code || typeof code !== 'string' || code.length > 60000)
    return res.status(400).json({ error: 'Invalid or oversized code payload' });
  try {
    const result = HPX.mode === 'native'
      ? await runWithHPX(code, { threads: Math.min(threads || 2, 8) })
      : await runWithWandbox(code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 8080;
detectHPX().then(() =>
  app.listen(PORT, () =>
    console.log(`HPX Playground → http://localhost:${PORT}  [mode: ${HPX.mode}]`)));
