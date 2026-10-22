const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 620,
    frame: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '..', 'LOGO.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // permite file:// para imagens/vídeos locais (app offline)
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---- Controles da janela ----
ipcMain.on('win:minimize', () => win.minimize());
ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win:close', () => win.close());

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
  const out = await Promise.all(entries.map(async (d) => {
    const full = path.join(dir, d.name);
    try {
      const st = await fs.promises.stat(full);
      return { name: d.name, path: full, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs };
    } catch {
      return null; // sem permissão / link quebrado
    }
  }));
  return out.filter(Boolean);
});

ipcMain.handle('fs:readfile', async (_e, file) => {
  const buf = await fs.promises.readFile(file);
  return buf; // Uint8Array no renderer
});

ipcMain.handle('fs:stat', async (_e, file) => {
  const st = await fs.promises.stat(file);
  return { size: st.size, mtime: st.mtimeMs, isDir: st.isDirectory() };
});

ipcMain.on('fs:reveal', (_e, file) => shell.showItemInFolder(file));

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
