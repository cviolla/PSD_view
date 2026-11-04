const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Flags para evitar conflitos de GPU/shader cache e travamentos de permissão no Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

// Garante apenas uma instância ativa do app para não conflitar pastas de cache
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 620,
    frame: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // permite file:// para imagens/vídeos locais (app offline)
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Segurança: o app é local; bloqueia abertura de novas janelas e navegação para fora da interface
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  win.on('enter-full-screen', () => win.webContents.send('win:fullscreen-changed', true));
  win.on('leave-full-screen', () => win.webContents.send('win:fullscreen-changed', false));
  win.on('maximize', () => win.webContents.send('win:maximized-changed', true));
  win.on('unmaximize', () => win.webContents.send('win:maximized-changed', false));
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---- Controles da janela ----
ipcMain.on('win:minimize', () => win.minimize());
ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.handle('win:is-maximized', () => (win ? win.isMaximized() : false));
ipcMain.on('win:close', () => win.close());
ipcMain.on('win:fullscreen', (_e, on) => win.setFullScreen(!!on));

// ---- Sistema de arquivos ----
ipcMain.handle('fs:home', () => ({
  Desktop: app.getPath('desktop'),
  Documentos: app.getPath('documents'),
  Imagens: app.getPath('pictures'),
  Downloads: app.getPath('downloads'),
  Vídeos: app.getPath('videos')
}));

ipcMain.handle('fs:readdir', async (_e, dir) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const out = [];
  const BATCH_SIZE = 48;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(chunk.map(async (d) => {
      const full = path.join(dir, d.name);
      try {
        const st = await fs.promises.stat(full);
        return { name: d.name, path: full, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs };
      } catch {
        return null; // sem permissão / link quebrado
      }
    }));
    for (const r of results) {
      if (r) out.push(r);
    }
  }
  return out;
});

ipcMain.handle('fs:readfile', async (_e, file) => {
  const buf = await fs.promises.readFile(file);
  return buf; // Uint8Array no renderer
});

// Extrai cabeçalho e miniatura JPEG embutida (Resource 1036) de PSD/PSB lendo apenas os primeiros KBs
ipcMain.handle('fs:psd-header', async (_e, file) => {
  let fh;
  try {
    fh = await fs.promises.open(file, 'r');
    const st = await fh.stat();
    const head = Buffer.alloc(30);
    const { bytesRead } = await fh.read(head, 0, 30, 0);
    if (bytesRead < 30 || head.toString('ascii', 0, 4) !== '8BPS') return null;

    const version = head.readUInt16BE(4); // 1 = PSD, 2 = PSB
    const channels = head.readUInt16BE(12);
    const height = head.readUInt32BE(14);
    const width = head.readUInt32BE(18);
    const depth = head.readUInt16BE(22);
    const colorMode = head.readUInt16BE(24);
    const colorModeLen = head.readUInt32BE(26);

    const resOffset = 30 + colorModeLen;
    const lenBuf = Buffer.alloc(4);
    const rLen = await fh.read(lenBuf, 0, 4, resOffset);
    let thumbDataUrl = null;

    if (rLen.bytesRead === 4) {
      const resLen = lenBuf.readUInt32BE(0);
      const readLen = Math.min(resLen, 16 * 1024 * 1024); // máx 16MB para recursos
      if (readLen > 0) {
        const resBuf = Buffer.alloc(readLen);
        const rData = await fh.read(resBuf, 0, readLen, resOffset + 4);
        const limit = rData.bytesRead;
        let pos = 0;
        while (pos + 12 <= limit) {
          if (resBuf.toString('ascii', pos, pos + 4) !== '8BIM') break;
          const id = resBuf.readUInt16BE(pos + 4);
          const nameLen = resBuf[pos + 6];
          const namePad = (nameLen + 1) % 2 === 0 ? (nameLen + 1) : (nameLen + 2);
          const sizePos = pos + 6 + namePad;
          if (sizePos + 4 > limit) break;
          const dataSize = resBuf.readUInt32BE(sizePos);
          const dataStart = sizePos + 4;
          const dataEnd = dataStart + dataSize;
          if (dataEnd > limit) break;

          if ((id === 1036 || id === 1033) && dataSize > 28) {
            const fmt = resBuf.readUInt32BE(dataStart);
            if (fmt === 1) {
              const jpegBuf = resBuf.subarray(dataStart + 28, dataEnd);
              thumbDataUrl = 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
              break;
            }
          }
          pos = dataEnd + (dataSize % 2 === 1 ? 1 : 0);
        }
      }
    }

    return {
      version,
      isPsb: version === 2,
      channels,
      width,
      height,
      depth,
      colorMode,
      fileSize: st.size,
      thumbDataUrl
    };
  } catch {
    return null;
  } finally {
    if (fh) await fh.close().catch(() => {});
  }
});

