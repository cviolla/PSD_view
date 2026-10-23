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
  selected: null, 
  viewables: [], 
  rating: store.get('ratings', {}), 
  favs: store.get('favs', []), 
  pinned: store.get('pinned', []), 
  nav: { rot: 0, zoom: 1, x: 0, y: 0 }, 
  token: 0,
  viewMode: store.get('viewMode', 'columns'),
  pdfDoc: null,
  pdfPage: 1,
  pdfTotalPages: 1
};

/* ---------- Janela / Tema ---------- */
$('btn-min').onclick = () => api.minimize();
$('btn-max').onclick = () => api.maximize();
$('btn-close').onclick = () => api.close();

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

/* ---------- Alternância de Visualização da Lista (Colunas / Lista) ---------- */
function applyViewMode(mode) {
  state.viewMode = mode;
  store.set('viewMode', mode);
  const fl = $('file-list');
  const btn = $('toggle-view');
  const img = $('toggle-view-img');
  if (!fl || !btn) return;

  if (mode === 'list') {
    fl.classList.remove('view-columns');
    fl.classList.add('view-list');
    if (img) img.src = '../../icons/OFF.png';
    btn.title = 'Modo de exibição: Lista linear (clique para Múltiplas Colunas)';
  } else {
    fl.classList.remove('view-list');
    fl.classList.add('view-columns');
    if (img) img.src = '../../icons/ON.png';
    btn.title = 'Modo de exibição: Múltiplas Colunas (clique para Lista linear)';
  }
}

