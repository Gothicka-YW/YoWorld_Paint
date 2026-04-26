
// home.js — donor storage format, live preview
(function(){
  const input   = document.getElementById('img-url');
  const btn     = document.getElementById('btn-set');
  const toggle  = document.getElementById('enable-redirect');
  const preview = document.querySelector('.preview');

  function setPreview(url) {
    if (!preview) return;
    // Ensure an <img> child shows the image, keeping the checkerboard background visible
    let img = preview.querySelector('img');
    if (!img){
      img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      preview.appendChild(img);
    }
    if (url){
      if (img.src !== url) img.src = url;
      img.style.display = '';
    }
    else { img.remove(); }
  }

  function load() {
    chrome.storage.local.get({ img: ["", false, null] }, (o)=>{
      let url = Array.isArray(o.img) ? (o.img[0] || "") : "";
      const enabled = Array.isArray(o.img) ? !!o.img[1] : false;
      // If no image is set, use the sticky default
      // Default fallback image
      if (!url) url = "https://i.postimg.cc/VLh6mKGY/20250924-1934-Celestial-Cartoon-Background-remix-01k5z13k9cf4jrwgtmak9dqwjr.png";
      if (input)  input.value = url;
      if (toggle) toggle.checked = enabled;
      setPreview(url);
    });
  }

  function saveUrl() {
    const url = (input && input.value || "").trim();
    chrome.storage.local.get({ img: ["", false, null] }, (o)=>{
      const enabled = Array.isArray(o.img) ? !!o.img[1] : false;
      const oldUrl = Array.isArray(o.img) ? (o.img[0] || '') : '';
      const pendingMeta = takePendingRedirectMeta(url);
      const existingMeta = extractExistingRedirectMeta(o.img);
      const nextMeta = pendingMeta || (url === oldUrl ? existingMeta : null);
      // immediate preview
      setPreview(url);
      chrome.storage.local.set({ img: [url, enabled, nextMeta] });
    });
  }

  function saveToggle() {
    const enabled = !!(toggle && toggle.checked);
    chrome.storage.local.get({ img: ["", false, null] }, (o)=>{
      const url = Array.isArray(o.img) ? (o.img[0] || "") : "";
      const meta = extractExistingRedirectMeta(o.img);
      chrome.storage.local.set({ img: [url, enabled, meta] });
    });
  }



  if (btn)   btn.addEventListener('click', saveUrl);
  if (input) input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); saveUrl(); }});
  if (toggle) toggle.addEventListener('change', saveToggle);

  // Allow Quick Upload flow to push an immediate local preview while remote image URL loads.
  window.ywpSetHomePreview = setPreview;

  load();
})();

const HOME_UPLOAD_STATE_KEY = 'ywp-home-upload-state';
const HOME_UPLOAD_DB = 'ywp-home-upload-db';
const HOME_UPLOAD_STORE = 'artifacts';
const HOME_UPLOAD_SOURCE_KEY = 'quick-upload-source';
const HOME_BOARD_WIDTH = 390;
const HOME_BOARD_HEIGHT = 260;
const HOME_LARGE_SOURCE_RATIO_WARN = 2.6;


async function toPngBlobFromFile(file){
  if (isPngFile(file)) {
    return file;
  }
  const img = await loadImageSource(file);
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
  return canvasToPngBlob(cv);
}