ipcMain.handle('fs:writefile', async (_e, filePath, base64Data) => {
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.promises.writeFile(filePath, buffer);
  return true;
});

ipcMain.handle('fs:saveFileDialog', async (_e, defaultName) => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Exportar imagem como PNG',
    defaultPath: defaultName,
    filters: [{ name: 'Imagem PNG (*.png)', extensions: ['png'] }]
  });
  return res.canceled ? null : res.filePath;
});

ipcMain.handle('fs:stat', async (_e, file) => {
  const st = await fs.promises.stat(file);
  return { size: st.size, mtime: st.mtimeMs, isDir: st.isDirectory() };
});

ipcMain.on('fs:reveal', (_e, file) => shell.showItemInFolder(file));
ipcMain.on('fs:open', (_e, file) => shell.openPath(file));

// ---- Menu de contexto: abrir com, copiar, colar, excluir, renomear, propriedades ----
function runPowerShell(script, env = {}) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      { env: { ...process.env, ...env }, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => (err ? reject(err) : resolve(String(stdout).trim())));
  });
}

function uniqueDest(dir, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let candidate = path.join(dir, name);
  let n = 0;
  while (fs.existsSync(candidate)) {
    n++;
    candidate = path.join(dir, `${base} - cópia${n > 1 ? ' (' + n + ')' : ''}${ext}`);
  }
  return candidate;
}

ipcMain.on('fs:openwith', (_e, file) => {
  if (process.platform === 'win32') {
    execFile('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', file], { windowsHide: false }, () => {});
  } else {
    shell.openPath(file);
  }
});

// Copia para a área de transferência do Windows (compatível com colar no Explorer)
ipcMain.handle('fs:copy', async (_e, files) => {
  await runPowerShell('Set-Clipboard -Path ((ConvertFrom-Json $env:PSDV_FILES) | ForEach-Object { $_ })',
    { PSDV_FILES: JSON.stringify(files) });
  return true;
});

ipcMain.handle('fs:paste', async (_e, destDir) => {
  const raw = await runPowerShell('$f = Get-Clipboard -Format FileDropList; if ($f) { ConvertTo-Json -InputObject @($f | ForEach-Object { $_.FullName }) -Compress }');
  if (!raw) return [];
  const list = JSON.parse(raw);
  const created = [];
  for (const src of list) {
    const dest = uniqueDest(destDir, path.basename(src));
    await fs.promises.cp(src, dest, { recursive: true });
    created.push(dest);
  }
  return created;
});

ipcMain.handle('fs:delete', async (_e, file) => {
  await shell.trashItem(file); // envia para a Lixeira (recuperável)
  return true;
});

