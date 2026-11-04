/* ==========================================================================
   PSD VIEW - Renderer Script com Suporte a Gilroy e Ícones Oficiais
   ========================================================================== */

const IMG = ['jpg','jpeg','png','gif','bmp','webp','svg','ico','avif','tif','tiff'];
const VID = ['mp4','webm','mov','mkv','avi','m4v','ogv','wmv','flv'];
const PSD = ['psd','psb'];
const PDF = ['pdf'];

const iconPaths = {
  dir: '../../icons/Opened-Folder.png',
  psd: '../../icons/Adobe-Photoshop.png',
  pdf: '../../icons/Docs.png',
  image: '../../icons/Picture.png',
  video: '../../icons/Clip-Appearance.png',
  other: '../../icons/Docs.png'
};

const $ = (id) => document.getElementById(id);
const ext = (n) => (n.includes('.') ? n.split('.').pop().toLowerCase() : '');
const kind = (f) => f.isDir ? 'dir' : PSD.includes(ext(f.name)) ? 'psd' : PDF.includes(ext(f.name)) ? 'pdf' : IMG.includes(ext(f.name)) ? 'image' : VID.includes(ext(f.name)) ? 'video' : 'other';
const fileUrl = (p) => 'file:///' + encodeURI(p.replace(/\\/g, '/')).replace(/#/g, '%23');
const fmtSize = (b) => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(2) + ' KB';
const fmtGB = (b) => (b / 1073741824).toFixed(1) + ' GB';
// Escapa texto vindo do disco (nomes/caminhos) antes de inserir via innerHTML
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

const state = { 
  dir: null, 
  items: [], 
  filter: 'all', 
  query: '', 
  searchScope: 'folder',
  searchActive: false,
  searchItems: [],
  searchDone: true,
  searchId: 0,
  history: [],
  historyIndex: -1,
  selected: null, 
  viewables: [], 
  rating: store.get('ratings', {}), 
  favs: store.get('favs', []), 
  pinned: store.get('pinned', []), 
  nav: { rot: 0, zoom: 1, x: 0, y: 0 }, 
  token: 0,
  viewMode: store.get('viewMode', 'columns'),
  lastTextMode: store.get('lastTextMode', 'columns'),
  rightTab: 'props',
  soloLayerId: null,
  pdfDoc: null,
  pdfPage: 1,
  pdfTotalPages: 1,
  tiffMultiPage: false,
  tiffPage: 1,
  tiffTotalPages: 1
};

/* ---------- Janela / Tema ---------- */
$('btn-min').onclick = () => api.minimize();
$('btn-max').onclick = () => api.maximize();
$('btn-close').onclick = () => api.close();

function updateMaxBtn(isMax) {
  const btn = $('btn-max');
  const img = $('icon-max');
  if (!btn || !img) return;
  if (isMax) {
    img.src = '../../icons/minimize 2.png';
    btn.title = 'Restaurar tamanho';
  } else {
    img.src = '../../icons/Decompress.png';
    btn.title = 'Maximizar';
  }
}

if (api.onMaximizedChange) {
  api.onMaximizedChange((isMax) => updateMaxBtn(isMax));
}
if (api.isMaximized) {
  api.isMaximized().then(updateMaxBtn).catch(() => {});
}

function setTheme(dark) { 
  document.body.classList.toggle('dark', dark); 
  const iconImg = $('icon-theme');
  if (iconImg) {
    iconImg.src = dark ? '../../icons/Moon-and-Stars.png' : '../../icons/Sun.png';
  }
  const logoSrc = dark ? '../../LOGO2.png' : '../../LOGO.png';
  const logo = $('logo');
  if (logo) logo.src = logoSrc;
  const aboutLogo = $('about-logo');
  if (aboutLogo) aboutLogo.src = dark ? '../../ISO1.png' : '../../ISO2.png';
  store.set('dark', dark); 
}
$('btn-theme').onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(store.get('dark', false));

$('btn-about').onclick = () => $('about').classList.remove('hidden');
$('about').onclick = (e) => { if (e.target === $('about')) $('about').classList.add('hidden'); };
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('about').classList.contains('hidden')) $('about').classList.add('hidden');
});

/* ---------- Persistência dos Painéis (Sistema, Discos, Favoritos) ---------- */
const savedCollapsed = store.get('collapsedGroups', {});
document.querySelectorAll('.group[data-group]').forEach((groupEl) => {
  const key = groupEl.dataset.group;
  if (savedCollapsed[key]) {
    groupEl.classList.add('collapsed');
  }
});

document.querySelectorAll('.group-head').forEach((h) => {
  h.onclick = () => {
    const parent = h.parentElement;
    parent.classList.toggle('collapsed');
    const key = parent.dataset.group;
    if (key) {
      const current = store.get('collapsedGroups', {});
      current[key] = parent.classList.contains('collapsed');
      store.set('collapsedGroups', current);
    }
  };
});

/* ---------- Navegação Lateral ---------- */
function navButton(label, path) {
  const b = document.createElement('button');
  b.innerHTML = `<img src="../../icons/Opened-Folder.png" class="sub-folder-icon" alt="" /><span>${esc(label)}</span>`; 
  b.title = path; 
  b.onclick = () => openDir(path);
  return b;
}

async function buildNav() {
  const home = await api.home();
  const gs = $('g-sistema'); 
  gs.innerHTML = '';
  Object.entries(home).forEach(([k, v]) => gs.appendChild(navButton(k, v)));
  
  const drives = await api.drives();
  const gd = $('g-discos'); 
  gd.innerHTML = '';
  drives.forEach((d) => gd.appendChild(navButton(d.letter, d.path)));
  
  const validDrives = drives.filter((d) => d.total);
  const totalCap = validDrives.reduce((acc, d) => acc + (d.total || 0), 0);
  const totalFree = validDrives.reduce((acc, d) => acc + (d.free || 0), 0);
  const sumEl = $('storage-summary');
  if (sumEl) {
    sumEl.textContent = `${validDrives.length} unidades · ${fmtGB(totalFree)} livres de ${fmtGB(totalCap)}`;
  }

  const sl = $('storage-list'); 
  sl.innerHTML = '';
  validDrives.forEach((d) => {
    const p = Math.round((d.used / d.total) * 100);
    const el = document.createElement('div'); 
    el.className = 'drive-card';
    el.dataset.letter = d.letter;
    el.dataset.path = d.path;
    el.innerHTML = `
      <div class="ring" style="--p:${p}" data-p="${p}%"></div>
      <div class="drive-info">
        <div class="drive-letter">${d.letter}</div>
        <div class="drive-stats">${fmtGB(d.used)} usados · ${fmtGB(d.free)} livres de ${fmtGB(d.total)}</div>
        <div class="drive-sub">Interno · NTFS</div>
      </div>
    `;
    el.onclick = () => openDir(d.path);
    sl.appendChild(el);
  });
  updateActiveDrive();
  renderFavs();
}

function getFolderDisplayName(fullPath) {
  if (!fullPath) return 'Pasta';
  const clean = String(fullPath).replace(/[\\/]+$/, '');
  if (/^[a-zA-Z]:$/.test(clean)) return clean;
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts.pop() || clean || fullPath;
}

function renderFavs() {
  const g = $('g-favoritos'); 
  g.innerHTML = '';
  if (!state.favs.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size: 11.5px; color: var(--muted); padding: 5px 8px; font-weight: 300;';
    empty.textContent = 'Nenhuma pasta favoritada';
    g.appendChild(empty);
    updateFavBtn();
    return;
  }
  state.favs.forEach((p) => {
    const label = getFolderDisplayName(p);
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.title = p;
    item.innerHTML = `
      <button class="fav-link">
        <img src="../../icons/Opened-Folder.png" class="sub-folder-icon" alt="" />
        <span class="fav-label">${esc(label)}</span>
      </button>
      <button class="fav-del-btn" title="Remover dos favoritos">✕</button>
    `;
    item.querySelector('.fav-link').onclick = () => openDir(p);
    item.querySelector('.fav-del-btn').onclick = (e) => {
      e.stopPropagation();
      state.favs = state.favs.filter((f) => f !== p);
      store.set('favs', state.favs);
      renderFavs();
      updateFavBtn();
    };
    g.appendChild(item);
  });
  updateFavBtn();
}

function updateFavBtn() {
  const btn = $('btn-fav');
  if (!btn) return;
  if (state.dir && state.favs.includes(state.dir)) {
    $('btn-fav-label').textContent = 'Pasta favoritada (remover)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--accent)';
    btn.style.boxShadow = '0 0 10px rgba(228, 255, 0, 0.3)';
  } else {
    $('btn-fav-label').textContent = 'Favoritar pasta atual';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = '';
    btn.style.boxShadow = '';
  }
}

$('btn-fav').onclick = () => {
  if (!state.dir) return;
  if (state.favs.includes(state.dir)) {
    state.favs = state.favs.filter((f) => f !== state.dir);
  } else {
    state.favs.push(state.dir);
  }
  store.set('favs', state.favs); 
  renderFavs();
  updateFavBtn();
};

/* ---------- Acesso Rápido (Fixar até 3 Arquivos Frequentes) ---------- */
const MAX_PINNED = 3;

function isPinned(path) {
  return state.pinned.some((p) => p.path === path);
}

function updatePinBtn() {
  const btn = $('btn-pin');
  if (!btn) return;
  const sel = state.selected;
  // Botão só fica visível quando um arquivo está selecionado (pastas usam Favoritos)
  if (!sel || sel.isDir) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'flex';
  if (isPinned(sel.path)) {
    $('btn-pin-label').textContent = 'Arquivo fixado (remover)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--accent)';
    btn.style.boxShadow = '0 0 10px rgba(228, 255, 0, 0.3)';
  } else {
    $('btn-pin-label').textContent = 'Fixar no Acesso Rápido';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = '';
    btn.style.boxShadow = '';
  }
}

