// Neon Coast Cover Studio — the editor. Wires the controls to the cover engine
// (cover.js): photos in, panels arranged, caption typed, PNG out. Everything runs
// in the browser; photos are read on the machine and never uploaded anywhere.
import { SIZES, LAYOUTS, GRADES, layoutPanels, renderCover, exportCoverCanvas } from './cover.js';
import { runShot, runSelfTest } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

// --- State: one object drives the preview and every export. -----------------
export const state = {
  size: '1080x1080',
  layout: 'hero3',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'a sunset drive story',
  photos: [null, null, null, null],
  panelPhoto: [0, 1, 0, 1, 0, 1, 0, 1, 0],
  panelZoom: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  panelPan: Array.from({ length: 9 }, () => ({ x: 0, y: 0 })),
  grain: true,
  halftone: true,
  badge: true,
  selectedPanel: 0,
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

/** Preview renders at most 900 px on the long side; exports render full-size. */
function redraw() {
  const size = SIZES[state.size];
  // Cover shots render at full export resolution; the editor preview caps at 900 px.
  const full = document.body.classList.contains('shot-cover');
  const scale = full ? 1 : Math.min(1, 900 / Math.max(size.w, size.h));
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  renderCover(preview, state);
  syncPanelControls();
  window.__neonCoastReady = true;
}

/** Panels of the current layout in preview-canvas pixels, for hit-testing. */
function previewPanels() {
  const size = SIZES[state.size];
  const bandH = Math.round(preview.height * (size.h > size.w ? 0.20 : size.h === size.w ? 0.22 : 0.26));
  return layoutPanels(state.layout, preview.width, preview.height, preview.height - bandH);
}

function pickPanelAt(cx, cy) {
  const panels = previewPanels();
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    // Rotation is small; the bounding box is close enough to tap a panel.
    if (cx >= p.x - 8 && cx <= p.x + p.w + 8 && cy >= p.y - 8 && cy <= p.y + p.h + 8) return i;
  }
  return -1;
}

// --- Photo slots -------------------------------------------------------------
const slotNames = ['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4'];

function refreshSlot(slot) {
  const img = state.photos[slot];
  const thumb = $(`thumb-${slot}`);
  const label = $(`slotlabel-${slot}`);
  if (img) {
    thumb.innerHTML = '';
    const t = img.cloneNode(false);
    t.alt = slotNames[slot];
    thumb.appendChild(t);
    label.textContent = `${slotNames[slot]} loaded`;
  } else {
    thumb.textContent = 'empty';
    label.textContent = `${slotNames[slot]} — none yet`;
  }
}

async function setPhoto(slot, fileOrUrl) {
  try {
    const img = typeof fileOrUrl === 'string'
      ? await loadImage(fileOrUrl)
      : await loadImage(URL.createObjectURL(fileOrUrl));
    state.photos[slot] = img;
    refreshSlot(slot);
    redraw();
    setStatus(`${slotNames[slot]} loaded.`);
  } catch {
    setStatus(`Could not load that image for ${slotNames[slot]}.`);
  }
}

function buildPhotoSlots() {
  const wrap = $('photos');
  for (let slot = 0; slot < 4; slot++) {
    const div = document.createElement('div');
    div.className = 'slot';
    div.innerHTML = `
      <div class="thumb" id="thumb-${slot}">empty</div>
      <div class="slot-body">
        <span id="slotlabel-${slot}">${slotNames[slot]} — none yet</span>
        <label class="file-btn">Upload ${slotNames[slot].toLowerCase()}
          <input id="file-${slot}" type="file" accept="image/*">
        </label>
        <button type="button" class="mini" id="sample-${slot}">Use sample photo</button>
      </div>`;
    wrap.appendChild(div);
    $(`file-${slot}`).addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) setPhoto(slot, f);
    });
    $(`sample-${slot}`).addEventListener('click', () => {
      setPhoto(slot, `samples/${slot % 2 === 0 ? 'boulevard' : 'pier'}.jpg`);
    });
  }
}

// --- Layout / grade / size pickers -------------------------------------------
function buildPickers() {
  const layoutWrap = $('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.layout = l.id;
    b.title = l.blurb;
    b.textContent = l.name;
    b.addEventListener('click', () => {
      state.layout = l.id;
      state.selectedPanel = 0;
      markActive(layoutWrap, b);
      redraw();
    });
    layoutWrap.appendChild(b);
  });
  const gradeWrap = $('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = g.id;
    b.title = g.name;
    b.style.background = `linear-gradient(135deg, ${g.sky[0]}, ${g.sky[1]} 55%, ${g.sky[2]})`;
    b.setAttribute('aria-label', g.name);
    b.addEventListener('click', () => {
      state.grade = g.id;
      markActive(gradeWrap, b);
      $('grade-name').textContent = g.name;
      redraw();
    });
    gradeWrap.appendChild(b);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      markActive($('sizes'), b);
      redraw();
    });
  });
  markActive(layoutWrap, layoutWrap.querySelector('[data-layout="hero3"]'));
  markActive(gradeWrap, gradeWrap.querySelector('[data-grade="sunset"]'));
  markActive($('sizes'), document.querySelector('[data-size="1080x1080"]'));
}

function markActive(wrap, btn) {
  wrap.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
  btn.classList.add('active');
}