ipcMain.handle('fs:rename', async (_e, file, newName) => {
  if (!newName || /[\\/:*?"<>|]/.test(newName)) throw new Error('Nome inválido. Não use \\ / : * ? " < > |');
  const dest = path.join(path.dirname(file), newName);
  if (dest.toLowerCase() !== file.toLowerCase() && fs.existsSync(dest)) throw new Error('Já existe um item com esse nome.');
  await fs.promises.rename(file, dest);
  return dest;
});

async function dirStats(dir, acc = { size: 0, files: 0, dirs: 0 }, depth = 0) {
  if (depth > 6) return acc;
  let entries = [];
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const d of entries) {
    const full = path.join(dir, d.name);
    try {
      if (d.isDirectory()) { acc.dirs++; await dirStats(full, acc, depth + 1); }
      else { const st = await fs.promises.stat(full); acc.size += st.size; acc.files++; }
    } catch {}
  }
  return acc;
}

ipcMain.handle('fs:props', async (_e, file) => {
  const st = await fs.promises.stat(file);
  const info = {
    name: path.basename(file), path: file, isDir: st.isDirectory(), size: st.size,
    created: st.birthtimeMs, modified: st.mtimeMs, accessed: st.atimeMs,
    readonly: !(st.mode & 0o200)
  };
  if (info.isDir) {
    const s = await dirStats(file);
    info.size = s.size; info.files = s.files; info.dirs = s.dirs;
  }
  return info;
});

// ---- Discos (Windows) ----
function listDrives() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([{ letter: '/', path: '/' }]);
    const drives = [];
    for (let c = 65; c <= 90; c++) {
      const p = String.fromCharCode(c) + ':\\';
      try { fs.accessSync(p); drives.push({ letter: String.fromCharCode(c) + ':', path: p }); } catch {}
    }
    resolve(drives);
  });
}

ipcMain.handle('fs:drives', async () => {
  const drives = await listDrives();
  return drives.map((d) => {
    try {
      const s = fs.statfsSync(d.path);
      const total = s.blocks * s.bsize;
      const free = s.bavail * s.bsize;
      return { ...d, total, free, used: total - free };
    } catch {
      return { ...d, total: 0, free: 0, used: 0 };
    }
  });
});

// ---- Busca global (home + todos os discos) com resultados em lote ----
let currentSearchId = 0;
const SEARCH_SKIP = new Set(['windows', '$recycle.bin', 'system volume information', 'node_modules', '.git', 'appdata', 'programdata', 'program files', 'program files (x86)', '$windows.~bt', 'recovery']);
const SEARCH_MAX = 1000;

ipcMain.on('search:cancel', () => { currentSearchId++; });

ipcMain.handle('search:start', async (e, query, searchDir = null) => {
  const id = ++currentSearchId;
  const q = String(query || '').trim().toLowerCase();
  const sender = e.sender;
  if (!q) return id;
  const send = (payload) => { if (!sender.isDestroyed()) sender.send('search:batch', { id, ...payload }); };

  (async () => {
    const roots = [];
    if (searchDir && typeof searchDir === 'string') {
      try {
        if (fs.existsSync(searchDir)) roots.push(searchDir);
      } catch {}
    }
    if (!roots.length) {
      for (const k of ['desktop', 'documents', 'pictures', 'downloads', 'videos']) {
        try { roots.push(app.getPath(k)); } catch {}
      }
      roots.push(...(await listDrives()).map((d) => d.path));
    }
    const visited = new Set();
    let batch = [];
    let total = 0;
    let lastFlush = Date.now();
    const flush = (force) => {
      if (batch.length && (force || Date.now() - lastFlush > 120)) {
        send({ items: batch, done: false });
        batch = [];
        lastFlush = Date.now();
      }
    };

    for (const root of roots) {
      const queue = [root];
      while (queue.length) {
        if (id !== currentSearchId) return; // cancelada / substituída
        if (total >= SEARCH_MAX) break;
        const dir = queue.shift();
        const key = dir.toLowerCase();
        if (visited.has(key)) continue;
        visited.add(key);
        let entries;
        try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { continue; }
        for (const d of entries) {
          const full = path.join(dir, d.name);
          const isDir = d.isDirectory();
          if (d.name.toLowerCase().includes(q)) {
            let size = 0, mtime = 0;
            try { const st = await fs.promises.stat(full); size = st.size; mtime = st.mtimeMs; } catch {}
            batch.push({ name: d.name, path: full, isDir, size, mtime });
            total++;
            if (total >= SEARCH_MAX) break;
          }
          if (isDir && !d.isSymbolicLink() && !SEARCH_SKIP.has(d.name.toLowerCase())) queue.push(full);
        }
        flush(false);
      }
      if (total >= SEARCH_MAX) break;
    }
    if (id !== currentSearchId) return;
    send({ items: batch, done: true, truncated: total >= SEARCH_MAX });
  })().catch(() => send({ items: [], done: true }));

  return id;
});
