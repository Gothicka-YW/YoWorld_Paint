// skew.js - fixed preset pre-warp (deskew) utilities
// H maps ideal (front-on) board -> in-game slanted board. We need Hinv to pre-warp.
// Shear-based presets aligned to GIMP Shear Y magnitude (px shift across height).

const DEG = Math.PI / 180;

// Build a simple X-shear (affine) homography using total horizontal shift (px) over image height.
// direction: 'right' uses +k (shifts downwards rows to the right), 'left' uses -k.
export function buildShearPreset(direction = 'right', width = 390, height = 260, totalShiftPx = 70, perspPct = 0) {
  const k = (totalShiftPx || 0) / (height || 1);
  const kdir = direction === 'left' ? -k : k;
  // Optional mild projective tweak: vertical perspective term g = +/- (perspPct / 1000)
  // Positive g causes vertical lines to converge slightly; sign flips with direction to mirror.
  const g = (perspPct ? (perspPct / 1000) : 0) * (direction === 'left' ? -1 : 1);
  // Shear + small projective skew in y-term of denominator: w' = 1 + g*y
  const H = [
    1, kdir, 0,
    0, 1,    0,
    0, g,    1
  ];
  const Hinv = invert3x3([ 1, -kdir, 0, 0, 1, 0, 0, 0, 1 ]); // inverse of shear
  return { H, Hinv, meta: { type: 'shear', direction, totalShiftPx, k: kdir } };
}

// Solve homography from 4 point pairs
function computeHomography(src, dst) {
  // src/dst: arrays of length 8: [x0,y0, x1,y1, x2,y2, x3,y3]
  const A = new Array(8).fill(0).map(() => new Array(8).fill(0));
  const b = new Array(8).fill(0);
  for (let i = 0; i < 4; i++) {
    const xs = src[2 * i];
    const ys = src[2 * i + 1];
    const xd = dst[2 * i];
    const yd = dst[2 * i + 1];
    A[2 * i][0] = xs;
    A[2 * i][1] = ys;
    A[2 * i][2] = 1;
    A[2 * i][3] = 0;
    A[2 * i][4] = 0;
    A[2 * i][5] = 0;
    A[2 * i][6] = -xs * xd;
    A[2 * i][7] = -ys * xd;
    b[2 * i] = xd;

    A[2 * i + 1][0] = 0;
    A[2 * i + 1][1] = 0;
    A[2 * i + 1][2] = 0;
    A[2 * i + 1][3] = xs;
    A[2 * i + 1][4] = ys;
    A[2 * i + 1][5] = 1;
    A[2 * i + 1][6] = -xs * yd;
    A[2 * i + 1][7] = -ys * yd;
    b[2 * i + 1] = yd;
  }
  const h = solveGaussian(A, b);
  h.push(1);
  return h; // length 9
}

function solveGaussian(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    // pivot
    let piv = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    }
    if (piv !== i) {
      [A[i], A[piv]] = [A[piv], A[i]];
      [b[i], b[piv]] = [b[piv], b[i]];
    }
    const div = A[i][i] || 1e-12;
    for (let c = i; c < n; c++) A[i][c] /= div;
    b[i] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = A[r][i];
      if (!factor) continue;
      for (let c = i; c < n; c++) A[r][c] -= factor * A[i][c];
      b[r] -= factor * b[i];
    }
  }
  return b;
}

function invert3x3(m) {
  const a = m;
  const A = a[0], B = a[1], C = a[2];
  const D = a[3], E = a[4], F = a[5];
  const G = a[6], H = a[7], I = a[8];
  const det = A * (E * I - F * H) - B * (D * I - F * G) + C * (D * H - E * G);
  if (Math.abs(det) < 1e-12) return null;
  const id = 1 / det;
  return [
    (E * I - F * H) * id,
    (C * H - B * I) * id,
    (B * F - C * E) * id,
    (F * G - D * I) * id,
    (A * I - C * G) * id,
    (C * D - A * F) * id,
    (D * H - E * G) * id,
    (B * G - A * H) * id,
    (A * E - B * D) * id
  ];
}