async function togglePin(item) {
  if (!item || item.isDir) return;
  if (isPinned(item.path)) {
    state.pinned = state.pinned.filter((p) => p.path !== item.path);
  } else {
    if (state.pinned.length >= MAX_PINNED) {
      await showError(`Limite de ${MAX_PINNED} arquivos fixados atingido. Desfixe um arquivo antes de adicionar outro.`);
      return;
    }
    state.pinned.push({
      path: item.path,
      name: item.name,
      kind: item.kind || kind(item),
      size: item.size || 0,
      mtime: item.mtime || Date.now()
    });
  }
  store.set('pinned', state.pinned);
  renderQuickAccess();
  updatePinBtn();
}

const btnPin = $('btn-pin');
if (btnPin) {
  btnPin.onclick = () => {
    if (state.selected && !state.selected.isDir) {
      togglePin(state.selected);
    }
  };
}

function updateQuickAccessActive() {
  const curPath = state.selected?.path;
  document.querySelectorAll('.qa-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.path === curPath);
  });
}

function renderQuickAccess() {
  const list = $('qa-list');
  const badge = $('qa-badge');
  if (!list) return;
  if (badge) badge.textContent = `${state.pinned.length}/${MAX_PINNED}`;
  list.innerHTML = '';

  if (!state.pinned.length) {
    const empty = document.createElement('div');
    empty.className = 'qa-empty';
    empty.innerHTML = 'Nenhum arquivo fixado<br><span style="opacity:0.75; font-size:10.5px;">Fixe até 3 arquivos favoritos</span>';
    list.appendChild(empty);
    updateQuickAccessActive();
    return;
  }

  state.pinned.forEach((file) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'qa-item' + (state.selected?.path === file.path ? ' active' : '');
    itemEl.dataset.path = file.path;
    itemEl.title = `${file.name}\n${file.path}\nClique: Selecionar e visualizar\nDuplo clique: Abrir no programa padrão`;

    const iconSrc = iconPaths[file.kind] || iconPaths.other;
    const parentDir = file.path.replace(/[\\/][^\\/]*$/, '');
    const folderDisplay = getFolderDisplayName(parentDir);

    itemEl.innerHTML = `
      <img src="${iconSrc}" class="qa-item-icon" alt="" />
      <div class="qa-item-info">
        <span class="qa-item-name">${esc(file.name)}</span>
        <span class="qa-item-sub">${esc(folderDisplay)}</span>
      </div>
      <button class="qa-item-del" title="Desfixar do Acesso Rápido" aria-label="Desfixar">✕</button>
    `;

    // Clique simples: abre a pasta de origem, seleciona o arquivo e faz o preview
    itemEl.onclick = async () => {
      try {
        if (state.dir !== parentDir) {
          await openDir(parentDir);
        }
        const target = state.items.find((i) => i.path === file.path) || file;
        const domEl = document.querySelector(`.item[data-path="${CSS.escape(file.path)}"]`);
        select(target, domEl);
        if (domEl) domEl.scrollIntoView({ block: 'nearest' });
      } catch (err) {
        showError('Não foi possível acessar o arquivo fixado: ' + (err.message || err));
      }
    };

    // Duplo clique: abre diretamente no programa padrão
    itemEl.ondblclick = (e) => {
      e.stopPropagation();
      api.open(file.path);
    };

    // Botão de desfixar (✕)
    itemEl.querySelector('.qa-item-del').onclick = (e) => {
      e.stopPropagation();
      state.pinned = state.pinned.filter((p) => p.path !== file.path);
      store.set('pinned', state.pinned);
      renderQuickAccess();
      updatePinBtn();
    };

    list.appendChild(itemEl);
  });

  updateQuickAccessActive();
}

/* ---------- Alternância de Visualização da Lista (Colunas / Lista / Galeria de Miniaturas) ---------- */
function applyViewMode(mode, reRender = true) {
  if (mode === 'columns' || mode === 'list') {
    state.lastTextMode = mode;
    store.set('lastTextMode', mode);
  }
  state.viewMode = mode;
  store.set('viewMode', mode);
  const fl = $('file-list');
  const btn = $('toggle-view');
  const img = $('toggle-view-img');
  const btnGal = $('btn-gallery');
  if (!fl || !btn) return;

  fl.classList.remove('view-columns', 'view-list', 'view-gallery');
  if (mode === 'gallery') {
    fl.classList.add('view-gallery');
    if (btnGal) btnGal.classList.add('active');
    btn.title = 'Alternar para modo de Lista ou Colunas';
  } else if (mode === 'list') {
    fl.classList.add('view-list');
    if (btnGal) btnGal.classList.remove('active');
    if (img) img.src = '../../icons/OFF.png';
    btn.title = 'Modo de exibição: Lista linear (clique para Múltiplas Colunas)';
  } else {
    fl.classList.add('view-columns');
    if (btnGal) btnGal.classList.remove('active');
    if (img) img.src = '../../icons/ON.png';
    btn.title = 'Modo de exibição: Múltiplas Colunas (clique para Lista linear)';
  }

  if (reRender && (state.dir || state.searchActive)) {
    renderList();
  }
}

const toggleViewBtn = $('toggle-view');
if (toggleViewBtn) {
  toggleViewBtn.onclick = () => {
    if (state.viewMode === 'gallery') {
      applyViewMode(state.lastTextMode || 'columns');
    } else {
      applyViewMode(state.viewMode === 'columns' ? 'list' : 'columns');
    }
  };
}

const btnGallery = $('btn-gallery');
if (btnGallery) {
  btnGallery.onclick = () => {
    if (state.viewMode === 'gallery') {
      applyViewMode(state.lastTextMode || 'columns');
    } else {
      applyViewMode('gallery');
    }
  };
}

/* ---------- Sistema de Miniaturas (Lazy Loading + Fila de Concorrência) ---------- */
const thumbCache = new Map(); // path -> dataUrl ou URL
let thumbQueue = [];
let activeThumbWorkers = 0;
const MAX_THUMB_WORKERS = 3;

const thumbObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const card = entry.target;
      thumbObserver.unobserve(card);
      const itemRef = card._itemRef;
      if (itemRef) enqueueThumb(card, itemRef);
    }
  });
}, { root: $('file-list'), rootMargin: '140px' });

function enqueueThumb(cardEl, item) {
  if (thumbCache.has(item.path)) {
    applyThumbToCard(cardEl, thumbCache.get(item.path));
    return;
  }
  thumbQueue.push({ cardEl, item });
  processThumbQueue();
}

function applyThumbToCard(cardEl, src) {
  if (!cardEl || !src || !cardEl.isConnected) return;
  const box = cardEl.querySelector('.thumb-box');
  if (!box) return;
  const existing = box.querySelector('.thumb-img');
  if (existing) {
    existing.src = src;
    return;
  }
  const img = new Image();
  img.className = 'thumb-img';
  img.alt = '';
  img.onload = () => {
    const fb = box.querySelector('.thumb-fallback-icon');
    if (fb) fb.style.display = 'none';
  };
  img.src = src;
  box.insertBefore(img, box.firstChild);
}

async function processThumbQueue() {
  while (activeThumbWorkers < MAX_THUMB_WORKERS && thumbQueue.length > 0) {
    const task = thumbQueue.shift();
    if (!task.cardEl.isConnected) continue;
    activeThumbWorkers++;
    generateThumbnail(task.item)
      .then((url) => {
        if (url) {
          thumbCache.set(task.item.path, url);
          if (thumbCache.size > 400) thumbCache.delete(thumbCache.keys().next().value);
          applyThumbToCard(task.cardEl, url);
        }
      })
      .catch(() => {})
      .finally(() => {
        activeThumbWorkers--;
        processThumbQueue();
      });
  }
}

async function generateThumbnail(item) {
  if (item.isDir) return null;
  const e = ext(item.name);
  if (item.kind === 'psd') {
    // 1. Extração ultrarrápida do recurso JPEG embutido (1036) via header reader (< 2ms)
    const hdr = await api.psdHeader(item.path);
    if (hdr && hdr.thumbDataUrl) return hdr.thumbDataUrl;
    // 2. Fallback para composite se o arquivo for <= 300MB
    if (item.size <= 300 * 1024 * 1024) {
      const entry = await psdToData(item.path);
      if (entry?.canvas) return canvasToThumbDataUrl(entry.canvas, 160);
    }
    return null;
  }
  if (e === 'tif' || e === 'tiff') {
    const tiffData = await tiffToCanvas(item.path, 0);
    if (tiffData?.canvas) return canvasToThumbDataUrl(tiffData.canvas, 160);
    return null;
  }
  if (item.kind === 'image') {
    return fileUrl(item.path);
  }
  if (item.kind === 'pdf') {
    if (item.size > 80 * 1024 * 1024) return null;
    const lib = await getPdfLib();
    const buf = await api.readfile(item.path);
    const pdfDoc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 0.4 });
    const c = document.createElement('canvas');
    c.width = vp.width;
    c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return c.toDataURL('image/jpeg', 0.8);
  }
  if (item.kind === 'video') {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.muted = true;
      v.preload = 'metadata';
      let done = false;
      const finish = (val) => {
        if (done) return;
        done = true;
        v.removeAttribute('src');
        v.load();
        resolve(val);
      };
      const timer = setTimeout(() => finish(null), 2500);
      v.onloadeddata = () => {
        v.currentTime = Math.min(1, (v.duration || 0) * 0.15);
      };
      v.onseeked = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          const ratio = (v.videoWidth || 160) / (v.videoHeight || 90);
          c.width = 160;
          c.height = Math.max(60, Math.round(160 / ratio));
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          finish(c.toDataURL('image/jpeg', 0.78));
        } catch {
          finish(null);
        }
      };
      v.onerror = () => { clearTimeout(timer); finish(null); };
      v.src = fileUrl(item.path);
    });
  }
  return null;
}

