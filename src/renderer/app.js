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
  store.set('dark', dark); 
}
$('btn-theme').onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(store.get('dark', false));

$('btn-about').onclick = () => $('about').classList.remove('hidden');
$('about-close').onclick = () => $('about').classList.add('hidden');
document.querySelectorAll('.group-head').forEach((h) => h.onclick = () => h.parentElement.classList.toggle('collapsed'));

/* ---------- Navegação Lateral ---------- */
function navButton(label, path) {
  const b = document.createElement('button');
  b.innerHTML = `<img src="../../icons/Opened-Folder.png" class="sub-folder-icon" alt="" /><span>${label}</span>`; 
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
    el.innerHTML = `
      <div class="ring" style="--p:${p}" data-p="${p}%"></div>
      <div class="drive-info">
        <div class="drive-letter">${d.letter}</div>
        <div>${fmtGB(d.used)} usados · ${fmtGB(d.free)} livres de ${fmtGB(d.total)}</div>
        <div style="font-size:10px; opacity:0.7">Interno · NTFS</div>
      </div>
    `;
    el.onclick = () => openDir(d.path);
    sl.appendChild(el);
  });
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
        <span class="fav-label">${label}</span>
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
    btn.textContent = '♥ Pasta favoritada (remover)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--accent)';
    btn.style.boxShadow = '0 0 10px rgba(228, 255, 0, 0.3)';
  } else {
    btn.textContent = '♥ Favoritar pasta atual';
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

/* ---------- Lista de Arquivos ---------- */
async function openDir(dir) {
  try {
    const items = await api.readdir(dir);
    state.dir = dir;
    state.items = items.map((i) => ({ ...i, kind: kind(i) }))
      .sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    $('crumb').textContent = dir;
    renderList();
    updateFavBtn();
  } catch (e) {
    $('crumb').textContent = 'Não foi possível abrir: ' + dir;
  }
}

function renderList() {
  const q = state.query.toLowerCase();
  const list = state.items.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q)) return false;
    if (state.filter === 'all') return true;
    return i.isDir || i.kind === state.filter;
  });
  state.viewables = list.filter((i) => ['image', 'psd', 'video', 'pdf'].includes(i.kind));
  $('count').textContent = list.length + ' itens';
  const frag = document.createDocumentFragment();
  
  const LIMIT = 3000;
  list.slice(0, LIMIT).forEach((i) => {
    const el = document.createElement('div');
    el.className = 'item' + (state.selected?.path === i.path ? ' sel' : '');
    el.title = i.name; 
    el.dataset.path = i.path;
    
    // Ícone oficial baseado no tipo de arquivo
    const iconSrc = iconPaths[i.kind] || iconPaths.other;
    el.innerHTML = `<img src="${iconSrc}" class="item-file-icon" alt="" /><span>${i.name}</span>`;
    
    el.onclick = () => select(i, el);
    el.ondblclick = () => i.isDir && openDir(i.path);
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

$('search').oninput = (e) => { 
  state.query = e.target.value; 
  renderList(); 
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
  if (['image', 'psd', 'video'].includes(item.kind)) {
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
        <div class="title">${item.name}</div>
        <div class="meta">Pasta de arquivos</div>
        <button class="card-btn" id="card-open-btn">Abrir pasta ↵</button>
      </div>`;
    $('card-open-btn').onclick = () => openDir(item.path);
  } else {
    const e = ext(item.name).toUpperCase() || 'ARQUIVO';
    stage.innerHTML = `
      <div class="file-card-preview">
        <img src="${iconSrc}" class="icon-img" alt="" />
        <div class="title">${item.name}</div>
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
    stage.innerHTML = `<div id="placeholder">Não foi possível abrir este arquivo.<br><small>${String(e.message || e)}</small></div>`;
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
  fitToScreen();
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
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

/* ---------- Início ---------- */
(async () => {
  applyViewMode(state.viewMode);
  await buildNav();
  // Abre a pasta inicial atual do projeto
  openDir('c:\\Users\\cviol\\PSD_view');
})();
