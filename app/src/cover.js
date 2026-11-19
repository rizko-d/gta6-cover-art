// Neon Coast cover engine: draws a multi-panel poster cover onto any 2D canvas.
// Everything here is original art drawn in code: gradient skies, a sun disc, palm
// silhouettes, halftone dots and bold condensed lettering. No external images, no
// fonts shipped, no Rockstar art, logo or wordmark anywhere.
//
// A cover is described by a state object:
//   size        "1080x1080" | "1080x1350" | "1920x1080"
//   layout      one of LAYOUTS below
//   grade       one of GRADES below
//   title       big caption, subtitle: smaller neon line
//   photos      array of HTMLImageElement | null (up to 4 slots)
//   panelPhoto  per-panel index into photos
//   panelZoom   per-panel zoom factor, panelPan: per-panel {x, y} offsets in panel fractions
//   grain, halftone, badge: effect toggles

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = [
  { id: 'hero3', name: 'Hero + 3', panels: 4, blurb: 'One big hero panel, three stacked beside it' },
  { id: 'grid4', name: 'Four Grid', panels: 4, blurb: 'A classic 2 x 2 poster grid' },
  { id: 'strip3', name: 'Three Bands', panels: 3, blurb: 'Three full-width bands, like a film strip' },
  { id: 'fullbleed', name: 'Full Bleed', panels: 2, blurb: 'One photo fills the cover, snapshot overlapping' },
  { id: 'tilted', name: 'Tilted Snaps', panels: 3, blurb: 'Three overlapping tilted snapshots on a sunset sky' },
  { id: 'nine', name: 'Nine Panel', panels: 9, blurb: 'A 3 x 3 contact-sheet grid, the loading-screen look' },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', sky: ['#ff9a3d', '#ff5e7a', '#7b2d8b'], tint: 'rgba(255,110,60,0.20)', title: ['#ffe259', '#ff7e2e'], accent: '#ff2e88', glow: '#ff9a3d' },
  { id: 'neon', name: 'Neon Nights', sky: ['#2b1055', '#7597de', '#ff2e88'], tint: 'rgba(255,46,136,0.22)', title: ['#7df9ff', '#ff2e88'], accent: '#00f0ff', glow: '#ff2e88' },
  { id: 'gold', name: 'Palm Gold', sky: ['#ffd76a', '#ff8c42', '#8a3b12'], tint: 'rgba(255,180,40,0.20)', title: ['#fff3b0', '#ffb347'], accent: '#ff5e00', glow: '#ffd76a' },
  { id: 'midnight', name: 'Midnight Drive', sky: ['#0f2027', '#2c5364', '#7b2d8b'], tint: 'rgba(80,60,255,0.22)', title: ['#c9b6ff', '#5e8bff'], accent: '#b388ff', glow: '#5e8bff' },
  { id: 'candy', name: 'Candy Pop', sky: ['#ff6ec7', '#7873f5', '#00d4ff'], tint: 'rgba(255,110,199,0.18)', title: ['#ffffff', '#ff6ec7'], accent: '#00e5ff', glow: '#ff6ec7' },
];