function canvasToThumbDataUrl(srcCanvas, maxDim = 160) {
  const w = srcCanvas.width || 1;
  const h = srcCanvas.height || 1;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(srcCanvas, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

function updateActiveDrive() {
  const currentDir = state.dir || '';
  const currentDrive = currentDir.match(/^([a-zA-Z]):/)?.[1]?.toUpperCase();
  document.querySelectorAll('.drive-card').forEach((card) => {
    const letter = card.dataset.letter?.replace(':', '').toUpperCase();
    if (letter && currentDrive && letter === currentDrive) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

/* ---------- Lista de Arquivos e Histórico de Navegação ---------- */
function updateHistoryButtons() {
  const btnBack = $('btn-back');
  const btnForward = $('btn-forward');
  if (btnBack) btnBack.disabled = state.historyIndex <= 0;
  if (btnForward) btnForward.disabled = state.historyIndex >= state.history.length - 1;
}

function goBackDir() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    openDir(state.history[state.historyIndex], false);
  }
}

function goForwardDir() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    openDir(state.history[state.historyIndex], false);
  }
}

$('btn-back').onclick = goBackDir;
$('btn-forward').onclick = goForwardDir;

async function openDir(dir, recordHistory = true) {
  try {
    const items = await api.readdir(dir);
    stopSearch(true);
    state.dir = dir;
    if (recordHistory) {
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      state.history.push(dir);
      state.historyIndex = state.history.length - 1;
    }
    updateHistoryButtons();
    state.items = items.map((i) => ({ ...i, kind: kind(i) }))
      .sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    $('crumb').textContent = dir;
    renderList();
    updateFavBtn();
    updateActiveDrive();
  } catch (e) {
    $('crumb').textContent = 'Não foi possível abrir: ' + dir;
  }
}

function renderList() {
  thumbObserver.disconnect();
  thumbQueue = [];
  const q = state.query.toLowerCase();
  const source = state.searchActive ? state.searchItems : state.items;
  const list = source.filter((i) => {
    if (!state.searchActive && q && !i.name.toLowerCase().includes(q)) return false;
    if (state.filter === 'all') return true;
    return i.isDir || i.kind === state.filter;
  });
  state.viewables = list.filter((i) => ['image', 'psd', 'video', 'pdf'].includes(i.kind));
  const scopeSuffix = state.searchScope === 'folder' ? ' (nesta pasta)' : ' (busca global)';
  $('count').textContent = list.length + ' itens' + (state.searchActive ? (state.searchDone ? scopeSuffix : ' — buscando…') : '');
  const frag = document.createDocumentFragment();
  const isGallery = state.viewMode === 'gallery';
  
  const LIMIT = 3000;
  list.slice(0, LIMIT).forEach((i) => {
    const el = document.createElement('div');
    const isSel = state.selected?.path === i.path;
    el.className = 'item' + (isGallery ? ' gallery-card' : '') + (isSel ? ' sel' : '');
    el.title = state.searchActive ? i.path : i.name; 
    el.dataset.path = i.path;
    
    const iconSrc = iconPaths[i.kind] || iconPaths.other;
    if (isGallery) {
      const badgeLabel = i.isDir ? 'PASTA' : (ext(i.name).toUpperCase() || 'ARQ');
      const subText = state.searchActive
        ? esc(i.path.slice(0, Math.max(0, i.path.length - i.name.length - 1)))
        : (i.isDir ? 'Pasta' : fmtSize(i.size));
      el.innerHTML = `
        <div class="thumb-box">
          <img src="${iconSrc}" class="thumb-fallback-icon" alt="" />
          <span class="thumb-ext-badge">${esc(badgeLabel)}</span>
        </div>
        <div class="gallery-card-title">${esc(i.name)}</div>
        <div class="gallery-card-sub">${subText}</div>
      `;
      if (!i.isDir && ['image', 'psd', 'pdf', 'video'].includes(i.kind)) {
        el._itemRef = i;
        if (thumbCache.has(i.path)) {
          applyThumbToCard(el, thumbCache.get(i.path));
        } else {
          thumbObserver.observe(el);
        }
      }
    } else {
      const sub = state.searchActive ? `<em class="item-path">${esc(i.path.slice(0, Math.max(0, i.path.length - i.name.length - 1)))}</em>` : '';
      el.innerHTML = `<img src="${iconSrc}" class="item-file-icon" alt="" /><span>${esc(i.name)}${sub}</span>`;
    }
    
    el.onclick = () => select(i, el);
    el.ondblclick = () => (i.isDir ? openDir(i.path) : api.open(i.path));
    el.oncontextmenu = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      select(i, el);
      showContextMenu(ev.clientX, ev.clientY, i);
    };
    frag.appendChild(el);
  });
  const fl = $('file-list'); 
  fl.innerHTML = ''; 
  fl.appendChild(frag);
}

$('btn-up').onclick = () => {
  if (!state.dir) return;
  const up = state.dir.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
  openDir(/^[A-Za-z]:$/.test(up) ? up + '\\' : up || state.dir);
};

/* ---------- Busca (Pasta atual recursiva ou Global em todo o PC) ---------- */
let searchTimer = null;

function stopSearch(clearInput) {
  clearTimeout(searchTimer);
  if (state.searchActive) api.searchCancel();
  state.searchActive = false;
  state.searchItems = [];
  state.searchDone = true;
  if (clearInput) {
    state.query = '';
    $('search').value = '';
  }
}

api.onSearchBatch((d) => {
  if (!state.searchActive || (state.searchId && d.id < state.searchId)) return;
  state.searchItems.push(...d.items.map((i) => ({ ...i, kind: kind(i) })));
  if (d.done) state.searchDone = true;
  renderList();
  if (d.done) {
    const isFolder = state.searchScope === 'folder' && state.dir;
    const targetLabel = isFolder ? ('na pasta "' + state.dir + '"') : 'em todo o computador';
    $('crumb').textContent = 'Resultados para "' + state.query + '" ' + targetLabel + (d.truncated ? ' (primeiros 1000)' : '');
  }
});

function triggerSearch() {
  clearTimeout(searchTimer);
  const q = state.query.trim();
  if (q.length < 2) {
    const wasActive = state.searchActive;
    stopSearch(false);
    if (wasActive && state.dir) $('crumb').textContent = state.dir;
    renderList();
    return;
  }
  searchTimer = setTimeout(async () => {
    state.searchActive = true;
    state.searchItems = [];
    state.searchDone = false;
    const isFolder = state.searchScope === 'folder' && state.dir;
    const targetLabel = isFolder ? ('em ' + state.dir) : 'em todo o computador';
    $('crumb').textContent = 'Buscando "' + q + '" ' + targetLabel + '…';
    renderList();
    state.searchId = await api.searchStart(q, isFolder ? state.dir : null);
  }, 250);
}

$('search').oninput = (e) => { 
  state.query = e.target.value; 
  triggerSearch();
};

const scopeButtons = document.querySelectorAll('#search-scope .scope-btn');
function setSearchScope(scope) {
  state.searchScope = scope;
  scopeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scope === scope);
  });
  const input = $('search');
  if (scope === 'folder') {
    input.placeholder = 'Buscar nesta pasta...';
  } else {
    input.placeholder = 'Buscar em todo o computador...';
  }
  if (state.query.trim().length >= 2) {
    triggerSearch();
  }
}

scopeButtons.forEach((btn) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    setSearchScope(btn.dataset.scope);
  };
});

document.querySelectorAll('#filters button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('#filters button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active'); 
  state.filter = b.dataset.filter; 
  renderList();
});

/* ---------- Abas do Painel Direito (Propriedades / Camadas) ---------- */
function setRightTab(tab) {
  state.rightTab = tab;
  const btnProps = $('tab-btn-props');
  const btnLayers = $('tab-btn-layers');
  const paneProps = $('pane-props');
  const paneLayers = $('pane-layers');
  const btnViewerLayers = $('btn-layers-toggle');

  if (btnProps) btnProps.classList.toggle('active', tab === 'props');
  if (btnLayers) btnLayers.classList.toggle('active', tab === 'layers');
  if (paneProps) paneProps.classList.toggle('hidden', tab !== 'props');
  if (paneLayers) paneLayers.classList.toggle('hidden', tab !== 'layers');
  if (btnViewerLayers) btnViewerLayers.classList.toggle('active', tab === 'layers');
}

if ($('tab-btn-props')) $('tab-btn-props').onclick = () => setRightTab('props');
if ($('tab-btn-layers')) $('tab-btn-layers').onclick = () => setRightTab('layers');
if ($('btn-layers-toggle')) {
  $('btn-layers-toggle').onclick = () => {
    setRightTab(state.rightTab === 'layers' ? 'props' : 'layers');
  };
}

/* ---------- Seleção / Preview / Propriedades ---------- */
function select(item, el) {
  state.selected = item;
  state.soloLayerId = null;
  document.querySelectorAll('.item.sel').forEach((x) => x.classList.remove('sel'));
  el?.classList.add('sel');
  showProps(item);
  updatePinBtn();
  updateQuickAccessActive();
  const btnLayersToggle = $('btn-layers-toggle');
  if (btnLayersToggle) {
    btnLayersToggle.classList.toggle('hidden', item.kind !== 'psd');
  }
  if (item.kind !== 'psd') {
    const badge = $('layers-badge');
    if (badge) badge.classList.add('hidden');
    const tree = $('layers-tree');
    if (tree) tree.innerHTML = '<div class="layers-empty">Selecione um arquivo PSD ou PSB para inspecionar suas camadas</div>';
    const status = $('layers-status');
    if (status) status.classList.add('hidden');
  }
  if (['image', 'psd', 'video', 'pdf'].includes(item.kind)) {
    preview(item);
  } else {
    showGenericPreview(item);
  }
  prefetch(item);
}

function getFormatDescription(item) {
  if (item.isDir) return 'Pasta';
  const e = ext(item.name);
  if (e === 'psb') return `${item.name} (PSB · Grande Formato)`;
  if (e === 'psd') return `${item.name} (PSD · Photoshop)`;
  if (e === 'tif' || e === 'tiff') return `${item.name} (TIFF)`;
  return item.name;
}