async function preparePngBlobFromFile(file, targetW, targetH){
  const img = await loadImageSource(file);
  const srcW = img.width || img.naturalWidth || 0;
  const srcH = img.height || img.naturalHeight || 0;
  if (!srcW || !srcH) throw new Error('Invalid image size');

  if (srcW === targetW && srcH === targetH && isPngFile(file)) {
    return {
      blob: file,
      meta: {
        sourceWidth: srcW,
        sourceHeight: srcH,
        outputWidth: targetW,
        outputHeight: targetH,
        mode: 'exact-original',
        downscaleRatio: 1,
        sharpenApplied: false
      }
    };
  }

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetW;
  targetCanvas.height = targetH;
  const targetCtx = targetCanvas.getContext('2d');
  targetCtx.clearRect(0, 0, targetW, targetH);
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';

  let mode = 'exact';
  if (srcW === targetW && srcH === targetH) {
    copyImagePixels(targetCtx, img, 0, 0, srcW, srcH);
    mode = 'exact';
  } else if (srcW <= targetW && srcH <= targetH) {
    const dx = Math.round((targetW - srcW) / 2);
    const dy = Math.round((targetH - srcH) / 2);
    copyImagePixels(targetCtx, img, dx, dy, srcW, srcH);
    mode = 'contain-no-upscale';
  } else {
    const safeSource = createAlphaSafeCanvas(img, srcW, srcH);
    const scale = Math.min(targetW / srcW, targetH / srcH);
    const downscaled = await progressiveDownscaleToCanvas(safeSource, Math.max(1, Math.round(srcW * scale)), Math.max(1, Math.round(srcH * scale)));
    const dw = downscaled.width;
    const dh = downscaled.height;
    const dx = Math.round((targetW - dw) / 2);
    const dy = Math.round((targetH - dh) / 2);
    targetCtx.drawImage(downscaled, dx, dy, dw, dh);
    mode = 'downscaled';
  }

  const downscaleRatio = Math.max(srcW / targetW, srcH / targetH);
  const sharpenApplied = maybeApplyDownscaleSharpen(targetCanvas, mode, downscaleRatio);

  return {
    blob: await canvasToPngBlob(targetCanvas),
    meta: {
      sourceWidth: srcW,
      sourceHeight: srcH,
      outputWidth: targetW,
      outputHeight: targetH,
      mode,
      downscaleRatio,
      sharpenApplied
    }
  };
}

async function progressiveDownscaleToCanvas(img, targetW, targetH){
  const srcW = img.width || img.naturalWidth || targetW;
  const srcH = img.height || img.naturalHeight || targetH;
  let workCanvas = document.createElement('canvas');
  workCanvas.width = srcW;
  workCanvas.height = srcH;
  let workCtx = workCanvas.getContext('2d');
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = 'high';
  workCtx.clearRect(0, 0, srcW, srcH);
  workCtx.drawImage(img, 0, 0, srcW, srcH);

  while (workCanvas.width * 0.5 > targetW && workCanvas.height * 0.5 > targetH) {
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = Math.max(targetW, Math.round(workCanvas.width * 0.5));
    nextCanvas.height = Math.max(targetH, Math.round(workCanvas.height * 0.5));
    const nextCtx = nextCanvas.getContext('2d');
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.drawImage(workCanvas, 0, 0, workCanvas.width, workCanvas.height, 0, 0, nextCanvas.width, nextCanvas.height);
    workCanvas = nextCanvas;
    workCtx = nextCtx;
  }

  if (workCanvas.width !== targetW || workCanvas.height !== targetH) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.clearRect(0, 0, targetW, targetH);
    finalCtx.drawImage(workCanvas, 0, 0, workCanvas.width, workCanvas.height, 0, 0, targetW, targetH);
    return finalCanvas;
  }

  return workCanvas;
}

function maybeApplyDownscaleSharpen(canvas, mode, downscaleRatio) {
  if (!canvas || mode !== 'downscaled') return false;
  if (!Number.isFinite(downscaleRatio) || downscaleRatio < 2.1) return false;
  if (canvas.width < 3 || canvas.height < 3) return false;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const amount = downscaleRatio >= 4 ? 0.36 : (downscaleRatio >= 3 ? 0.3 : 0.24);
  applySharpenKernel(ctx, canvas.width, canvas.height, amount);
  return true;
}

