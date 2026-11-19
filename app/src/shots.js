// Fixed scenes for screenshots and the scripted play-test.
//   ?shot=editor&photo=<sample>&layout=<id>&grade=<id>&caption=<text>
//       shows the full editor with a sample photo loaded.
//   ?shot=cover&...&size=<1080x1080|1080x1350|1920x1080>
//       shows just the cover, full frame — the app's own drawing of the export.
//   ?selftest=1 runs the play-test in the page and reports window.__testResult.
// window.__shotReady is set once the scene has painted.
import { SIZES } from './cover.js';

const SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

function applyQuery(state, query) {
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const caption = query.get('caption');
  if (caption) state.title = caption;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const pany = query.get('pany');
  const panx = query.get('panx');
  if (pany !== null || panx !== null) {
    const y = pany === null ? 0 : parseFloat(pany) || 0;
    const x = panx === null ? 0 : parseFloat(panx) || 0;
    state.panelPan = state.panelPan.map(() => ({ x, y }));
  }
  return query.get('photo') ?? 'boulevard';
}

export async function runShot(shot, query, api) {
  const { state, setPhoto, redraw } = api;
  const photo = applyQuery(state, query);
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setPhoto(0, SAMPLES[photo] || SAMPLES.boulevard);
  await setPhoto(1, SAMPLES[photo === 'boulevard' ? 'pier' : 'boulevard']);
  // Second sample fills the side panels; the hero keeps the named photo.
  state.panelPhoto = state.panelPhoto.map((_, i) => (i % 2 === 0 ? 0 : 1));
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

/** Scripted play-test: loads photos, edits the caption, exports every size and
 *  checks the PNG dimensions, while collecting page errors and requests. */
export async function runSelfTest(api) {
  const { state, setPhoto, exportSize, loadImage } = api;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const requests = [];
  const open = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (...a) { requests.push(a[1]); return open.apply(this, a); };
  const fetch0 = window.fetch;
  window.fetch = (...a) => { requests.push(String(a[0])); return fetch0(...a); };

  const result = { steps: [], exports: [], errors, externalRequests: [] };
  const t0 = performance.now();
  try {
    await setPhoto(0, 'samples/boulevard.jpg');
    result.steps.push('photo-1-loaded');
    await setPhoto(1, 'samples/pier.jpg');
    result.steps.push('photo-2-loaded');
    state.title = 'PLAY TEST';
    state.subtitle = 'driven by the scripted test';
    state.layout = 'grid4';
    state.grade = 'neon';
    api.redraw();
    result.steps.push('caption-and-layout-changed');
    // Crop: zoom and pan panel 0, then reset it.
    state.panelZoom[0] = 1.6;
    state.panelPan[0] = { x: 0.1, y: -0.05 };
    api.redraw();
    result.steps.push('panel-0-cropped');
    for (const sizeId of Object.keys(SIZES)) {
      const canvas = await exportSize(sizeId);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      result.exports.push({
        size: sizeId,
        width: img.naturalWidth,
        height: img.naturalHeight,
        bytes: blob.size,
        ok: img.naturalWidth === SIZES[sizeId].w && img.naturalHeight === SIZES[sizeId].h && blob.size > 10000,
      });
    }
    result.steps.push('all-sizes-exported');
  } catch (err) {
    errors.push(`test-threw: ${err && err.message}`);
  }
  result.errors = errors;
  result.externalRequests = requests.filter((u) => !u.startsWith('blob:') && !u.startsWith('data:') && !u.startsWith('http://localhost') && !u.startsWith('http://127.0.0.1'));
  result.ms = Math.round(performance.now() - t0);
  result.pass = result.exports.length === 3 && result.exports.every((e) => e.ok)
    && errors.length === 0 && result.externalRequests.length === 0;
  window.__testResult = result;
  document.title = 'TEST_DONE';
}