function showProps(item) {
  $('p-tipo').textContent = getFormatDescription(item);
  $('p-tam').textContent = item.isDir ? '—' : fmtSize(item.size);
  $('p-cam').textContent = item.path.length > 34 ? '…' + item.path.slice(-32) : item.path;
  $('p-cam').title = item.path;
  $('p-mod').textContent = new Date(item.mtime).toLocaleDateString('pt-BR');
  $('p-dim').textContent = '—'; 
  $('p-time').textContent = '—';
  renderStars();
}

function renderStars() {
  const box = $('p-stars'); 
  box.innerHTML = '';
  const cur = state.selected ? state.rating[state.selected.path] || 0 : 0;
  for (let n = 1; n <= 5; n++) {
    const s = document.createElement('img'); 
    s.src = '../../icons/Star.png';
    s.className = 'star-img' + (n <= cur ? ' active' : '');
    s.title = `${n} estrela(s)`;
    s.onclick = () => {
      if (!state.selected) return;
      state.rating[state.selected.path] = cur === n ? 0 : n;
      store.set('ratings', state.rating); 
      renderStars();
    };
    box.appendChild(s);
  }
}

$('btn-reveal').onclick = () => state.selected && api.reveal(state.selected.path);
$('btn-open-app').onclick = () => state.selected && api.open(state.selected.path);

/* ---------- Decodificador PSD / PSB em 2 Estágios + Árvore de Camadas ---------- */
const psdCache = new Map(); // path -> { canvas, compositeCanvas, psd, layersLoaded, totalLayers, isHugeFallback }
const MAX_BUFFER_READ_BYTES = 1800 * 1024 * 1024; // ~1.8 GB segurança para Buffer do Node

function assignLayerMeta(nodes, counter = { id: 1, count: 0 }) {
  if (!Array.isArray(nodes)) return counter;
  for (const node of nodes) {
    node._id = counter.id++;
    node._origHidden = !!node.hidden;
    if (Array.isArray(node.children)) {
      if (typeof node._collapsed !== 'boolean') {
        node._collapsed = node.opened === false;
      }
      assignLayerMeta(node.children, counter);
    } else {
      counter.count++;
    }
  }
  return counter;
}

function syncLayerStates(srcNodes, dstNodes) {
  if (!Array.isArray(srcNodes) || !Array.isArray(dstNodes)) return;
  const len = Math.min(srcNodes.length, dstNodes.length);
  for (let i = 0; i < len; i++) {
    dstNodes[i]._id = srcNodes[i]._id;
    dstNodes[i]._origHidden = srcNodes[i]._origHidden;
    dstNodes[i].hidden = srcNodes[i].hidden;
    dstNodes[i]._collapsed = srcNodes[i]._collapsed;
    if (srcNodes[i].children && dstNodes[i].children) {
      syncLayerStates(srcNodes[i].children, dstNodes[i].children);
    }
  }
}

async function psdToData(path, fileSize = 0) {
  if (psdCache.has(path)) return psdCache.get(path);

  // Proteção para arquivos PSB gigantes (> 1.8 GB): usa header reader com miniatura embutida
  if (fileSize > MAX_BUFFER_READ_BYTES) {
    const hdr = await api.psdHeader(path);
    const canvas = document.createElement('canvas');
    if (hdr && hdr.thumbDataUrl) {
      const img = new Image();
      img.src = hdr.thumbDataUrl;
      await img.decode();
      canvas.width = hdr.width || img.naturalWidth || 800;
      canvas.height = hdr.height || img.naturalHeight || 600;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = hdr?.width || 800;
      canvas.height = hdr?.height || 600;
    }
    const entry = {
      canvas,
      compositeCanvas: canvas,
      psd: { width: hdr?.width || canvas.width, height: hdr?.height || canvas.height, children: [] },
      layersLoaded: false,
      totalLayers: 0,
      isHugeFallback: true
    };
    psdCache.set(path, entry);
    return entry;
  }

  // Estágio 1: Leitura rápida da imagem composta + metadados da árvore de camadas (sem decodificar pixels de cada camada)
  const buf = await api.readfile(path);
  const u8 = buf.buffer ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf;
  let psd;
  let layersLoaded = false;
  try {
    psd = agPsd.readPsd(u8, { skipLayerImageData: true, skipThumbnail: true, skipCompositeImageData: false });
    if (!psd.canvas && psd.children && psd.children.length) {
      // Arquivos salvos sem "Maximizar Compatibilidade" precisam das camadas no Estágio 1
      psd = agPsd.readPsd(u8, { skipThumbnail: true });
      layersLoaded = true;
    }
  } catch {
    psd = agPsd.readPsd(u8);
    layersLoaded = true;
  }

  const meta = assignLayerMeta(psd.children || []);
  let canvas = psd.canvas;
  if (!canvas) {
    canvas = composePsdLayersToCanvas(psd, null);
  }

  const entry = {
    canvas,
    compositeCanvas: canvas,
    psd,
    layersLoaded,
    totalLayers: meta.count
  };
  psdCache.set(path, entry);
  if (psdCache.size > 8) psdCache.delete(psdCache.keys().next().value);
  return entry;
}

async function psdToCanvas(path, fileSize = 0) {
  const entry = await psdToData(path, fileSize);
  return entry.canvas;
}

async function ensurePsdLayersLoaded(path) {
  const entry = psdCache.get(path);
  if (!entry) return null;
  if (entry.layersLoaded || entry.isHugeFallback) return entry;

  const statusEl = $('layers-status');
  if (statusEl) {
    statusEl.textContent = 'Decodificando pixels das camadas...';
    statusEl.classList.remove('hidden');
  }
  await new Promise((r) => setTimeout(r, 15));

  const buf = await api.readfile(path);
  const u8 = buf.buffer ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf;
  const fullPsd = agPsd.readPsd(u8, { skipThumbnail: true, skipCompositeImageData: true });
  syncLayerStates(entry.psd.children || [], fullPsd.children || []);
  fullPsd.width = entry.psd.width;
  fullPsd.height = entry.psd.height;
  entry.psd = fullPsd;
  entry.layersLoaded = true;
  return entry;
}

const BLEND_MAP = {
  'normal': 'source-over',
  'pass through': 'source-over',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color dodge': 'color-dodge',
  'linear dodge': 'lighter',
  'color burn': 'color-burn',
  'hard light': 'hard-light',
  'soft light': 'soft-light',
  'difference': 'difference',
  'exclusion': 'exclusion',
  'hue': 'hue',
  'saturation': 'saturation',
  'color': 'color',
  'luminosity': 'luminosity'
};

function composePsdLayersToCanvas(psd, soloLayerId = null) {
  const out = document.createElement('canvas');
  out.width = psd.width || 800;
  out.height = psd.height || 600;
  const ctx = out.getContext('2d');

  function drawNodes(nodes) {
    if (!Array.isArray(nodes)) return;
    // Em ag-psd, nodes[0] é a camada mais ao fundo e nodes[length-1] é a camada do topo
    for (let i = 0; i < nodes.length; i++) {
      const layer = nodes[i];
      if (soloLayerId !== null) {
        if (layer._id === soloLayerId) {
          drawSingleNode(ctx, layer, true);
        } else if (Array.isArray(layer.children)) {
          drawNodes(layer.children);
        }
        continue;
      }

      if (layer.hidden) continue;
      drawSingleNode(ctx, layer, false);
    }
  }

  function drawSingleNode(targetCtx, layer, ignoreHidden) {
    const alpha = typeof layer.opacity === 'number' ? layer.opacity : 1;
    const blend = BLEND_MAP[layer.blendMode] || 'source-over';

    if (Array.isArray(layer.children)) {
      const grpCanvas = document.createElement('canvas');
      grpCanvas.width = out.width;
      grpCanvas.height = out.height;
      const gCtx = grpCanvas.getContext('2d');
      for (let j = 0; j < layer.children.length; j++) {
        const child = layer.children[j];
        if (!ignoreHidden && child.hidden) continue;
        drawSingleNode(gCtx, child, ignoreHidden);
      }
      targetCtx.save();
      targetCtx.globalAlpha = alpha;
      targetCtx.globalCompositeOperation = blend;
      targetCtx.drawImage(grpCanvas, 0, 0);
      targetCtx.restore();
    } else if (layer.canvas) {
      targetCtx.save();
      targetCtx.globalAlpha = alpha;
      targetCtx.globalCompositeOperation = blend;
      targetCtx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
      targetCtx.restore();
    }
  }

  drawNodes(psd.children || []);
  return out;
}

function isPsdInDefaultState(nodes) {
  if (!Array.isArray(nodes)) return true;
  for (const n of nodes) {
    if (!!n.hidden !== !!n._origHidden) return false;
    if (n.children && !isPsdInDefaultState(n.children)) return false;
  }
  return true;
}

async function refreshPsdPreviewCanvas() {
  const item = state.selected;
  if (!item || item.kind !== 'psd') return;
  const entry = psdCache.get(item.path);
  if (!entry) return;

  const statusEl = $('layers-status');
  const isDefault = state.soloLayerId === null && isPsdInDefaultState(entry.psd.children);

  let targetCanvas;
  if (isDefault && entry.compositeCanvas) {
    targetCanvas = entry.compositeCanvas;
    if (statusEl) statusEl.classList.add('hidden');
  } else {
    await ensurePsdLayersLoaded(item.path);
    targetCanvas = composePsdLayersToCanvas(entry.psd, state.soloLayerId);
    if (statusEl) {
      if (state.soloLayerId !== null) {
        statusEl.textContent = 'Modo Solo ativo — clique na camada novamente ou em "Original" para sair';
        statusEl.classList.remove('hidden');
      } else {
        statusEl.textContent = 'Visualização personalizada de camadas';
        statusEl.classList.remove('hidden');
      }
    }
  }

  entry.canvas = targetCanvas;
  const stageCanvas = $('stage').querySelector('canvas.preview-media');
  if (stageCanvas) {
    stageCanvas.width = targetCanvas.width;
    stageCanvas.height = targetCanvas.height;
    const ctx = stageCanvas.getContext('2d');
    ctx.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
    ctx.drawImage(targetCanvas, 0, 0);
  }
}