function applySharpenKernel(ctx, width, height, amount) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const stride = width * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] === 0) continue;

      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        const top = src[idx - stride + c];
        const bottom = src[idx + stride + c];
        const left = src[idx - 4 + c];
        const right = src[idx + 4 + c];
        const sharpened = center * 5 - top - bottom - left - right;
        const blended = center + (sharpened - center) * amount;
        out[idx + c] = clampByte(blended);
      }
      out[idx + 3] = src[idx + 3];
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

function clampByte(value) {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

function createAlphaSafeCanvas(img, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  bleedTransparentPixels(ctx, width, height, 2);
  return canvas;
}

function bleedTransparentPixels(ctx, width, height, passes) {
  const imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;

  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] !== 0) continue;

        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIdx = (ny * width + nx) * 4;
            if (data[nIdx + 3] === 0) continue;
            sumR += data[nIdx];
            sumG += data[nIdx + 1];
            sumB += data[nIdx + 2];
            count++;
          }
        }

        if (!count) continue;
        next[idx] = Math.round(sumR / count);
        next[idx + 1] = Math.round(sumG / count);
        next[idx + 2] = Math.round(sumB / count);
      }
    }
    data = next;
  }

  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function copyImagePixels(targetCtx, img, dx, dy, width, height) {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.clearRect(0, 0, width, height);
  sourceCtx.drawImage(img, 0, 0, width, height);
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  targetCtx.putImageData(imageData, dx, dy);
}

function isPngFile(file) {
  return !!(file && typeof file.type === 'string' && file.type.toLowerCase() === 'image/png');
}

function loadImageSource(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    img.decoding = 'async';
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to decode image'));
    };
    img.src = objectUrl;
  });
}

async function getBlobImageDimensions(blob) {
  const img = await loadImageSource(blob);
  return {
    width: img.width || img.naturalWidth || 0,
    height: img.height || img.naturalHeight || 0
  };
}

function openHomeUploadDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HOME_UPLOAD_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HOME_UPLOAD_STORE)) {
        db.createObjectStore(HOME_UPLOAD_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

async function idbSet(key, value) {
  const db = await openHomeUploadDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HOME_UPLOAD_STORE, 'readwrite');
    tx.objectStore(HOME_UPLOAD_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
  });
}

async function idbGet(key) {
  const db = await openHomeUploadDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HOME_UPLOAD_STORE, 'readonly');
    const req = tx.objectStore(HOME_UPLOAD_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
  });
}

async function idbDelete(key) {
  const db = await openHomeUploadDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HOME_UPLOAD_STORE, 'readwrite');
    tx.objectStore(HOME_UPLOAD_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
  });
}