/** Panels for a layout, in cover pixels. `area` is the photo zone above the title band. */
export function layoutPanels(layoutId, W, H, areaH) {
  const g = Math.max(6, Math.round(W * 0.008)); // white gutter between panels
  const m = Math.round(W * 0.02); // outer margin
  const x0 = m, y0 = m, w = W - m * 2, h = areaH - m;
  const R = (x, y, pw, ph, rot = 0) => ({ x, y, w: pw, h: ph, rot });
  switch (layoutId) {
    case 'hero3': {
      const heroW = w * 0.62;
      const sideW = w - heroW - g;
      const sh = (h - g * 2) / 3;
      return [R(x0, y0, heroW, h), R(x0 + heroW + g, y0, sideW, sh),
        R(x0 + heroW + g, y0 + sh + g, sideW, sh), R(x0 + heroW + g, y0 + (sh + g) * 2, sideW, sh)];
    }
    case 'grid4': {
      const cw = (w - g) / 2, ch = (h - g) / 2;
      return [R(x0, y0, cw, ch), R(x0 + cw + g, y0, cw, ch),
        R(x0, y0 + ch + g, cw, ch), R(x0 + cw + g, y0 + ch + g, cw, ch)];
    }
    case 'strip3': {
      const bh = (h - g * 2) / 3;
      return [R(x0, y0, w, bh), R(x0, y0 + bh + g, w, bh), R(x0, y0 + (bh + g) * 2, w, bh)];
    }
    case 'fullbleed':
      return [R(x0, y0, w, h), R(x0 + w * 0.58, y0 + h * 0.58, w * 0.36, h * 0.36, -4)];
    case 'tilted': {
      const pw = w * 0.52, ph = h * 0.62;
      return [R(x0 + w * 0.04, y0 + h * 0.02, pw, ph, -5),
        R(x0 + w * 0.42, y0 + h * 0.10, pw, ph, 4),
        R(x0 + w * 0.22, y0 + h * 0.30, pw * 0.9, ph * 0.72, -1)];
    }
    case 'nine':
    default: {
      const cw = (w - g * 2) / 3, ch = (h - g * 2) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        out.push(R(x0 + c * (cw + g), y0 + r * (ch + g), cw, ch));
      return out;
    }
  }
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan. */
export function drawPhotoInPanel(ctx, img, panel, zoom, pan) {
  if (!img) return false;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return false;
  const base = Math.max(panel.w / iw, panel.h / ih);
  const s = base * (zoom || 1);
  const dw = iw * s, dh = ih * s;
  // Clamp the pan so the photo always covers the panel.
  const maxX = Math.max(0, (dw - panel.w) / 2), maxY = Math.max(0, (dh - panel.h) / 2);
  const ox = Math.max(-maxX, Math.min(maxX, (pan?.x || 0) * panel.w));
  const oy = Math.max(-maxY, Math.min(maxY, (pan?.y || 0) * panel.h));
  ctx.drawImage(img, panel.x + (panel.w - dw) / 2 + ox, panel.y + (panel.h - dh) / 2 + oy, dw, dh);
  return true;
}

/** A stylised palm silhouette, drawn with curves: trunk plus seven fronds. */
export function drawPalm(ctx, x, y, s, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -60, -6, -118);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 52) * Math.PI / 180;
    const tx = Math.cos(a) * 62, ty = -118 + Math.sin(a) * 42 + 14;
    ctx.beginPath();
    ctx.moveTo(-6, -118);
    ctx.quadraticCurveTo(Math.cos(a) * 34, -118 + Math.sin(a) * 26 - 12, tx, ty);
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-6, -118, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Deterministic pseudo-random from a seed, so grain is stable per render. */
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 4294967296;
  };
}

/** Fits `text` to `maxWidth` by shrinking the font, returns the font size used. */
function fitFont(ctx, text, startSize, maxWidth, family, weight = 900) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const DISPLAY = `'Arial Black', Impact, 'DejaVu Sans', 'Liberation Sans', sans-serif`;