const toggleViewBtn = $('toggle-view');
if (toggleViewBtn) {
  toggleViewBtn.onclick = () => {
    applyViewMode(state.viewMode === 'columns' ? 'list' : 'columns');
  };
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

/* ---------- Lista de Arquivos ---------- */
async function openDir(dir) {
  try {
    const items = await api.readdir(dir);
    stopGlobalSearch(true);
    state.dir = dir;
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
  const q = state.query.toLowerCase();
  const source = state.globalActive ? state.globalItems : state.items;
  const list = source.filter((i) => {
    if (!state.globalActive && q && !i.name.toLowerCase().includes(q)) return false;
    if (state.filter === 'all') return true;
    return i.isDir || i.kind === state.filter;
  });
  state.viewables = list.filter((i) => ['image', 'psd', 'video', 'pdf'].includes(i.kind));
  $('count').textContent = list.length + ' itens' + (state.globalActive ? (state.globalDone ? ' (busca global)' : ' — buscando…') : '');
  const frag = document.createDocumentFragment();
  
  const LIMIT = 3000;
  list.slice(0, LIMIT).forEach((i) => {
    const el = document.createElement('div');
    el.className = 'item' + (state.selected?.path === i.path ? ' sel' : '');
    el.title = state.globalActive ? i.path : i.name; 
    el.dataset.path = i.path;
    
    // Ícone oficial baseado no tipo de arquivo
    const iconSrc = iconPaths[i.kind] || iconPaths.other;
    const sub = state.globalActive ? `<em class="item-path">${esc(i.path.slice(0, Math.max(0, i.path.length - i.name.length - 1)))}</em>` : '';
    el.innerHTML = `<img src="${iconSrc}" class="item-file-icon" alt="" /><span>${esc(i.name)}${sub}</span>`;
    
    el.onclick = () => select(i, el);
    el.ondblclick = () => (i.isDir ? openDir(i.path) : select(i, el));
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

/* ---------- Busca global (todos os discos) ---------- */
let searchTimer = null;

function stopGlobalSearch(clearInput) {
  clearTimeout(searchTimer);
  if (state.globalActive) api.searchCancel();
  state.globalActive = false;
  state.globalItems = [];
  state.globalDone = true;
  if (clearInput) {
    state.query = '';
    $('search').value = '';
  }
}

api.onSearchBatch((d) => {
  if (!state.globalActive || (state.searchId && d.id < state.searchId)) return;
  state.globalItems.push(...d.items.map((i) => ({ ...i, kind: kind(i) })));
  if (d.done) state.globalDone = true;
  renderList();
  if (d.done) $('crumb').textContent = 'Resultados para "' + state.query + '" em todo o computador' + (d.truncated ? ' (primeiros 1000)' : '');
});

$('search').oninput = (e) => { 
  state.query = e.target.value; 
  clearTimeout(searchTimer);
  const q = state.query.trim();
  if (q.length < 2) {
    const wasGlobal = state.globalActive;
    stopGlobalSearch(false);
    if (wasGlobal && state.dir) $('crumb').textContent = state.dir;
    renderList();
    return;
  }
  searchTimer = setTimeout(async () => {
    state.globalActive = true;
    state.globalItems = [];
    state.globalDone = false;
    $('crumb').textContent = 'Buscando "' + q + '" em todo o computador…';
    renderList();
    state.searchId = await api.searchStart(q);
  }, 300);
};

document.querySelectorAll('#filters button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('#filters button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active'); 
  state.filter = b.dataset.filter; 
  renderList();
});

/* ---------- Seleção / Preview / Propriedades ---------- */
function select(item, el) {
  state.selected = item;
  document.querySelectorAll('.item.sel').forEach((x) => x.classList.remove('sel'));
  el?.classList.add('sel');
  showProps(item);
  updatePinBtn();
  updateQuickAccessActive();
  if (['image', 'psd', 'video', 'pdf'].includes(item.kind)) {
    preview(item);
  } else {
    showGenericPreview(item);
  }
  prefetch(item);
}

function showProps(item) {
  $('p-tipo').textContent = item.isDir ? 'Pasta' : item.name;
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

const psdCache = new Map(); // path -> canvas cache
async function psdToCanvas(path) {
  if (psdCache.has(path)) return psdCache.get(path);
  const buf = await api.readfile(path);
  const u8 = buf.buffer ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf;
  let psd;
  try {
    psd = agPsd.readPsd(u8, { skipLayerImageData: true, skipThumbnail: true, skipCompositeImageData: false });
  } catch (err) {
    psd = agPsd.readPsd(u8);
  }
  let canvas = psd.canvas;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = psd.width || 800;
    canvas.height = psd.height || 600;
  }
  psdCache.set(path, canvas);
  if (psdCache.size > 10) psdCache.delete(psdCache.keys().next().value);
  return canvas;
}

function prefetch(item) {
  const i = state.viewables.findIndex((v) => v.path === item.path);
  [state.viewables[i + 1]].forEach((n) => {
    if (n?.kind === 'psd') psdToCanvas(n.path).catch(() => {});
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

$('btn-fit').onclick = fitToScreen;
$('btn-zoom-in').onclick = () => {
  state.nav.zoom = Math.min(20, state.nav.zoom * 1.25);
  applyTransform();
};
$('btn-zoom-out').onclick = () => {
  state.nav.zoom = Math.max(0.1, state.nav.zoom * 0.8);
  applyTransform();
};
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
    if (state.pdfPage > 1) renderPdfPage(state.pdfPage - 1);
  };
}
const btnPdfNext = $('btn-pdf-next');
if (btnPdfNext) {
  btnPdfNext.onclick = () => {
    if (state.pdfPage < state.pdfTotalPages) renderPdfPage(state.pdfPage + 1);
  };
}

async function preview(item) {
  const token = ++state.token;
  const stage = $('stage');
  state.nav = { rot: 0, zoom: 1, x: 0, y: 0 };
  const t0 = performance.now();
  let node;
  try {
    if (item.kind === 'image') {
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
      const src = await psdToCanvas(item.path);
      node = document.createElement('canvas');
      node.className = 'preview-media';
      node.width = src.width;
      node.height = src.height;
      node.style.aspectRatio = `${src.width} / ${src.height}`;
      const ctx = node.getContext('2d');
      ctx.drawImage(src, 0, 0);
      $('p-dim').textContent = `${src.width} × ${src.height}`;
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
    state.nav.zoom = Math.min(20, Math.max(0.1, state.nav.zoom * (e.deltaY < 0 ? 1.15 : 0.85))); 
    applyTransform(); 
  } else {
    step(e.deltaY > 0 ? 1 : -1);
  }
}, { passive: false });

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
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'PageDown' || (state.selected?.kind === 'pdf' && e.key === 'ArrowDown')) {
    if (state.selected?.kind === 'pdf' && state.pdfDoc && state.pdfPage < state.pdfTotalPages) {
      e.preventDefault();
      renderPdfPage(state.pdfPage + 1);
    }
  }
  else if (e.key === 'PageUp' || (state.selected?.kind === 'pdf' && e.key === 'ArrowUp')) {
    if (state.selected?.kind === 'pdf' && state.pdfDoc && state.pdfPage > 1) {
      e.preventDefault();
      renderPdfPage(state.pdfPage - 1);
    }
  }
  else if (e.key.toLowerCase() === 'r') { 
    state.nav.rot = (state.nav.rot + 90) % 360; 
    applyTransform(); 
  }
  else if (e.key === '0') {
    fitToScreen();
  }
  else if (e.key === 'Escape') { 
    state.token++; 
    state.pdfDoc = null;
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

function showContextMenu(x, y, item, custom) {
  const entries = custom ? custom : item
    ? [
        { label: 'Abrir', hint: 'Enter', run: () => (item.isDir ? openDir(item.path) : api.open(item.path)) },
        { label: 'Abrir com...', disabled: item.isDir, run: () => api.openWith(item.path) },
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

// Atalhos: Ctrl+C / Ctrl+V / F2 / Delete / F5 / Alt+Enter / Enter
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !$('dialog').classList.contains('hidden')) return;
  const sel = state.selected;
  if (e.key === 'Escape') hideContextMenu();
  else if (e.ctrlKey && e.key.toLowerCase() === 'c' && sel) { e.preventDefault(); copyItem(sel); }
  else if (e.ctrlKey && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteHere(sel?.isDir ? sel.path : state.dir); }
  else if (e.key === 'F2' && sel) { e.preventDefault(); renameItem(sel); }
  else if (e.key === 'Delete' && sel) { e.preventDefault(); deleteItem(sel); }
  else if (e.key === 'F5' && state.dir) { e.preventDefault(); openDir(state.dir); }
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