// --- Quick Upload Integration ---
(function(){
  const hostSel = document.getElementById('qu-host');
  const fileEl = document.getElementById('qu-file');
  const dropZone = document.getElementById('qu-drop');
  const btnUpload = document.getElementById('qu-upload');
  const btnCopy = document.getElementById('qu-copy');
  const statusEl = document.getElementById('qu-status');
  const resultEl = document.getElementById('qu-result');
  const warnEl = document.getElementById('qu-warning');
  const clarityWarnEl = document.getElementById('qu-clarity-warning');
  const autoChk = document.getElementById('qu-autoset');
  const resizeChk = document.getElementById('qu-autoresize');
  const clearBtn = document.getElementById('qu-clear');
  const bridgeBtn = document.getElementById('btn-upload-last');
  if (!hostSel || !fileEl || !btnUpload) return;

  let lastUrl = '';
  let clipboardBlob = null;
  let pickedFile = null; // single source for chosen/dropped file
  let uploadStateLoaded = false;
  let tempPreviewUrl = '';

  function setStatus(msg, isErr){
    if (statusEl){
      statusEl.textContent = msg || '';
      statusEl.style.color = isErr ? '#b00020' : '#6b7280';
    }
    if (uploadStateLoaded) persistUploaderState();
  }

  function setClarityWarning(msg) {
    if (!clarityWarnEl) return;
    const text = String(msg || '').trim();
    clarityWarnEl.textContent = text;
    clarityWarnEl.style.display = text ? 'block' : 'none';
  }

  function setResult(url){ if (resultEl){ if (url){ resultEl.style.display='block'; resultEl.textContent = url; } else { resultEl.style.display='none'; resultEl.textContent=''; } } }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image data'));
      reader.readAsDataURL(file);
    });
  }

  function switchToToolsTab() {
    const toolsTab = document.querySelector('nav.tabs .tab[data-tab="tools"]');
    if (toolsTab && typeof toolsTab.click === 'function') {
      toolsTab.click();
    }
  }

  async function routeImageToToolsSplitter(file, dims) {
    const sourceWidth = Math.max(1, dims && dims.width ? dims.width : HOME_BOARD_WIDTH);
    const sourceHeight = Math.max(1, dims && dims.height ? dims.height : HOME_BOARD_HEIGHT);
    const cols = Math.max(1, Math.ceil(sourceWidth / HOME_BOARD_WIDTH));
    const rows = Math.max(1, Math.ceil(sourceHeight / HOME_BOARD_HEIGHT));
    const sourceImage = await fileToDataUrl(file);
    const state = {
      cols,
      rows,
      scale: false,
      sourceImage,
      hadSplit: false,
      tiles: []
    };

    try { localStorage.setItem('ywp-tools-state', JSON.stringify(state)); } catch (_) {}
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ 'ywp-tools-state-v2': state }, () => {
          void chrome.runtime?.lastError;
        });
      }
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent('ywp-tools-import-source', {
        detail: {
          ...state,
          sourceName: file && file.name ? file.name : 'image'
        }
      }));
    } catch (_) {}

    switchToToolsTab();
    return { cols, rows };
  }

  function showInstantPreviewFromBlob(blobLike) {
    if (!blobLike || typeof window.ywpSetHomePreview !== 'function') return;
    clearTempPreview(0);
    try {
      tempPreviewUrl = URL.createObjectURL(blobLike);
      window.ywpSetHomePreview(tempPreviewUrl);
    } catch (_) {
      tempPreviewUrl = '';
    }
  }

  function clearTempPreview(delayMs = 0) {
    const url = tempPreviewUrl;
    tempPreviewUrl = '';
    if (!url) return;
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, Math.max(0, delayMs | 0));
  }

  function getSourceMeta(file){
    if (!file) return null;
    return {
      name: file.name || 'image.png',
      type: file.type || 'image/png',
      size: typeof file.size === 'number' ? file.size : 0
    };
  }

  function describePreparedUpload(meta) {
    if (!meta) return 'PNG prepared.';
    if (meta.mode === 'routed-to-splitter') {
      return `Sent to Image Splitter (${meta.suggestedCols} x ${meta.suggestedRows}) so the full image is preserved.`;
    }
    if (meta.mode === 'original-png') {
      return `Original-size PNG kept at ${meta.sourceWidth} x ${meta.sourceHeight}.`;
    }
    if (meta.mode === 'contain-no-upscale') {
      return `Smaller image preserved on a transparent ${meta.outputWidth} x ${meta.outputHeight} board with no stretching.`;
    }
    if (meta.mode === 'downscaled') {
      const sharpenedNote = meta.sharpenApplied ? ' Added readability sharpening for small text.' : '';
      return `Resized to ${meta.outputWidth} x ${meta.outputHeight} PNG with high-quality downscaling.${sharpenedNote}`;
    }
    if (meta.mode === 'exact' || meta.mode === 'exact-original') {
      return `Prepared at ${meta.outputWidth} x ${meta.outputHeight} PNG.`;
    }
    return `PNG prepared at ${meta.outputWidth} x ${meta.outputHeight}.`;
  }

  function getClarityWarning(meta) {
    if (!meta) return '';
    if (meta.mode === 'routed-to-splitter') {
      return 'Image is larger than one board. Use Tools > Image Splitter to keep the full image and readable details.';
    }
    if (meta.mode === 'original-png') {
      const sourceW = meta.sourceWidth || HOME_BOARD_WIDTH;
      const sourceH = meta.sourceHeight || HOME_BOARD_HEIGHT;
      if (sourceW > HOME_BOARD_WIDTH || sourceH > HOME_BOARD_HEIGHT) {
        return 'Original-size upload selected. Large images can blur or fail to save after Redirect is turned off. Turn on Prepare as 390×260 PNG for best reliability.';
      }
      return '';
    }

    const outputW = meta.outputWidth || HOME_BOARD_WIDTH;
    const outputH = meta.outputHeight || HOME_BOARD_HEIGHT;
    const ratio = Number(meta.downscaleRatio) || Math.max(
      (meta.sourceWidth || outputW) / outputW,
      (meta.sourceHeight || outputH) / outputH
    );
    const sourcePixels = (meta.sourceWidth || outputW) * (meta.sourceHeight || outputH);
    const outputPixels = outputW * outputH;
    const isLargeForSingleBoard = ratio >= HOME_LARGE_SOURCE_RATIO_WARN || sourcePixels >= outputPixels * 5;
    if (!isLargeForSingleBoard) return '';
    const forceProxyMsg = (meta.sourceWidth || 0) > HOME_BOARD_WIDTH || (meta.sourceHeight || 0) > HOME_BOARD_HEIGHT
      ? ' Redirect will use compatibility mode for this upload.'
      : '';
    return `Large source detected. Text-heavy sales-board collages may still blur on one board. For sharper text, use Tools > Image Splitter.${forceProxyMsg}`;
  }

  async function persistUploaderState(extra = {}) {
    try {
      const sourceBlob = (fileEl.files && fileEl.files[0]) || pickedFile || clipboardBlob || null;
      if (sourceBlob) {
        await idbSet(HOME_UPLOAD_SOURCE_KEY, sourceBlob);
      } else {
        await idbDelete(HOME_UPLOAD_SOURCE_KEY);
      }
      await chrome.storage.local.set({
        [HOME_UPLOAD_STATE_KEY]: {
          host: hostSel.value,
          autoResize: !!(resizeChk && resizeChk.checked),
          autoSet: !!(autoChk && autoChk.checked),
          lastUrl: lastUrl || '',
          status: statusEl ? (statusEl.textContent || '') : '',
          statusErr: statusEl ? statusEl.style.color === 'rgb(176, 0, 32)' || statusEl.style.color === '#b00020' : false,
          sourceMeta: getSourceMeta(sourceBlob),
          updatedAt: Date.now(),
          ...extra
        }
      });
    } catch (err) {
      console.warn('Failed to persist Home upload state', err);
    }
  }

  async function clearUploaderState() {
    try {
      await idbDelete(HOME_UPLOAD_SOURCE_KEY);
      await chrome.storage.local.remove(HOME_UPLOAD_STATE_KEY);
    } catch (err) {
      console.warn('Failed to clear Home upload state', err);
    }
  }

  async function restoreUploaderState() {
    try {
      const stored = await chrome.storage.local.get([HOME_UPLOAD_STATE_KEY]);
      const state = stored ? stored[HOME_UPLOAD_STATE_KEY] : null;
      if (state && hostSel && state.host) hostSel.value = state.host;
      if (resizeChk && state && typeof state.autoResize === 'boolean') resizeChk.checked = state.autoResize;
      if (autoChk && state && typeof state.autoSet === 'boolean') autoChk.checked = state.autoSet;
      if (state && state.lastUrl) {
        lastUrl = state.lastUrl;
        setResult(lastUrl);
        btnCopy.disabled = false;
      }
      const sourceBlob = await idbGet(HOME_UPLOAD_SOURCE_KEY);
      if (sourceBlob) {
        pickedFile = sourceBlob;
        const dims = await getBlobImageDimensions(sourceBlob).catch(() => null);
        const meta = state && state.sourceMeta ? state.sourceMeta : getSourceMeta(sourceBlob);
        const dimensionText = dims && dims.width && dims.height ? ` (${dims.width} x ${dims.height})` : '';
        setStatus(`Restored ${meta?.name || 'image'}${dimensionText}. Ready to upload.`, false);
      } else if (state && state.status) {
        setStatus(state.status, !!state.statusErr);
      }
      setClarityWarning(getClarityWarning(state && state.preparedMeta ? state.preparedMeta : null));
    } catch (err) {
      console.warn('Failed to restore Home upload state', err);
    } finally {
      uploadStateLoaded = true;
    }
  }

  // Load preferred host, key, and auto-resize (default ON for reliability, optional to disable).
  chrome.storage.sync.get(['quickUploadHost','imgbbKey','quickUploadAutoResize'], data => {
    if (data.quickUploadHost && hostSel) hostSel.value = data.quickUploadHost;
    if (resizeChk) resizeChk.checked = (data.quickUploadAutoResize !== false);
    toggleKeyWarning();
  });
  void restoreUploaderState();

  hostSel.addEventListener('change', () => {
    chrome.storage.sync.set({ quickUploadHost: hostSel.value });
    toggleKeyWarning();
    void persistUploaderState();
  });

  if (resizeChk){
    resizeChk.addEventListener('change', () => {
      chrome.storage.sync.set({ quickUploadAutoResize: !!resizeChk.checked });
      void persistUploaderState();
    });
  }

  if (autoChk) {
    autoChk.addEventListener('change', () => {
      void persistUploaderState();
    });
  }

  document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items||[])].find(i => i.type && i.type.startsWith('image/'));
    if (item){
      clipboardBlob = item.getAsFile();
      setStatus('Image pasted. Ready to upload.');
      void persistUploaderState();
      showToast('Pasted image captured');
    }
  });

  btnCopy.addEventListener('click', async () => {
    if (!lastUrl) return;
    try { await navigator.clipboard.writeText(lastUrl); setStatus('Link copied.'); } catch { setStatus('Copy failed—select manually.', true); }
  });

  // Drag & drop
  if (dropZone){
    // Simplified: element is no longer inside a label, so a direct click triggers once
    function openPicker(){ if (fileEl) { try { fileEl.click(); } catch(_){} } }
    dropZone.addEventListener('click', (ev) => { ev.stopPropagation(); openPicker(); });
    dropZone.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPicker(); } });
    ['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; dropZone.classList.add('drag'); }));
    ['dragleave','dragend'].forEach(ev => dropZone.addEventListener(ev, e => { dropZone.classList.remove('drag'); }));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('drag');
      const f = e.dataTransfer?.files?.[0];
      if (f){
        pickedFile = f; // cannot assign to fileEl.files (read-only)
        setStatus('File ready.');
        void persistUploaderState();
        showToast('Image added');
      }
    });
  }

  // Reflect file selection changes (first click reliability)
  fileEl.addEventListener('change', () => {
    pickedFile = (fileEl.files && fileEl.files[0]) || null;
    if (pickedFile){ setStatus('File selected.'); void persistUploaderState(); showToast('Image selected'); }
  });

  if (clearBtn){
    clearBtn.addEventListener('click', async () => {
      pickedFile = null; clipboardBlob = null; lastUrl='';
      if (fileEl) fileEl.value='';
      setStatus(''); setResult('');
      setClarityWarning('');
      clearTempPreview(0);
      btnCopy.disabled = true;
      await clearUploaderState();
      showToast('Cleared');
    });
  }

  btnUpload.addEventListener('click', async () => {
  const host = hostSel.value;
  // Prefer fresh file input; fall back to dropped/pasted
  const file = (fileEl.files && fileEl.files[0]) || pickedFile || clipboardBlob;
    if (!file){ setStatus('Select or paste an image.', true); return; }
    setClarityWarning('');
    if (host === 'imgbb'){
      const { imgbbKey } = await chrome.storage.sync.get(['imgbbKey']);
      if (!imgbbKey){ setStatus('ImgBB key missing.', true); toggleKeyWarning(true); return; }
    }
    const doResize = !resizeChk || !!resizeChk.checked;
    btnUpload.disabled = true;
    btnCopy.disabled = true;
    setStatus(doResize ? 'Preparing 390×260 PNG…' : 'Preparing original PNG…');
    setResult('');
    lastUrl='';
    try {
      let uploadFile = file;
      let preparedMeta = null;

      if (!doResize) {
        const sourceDims = await getBlobImageDimensions(file);
        const sourceWidth = sourceDims && sourceDims.width ? sourceDims.width : 0;
        const sourceHeight = sourceDims && sourceDims.height ? sourceDims.height : 0;
        const isLargerThanBoard = sourceWidth > HOME_BOARD_WIDTH || sourceHeight > HOME_BOARD_HEIGHT;

        if (isLargerThanBoard) {
          setStatus('Opening Image Splitter…');
          const routed = await routeImageToToolsSplitter(file, sourceDims);
          clearPendingRedirectMeta();
          preparedMeta = {
            sourceWidth,
            sourceHeight,
            outputWidth: sourceWidth,
            outputHeight: sourceHeight,
            mode: 'routed-to-splitter',
            downscaleRatio: 1,
            sharpenApplied: false,
            suggestedCols: routed.cols,
            suggestedRows: routed.rows
          };
          setClarityWarning(getClarityWarning(preparedMeta));
          setStatus(`Image is ${sourceWidth} x ${sourceHeight}. ${describePreparedUpload(preparedMeta)}`);
          await persistUploaderState({ preparedMeta });
          showToast('Sent to Image Splitter');
          return;
        }
      }

      if (doResize) {
        const prepared = await preparePngBlobFromFile(file, HOME_BOARD_WIDTH, HOME_BOARD_HEIGHT);
        preparedMeta = prepared.meta;
        uploadFile = new File([prepared.blob], toPngFilename(file.name), { type:'image/png' });
      } else {
        // Keep smaller images fully visible by placing them on a transparent board canvas.
        setStatus('Preparing transparent board…');
        const prepared = await preparePngBlobFromFile(file, HOME_BOARD_WIDTH, HOME_BOARD_HEIGHT);
        preparedMeta = prepared.meta;
        uploadFile = new File([prepared.blob], toPngFilename(file.name), { type:'image/png' });
      }

      if (autoChk && autoChk.checked) {
        showInstantPreviewFromBlob(uploadFile);
      }

      setStatus('Uploading…');
      setClarityWarning(getClarityWarning(preparedMeta));
      const { uploadImage } = await import('../../src/lib/uploader.js');
      const url = await uploadImage(uploadFile, { host });
      queuePendingRedirectMeta(url, preparedMeta);
      lastUrl = url; setResult(url);
      const preparedMsg = describePreparedUpload(preparedMeta);
      try { await navigator.clipboard.writeText(url); setStatus(`Uploaded & copied. ${preparedMsg}`); btnCopy.disabled=false; }
      catch { setStatus(`Uploaded. Use Copy button. ${preparedMsg}`, true); btnCopy.disabled=false; }
      // Auto-set as current image
      if (autoChk && autoChk.checked){
        const mainInput = document.getElementById('img-url');
        if (mainInput){ mainInput.value = url; mainInput.dispatchEvent(new Event('input', {bubbles:true})); }
        const btn = document.getElementById('btn-set'); if (btn) btn.click();
        clearTempPreview(12000);
      } else {
        clearTempPreview(0);
      }
      await persistUploaderState({ preparedMeta });
      showToast('Upload complete');
      // reset transient sources after success
      pickedFile = null; clipboardBlob = null; if (fileEl) fileEl.value = '';
    } catch(e){
      const msg = (e && e.message) ? e.message : String(e);
      setStatus('Upload failed: ' + msg, true);
      clearPendingRedirectMeta();
      clearTempPreview(0);
      if (/imgbb/i.test(msg)) toggleKeyWarning(true);
    }
    finally { btnUpload.disabled = false; }
  });

  function toggleKeyWarning(force){
    chrome.storage.sync.get(['imgbbKey'], d => {
      const missing = !d.imgbbKey && hostSel.value === 'imgbb';
      if (warnEl) warnEl.style.display = (missing || force) ? 'block' : 'none';
    });
  }

  // Bridge: Upload last exported PNG from Sales
  if (bridgeBtn){
    try {
      const last = localStorage.getItem('ywp:lastExportPng');
      bridgeBtn.disabled = !last;
    } catch(_){}
    bridgeBtn.addEventListener('click', async () => {
      try {
        const dataUrl = localStorage.getItem('ywp:lastExportPng');
        if (!dataUrl){ showToast('No recent export found'); return; }
        // Convert dataURL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'ywp-sales-board.png', { type: 'image/png' });
        pickedFile = file;
        setStatus('File ready from last export.');
        await persistUploaderState();
        // Auto trigger Upload with auto-set if desired
        if (autoChk) autoChk.checked = true;
        btnUpload.click();
        showToast('Uploading last export…');
      } catch(e){ setStatus('Could not load last export', true); }
    });
  }
})();