// --- Panel controls: which photo, zoom, fill-all ------------------------------
function syncPanelControls() {
  const panels = previewPanels();
  const sel = $('panel-select');
  const cur = Number(sel.value || 0);
  if (sel.options.length !== panels.length) {
    sel.innerHTML = '';
    panels.forEach((_, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `Panel ${i + 1}`;
      sel.appendChild(o);
    });
  }
  sel.value = String(Math.min(state.selectedPanel, panels.length - 1));
  const i = Number(sel.value);
  const photoSel = $('panel-photo');
  photoSel.value = String(state.panelPhoto[i] ?? 0);
  $('panel-zoom').value = String(state.panelZoom[i] || 1);
  $('zoom-val').textContent = `${Math.round((state.panelZoom[i] || 1) * 100)}%`;
  document.querySelectorAll('#layouts .chip').forEach((el) => {
    el.classList.toggle('active', el.dataset.layout === state.layout);
  });
  void cur;
}

function buildPanelControls() {
  const photoSel = $('panel-photo');
  for (let s = 0; s < 4; s++) {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = slotNames[s];
    photoSel.appendChild(o);
  }
  $('panel-select').addEventListener('change', (e) => {
    state.selectedPanel = Number(e.target.value);
    syncPanelControls();
  });
  photoSel.addEventListener('change', (e) => {
    state.panelPhoto[state.selectedPanel] = Number(e.target.value);
    redraw();
  });
  $('panel-zoom').addEventListener('input', (e) => {
    state.panelZoom[state.selectedPanel] = Number(e.target.value);
    redraw();
  });
  $('fill-all').addEventListener('click', () => {
    const slot = state.panelPhoto[state.selectedPanel];
    state.panelPhoto = state.panelPhoto.map(() => slot);
    redraw();
    setStatus(`Every panel now uses ${slotNames[slot]}.`);
  });
  $('reset-crop').addEventListener('click', () => {
    state.panelZoom[state.selectedPanel] = 1;
    state.panelPan[state.selectedPanel] = { x: 0, y: 0 };
    redraw();
  });
}

// --- Drag to pan, wheel to zoom, click to select a panel ----------------------
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const r = preview.getBoundingClientRect();
  const cx = (e.clientX - r.left) * (preview.width / r.width);
  const cy = (e.clientY - r.top) * (preview.height / r.height);
  const hit = pickPanelAt(cx, cy);
  if (hit < 0) return;
  state.selectedPanel = hit;
  drag = { x: cx, y: cy, panel: hit, moved: false };
  preview.setPointerCapture(e.pointerId);
  syncPanelControls();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = preview.getBoundingClientRect();
  const cx = (e.clientX - r.left) * (preview.width / r.width);
  const cy = (e.clientY - r.top) * (preview.height / r.height);
  const panels = previewPanels();
  const p = panels[drag.panel];
  const pan = state.panelPan[drag.panel];
  pan.x += (cx - drag.x) / p.w;
  pan.y += (cy - drag.y) / p.h;
  drag.x = cx;
  drag.y = cy;
  drag.moved = true;
  redraw();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = preview.getBoundingClientRect();
  const cx = (e.clientX - r.left) * (preview.width / r.width);
  const cy = (e.clientY - r.top) * (preview.height / r.height);
  const hit = pickPanelAt(cx, cy);
  if (hit < 0) return;
  state.selectedPanel = hit;
  const z = state.panelZoom[hit] || 1;
  state.panelZoom[hit] = Math.max(1, Math.min(3, z * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// --- Caption, effects, export -------------------------------------------------
function setStatus(msg) {
  statusEl.textContent = msg;
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('export produced no PNG'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

async function exportSize(sizeId) {
  const size = SIZES[sizeId];
  const canvas = exportCoverCanvas(state, sizeId);
  const name = `neon-coast-cover-${size.w}x${size.h}.png`;
  await downloadCanvas(canvas, name);
  window.__lastExport = { width: size.w, height: size.h, name, bytes: 0 };
  setStatus(`Saved ${name} — ${size.w} x ${size.h}.`);
  return canvas;
}

function buildExports() {
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await exportSize(b.dataset.export);
      } catch {
        setStatus('Export failed — try again.');
      } finally {
        b.disabled = false;
      }
    });
  });
}

function buildTextAndEffects() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
  $('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; redraw(); });
  $('badge').addEventListener('change', (e) => { state.badge = e.target.checked; redraw(); });
  $('load-samples').addEventListener('click', async () => {
    await setPhoto(0, 'samples/boulevard.jpg');
    await setPhoto(1, 'samples/pier.jpg');
    setStatus('Sample photos loaded into slots 1 and 2.');
  });
  $('shuffle').addEventListener('click', () => {
    state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
    state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
    $('grade-name').textContent = (GRADES.find((g) => g.id === state.grade) || {}).name || '';
    redraw();
    setStatus('Shuffled layout and colour grade.');
  });
}

// Test hooks: the play-test and the screenshot scenes drive the same editor.
window.__neonCoast = { state, redraw, setPhoto, exportSize, loadImage };

buildPhotoSlots();
buildPickers();
buildPanelControls();
buildExports();
buildTextAndEffects();

const params = new URLSearchParams(location.search);
if (params.get('selftest') === '1') {
  runSelfTest({ state, setPhoto, exportSize, loadImage, redraw });
} else if (params.get('shot')) {
  runShot(params.get('shot'), params, { state, setPhoto, redraw, loadImage });
} else {
  redraw();
}