async function exportLayerToPng(layer, psd) {
  try {
    const item = state.selected;
    if (!item) return;
    await ensurePsdLayersLoaded(item.path);
    const updatedEntry = psdCache.get(item.path);
    // Localiza a camada pelo _id na árvore recém-decodificada
    function findById(nodes, id) {
      for (const n of nodes || []) {
        if (n._id === id) return n;
        if (n.children) {
          const f = findById(n.children, id);
          if (f) return f;
        }
      }
      return null;
    }
    const targetLayer = findById(updatedEntry.psd.children, layer._id) || layer;
    let exportCanvas = null;

    if (Array.isArray(targetLayer.children)) {
      exportCanvas = composePsdLayersToCanvas(updatedEntry.psd, targetLayer._id);
    } else if (targetLayer.canvas) {
      exportCanvas = targetLayer.canvas;
    }

    if (!exportCanvas || exportCanvas.width === 0 || exportCanvas.height === 0) {
      showError('Esta camada está vazia ou não possui pixels exportáveis.');
      return;
    }

    const safeName = (targetLayer.name || 'camada').replace(/[\\/:*?"<>|]/g, '_');
    const targetPath = await api.saveFileDialog(`${safeName}.png`);
    if (!targetPath) return;

    const dataUrl = exportCanvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    await api.writefile(targetPath, base64Data);
    if (state.dir && targetPath.toLowerCase().startsWith(state.dir.toLowerCase())) {
      openDir(state.dir, false);
    }
  } catch (err) {
    showError('Não foi possível exportar a camada: ' + (err.message || err));
  }
}

function renderLayersPanel(entry) {
  const badge = $('layers-badge');
  const tree = $('layers-tree');
  const statusEl = $('layers-status');
  if (!tree) return;

  if (!entry || !entry.psd || !Array.isArray(entry.psd.children) || entry.psd.children.length === 0) {
    if (badge) badge.classList.add('hidden');
    if (statusEl) statusEl.classList.add('hidden');
    tree.innerHTML = `<div class="layers-empty">${entry?.isHugeFallback ? 'Arquivo PSB gigante (> 1.8 GB): usando pré-visualização rápida embutida' : 'Este arquivo PSD/PSB não possui camadas individuais (apenas imagem achatada)'}</div>`;
    return;
  }

  if (badge) {
    badge.textContent = String(entry.totalLayers || entry.psd.children.length);
    badge.classList.remove('hidden');
  }

  tree.innerHTML = '';

  function buildDomNodes(nodes, container) {
    // Renderiza de cima para baixo (ordem do Photoshop: do último elemento ao primeiro)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const layer = nodes[i];
      const isGroup = Array.isArray(layer.children);
      const isText = !!layer.text;
      const isSolo = state.soloLayerId === layer._id;

      const nodeWrap = document.createElement('div');
      nodeWrap.className = 'layer-node';

      const row = document.createElement('div');
      row.className = 'layer-row' + (layer.hidden ? ' is-hidden' : '') + (isSolo ? ' is-solo' : '');

      // Botão de expandir/recolher grupo
      const foldBtn = document.createElement('button');
      foldBtn.className = 'layer-fold-btn' + (isGroup ? '' : ' invisible');
      foldBtn.textContent = layer._collapsed ? '▸' : '▾';
      foldBtn.title = isGroup ? (layer._collapsed ? 'Expandir grupo' : 'Recolher grupo') : '';
      if (isGroup) {
        foldBtn.onclick = (e) => {
          e.stopPropagation();
          layer._collapsed = !layer._collapsed;
          renderLayersPanel(entry);
        };
      }

      // Botão de visibilidade (olho)
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'layer-eye-btn' + (layer.hidden ? ' off' : '');
      eyeBtn.textContent = '👁';
      eyeBtn.title = layer.hidden ? 'Mostrar camada' : 'Ocultar camada';
      eyeBtn.onclick = async (e) => {
        e.stopPropagation();
        layer.hidden = !layer.hidden;
        if (state.soloLayerId !== null) state.soloLayerId = null;
        renderLayersPanel(entry);
        await refreshPsdPreviewCanvas();
      };

      // Badge do tipo da camada (Pasta, Texto, Pixel)
      const typeBadge = document.createElement('span');
      typeBadge.className = 'layer-type-badge' + (isGroup ? ' is-group' : isText ? ' is-text' : '');
      typeBadge.textContent = isGroup ? '📁' : isText ? 'T' : '🖼';

      // Informações (Nome + modo de mesclagem + opacidade)
      const info = document.createElement('div');
      info.className = 'layer-info';
      const pct = Math.round((typeof layer.opacity === 'number' ? layer.opacity : 1) * 100);
      const blendLabel = (layer.blendMode || 'normal').toUpperCase();
      info.innerHTML = `
        <div class="layer-name" title="${esc(layer.name || 'Camada')}">${esc(layer.name || 'Camada sem nome')}</div>
        <div class="layer-meta">${esc(blendLabel)} · ${pct}%</div>
      `;

      // Clique na linha inteira ativa/desativa o modo Solo (isolar camada)
      row.onclick = async () => {
        state.soloLayerId = state.soloLayerId === layer._id ? null : layer._id;
        renderLayersPanel(entry);
        await refreshPsdPreviewCanvas();
      };
      row.title = 'Clique para isolar esta camada (Modo Solo) · Clique no olho para mostrar/ocultar';

      // Botão de exportar camada individual para PNG
      const expBtn = document.createElement('button');
      expBtn.className = 'layer-export-btn';
      expBtn.textContent = '⬇';
      expBtn.title = 'Exportar esta camada como PNG transparente';
      expBtn.onclick = (e) => {
        e.stopPropagation();
        exportLayerToPng(layer, entry.psd);
      };

      row.appendChild(foldBtn);
      row.appendChild(eyeBtn);
      row.appendChild(typeBadge);
      row.appendChild(info);
      row.appendChild(expBtn);
      nodeWrap.appendChild(row);

      if (isGroup && layer.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'layer-children' + (layer._collapsed ? ' collapsed' : '');
        buildDomNodes(layer.children, childrenContainer);
        nodeWrap.appendChild(childrenContainer);
      }

      container.appendChild(nodeWrap);
    }
  }

  buildDomNodes(entry.psd.children, tree);
}

if ($('btn-layers-reset')) {
  $('btn-layers-reset').onclick = async () => {
    const item = state.selected;
    if (!item || item.kind !== 'psd') return;
    const entry = psdCache.get(item.path);
    if (!entry) return;
    state.soloLayerId = null;
    function resetNodes(nodes) {
      for (const n of nodes || []) {
        n.hidden = !!n._origHidden;
        if (n.children) resetNodes(n.children);
      }
    }
    resetNodes(entry.psd.children);
    renderLayersPanel(entry);
    await refreshPsdPreviewCanvas();
  };
}

if ($('btn-layers-all')) {
  $('btn-layers-all').onclick = async () => {
    const item = state.selected;
    if (!item || item.kind !== 'psd') return;
    const entry = psdCache.get(item.path);
    if (!entry || !entry.psd?.children) return;
    state.soloLayerId = null;
    const anyVisible = entry.psd.children.some((n) => !n.hidden);
    function setAll(nodes, hide) {
      for (const n of nodes || []) {
        n.hidden = hide;
        if (n.children) setAll(n.children, hide);
      }
    }
    setAll(entry.psd.children, anyVisible);
    renderLayersPanel(entry);
    await refreshPsdPreviewCanvas();
  };
}

/* ---------- Decodificador Nativo de TIFF (Single & Multi-Page, CMYK, 8/16-bit) ---------- */
const tiffCache = new Map(); // path -> { buffer, ifds }

async function tiffToCanvas(path, pageIdx = 0) {
  if (!window.UTIF) throw new Error('Biblioteca UTIF não carregada.');
  let cached = tiffCache.get(path);
  if (!cached) {
    const buf = await api.readfile(path);
    const ab = buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf;
    const ifds = window.UTIF.decode(ab);
    if (!ifds || !ifds.length) throw new Error('Arquivo TIFF inválido ou vazio.');
    cached = { ab, ifds };
    tiffCache.set(path, cached);
    if (tiffCache.size > 6) tiffCache.delete(tiffCache.keys().next().value);
  }
  const idx = Math.min(cached.ifds.length - 1, Math.max(0, pageIdx));
  const ifd = cached.ifds[idx];
  if (!ifd.data) {
    window.UTIF.decodeImage(cached.ab, ifd);
  }
  const rgba = window.UTIF.toRGBA8(ifd);
  const canvas = document.createElement('canvas');
  canvas.width = ifd.width;
  canvas.height = ifd.height;
  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), ifd.width, ifd.height);
  ctx.putImageData(imgData, 0, 0);
  return { canvas, width: ifd.width, height: ifd.height, totalPages: cached.ifds.length, page: idx + 1 };
}

async function renderTiffPage(pageNum) {
  const item = state.selected;
  if (!item || !state.tiffMultiPage) return;
  const num = Math.min(state.tiffTotalPages, Math.max(1, pageNum));
  state.tiffPage = num;
  updatePdfControls();

  const res = await tiffToCanvas(item.path, num - 1);
  const stage = $('stage');
  let canvas = stage.querySelector('.preview-media');
  if (!canvas || canvas.tagName !== 'CANVAS') {
    canvas = document.createElement('canvas');
    canvas.className = 'preview-media';
    stage.innerHTML = '';
    stage.appendChild(canvas);
  }
  canvas.width = res.width;
  canvas.height = res.height;
  canvas.style.aspectRatio = `${res.width} / ${res.height}`;
  canvas.getContext('2d').drawImage(res.canvas, 0, 0);
  $('p-dim').textContent = `${res.width} × ${res.height} px (Pág ${num} de ${state.tiffTotalPages})`;
  applyTransform();
}