// Toast helper
function showToast(msg){
  const wrap = document.getElementById('toast-container');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  // Remove after animation completes (~3.6s)
  setTimeout(() => { el.remove(); }, 3900);
}

function toPngFilename(name) {
  const safe = String(name || 'image').replace(/\.[a-zA-Z0-9]+$/, '');
  return `${safe || 'image'}.png`;
}

function createRedirectMetaFromPrepared(preparedMeta) {
  if (!preparedMeta || typeof preparedMeta !== 'object') return null;
  const sourceWidth = Number(preparedMeta.sourceWidth) || 0;
  const sourceHeight = Number(preparedMeta.sourceHeight) || 0;
  const outputWidth = Number(preparedMeta.outputWidth) || 0;
  const outputHeight = Number(preparedMeta.outputHeight) || 0;
  const mode = String(preparedMeta.mode || '');
  if (!sourceWidth && !sourceHeight && !outputWidth && !outputHeight && !mode) return null;
  return {
    sourceWidth,
    sourceHeight,
    outputWidth,
    outputHeight,
    mode,
    downscaleRatio: Number(preparedMeta.downscaleRatio) || 0,
    forceProxy: sourceWidth > HOME_BOARD_WIDTH || sourceHeight > HOME_BOARD_HEIGHT
  };
}

function queuePendingRedirectMeta(url, preparedMeta) {
  const meta = createRedirectMetaFromPrepared(preparedMeta);
  const safeUrl = String(url || '').trim();
  if (!meta || !safeUrl) {
    window.ywpPendingRedirectMeta = null;
    return;
  }
  window.ywpPendingRedirectMeta = { url: safeUrl, meta };
}

function clearPendingRedirectMeta() {
  window.ywpPendingRedirectMeta = null;
}

function takePendingRedirectMeta(nextUrl) {
  const pending = window.ywpPendingRedirectMeta;
  if (!pending || typeof pending !== 'object') return null;

  const expectedUrl = String(nextUrl || '').trim();
  const pendingUrl = String(pending.url || '').trim();
  const pendingMeta = pending.meta && typeof pending.meta === 'object' ? pending.meta : null;

  if (pendingMeta && pendingUrl && pendingUrl === expectedUrl) {
    window.ywpPendingRedirectMeta = null;
    return pendingMeta;
  }

  return null;
}

function extractExistingRedirectMeta(rawImgState) {
  if (!Array.isArray(rawImgState)) return null;
  const candidate = rawImgState.length >= 3 ? rawImgState[2] : null;
  return (candidate && typeof candidate === 'object') ? candidate : null;
}