/** Draws the big caption: condensed, gradient-filled, thick dark outline, slight skew. */
function drawTitle(ctx, text, cx, baseline, maxWidth, grade, W) {
  const upper = (text || 'NEON COAST').toUpperCase();
  const start = Math.round(W * 0.115);
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.transform(1, 0, -0.06, 1, 0, 0); // poster skew
  ctx.scale(0.86, 1); // condensed look without a condensed font file
  const size = fitFont(ctx, upper, start, maxWidth / 0.86, DISPLAY);
  const grad = ctx.createLinearGradient(0, -size, 0, size * 0.25);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(1, grade.title[1]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14061f';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.strokeText(upper, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(upper, 0, 0);
  // Hot top edge highlight, like sunlit lettering.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1.5, size * 0.012);
  ctx.strokeText(upper, 0, -size * 0.02);
  ctx.restore();
  return size;
}

/** Renders a whole cover. `state` is the editor state; `out` is the target canvas. */
export function renderCover(out, state) {
  const W = out.width, H = out.height;
  const ctx = out.getContext('2d');
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];

  // --- Sky: vertical sunset gradient with a low sun disc.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sunR = W * 0.16;
  const sun = ctx.createRadialGradient(W * 0.78, H * 0.30, sunR * 0.1, W * 0.78, H * 0.30, sunR);
  sun.addColorStop(0, 'rgba(255,244,180,0.95)');
  sun.addColorStop(0.6, 'rgba(255,180,90,0.55)');
  sun.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff2b0';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.30, sunR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Palm silhouettes only where sky actually shows: the tilted layout's open
  // background. In the other layouts the panels cover the sky, and a palm
  // clipped by a panel edge would read as a smudge, so they are skipped.
  if (state.layout === 'tilted') {
    ctx.globalAlpha = 0.9;
    drawPalm(ctx, W * 0.06, H * 0.55, W / 1500, -0.10, '#2a0a33');
    drawPalm(ctx, W * 0.94, H * 0.50, W / 1700, 0.12, '#2a0a33');
    ctx.globalAlpha = 1;
  }

  // --- Title band and panel zone.
  const bandH = Math.round(H * (H > W ? 0.20 : H === W ? 0.22 : 0.26));
  const areaH = H - bandH;
  const panels = layoutPanels(state.layout, W, H, areaH);
  const gutter = Math.max(6, Math.round(W * 0.008));

  // --- Panels: white poster frame, photo, grade tint, ink edge.
  panels.forEach((p, i) => {
    const slot = (state.panelPhoto && state.panelPhoto[i]) ?? 0;
    const img = state.photos ? state.photos[slot] : null;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.rot) ctx.rotate(p.rot * Math.PI / 180);
    ctx.translate(-p.w / 2, -p.h / 2);
    ctx.beginPath();
    ctx.rect(0, 0, p.w, p.h);
    ctx.clip();
    if (img) {
      drawPhotoInPanel(ctx, img, { x: 0, y: 0, w: p.w, h: p.h },
        (state.panelZoom && state.panelZoom[i]) || 1,
        (state.panelPan && state.panelPan[i]) || { x: 0, y: 0 });
    } else {
      // Empty panel: a warm placeholder so the grid still reads as a poster.
      const ph = ctx.createLinearGradient(0, 0, p.w, p.h);
      ph.addColorStop(0, grade.sky[1]);
      ph.addColorStop(1, grade.sky[2]);
      ctx.fillStyle = ph;
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.max(14, p.w * 0.055)}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD PHOTO', p.w / 2, p.h / 2);
    }
    // Sunset grade wash over the photo.
    const wash = ctx.createLinearGradient(0, 0, 0, p.h);
    wash.addColorStop(0, 'rgba(255,140,80,0)');
    wash.addColorStop(1, grade.tint);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.restore();
    // White frame + ink edge, drawn unrotated around the rotated panel's box.
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.rot) ctx.rotate(p.rot * Math.PI / 180);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = gutter;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.strokeStyle = 'rgba(20,6,31,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  // --- Halftone dots along the top of the title band.
  if (state.halftone !== false) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const r = Math.max(2, W * 0.004);
    for (let x = W * 0.04; x < W * 0.96; x += r * 5) {
      ctx.beginPath();
      ctx.arc(x, areaH + r * 2.2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Title band: deep ink, caption, neon subtitle, badge.
  const band = ctx.createLinearGradient(0, areaH, 0, H);
  band.addColorStop(0, '#1c0a26');
  band.addColorStop(1, '#0d0413');
  ctx.fillStyle = band;
  ctx.fillRect(0, areaH, W, H - areaH);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, areaH, W, Math.max(3, H * 0.004));

  const titleSize = drawTitle(ctx, state.title, W / 2, areaH + bandH * 0.62, W * 0.92, grade, W);

  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `italic 700 ${Math.max(13, Math.round(W * 0.028))}px Georgia, 'DejaVu Serif', serif`;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = Math.max(6, W * 0.012);
    ctx.fillStyle = grade.accent;
    const subY = areaH + bandH * 0.62 + titleSize * 0.42;
    ctx.fillText(sub, W / 2, Math.min(subY, H - H * 0.03));
    ctx.restore();
  }

  // Star badge, top-right of the cover.
  if (state.badge !== false) {
    const bx = W * 0.90, by = H * 0.055, br = W * 0.052;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(0.12);
    ctx.fillStyle = '#ffd76a';
    ctx.strokeStyle = '#14061f';
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? br : br * 0.45;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#14061f';
    ctx.font = `900 ${Math.max(10, Math.round(br * 0.34))}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('EST.', 0, -br * 0.05);
    ctx.fillText('2026', 0, br * 0.32);
    ctx.restore();
  }

  // --- Grain + vignette finish.
  if (state.grain !== false) {
    const rnd = seededRandom(20261119);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const n = Math.round(W * H / 900);
    for (let i = 0; i < n; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i < n / 2; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
    }
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,18,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/** Renders `state` at a post size into a fresh canvas and returns it. */
export function exportCoverCanvas(state, sizeId) {
  const size = SIZES[sizeId] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, { ...state, size: sizeId });
  return canvas;
}