// Apply pre-warp: given straight source ImageData, produce warped output so that
// when shown in-game (with perspective) it appears straight. We apply Hinv,
// meaning we map destination pixel back into source coordinates.
export function preWarpImageData(srcImageData, preset, opts = {}) {
  if (!preset || !preset.Hinv) {
    console.warn('[skew] Missing preset or Hinv');
    return srcImageData;
  }
  const { Hinv } = preset;
  const w = srcImageData.width;
  const h = srcImageData.height;
  const outCanvas = new OffscreenCanvas(w, h);
  const ctx = outCanvas.getContext('2d');
  const outData = ctx.createImageData(w, h);
  const sdata = srcImageData.data;
  const ddata = outData.data;

  const h0 = Hinv[0], h1 = Hinv[1], h2 = Hinv[2];
  const h3 = Hinv[3], h4 = Hinv[4], h5 = Hinv[5];
  const h6 = Hinv[6], h7 = Hinv[7], h8 = Hinv[8];

  const bilinear = opts.hq !== false; // default true

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = h0 * x + h1 * y + h2;
      const wy = h3 * x + h4 * y + h5;
      const wz = h6 * x + h7 * y + h8;
      if (wz === 0) continue;
      let sx = wx / wz;
      let sy = wy / wz;
      if (bilinear) {
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        const fx = sx - ix;
        const fy = sy - iy;
        if (ix >= 0 && iy >= 0 && ix + 1 < w && iy + 1 < h) {
          const i00 = (iy * w + ix) * 4;
          const i10 = (iy * w + (ix + 1)) * 4;
          const i01 = ((iy + 1) * w + ix) * 4;
            const i11 = ((iy + 1) * w + (ix + 1)) * 4;
          for (let c = 0; c < 4; c++) {
            const v00 = sdata[i00 + c];
            const v10 = sdata[i10 + c];
            const v01 = sdata[i01 + c];
            const v11 = sdata[i11 + c];
            const v0 = v00 + fx * (v10 - v00);
            const v1 = v01 + fx * (v11 - v01);
            ddata[(y * w + x) * 4 + c] = v0 + fy * (v1 - v0);
          }
        }
      } else {
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix >= 0 && iy >= 0 && ix < w && iy < h) {
          const si = (iy * w + ix) * 4;
          const di = (y * w + x) * 4;
          ddata[di] = sdata[si];
          ddata[di + 1] = sdata[si + 1];
          ddata[di + 2] = sdata[si + 2];
          ddata[di + 3] = sdata[si + 3];
        }
      }
    }
  }
  return outData;
}

// Generate default approximate presets (one-time). Can be replaced with real storage/ calibration.
export function defaultSkewPresets() {
  const right = buildShearPreset('right', 390, 260, 70, 0);
  const left = buildShearPreset('left', 390, 260, 70, 0);
  return { right, left };
}

export function ensurePresetMatrices(settings) {
  const need = !settings.skewPresets || !settings.skewPresets.right?.Hinv || !settings.skewPresets.left?.Hinv;
  const slantPx = settings.skewSlantPx != null ? settings.skewSlantPx : 70;
  if (need) {
    const right = buildShearPreset('right', 390, 260, slantPx, settings.skewPerspectivePct || 0);
    const left = buildShearPreset('left', 390, 260, slantPx, settings.skewPerspectivePct || 0);
    return { ...settings, skewPresets: {
      right: { H: right.H, Hinv: right.Hinv },
      left: { H: left.H, Hinv: left.Hinv }
    } };
  }
  return settings;
}

export function serializePreset(p) {
  if (!p) return null;
  return { H: p.H, Hinv: p.Hinv };
}

export function updateSlant(settings, { direction, slantPx }) {
  const updated = buildShearPreset(direction, 390, 260, slantPx, settings.skewPerspectivePct || 0);
  const skewPresets = { ...settings.skewPresets };
  skewPresets[direction] = { H: updated.H, Hinv: updated.Hinv };
  return { ...settings, skewPresets };
}

export function updatePerspective(settings, { perspPct }) {
  const dirList = ['left','right'];
  const skewPresets = { ...settings.skewPresets };
  dirList.forEach(dir=>{
    const updated = buildShearPreset(dir, 390, 260, settings.skewSlantPx || 70, perspPct);
    skewPresets[dir] = { H: updated.H, Hinv: updated.Hinv };
  });
  return { ...settings, skewPresets };
}

// Convenience: resize an ImageBitmap/HTMLImageElement to 390x260 (contain = false: we force exact size)
export function forceBoardSizeToCanvas(source, targetW = 390, targetH = 260) {
  const cvs = new OffscreenCanvas(targetW, targetH);
  const ctx = cvs.getContext('2d');
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

export function imageElementToImageData(img) {
  const cvs = new OffscreenCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

export function imageBitmapToImageData(bitmap) {
  const cvs = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = cvs.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

// Export for unit usage in tools tab
export default {
  preWarpImageData,
  defaultSkewPresets,
  ensurePresetMatrices,
  updateSlant,
  updatePerspective,
  forceBoardSizeToCanvas,
  imageElementToImageData,
  imageBitmapToImageData
};

// Build an approximate preset for an arbitrary image size.
export function buildApproxPreset(direction = 'right', width = 390, height = 260, slantPx = 70, perspPct = 0) {
  return buildShearPreset(direction, width, height, slantPx, perspPct);
}
