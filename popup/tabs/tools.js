(() => {
  const BOARD_W = 390;
  const BOARD_H = 260;
  const STORAGE_KEY = 'ywp-tools-state';

  const panel = document.getElementById('panel-tools');
  if (!panel) return;

  const els = {
    cols: document.getElementById('tool-cols'),
    rows: document.getElementById('tool-rows'),
    size: document.getElementById('tool-size'),
    fileBtn: document.getElementById('tool-file-btn'),
    fileInput: document.getElementById('tool-file'),
    drop: document.getElementById('tool-drop'),
    meta: document.getElementById('tool-meta'),
    warning: document.getElementById('tool-warning'),
    split: document.getElementById('tool-split'),
    scale: document.getElementById('tool-scale'),
    zip: document.getElementById('tool-zip'),
    clear: document.getElementById('tool-clear'),
    hint: document.getElementById('tool-hint'),
    results: document.getElementById('tool-results')
  };

  let sourceImage = null;
  let tiles = [];
  let tileEntries = [];

  init();

  function init() {
    wireCalculator();
    wireFileInputs();
    wireSplitter();
    wireClear();
    wireZip();
    restoreState();
  }

  function wireCalculator() {
    if (!els.cols || !els.rows || !els.size) return;
    const update = () => {
      const cols = clampInt(els.cols.value, 1, 20, 3);
      const rows = clampInt(els.rows.value, 1, 20, 2);
      els.cols.value = cols;
      els.rows.value = rows;
      const w = cols * BOARD_W;
      const h = rows * BOARD_H;
      els.size.textContent = `Target size: ${w} × ${h} px`;
      persistSettings();
    };
    els.cols.addEventListener('input', update);
    els.rows.addEventListener('input', update);
    update();
  }

  function wireFileInputs() {
    if (!els.fileBtn || !els.fileInput || !els.drop) return;
    els.fileBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    const openPicker = () => els.fileInput.click();
    els.drop.addEventListener('click', openPicker);
    els.drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });
    ['dragenter', 'dragover'].forEach(evt => els.drop.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      els.drop.classList.add('drag');
    }));
    ['dragleave', 'drop'].forEach(evt => els.drop.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      els.drop.classList.remove('drag');
    }));
    els.drop.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
    });

    window.addEventListener('paste', (e) => {
      const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) handleFiles([file]);
    });
  }

  function wireSplitter() {
    if (!els.split) return;
    els.split.addEventListener('click', () => splitImage());
  }

  function wireClear() {
    if (!els.clear) return;
    els.clear.addEventListener('click', () => clearAll());
  }

  function wireZip() {
    if (!els.zip) return;
    els.zip.addEventListener('click', () => downloadZip());
  }

  async function handleFiles(fileList) {
    const file = fileList && fileList[0];
    if (!file) return;
    resetTiles();
    setWarning('');
    setMeta('Loading image...');
    try {
      sourceImage = await blobToImage(file);
      const w = sourceImage.width || sourceImage.naturalWidth;
      const h = sourceImage.height || sourceImage.naturalHeight;
      setMeta(`Loaded ${file.name} (${w} × ${h})`);
      els.split.disabled = false;
      els.zip.disabled = true;
    } catch (err) {
      console.error(err);
      setMeta('Failed to load image.');
      els.split.disabled = true;
    }
  }

  async function splitImage() {
    if (!sourceImage) {
      setWarning('Load an image first.');
      return;
    }
    setWarning('');
    els.split.disabled = true;
    els.zip.disabled = true;
    els.results.innerHTML = 'Splitting...';

    const cols = clampInt(els.cols.value, 1, 20, 3);
    const rows = clampInt(els.rows.value, 1, 20, 2);
    const targetW = cols * BOARD_W;
    const targetH = rows * BOARD_H;

    const working = document.createElement('canvas');
    const wctx = working.getContext('2d');
    if (els.scale?.checked) {
      working.width = targetW; working.height = targetH;
      wctx.drawImage(sourceImage, 0, 0, targetW, targetH);
    } else {
      const sw = sourceImage.width || sourceImage.naturalWidth;
      const sh = sourceImage.height || sourceImage.naturalHeight;
      working.width = sw; working.height = sh;
      wctx.drawImage(sourceImage, 0, 0);
    }

    const tileCanvases = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement('canvas');
        tile.width = BOARD_W; tile.height = BOARD_H;
        const tctx = tile.getContext('2d');
        const sx = c * BOARD_W;
        const sy = r * BOARD_H;
        tctx.drawImage(working, sx, sy, BOARD_W, BOARD_H, 0, 0, BOARD_W, BOARD_H);
        tileCanvases.push(tile);
      }
    }

    const entries = await Promise.all(tileCanvases.map(async (tile, idx) => {
      const blob = await canvasToPng(tile);
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const name = `tile-${idx + 1}.png`;
      return { name, canvas: tile, blob, buffer };
    }));

    tiles = entries;
    tileEntries = entries;
    renderTiles(entries);
    persistState(entries);
    els.split.disabled = false;
    els.zip.disabled = entries.length === 0;
    setMeta(`Split into ${entries.length} tile${entries.length === 1 ? '' : 's'}.`);
  }

  function renderTiles(entries) {
    els.results.innerHTML = '';
    if (!entries.length) {
      els.results.textContent = 'No tiles yet. Load an image and split.';
      return;
    }
    entries.forEach((entry, idx) => {
      const card = document.createElement('div');
      card.className = 'tool-tile';

      const label = document.createElement('div');
      label.className = 'tool-tile-title';
      label.textContent = `Tile ${idx + 1}`;

      const preview = document.createElement('canvas');
      preview.width = BOARD_W / 2;
      preview.height = BOARD_H / 2;
      const pctx = preview.getContext('2d');
      pctx.imageSmoothingEnabled = true;
      pctx.imageSmoothingQuality = 'high';
      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.drawImage(entry.canvas, 0, 0, preview.width, preview.height);

      const actions = document.createElement('div');
      actions.className = 'tool-actions';

      const dl = document.createElement('button');
      dl.className = 'btn btn-sm';
      dl.textContent = 'Download';
      dl.addEventListener('click', () => downloadSingle(entry));

      const cp = document.createElement('button');
      cp.className = 'btn btn-sm';
      cp.textContent = 'Copy';
      cp.addEventListener('click', () => copySingle(entry));

      actions.append(dl, cp);
      card.append(label, preview, actions);
      els.results.appendChild(card);
    });
  }

  async function downloadSingle(entry) {
    const blob = entry.blob || await canvasToPng(entry.canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  async function copySingle(entry) {
    try {
      const blob = entry.blob || await canvasToPng(entry.canvas);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setWarning('Copied tile to clipboard.', '#2563eb');
    } catch (err) {
      console.error(err);
      setWarning('Clipboard not available in this context.', '#b00020');
    }
  }

  async function downloadZip() {
    if (!tileEntries.length) return;
    setWarning('Packaging ZIP...');
    try {
      const files = tileEntries.map(t => ({ name: t.name, data: t.buffer }));
      const zipBlob = buildStoreZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ywp-tiles.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setWarning('ZIP ready.', '#2563eb');
    } catch (err) {
      console.error(err);
      setWarning('ZIP failed.', '#b00020');
    }
  }

  function clearAll() {
    sourceImage = null;
    resetTiles();
    if (els.fileInput) els.fileInput.value = '';
    setMeta('No image loaded.');
    setWarning('');
    els.split.disabled = true;
    els.zip.disabled = true;
    els.results.textContent = 'Cleared.';
    persistState([]);
  }

  function resetTiles() {
    tiles = [];
    tileEntries = [];
    if (els.results) els.results.innerHTML = '';
  }

  function setMeta(msg) {
    if (!els.meta) return;
    els.meta.textContent = msg;
  }

  function setWarning(msg, color) {
    if (!els.warning) return;
    els.warning.textContent = msg;
    els.warning.style.color = color || '#b00020';
    if (!msg) els.warning.textContent = '';
  }

  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  async function blobToImage(blob) {
    if (window.createImageBitmap) {
      try {
        const bmp = await createImageBitmap(blob);
        return bmp;
      } catch (err) {
        console.warn('createImageBitmap failed, falling back.', err);
      }
    }
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

  function buildStoreZip(files) {
    // Minimal ZIP (store) to avoid external deps.
    const encoder = new TextEncoder();
    let localSize = 0;
    const localChunks = [];
    const centralChunks = [];

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const crc = crc32(file.data);
      const compSize = file.data.length;
      const uncompSize = file.data.length;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true); // version needed
      lv.setUint16(6, 0, true); // flags
      lv.setUint16(8, 0, true); // method: store
      lv.setUint16(10, 0, true); // mod time
      lv.setUint16(12, 0, true); // mod date
      lv.setUint32(14, crc, true);
      lv.setUint32(18, compSize, true);
      lv.setUint32(22, uncompSize, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true); // extra len
      localHeader.set(nameBytes, 30);

      const local = new Uint8Array(localHeader.length + file.data.length);
      local.set(localHeader, 0);
      local.set(file.data, localHeader.length);
      localChunks.push(local);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0, true); // flags
      cv.setUint16(10, 0, true); // method
      cv.setUint16(12, 0, true); // mod time
      cv.setUint16(14, 0, true); // mod date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, compSize, true);
      cv.setUint32(24, uncompSize, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true); // extra len
      cv.setUint16(32, 0, true); // comment len
      cv.setUint16(34, 0, true); // disk number
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, localSize, true); // offset
      centralHeader.set(nameBytes, 46);
      centralChunks.push(centralHeader);

      localSize += local.length;
    });

    const centralDirSize = centralChunks.reduce((sum, arr) => sum + arr.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true); // disk
    ev.setUint16(6, 0, true); // disk start
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, localSize, true);
    ev.setUint16(20, 0, true); // comment len

    const totalSize = localSize + centralDirSize + eocd.length;
    const out = new Uint8Array(totalSize);
    let offset = 0;
    localChunks.forEach(chunk => { out.set(chunk, offset); offset += chunk.length; });
    centralChunks.forEach(chunk => { out.set(chunk, offset); offset += chunk.length; });
    out.set(eocd, offset);

    return new Blob([out], { type: 'application/zip' });
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let c = (crc ^ buf[i]) & 0xff;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ -1) >>> 0;
  }

  function persistSettings() {
    const state = readState();
    state.cols = clampInt(els.cols.value, 1, 20, 3);
    state.rows = clampInt(els.rows.value, 1, 20, 2);
    state.scale = !!(els.scale && els.scale.checked);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function persistState(entries) {
    const state = readState();
    state.cols = clampInt(els.cols.value, 1, 20, 3);
    state.rows = clampInt(els.rows.value, 1, 20, 2);
    state.scale = !!(els.scale && els.scale.checked);
    state.tiles = entries.map(e => ({ name: e.name, dataUrl: e.canvas.toDataURL('image/png') }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (err) {
      console.warn('Failed to read tools state', err);
      return {};
    }
  }

  async function restoreState() {
    const state = readState();
    if (state.cols && els.cols) els.cols.value = state.cols;
    if (state.rows && els.rows) els.rows.value = state.rows;
    if (els.scale && typeof state.scale === 'boolean') els.scale.checked = state.scale;
    if (els.cols && els.rows && els.size) {
      const w = clampInt(els.cols.value, 1, 20, 3) * BOARD_W;
      const h = clampInt(els.rows.value, 1, 20, 2) * BOARD_H;
      els.size.textContent = `Target size: ${w} × ${h} px`;
    }
    if (Array.isArray(state.tiles) && state.tiles.length) {
      const restored = await Promise.all(state.tiles.map(async (t, idx) => {
        const canvas = await dataUrlToCanvas(t.dataUrl);
        const blob = await canvasToPng(canvas);
        const buffer = new Uint8Array(await blob.arrayBuffer());
        return { name: t.name || `tile-${idx + 1}.png`, canvas, blob, buffer };
      }));
      tiles = restored;
      tileEntries = restored;
      renderTiles(restored);
      els.split.disabled = false;
      els.zip.disabled = restored.length === 0;
      setMeta(`Restored ${restored.length} tile${restored.length === 1 ? '' : 's'} from last session.`);
    } else {
      setMeta('No image loaded.');
      els.split.disabled = true;
      els.zip.disabled = true;
    }
  }

  function dataUrlToCanvas(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error('Failed to load data URL'));
      img.src = dataUrl;
    });
  }
})();