function prefetch(item) {
  const i = state.viewables.findIndex((v) => v.path === item.path);
  [state.viewables[i + 1]].forEach((n) => {
    if (n?.kind === 'psd') psdToData(n.path, n.size).catch(() => {});
  });
}

function fitToScreen() {
  const n = $('stage').querySelector('.preview-media');
  if (n) {
    const natW = n.naturalWidth || n.width || 0;
    const natH = n.naturalHeight || n.height || 0;
    if (natW > 0 && natH > 0 && (natW < 260 || natH < 260)) {
      const targetSize = 250;
      const maxDim = Math.max(natW, natH);
      state.nav.zoom = Math.min(12, Math.max(1, Math.round((targetSize / maxDim) * 10) / 10));
      n.style.imageRendering = 'pixelated';
    } else {
      state.nav.zoom = 1;
      n.style.imageRendering = 'auto';
    }
  } else {
    state.nav.zoom = 1;
  }
  state.nav.rot = 0;
  state.nav.x = 0;
  state.nav.y = 0;
  applyTransform();
}

function zoomAtPoint(factor, clientX, clientY) {
  const stage = $('stage');
  const media = stage.querySelector('.preview-media');
  if (!media) return;
  const oldZoom = state.nav.zoom;
  const newZoom = Math.min(25, Math.max(0.08, oldZoom * factor));
  if (oldZoom === newZoom) return;

  const rect = stage.getBoundingClientRect();
  const cX = typeof clientX === 'number' ? (clientX - (rect.left + rect.width / 2)) : 0;
  const cY = typeof clientY === 'number' ? (clientY - (rect.top + rect.height / 2)) : 0;

  const imgX = (cX - state.nav.x) / oldZoom;
  const imgY = (cY - state.nav.y) / oldZoom;

  state.nav.x = cX - imgX * newZoom;
  state.nav.y = cY - imgY * newZoom;
  state.nav.zoom = newZoom;
  applyTransform();
}

function zoomByFactor(factor) {
  zoomAtPoint(factor);
}

$('btn-fit').onclick = fitToScreen;
$('btn-zoom-in').onclick = () => zoomByFactor(1.25);
$('btn-zoom-out').onclick = () => zoomByFactor(0.8);
$('btn-rotate').onclick = () => {
  state.nav.rot = (state.nav.rot + 90) % 360;
  applyTransform();
};

const bgModes = ['default', 'bg-checker', 'bg-white', 'bg-black'];
let curBgIdx = 0;
const bgBtn = $('btn-bg');
if (bgBtn) {
  bgBtn.onclick = () => {
    const stage = $('stage');
    bgModes.forEach((m) => stage.classList.remove(m));
    curBgIdx = (curBgIdx + 1) % bgModes.length;
    if (bgModes[curBgIdx] !== 'default') {
      stage.classList.add(bgModes[curBgIdx]);
    }
  };
}

function showGenericPreview(item) {
  const stage = $('stage');
  state.nav = { rot: 0, zoom: 1, x: 0, y: 0 };
  const iconSrc = iconPaths[item.kind] || iconPaths.other;
  
  if (item.isDir) {
    stage.innerHTML = `
      <div class="file-card-preview">
        <img src="${iconSrc}" class="icon-img" alt="" />
        <div class="title">${esc(item.name)}</div>
        <div class="meta">Pasta de arquivos</div>
        <button class="card-btn" id="card-open-btn">Abrir pasta ↵</button>
      </div>`;
    $('card-open-btn').onclick = () => openDir(item.path);
  } else {
    const e = ext(item.name).toUpperCase() || 'ARQUIVO';
    stage.innerHTML = `
      <div class="file-card-preview">
        <img src="${iconSrc}" class="icon-img" alt="" />
        <div class="title">${esc(item.name)}</div>
        <div class="meta">${e} • ${fmtSize(item.size)}</div>
        <button class="card-btn" id="card-open-btn">Abrir no programa padrão ↗</button>
      </div>`;
    $('card-open-btn').onclick = () => api.open(item.path);
  }
}

let pdfjsLib = null;
async function getPdfLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('../../node_modules/pdfjs-dist/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs';
  }
  return pdfjsLib;
}

function updatePdfControls() {
  const tools = $('pdf-tools');
  const ind = $('pdf-page-indicator');
  if (!tools) return;
  if (state.selected?.kind === 'pdf' && state.pdfDoc) {
    tools.classList.remove('hidden');
    if (ind) ind.textContent = `${state.pdfPage} / ${state.pdfTotalPages}`;
  } else if (state.tiffMultiPage && state.tiffTotalPages > 1) {
    tools.classList.remove('hidden');
    if (ind) ind.textContent = `${state.tiffPage} / ${state.tiffTotalPages}`;
  } else {
    tools.classList.add('hidden');
  }
}

async function renderPdfPage(pageNum) {
  if (!state.pdfDoc) return;
  const num = Math.min(state.pdfTotalPages, Math.max(1, pageNum));
  state.pdfPage = num;
  updatePdfControls();

  const stage = $('stage');
  const page = await state.pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: 2.0 });

  let canvas = stage.querySelector('.preview-media');
  if (!canvas || canvas.tagName !== 'CANVAS') {
    canvas = document.createElement('canvas');
    canvas.className = 'preview-media';
    stage.innerHTML = '';
    stage.appendChild(canvas);
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  $('p-dim').textContent = `${Math.round(viewport.width / 2)} × ${Math.round(viewport.height / 2)} pt (Pág ${num} de ${state.pdfTotalPages})`;
  applyTransform();
}

const btnPdfPrev = $('btn-pdf-prev');
if (btnPdfPrev) {
  btnPdfPrev.onclick = () => {
    if (state.selected?.kind === 'pdf' && state.pdfPage > 1) {
      renderPdfPage(state.pdfPage - 1);
    } else if (state.tiffMultiPage && state.tiffPage > 1) {
      renderTiffPage(state.tiffPage - 1);
    }
  };
}
const btnPdfNext = $('btn-pdf-next');
if (btnPdfNext) {
  btnPdfNext.onclick = () => {
    if (state.selected?.kind === 'pdf' && state.pdfPage < state.pdfTotalPages) {
      renderPdfPage(state.pdfPage + 1);
    } else if (state.tiffMultiPage && state.tiffPage < state.tiffTotalPages) {
      renderTiffPage(state.tiffPage + 1);
    }
  };
}

async function preview(item) {
  const token = ++state.token;
  const stage = $('stage');
  state.nav = { rot: 0, zoom: 1, x: 0, y: 0 };
  state.tiffMultiPage = false;
  state.tiffPage = 1;
  state.tiffTotalPages = 1;
  const t0 = performance.now();
  let node;

  stage.innerHTML = `
    <div class="preview-loading">
      <div class="preview-spinner"></div>
      <span>Carregando preview...</span>
    </div>
  `;

  try {
    const fileExt = ext(item.name);
    if (fileExt === 'tif' || fileExt === 'tiff') {
      state.pdfDoc = null;
      const tiffRes = await tiffToCanvas(item.path, 0);
      state.tiffMultiPage = tiffRes.totalPages > 1;
      state.tiffPage = 1;
      state.tiffTotalPages = tiffRes.totalPages;
      updatePdfControls();

      node = document.createElement('canvas');
      node.className = 'preview-media';
      node.width = tiffRes.width;
      node.height = tiffRes.height;
      node.style.aspectRatio = `${tiffRes.width} / ${tiffRes.height}`;
      node.getContext('2d').drawImage(tiffRes.canvas, 0, 0);
      $('p-dim').textContent = `${tiffRes.width} × ${tiffRes.height}` + (tiffRes.totalPages > 1 ? ` (${tiffRes.totalPages} págs)` : '');
    } else if (item.kind === 'image') {
      state.pdfDoc = null;
      updatePdfControls();
      node = new Image();
      node.className = 'preview-media';
      node.src = fileUrl(item.path);
      await node.decode();
      node.style.aspectRatio = `${node.naturalWidth} / ${node.naturalHeight}`;
      $('p-dim').textContent = `${node.naturalWidth} × ${node.naturalHeight}`;
    } else if (item.kind === 'video') {
      state.pdfDoc = null;
      updatePdfControls();
      node = document.createElement('video');
      node.className = 'preview-media';
      node.src = fileUrl(item.path);
      node.controls = true;
      node.autoplay = true;
      node.playsInline = true;
      node.onloadedmetadata = () => {
        if (node.videoWidth && node.videoHeight) {
          node.style.aspectRatio = `${node.videoWidth} / ${node.videoHeight}`;
          $('p-dim').textContent = `${node.videoWidth} × ${node.videoHeight}`;
        }
      };
    } else if (item.kind === 'pdf') {
      const lib = await getPdfLib();
      const buf = await api.readfile(item.path);
      const loadingTask = lib.getDocument({ data: new Uint8Array(buf) });
      const pdfDoc = await loadingTask.promise;
      state.pdfDoc = pdfDoc;
      state.pdfPage = 1;
      state.pdfTotalPages = pdfDoc.numPages;

      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      node = document.createElement('canvas');
      node.className = 'preview-media';
      node.width = viewport.width;
      node.height = viewport.height;
      node.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      const ctx = node.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      $('p-dim').textContent = `${Math.round(viewport.width / 2)} × ${Math.round(viewport.height / 2)} pt (${pdfDoc.numPages} pág${pdfDoc.numPages > 1 ? 's' : ''})`;
      updatePdfControls();
    } else {
      state.pdfDoc = null;
      updatePdfControls();
      const entry = await psdToData(item.path, item.size);
      if (token === state.token) {
        renderLayersPanel(entry);
      }
      const src = entry.canvas;
      node = document.createElement('canvas');
      node.className = 'preview-media';
      node.width = src.width;
      node.height = src.height;
      node.style.aspectRatio = `${src.width} / ${src.height}`;
      const ctx = node.getContext('2d');
      ctx.drawImage(src, 0, 0);
      const layersSuffix = entry.totalLayers ? ` · ${entry.totalLayers} camada${entry.totalLayers > 1 ? 's' : ''}` : '';
      $('p-dim').textContent = `${src.width} × ${src.height}${layersSuffix}`;
    }
  } catch (e) {
    if (token !== state.token) return;
    stage.innerHTML = `<div id="placeholder">Não foi possível abrir este arquivo.<br><small>${esc(e.message || e)}</small></div>`;
    return;
  }
  
  if (token !== state.token) return; // Usuário já trocou de arquivo
  
  // Escala inteligente para ícones e arquivos pequenos (< 260px)
  const natW = node.naturalWidth || node.width || 0;
  const natH = node.naturalHeight || node.height || 0;
  if (natW > 0 && natH > 0 && (natW < 260 || natH < 260)) {
    const targetSize = 250;
    const maxDim = Math.max(natW, natH);
    const fitScale = Math.min(12, Math.max(1, Math.round((targetSize / maxDim) * 10) / 10));
    state.nav.zoom = fitScale;
    node.style.imageRendering = 'pixelated';
  } else {
    state.nav.zoom = 1;
    node.style.imageRendering = 'auto';
  }

  $('p-time').textContent = Math.round(performance.now() - t0) + ' ms';
  stage.innerHTML = ''; 
  stage.appendChild(node); 
  applyTransform();
}

