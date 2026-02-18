(() => {
  const panel = document.getElementById('panel-transform');
  if (!panel) return;

  const els = {
    presetRight: panel.querySelector('#tx-preset-right'),
    presetLeft: panel.querySelector('#tx-preset-left'),
    inverse: panel.querySelector('#tx-inverse'),
    autoresize: panel.querySelector('#tx-autoresize'),
    multitile: panel.querySelector('#tx-multitile'),
    matrixInputs: Array.from(panel.querySelectorAll('[data-m]')),
    applyBtn: panel.querySelector('#tx-apply'),
    exportBtn: panel.querySelector('#tx-export'),
    exportAllBtn: panel.querySelector('#tx-export-all'),
    copyBtn: panel.querySelector('#tx-copy'),
    clearBtn: panel.querySelector('#tx-clear'),
    fileBtn: panel.querySelector('#tx-file-btn'),
    fileInput: panel.querySelector('#tx-file'),
    drop: panel.querySelector('#tx-drop'),
    status: panel.querySelector('#tx-status'),
    warn: panel.querySelector('#tx-warn'),
    preview: panel.querySelector('#tx-preview')
  };

  const PRESETS = {
    right: [0.9970, 0, 0.4618, -0.4771, 0.9994, 89.6913, 0, 0, 1],
    left: [1, 0, 0, 0, 1, 0, 0, 0, 1] // placeholder until left preset is provided
  };

  let sourceImage = null;
  let lastCanvas = null;
  let lastTiles = [];

  init();

  function init() {
    wirePresets();
    wireMatrixInputs();
    wireFileInputs();
    wireActions();
    loadPreset('right');
  }

  function wirePresets() {
    if (els.presetRight) {
      els.presetRight.addEventListener('click', () => loadPreset('right'));
    }
    if (els.presetLeft) {
      els.presetLeft.addEventListener('click', () => loadPreset('left'));
    }
  }

  function wireMatrixInputs() {
    els.matrixInputs.forEach((inp) => {
      inp.addEventListener('change', () => {
        setWarn('');
      });
    });
  }

  function wireFileInputs() {
    if (els.fileBtn && els.fileInput) {
      els.fileBtn.addEventListener('click', () => els.fileInput.click());
      els.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    }
    if (els.drop) {
      const openPicker = () => els.fileInput && els.fileInput.click();
      els.drop.addEventListener('click', openPicker);
      els.drop.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      });
      ['dragenter', 'dragover'].forEach((evt) => els.drop.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        els.drop.classList.add('drag');
      }));
      ['dragleave', 'drop'].forEach((evt) => els.drop.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        els.drop.classList.remove('drag');
      }));
      els.drop.addEventListener('drop', (e) => {
        if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
      });
    }
    window.addEventListener('paste', (e) => {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
      if (file) handleFiles([file]);
    });
  }

  function wireActions() {
    if (els.applyBtn) els.applyBtn.addEventListener('click', applyTransform);
    if (els.exportBtn) els.exportBtn.addEventListener('click', exportPng);
    if (els.exportAllBtn) els.exportAllBtn.addEventListener('click', exportAllTiles);
    if (els.copyBtn) els.copyBtn.addEventListener('click', copyPng);
    if (els.clearBtn) els.clearBtn.addEventListener('click', clearAll);
  }

  function loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) {
      setWarn('Preset not available.');
      return;
    }
    setMatrix(preset);
    setStatus(`${name === 'right' ? 'Right' : 'Left'} preset loaded.`);
  }

  function setMatrix(vals) {
    if (!Array.isArray(vals) || vals.length !== 9) return;
    els.matrixInputs.forEach((inp) => {
      const idx = Number(inp.dataset.m);
      const v = vals[idx];
      inp.value = typeof v === 'number' ? v : 0;
    });
  }

  function getMatrix() {
    const out = new Array(9).fill(0);
    for (let i = 0; i < 9; i++) {
      const inp = els.matrixInputs[i];
      const val = inp ? parseFloat(inp.value) : NaN;
      out[i] = Number.isFinite(val) ? val : 0;
    }
    return out;
  }

  async function handleFiles(fileList) {
    const file = fileList && fileList[0];
    if (!file) return;
    setWarn('');
    setStatus('Loading image...');
    try {
      const img = await blobToImage(file);
      sourceImage = img;
      const w = img.width || img.naturalWidth || 0;
      const h = img.height || img.naturalHeight || 0;
      setStatus(`Loaded ${file.name || 'image'} (${w} × ${h})`);
      clearPreview();
    } catch (err) {
      console.error(err);
      setWarn('Failed to load image.');
    }
  }

  function applyTransform() {
    if (!sourceImage) {
      setWarn('Load an image first.');
      return;
    }
    const mat = getMatrix();
    const useInverse = !!(els.inverse && els.inverse.checked);
    let H = mat;
    if (useInverse) {
      H = invert3x3(mat);
      if (!H) {
        setWarn('Matrix is not invertible.');
        return;
      }
    }
    const Hinv = invert3x3(H);
    if (!Hinv) {
      setWarn('Matrix is not invertible.');
      return;
    }

    const targetW = 390;
    const targetH = 260;
    const autoresize = !!(els.autoresize && els.autoresize.checked);
    const multiTile = !!(els.multitile && els.multitile.checked);
    
    const srcW = autoresize ? targetW : (sourceImage.width || sourceImage.naturalWidth || targetW);
    const srcH = autoresize ? targetH : (sourceImage.height || sourceImage.naturalHeight || targetH);

    // Create source canvas at desired size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = autoresize ? targetW : srcW;
    srcCanvas.height = autoresize ? targetH : srcH;
    const sctx = srcCanvas.getContext('2d');
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(sourceImage, 0, 0, srcW, srcH, 0, 0, srcCanvas.width, srcCanvas.height);
    const srcData = sctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

    if (multiTile) {
      // Multi-tile mode: calculate full transformed bounds and split into tiles
      const { minX, minY, maxX, maxY, fullCanvas } = warpImageDataFull(srcData, Hinv, H);
      const fullW = maxX - minX;
      const fullH = maxY - minY;
      
      if (fullW <= targetW && fullH <= targetH) {
        // Result fits in one tile
        renderPreview(fullCanvas.getContext('2d').getImageData(0, 0, fullCanvas.width, fullCanvas.height));
        lastTiles = [fullCanvas];
        setWarn('');
        setStatus(`Applied transform (1 tile: ${fullW}×${fullH})`);
        if (els.exportAllBtn) els.exportAllBtn.style.display = 'none';
      } else {
        // Split into tiles
        const tiles = splitIntoTiles(fullCanvas, targetW, targetH);
        lastTiles = tiles;
        renderMultiPreview(tiles, targetW, targetH);
        setWarn('');
        setStatus(`Applied transform (${tiles.length} tiles: ${fullW}×${fullH} total)`);
        if (els.exportAllBtn) {
          els.exportAllBtn.style.display = '';
          els.exportAllBtn.disabled = false;
        }
      }
    } else {
      // Single tile mode (original behavior)
      const outData = warpImageData(srcData, Hinv);
      renderPreview(outData);
      setWarn('');
      setStatus('Applied transform.');
      if (els.exportAllBtn) els.exportAllBtn.style.display = 'none';
    }
  }

  function renderPreview(imageData) {
    if (!els.preview) return;
    els.preview.width = imageData.width;
    els.preview.height = imageData.height;
    const ctx = els.preview.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    lastCanvas = document.createElement('canvas');
    lastCanvas.width = imageData.width;
    lastCanvas.height = imageData.height;
    lastCanvas.getContext('2d').putImageData(imageData, 0, 0);
    lastTiles = [lastCanvas];

    if (els.exportBtn) els.exportBtn.disabled = false;
    if (els.copyBtn) els.copyBtn.disabled = false;
  }

  async function exportPng() {
    if (!lastCanvas) return;
    try {
      const blob = await canvasToPng(lastCanvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ywp-perspective.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      console.error(err);
      setWarn('Export failed.');
    }
  }

  async function copyPng() {
    if (!lastCanvas) return;
    try {
      const blob = await canvasToPng(lastCanvas);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus('Copied to clipboard.');
    } catch (err) {
      console.error(err);
      setWarn('Clipboard not available in this context.');
    }
  }

  function clearAll() {
    sourceImage = null;
    lastCanvas = null;
    lastTiles = [];
    if (els.fileInput) els.fileInput.value = '';
    if (els.preview) {
      const ctx = els.preview.getContext('2d');
      ctx.clearRect(0, 0, els.preview.width, els.preview.height);
    }
    if (els.exportBtn) els.exportBtn.disabled = true;
    if (els.exportAllBtn) {
      els.exportAllBtn.disabled = true;
      els.exportAllBtn.style.display = 'none';
    }
    if (els.copyBtn) els.copyBtn.disabled = true;
    setStatus('Cleared.');
    setWarn('');
  }

  function clearPreview() {
    if (!els.preview) return;
    const ctx = els.preview.getContext('2d');
    ctx.clearRect(0, 0, els.preview.width, els.preview.height);
    if (els.exportBtn) els.exportBtn.disabled = true;
    if (els.copyBtn) els.copyBtn.disabled = true;
    lastCanvas = null;
  }

  function setStatus(msg) {
    if (!els.status) return;
    els.status.textContent = msg || '';
  }

  function setWarn(msg) {
    if (!els.warn) return;
    els.warn.textContent = msg || '';
  }

  function blobToImage(blob) {
    if (window.createImageBitmap) {
      return createImageBitmap(blob).catch(() => fallbackDecode(blob));
    }
    return fallbackDecode(blob);
  }

  function fallbackDecode(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode failed'));
      img.src = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(img.src), 4000);
    });
  }

  function canvasToPng(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Blob failed'));
        else resolve(blob);
      }, 'image/png');
    });
  }

  function invert3x3(m) {
    const A = m[0], B = m[1], C = m[2];
    const D = m[3], E = m[4], F = m[5];
    const G = m[6], H = m[7], I = m[8];
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

  function warpImageData(srcImageData, Hinv) {
    const w = srcImageData.width;
    const h = srcImageData.height;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const outCtx = outCanvas.getContext('2d');
    const outData = outCtx.createImageData(w, h);
    const sdata = srcImageData.data;
    const ddata = outData.data;

    const h0 = Hinv[0], h1 = Hinv[1], h2 = Hinv[2];
    const h3 = Hinv[3], h4 = Hinv[4], h5 = Hinv[5];
    const h6 = Hinv[6], h7 = Hinv[7], h8 = Hinv[8];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wx = h0 * x + h1 * y + h2;
        const wy = h3 * x + h4 * y + h5;
        const wz = h6 * x + h7 * y + h8;
        if (wz === 0) continue;
        const sx = wx / wz;
        const sy = wy / wz;
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        if (ix >= 0 && iy >= 0 && ix + 1 < w && iy + 1 < h) {
          const fx = sx - ix;
          const fy = sy - iy;
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
      }
    }
    return outData;
  }

  // Multi-tile support functions
  function warpImageDataFull(srcImageData, Hinv, H) {
    const w = srcImageData.width;
    const h = srcImageData.height;

    // Calculate bounding box of transformed image
    const corners = [
      [0, 0], [w, 0], [w, h], [0, h]
    ];
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    corners.forEach(([x, y]) => {
      const wx = H[0] * x + H[1] * y + H[2];
      const wy = H[3] * x + H[4] * y + H[5];
      const wz = H[6] * x + H[7] * y + H[8];
      if (wz !== 0) {
        const tx = wx / wz;
        const ty = wy / wz;
        minX = Math.min(minX, tx);
        minY = Math.min(minY, ty);
        maxX = Math.max(maxX, tx);
        maxY = Math.max(maxY, ty);
      }
    });

    // Create canvas for full transformed image
    const fullW = Math.ceil(maxX - minX);
    const fullH = Math.ceil(maxY - minY);
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = fullW;
    fullCanvas.height = fullH;
    const fullCtx = fullCanvas.getContext('2d');
    const fullData = fullCtx.createImageData(fullW, fullH);

    const sdata = srcImageData.data;
    const ddata = fullData.data;

    const h0 = Hinv[0], h1 = Hinv[1], h2 = Hinv[2];
    const h3 = Hinv[3], h4 = Hinv[4], h5 = Hinv[5];
    const h6 = Hinv[6], h7 = Hinv[7], h8 = Hinv[8];

    // Transform with offset
    for (let y = 0; y < fullH; y++) {
      for (let x = 0; x < fullW; x++) {
        const dx = x + minX;
        const dy = y + minY;
        const wx = h0 * dx + h1 * dy + h2;
        const wy = h3 * dx + h4 * dy + h5;
        const wz = h6 * dx + h7 * dy + h8;
        if (wz === 0) continue;
        const sx = wx / wz;
        const sy = wy / wz;
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        if (ix >= 0 && iy >= 0 && ix + 1 < w && iy + 1 < h) {
          const fx = sx - ix;
          const fy = sy - iy;
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
            ddata[(y * fullW + x) * 4 + c] = v0 + fy * (v1 - v0);
          }
        }
      }
    }

    fullCtx.putImageData(fullData, 0, 0);
    return { minX, minY, maxX, maxY, fullCanvas };
  }

  function splitIntoTiles(canvas, tileW, tileH) {
    const tiles = [];
    const cols = Math.ceil(canvas.width / tileW);
    const rows = Math.ceil(canvas.height / tileH);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileW;
        tileCanvas.height = tileH;
        const ctx = tileCanvas.getContext('2d');
        
        const sx = col * tileW;
        const sy = row * tileH;
        const sw = Math.min(tileW, canvas.width - sx);
        const sh = Math.min(tileH, canvas.height - sy);
        
        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        tiles.push({ canvas: tileCanvas, row, col });
      }
    }

    return tiles;
  }

  function renderMultiPreview(tiles, tileW, tileH) {
    if (!els.preview || tiles.length === 0) return;

    // Calculate grid dimensions
    const cols = Math.max(...tiles.map(t => t.col)) + 1;
    const rows = Math.max(...tiles.map(t => t.row)) + 1;
    
    // Set preview canvas to show all tiles
    const previewW = cols * tileW;
    const previewH = rows * tileH;
    els.preview.width = previewW;
    els.preview.height = previewH;
    
    const ctx = els.preview.getContext('2d');
    ctx.clearRect(0, 0, previewW, previewH);

    // Draw each tile
    tiles.forEach(({ canvas, row, col }) => {
      ctx.drawImage(canvas, col * tileW, row * tileH);
    });

    // Store full preview canvas for copy/export
    lastCanvas = document.createElement('canvas');
    lastCanvas.width = previewW;
    lastCanvas.height = previewH;
    const lastCtx = lastCanvas.getContext('2d');
    lastCtx.drawImage(els.preview, 0, 0);

    if (els.exportBtn) els.exportBtn.disabled = false;
    if (els.copyBtn) els.copyBtn.disabled = false;
  }

  async function exportAllTiles() {
    if (lastTiles.length === 0) return;
    
    try {
      setStatus('Exporting all tiles...');
      
      for (let i = 0; i < lastTiles.length; i++) {
        const tile = lastTiles[i];
        const canvas = tile.canvas || tile;
        const blob = await canvasToPng(canvas);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ywp-perspective-tile-${i + 1}.png`;
        a.click();
        
        // Stagger downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 200));
        URL.revokeObjectURL(url);
      }
      
      setStatus(`Exported ${lastTiles.length} tiles.`);
    } catch (err) {
      console.error(err);
      setWarn('Export failed.');
    }
  }
})();