/* ---------- Zoom / Mover / Girar / Navegar ---------- */
function applyTransform() {
  const n = $('stage').querySelector('.preview-media');
  if (!n) return;
  const { rot, zoom, x, y } = state.nav;
  n.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${zoom})`;
}

function step(d) {
  if (!state.viewables.length) return;
  let i = state.viewables.findIndex((v) => v.path === state.selected?.path);
  i = (i + d + state.viewables.length) % state.viewables.length;
  const it = state.viewables[i];
  select(it, document.querySelector(`.item[data-path="${CSS.escape(it.path)}"]`));
  document.querySelector('.item.sel')?.scrollIntoView({ block: 'nearest' });
}

const stage = $('stage');

stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey) { 
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    zoomAtPoint(factor, e.clientX, e.clientY);
  } else {
    step(e.deltaY > 0 ? 1 : -1);
  }
}, { passive: false });

let spacePan = false;
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !$('dialog').classList.contains('hidden') || !$('shortcuts-modal').classList.contains('hidden')) return;
  if (e.code === 'Space' && !spacePan) {
    spacePan = true;
    stage.classList.add('space-pan');
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spacePan = false;
    stage.classList.remove('space-pan');
  }
});

let drag = null;
stage.addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.closest('#viewer-tools')) return;
  drag = { x: e.clientX - state.nav.x, y: e.clientY - state.nav.y }; 
  stage.classList.add('dragging'); 
});

window.addEventListener('mousemove', (e) => { 
  if (!drag) return; 
  state.nav.x = e.clientX - drag.x; 
  state.nav.y = e.clientY - drag.y; 
  applyTransform(); 
});

window.addEventListener('mouseup', () => { 
  drag = null; 
  stage.classList.remove('dragging'); 
});

stage.addEventListener('dblclick', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.closest('#viewer-tools')) return;
  if (state.fullview) { setFullView(false); return; }
  fitToScreen();
});

/* ---------- Tela cheia do preview ---------- */
let fsHintTimer = null;

function setFullView(on) {
  if (on === !!state.fullview) return;
  state.fullview = on;
  document.body.classList.toggle('fullview', on);
  api.setFullscreen(on);
  hideContextMenu();
  clearTimeout(fsHintTimer);
  $('fs-hint').classList.toggle('show', on);
  if (on) fsHintTimer = setTimeout(() => $('fs-hint').classList.remove('show'), 3500);
  // Reajusta ao novo tamanho do palco mantendo a rotação escolhida
  setTimeout(() => {
    const rot = state.nav.rot;
    fitToScreen();
    state.nav.rot = rot;
    applyTransform();
  }, 150);
}

api.onFullscreenChange((on) => {
  // Sincroniza caso o Windows saia da tela cheia por outro meio
  if (!on && state.fullview) {
    state.fullview = false;
    document.body.classList.remove('fullview');
    $('fs-hint').classList.remove('show');
  }
});

stage.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#viewer-tools')) return;
  if (!state.fullview && !stage.querySelector('.preview-media')) return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, null, [
    state.fullview
      ? { label: 'Sair da tela cheia', hint: 'Esc', run: () => setFullView(false) }
      : { label: 'Ver em tela cheia', run: () => setFullView(true) }
  ]);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape' && state.fullview) { setFullView(false); return; }
  if (e.key === 'ArrowRight' && !e.altKey) step(1);
  else if (e.key === 'ArrowLeft' && !e.altKey) step(-1);
  else if (e.key === 'PageDown' || (state.selected?.kind === 'pdf' && e.key === 'ArrowDown')) {
    if (state.selected?.kind === 'pdf' && state.pdfDoc && state.pdfPage < state.pdfTotalPages) {
      e.preventDefault();
      renderPdfPage(state.pdfPage + 1);
    } else if (state.tiffMultiPage && state.tiffPage < state.tiffTotalPages) {
      e.preventDefault();
      renderTiffPage(state.tiffPage + 1);
    }
  }
  else if (e.key === 'PageUp' || (state.selected?.kind === 'pdf' && e.key === 'ArrowUp')) {
    if (state.selected?.kind === 'pdf' && state.pdfDoc && state.pdfPage > 1) {
      e.preventDefault();
      renderPdfPage(state.pdfPage - 1);
    } else if (state.tiffMultiPage && state.tiffPage > 1) {
      e.preventDefault();
      renderTiffPage(state.tiffPage - 1);
    }
  }
  else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey) { 
    state.nav.rot = (state.nav.rot + 90) % 360; 
    applyTransform(); 
  }
  else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    setRightTab(state.rightTab === 'layers' ? 'props' : 'layers');
  }
  else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    applyViewMode(state.viewMode === 'gallery' ? (state.lastTextMode || 'columns') : 'gallery');
  }
  else if (e.key === '0') {
    fitToScreen();
  }
  else if (e.key === 'Escape') { 
    state.token++; 
    state.pdfDoc = null;
    state.tiffMultiPage = false;
    updatePdfControls();
    stage.innerHTML = '<div id="placeholder">Selecione um arquivo para pré-visualizar</div>'; 
  }
});

/* ---------- Diálogos (confirmar / renomear / propriedades) ---------- */
function openDialog({ title, bodyHtml, confirmText = 'OK', cancelText = 'Cancelar', input = null, danger = false, hideCancel = false }) {
  return new Promise((resolve) => {
    const root = $('dialog');
    $('dialog-title').textContent = title;
    $('dialog-body').innerHTML = bodyHtml || '';
    const inp = $('dialog-input');
    const err = $('dialog-error');
    err.textContent = '';
    inp.classList.toggle('hidden', input === null);
    if (input !== null) inp.value = input;
    const ok = $('dialog-ok');
    const cancel = $('dialog-cancel');
    ok.textContent = confirmText;
    cancel.textContent = cancelText;
    cancel.classList.toggle('hidden', hideCancel);
    ok.classList.toggle('danger', danger);
    root.classList.remove('hidden');

    const close = (val) => {
      root.classList.add('hidden');
      ok.onclick = cancel.onclick = null;
      inp.onkeydown = null;
      root.onmousedown = null;
      resolve(val);
    };
    ok.onclick = () => close(input !== null ? inp.value.trim() : true);
    cancel.onclick = () => close(null);
    root.onmousedown = (e) => { if (e.target === root) close(null); };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') ok.click();
      else if (e.key === 'Escape') cancel.click();
      e.stopPropagation();
    };
    if (input !== null) {
      inp.focus();
      const dot = input.lastIndexOf('.');
      inp.setSelectionRange(0, dot > 0 ? dot : input.length);
    } else {
      ok.focus();
    }
  });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ms) => new Date(ms).toLocaleString('pt-BR');

async function showError(msg) {
  await openDialog({ title: 'Atenção', bodyHtml: `<p>${escapeHtml(msg)}</p>`, confirmText: 'OK', hideCancel: true });
}

/* ---------- Menu de contexto (botão direito) ---------- */
const ctxMenu = $('ctx-menu');

function hideContextMenu() {
  ctxMenu.classList.add('hidden');
  ctxMenu.innerHTML = '';
}

async function exportToPng(item) {
  try {
    let canvas = null;
    const fileExt = ext(item.name);
    if (item.kind === 'psd') {
      canvas = await psdToCanvas(item.path, item.size);
    } else if (fileExt === 'tif' || fileExt === 'tiff') {
      const tiffRes = await tiffToCanvas(item.path, state.tiffMultiPage ? (state.tiffPage - 1) : 0);
      canvas = tiffRes.canvas;
    } else if (item.kind === 'image') {
      const img = new Image();
      img.src = fileUrl(item.path);
      await img.decode();
      canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    }
    if (!canvas) {
      showError('Formato não suporta exportação direta como imagem.');
      return;
    }
    const defaultName = item.name.replace(/\.[^/.]+$/, '') + '.png';
    const targetPath = await api.saveFileDialog(defaultName);
    if (!targetPath) return;

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    await api.writefile(targetPath, base64Data);
    
    if (state.dir && targetPath.toLowerCase().startsWith(state.dir.toLowerCase())) {
      openDir(state.dir, false);
    }
  } catch (err) {
    showError('Falha ao exportar imagem: ' + (err.message || err));
  }
}

function showContextMenu(x, y, item, custom) {
  const entries = custom ? custom : item
    ? [
        { label: 'Abrir', hint: 'Enter', run: () => (item.isDir ? openDir(item.path) : api.open(item.path)) },
        { label: 'Abrir com...', disabled: item.isDir, run: () => api.openWith(item.path) },
        ...(!item.isDir && ['psd', 'image'].includes(item.kind) ? [
          { label: 'Exportar como PNG...', run: () => exportToPng(item) }
        ] : []),
        ...(!item.isDir ? [
          { label: isPinned(item.path) ? 'Desfixar do Acesso Rápido' : 'Fixar no Acesso Rápido', run: () => togglePin(item) }
        ] : []),
        { sep: true },
        { label: 'Copiar', hint: 'Ctrl+C', run: () => copyItem(item) },
        { label: 'Colar', hint: 'Ctrl+V', run: () => pasteHere(item.isDir ? item.path : state.dir) },
        { sep: true },
        { label: 'Renomear', hint: 'F2', run: () => renameItem(item) },
        { label: 'Excluir', hint: 'Del', danger: true, run: () => deleteItem(item) },
        { sep: true },
        { label: 'Propriedades', hint: 'Alt+Enter', run: () => showPropsDialog(item) }
      ]
    : [
        { label: 'Colar', hint: 'Ctrl+V', run: () => pasteHere(state.dir) },
        { label: 'Atualizar', hint: 'F5', run: () => state.dir && openDir(state.dir) },
        { sep: true },
        { label: 'Propriedades da pasta', run: () => state.dir && showPropsDialog({ path: state.dir, name: getFolderDisplayName(state.dir), isDir: true }) }
      ];

  ctxMenu.innerHTML = '';
  entries.forEach((en) => {
    if (en.sep) {
      const s = document.createElement('div');
      s.className = 'ctx-sep';
      ctxMenu.appendChild(s);
      return;
    }
    const b = document.createElement('button');
    b.className = 'ctx-item' + (en.danger ? ' danger' : '');
    b.disabled = !!en.disabled;
    b.innerHTML = `<span>${en.label}</span><span class="ctx-hint">${en.hint || ''}</span>`;
    b.onclick = () => { hideContextMenu(); en.run(); };
    ctxMenu.appendChild(b);
  });

  ctxMenu.classList.remove('hidden');
  const { offsetWidth: w, offsetHeight: h } = ctxMenu;
  ctxMenu.style.left = Math.max(4, Math.min(x, window.innerWidth - w - 6)) + 'px';
  ctxMenu.style.top = Math.max(4, Math.min(y, window.innerHeight - h - 6)) + 'px';
}

async function copyItem(item) {
  try { await api.copy([item.path]); } catch (e) { showError('Não foi possível copiar: ' + (e.message || e)); }
}

async function pasteHere(dir) {
  if (!dir) return;
  try {
    const created = await api.paste(dir);
    if (!created.length) { await showError('A área de transferência não contém arquivos para colar.'); return; }
    await openDir(state.dir);
  } catch (e) {
    showError('Não foi possível colar: ' + (e.message || e));
  }
}

async function renameItem(item) {
  const name = await openDialog({ title: 'Renomear', bodyHtml: `<p>Novo nome para <b>${escapeHtml(item.name)}</b>:</p>`, confirmText: 'Renomear', input: item.name });
  if (!name || name === item.name) return;
  try {
    const dest = await api.rename(item.path, name);
    if (isPinned(item.path)) {
      state.pinned = state.pinned.map((p) => p.path === item.path ? { ...p, path: dest, name: name } : p);
      store.set('pinned', state.pinned);
      renderQuickAccess();
      updatePinBtn();
    }
    if (state.selected?.path === item.path) state.selected = null;
    await openDir(state.dir);
    const el = document.querySelector(`.item[data-path="${CSS.escape(dest)}"]`);
    const found = state.items.find((i) => i.path === dest);
    if (found && el) { select(found, el); el.scrollIntoView({ block: 'nearest' }); }
  } catch (e) {
    showError(String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  }
}

async function deleteItem(item) {
  const ok = await openDialog({
    title: 'Excluir',
    bodyHtml: `<p>Enviar <b>${escapeHtml(item.name)}</b> para a Lixeira?</p>`,
    confirmText: 'Excluir',
    danger: true
  });
  if (!ok) return;
  try {
    await api.remove(item.path);
    if (isPinned(item.path)) {
      state.pinned = state.pinned.filter((p) => p.path !== item.path);
      store.set('pinned', state.pinned);
      renderQuickAccess();
      updatePinBtn();
    }
    if (state.selected?.path === item.path) {
      state.selected = null;
      state.token++;
      state.pdfDoc = null;
      updatePdfControls();
      $('stage').innerHTML = '<div id="placeholder">Selecione um arquivo para pré-visualizar</div>';
    }
    await openDir(state.dir);
  } catch (e) {
    showError('Não foi possível excluir: ' + (e.message || e));
  }
}

async function showPropsDialog(item) {
  try {
    const p = await api.props(item.path);
    const rows = [
      ['Nome', p.name],
      ['Tipo', p.isDir ? 'Pasta de arquivos' : (ext(p.name).toUpperCase() || 'Arquivo') ],
      ['Local', p.path],
      ['Tamanho', fmtSize(p.size) + (p.isDir ? ` (${p.files} arquivo(s), ${p.dirs} pasta(s))` : ` (${p.size.toLocaleString('pt-BR')} bytes)`)],
      ['Criado em', fmtDate(p.created)],
      ['Modificado em', fmtDate(p.modified)],
      ['Acessado em', fmtDate(p.accessed)],
      ['Somente leitura', p.readonly ? 'Sim' : 'Não']
    ];
    const html = '<dl class="dlg-props">' + rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('') + '</dl>';
    await openDialog({ title: 'Propriedades', bodyHtml: html, confirmText: 'Fechar', hideCancel: true });
  } catch (e) {
    showError('Não foi possível ler as propriedades: ' + (e.message || e));
  }
}

// Botão direito em área vazia da lista
$('file-list').addEventListener('contextmenu', (ev) => {
  if (ev.target.closest('.item')) return;
  ev.preventDefault();
  showContextMenu(ev.clientX, ev.clientY, null);
});
window.addEventListener('contextmenu', (ev) => {
  if (!ev.target.closest('#file-list')) ev.preventDefault();
});
window.addEventListener('mousedown', (ev) => { if (!ev.target.closest('#ctx-menu')) hideContextMenu(); });
window.addEventListener('blur', hideContextMenu);
window.addEventListener('resize', hideContextMenu);
$('file-list').addEventListener('scroll', hideContextMenu);

/* ---------- Modal de Atalhos de Teclado ---------- */
function toggleShortcutsModal() {
  const m = $('shortcuts-modal');
  m.classList.toggle('hidden');
}

function hideShortcutsModal() {
  $('shortcuts-modal').classList.add('hidden');
}

const btnShortcuts = $('btn-shortcuts');
if (btnShortcuts) btnShortcuts.onclick = toggleShortcutsModal;

const btnShortcutsClose = $('btn-shortcuts-close');
if (btnShortcutsClose) btnShortcutsClose.onclick = hideShortcutsModal;

$('shortcuts-modal').onclick = (e) => {
  if (e.target === $('shortcuts-modal')) hideShortcutsModal();
};

// Atalhos globais expandidos
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !$('dialog').classList.contains('hidden')) return;
  const sel = state.selected;

  if (e.key === 'Escape') {
    if (!$('shortcuts-modal').classList.contains('hidden')) {
      hideShortcutsModal();
    } else if (!$('about').classList.contains('hidden')) {
      $('about').classList.add('hidden');
    } else if (!$('ctx-menu').classList.contains('hidden')) {
      hideContextMenu();
    } else if (state.fullview) {
      setFullView(false);
    }
  }
  else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    toggleShortcutsModal();
  }
  else if (e.key === 'F11') {
    e.preventDefault();
    setFullView(!state.fullview);
  }
  else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    const sInput = $('search');
    sInput.focus();
    sInput.select();
  }
  else if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    goBackDir();
  }
  else if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    goForwardDir();
  }
  else if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    $('btn-up').click();
  }
  else if (['1', '2', '3', '4', '5'].includes(e.key) && sel && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    const stars = Number(e.key);
    state.rating[sel.path] = state.rating[sel.path] === stars ? 0 : stars;
    store.set('ratings', state.rating);
    renderStars();
  }
  else if (e.key === '0' && sel && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    state.rating[sel.path] = 0;
    store.set('ratings', state.rating);
    renderStars();
  }
  else if ((e.key === '+' || e.key === '=') && !e.ctrlKey && sel) {
    e.preventDefault();
    zoomByFactor(1.25);
  }
  else if ((e.key === '-' || e.key === '_') && !e.ctrlKey && sel) {
    e.preventDefault();
    zoomByFactor(0.8);
  }
  else if (e.key === 'Backspace' && !e.ctrlKey && sel) {
    e.preventDefault();
    fitToScreen();
  }
  else if (e.ctrlKey && e.key.toLowerCase() === 'c' && sel) { e.preventDefault(); copyItem(sel); }
  else if (e.ctrlKey && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteHere(sel?.isDir ? sel.path : state.dir); }
  else if (e.key === 'F2' && sel) { e.preventDefault(); renameItem(sel); }
  else if (e.key === 'Delete' && sel) { e.preventDefault(); deleteItem(sel); }
  else if (e.key === 'F5' && state.dir) { e.preventDefault(); openDir(state.dir, false); }
  else if (e.altKey && e.key === 'Enter' && sel) { e.preventDefault(); showPropsDialog(sel); }
  else if (e.key === 'Enter' && sel) { e.preventDefault(); sel.isDir ? openDir(sel.path) : api.open(sel.path); }
});

/* ---------- Início ---------- */
(async () => {
  applyViewMode(state.viewMode);
  renderQuickAccess();
  updatePinBtn();
  await buildNav();
  // Abre a pasta inicial atual do projeto
  openDir('c:\\Users\\cviol\\PSD_view');
})();
