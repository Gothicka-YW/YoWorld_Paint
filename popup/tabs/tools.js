<<<<<<< HEAD
(function(){
  const BOARD_W = 390;
  const BOARD_H = 260;

  const colsInput = document.getElementById('tool-cols');
  const rowsInput = document.getElementById('tool-rows');
  const sizeOut = document.getElementById('tool-size');
  const fileBtn = document.getElementById('tool-file-btn');
  const fileInput = document.getElementById('tool-file');
  const drop = document.getElementById('tool-drop');
  const meta = document.getElementById('tool-meta');
  const warning = document.getElementById('tool-warning');
  const splitBtn = document.getElementById('tool-split');
  const scaleToggle = document.getElementById('tool-scale');
  const zipBtn = document.getElementById('tool-zip');
  const clearBtn = document.getElementById('tool-clear');
  const hint = document.getElementById('tool-hint');
  const results = document.getElementById('tool-results');
  const STORAGE_KEY = 'ywp-tools-state';

  let img = null;
  let imgName = '';
  let imgW = 0;
  let imgH = 0;
  let lastTargetW = 0;
  let lastTargetH = 0;
  let tiles = [];

  function clampBoardCount(val){
    const n = Math.max(1, Math.floor(Number(val) || 0));
    return n;
  }

  function updateCalc(){
    const cols = clampBoardCount(colsInput.value);
    const rows = clampBoardCount(rowsInput.value);
    colsInput.value = cols;
    rowsInput.value = rows;
    const targetW = cols * BOARD_W;
    const targetH = rows * BOARD_H;
    sizeOut.textContent = `Target size: ${targetW} × ${targetH} px`;
    hint.textContent = `Target for ${cols}×${rows} boards is ${targetW}×${targetH}.`;
    evaluateImage(cols, rows, targetW, targetH);
  }

  function resetImage(){
    img = null;
    imgName = '';
    imgW = 0;
    imgH = 0;
    meta.textContent = 'No image loaded.';
    warning.textContent = '';
    splitBtn.disabled = true;
    zipBtn.disabled = true;
    results.innerHTML = '';
    tiles = [];
    persistState();
  }

  function setWarning(msg){
    warning.textContent = msg || '';
  }

  function evaluateImage(cols, rows, targetW, targetH){
    lastTargetW = targetW;
    lastTargetH = targetH;
    if (!img){
      splitBtn.disabled = true;
      zipBtn.disabled = true;
      return;
    }
    const exact = imgW === targetW && imgH === targetH;
    meta.textContent = `${imgName || 'Image'}: ${imgW} × ${imgH} px`;
    const doScale = scaleToggle.checked;
    if (exact){
      setWarning(doScale ? 'Ready to split.' : 'Ready to split (no scaling).');
      splitBtn.disabled = false;
      return;
    }
    const pctW = (targetW / imgW) * 100;
    const pctH = (targetH / imgH) * 100;
    const widthScaledH = Math.round(imgH * pctW / 100);
    const heightScaledW = Math.round(imgW * pctH / 100);
    const near = Math.abs(pctW - 100) <= Math.abs(pctH - 100)
      ? `Scale width: ${pctW.toFixed(1)}% → ${targetW}×${widthScaledH}`
      : `Scale height: ${pctH.toFixed(1)}% → ${heightScaledW}×${targetH}`;

    if (doScale){
      setWarning(`Image does not match ${targetW}×${targetH}. It will be scaled to the target when splitting (may distort). If keeping aspect ratio, try: width ${pctW.toFixed(1)}% → ${targetW}×${widthScaledH} or height ${pctH.toFixed(1)}% → ${heightScaledW}×${targetH}. Closest: ${near}.`);
    } else {
      const autoCols = Math.ceil(imgW / BOARD_W);
      const autoRows = Math.ceil(imgH / BOARD_H);
      setWarning(`No scaling. Image will be split into ${autoCols} × ${autoRows} tiles (${BOARD_W}×${BOARD_H}). If you prefer a ${cols}×${rows} grid, scale to ${targetW}×${targetH}.`);
    }
    splitBtn.disabled = false;
  }

  function handleFile(file){
    if (!file || !file.type || !file.type.startsWith('image/')){
      setWarning('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        img = im;
        imgName = file.name || 'Image';
        imgW = im.naturalWidth;
        imgH = im.naturalHeight;
        results.innerHTML = '';
        const cols = clampBoardCount(colsInput.value);
        const rows = clampBoardCount(rowsInput.value);
        const targetW = cols * BOARD_W;
        const targetH = rows * BOARD_H;
        meta.textContent = `${imgName}: ${imgW} × ${imgH} px`;
        evaluateImage(cols, rows, targetW, targetH);
      };
      im.onerror = () => setWarning('Could not load that image.');
      im.src = reader.result;
    };
    reader.onerror = () => setWarning('Could not read that file.');
    reader.readAsDataURL(file);
  }

  function splitImage(){
    if (!img) return;
    const cols = clampBoardCount(colsInput.value);
    const rows = clampBoardCount(rowsInput.value);
    const targetW = cols * BOARD_W;
    const targetH = rows * BOARD_H;

    const doScale = scaleToggle.checked;
    const needsScale = doScale && (imgW !== targetW || imgH !== targetH);
    const base = needsScale ? (() => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);
      return canvas;
    })() : img;

    results.innerHTML = '';
    tiles = [];

    const colsUsed = doScale ? cols : Math.ceil(imgW / BOARD_W);
    const rowsUsed = doScale ? rows : Math.ceil(imgH / BOARD_H);

    for (let r = 0; r < rowsUsed; r++){
      for (let c = 0; c < colsUsed; c++){
        const canvas = document.createElement('canvas');
        const tileW = doScale ? BOARD_W : Math.min(BOARD_W, imgW - c * BOARD_W);
        const tileH = doScale ? BOARD_H : Math.min(BOARD_H, imgH - r * BOARD_H);
        if (tileW <= 0 || tileH <= 0) continue;
        canvas.width = BOARD_W;
        canvas.height = BOARD_H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(base, c * BOARD_W, r * BOARD_H, tileW, tileH, 0, 0, tileW, tileH);
        const url = canvas.toDataURL('image/png');
        const filename = `tile-r${r + 1}-c${c + 1}.png`;
        tiles.push({ url, name: filename });
      }
    }

    renderTiles();

    zipBtn.disabled = tiles.length === 0;

    if (needsScale){
      setWarning(`Tiles ready. Image was scaled to ${targetW}×${targetH}; expect distortion if aspect differed.`);
    } else if (!doScale) {
      setWarning(`Tiles ready. Split without scaling into ${colsUsed}×${rowsUsed} tiles (last row/column may be smaller).`);
    } else {
      setWarning('Tiles ready. Download and upload each tile as separate boards.');
    }

    persistState();
  }

  function renderTiles(list){
    const items = list || tiles;
    results.innerHTML = '';
    items.forEach((tile, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'tool-tile';
      const thumb = document.createElement('img');
      thumb.src = tile.url;
      thumb.alt = `Tile ${idx + 1}`;
      const link = document.createElement('a');
      link.href = tile.url;
      link.download = tile.name;
      link.textContent = `Download ${tile.name}`;
      wrap.appendChild(thumb);
      wrap.appendChild(link);
      results.appendChild(wrap);
    });
  }

  function persistState(){
    try {
      if (!tiles.length){
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const state = {
        v: 1,
        tiles,
        imgName,
        imgW,
        imgH,
        cols: clampBoardCount(colsInput.value),
        rows: clampBoardCount(rowsInput.value),
        scale: !!scaleToggle.checked,
        metaText: meta.textContent,
        warningText: warning.textContent,
        hintText: hint.textContent
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore storage errors
    }
  }

  function restoreState(){
    let data = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!data || data.v !== 1 || !Array.isArray(data.tiles) || !data.tiles.length) return;

    // Apply inputs before calc to keep target text in sync
    if (data.cols) colsInput.value = data.cols;
    if (data.rows) rowsInput.value = data.rows;
    scaleToggle.checked = data.scale !== false;
    updateCalc();

    tiles = data.tiles;
    imgName = data.imgName || '';
    imgW = data.imgW || 0;
    imgH = data.imgH || 0;
    meta.textContent = data.metaText || (imgName ? `${imgName}: ${imgW} × ${imgH} px` : 'No image loaded.');
    warning.textContent = data.warningText || '';
    if (data.hintText) hint.textContent = data.hintText;
    renderTiles(tiles);
    zipBtn.disabled = tiles.length === 0;
  }

  function b64ToBytes(dataUrl){
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function writeString(view, offset, str){
    for (let i=0;i<str.length;i++) view.setUint8(offset+i, str.charCodeAt(i));
  }

  function msDosTime(date){
    const d = date instanceof Date ? date : new Date();
    const sec = Math.floor(d.getSeconds() / 2);
    return (d.getMinutes() << 5) | sec | (d.getHours() << 11);
  }

  function msDosDate(date){
    const d = date instanceof Date ? date : new Date();
    return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  }

  function createZip(files){
    // ZIP store (no compression), hand-rolled for MV3
    const encoder = new TextEncoder();
    const parts = [];
    const centrals = [];
    let offset = 0;
    const modTime = msDosTime();
    const modDate = msDosDate();

    const w16 = (buf, i, v) => { buf[i] = v & 0xff; buf[i+1] = (v >>> 8) & 0xff; };
    const w32 = (buf, i, v) => {
      buf[i] = v & 0xff;
      buf[i+1] = (v >>> 8) & 0xff;
      buf[i+2] = (v >>> 16) & 0xff;
      buf[i+3] = (v >>> 24) & 0xff;
    };

    files.forEach(file => {
      const data = b64ToBytes(file.url);
      const nameBytes = encoder.encode(file.name);
      const crc = crc32(data);

      // Local file header + name
      const lh = new Uint8Array(30 + nameBytes.length);
      w32(lh, 0, 0x04034b50);
      w16(lh, 4, 20); // version needed
      w16(lh, 6, 0);  // flags
      w16(lh, 8, 0);  // method store
      w16(lh, 10, modTime);
      w16(lh, 12, modDate);
      w32(lh, 14, crc);
      w32(lh, 18, data.length);
      w32(lh, 22, data.length);
      w16(lh, 26, nameBytes.length);
      // extra length 0 at 28-29
      lh.set(nameBytes, 30);

      parts.push(lh, data);

      // Central directory header + name
      const ch = new Uint8Array(46 + nameBytes.length);
      w32(ch, 0, 0x02014b50);
      w16(ch, 4, 20); // version made by (FAT)
      w16(ch, 6, 20); // version needed
      w16(ch, 8, 0);  // flags
      w16(ch, 10, 0); // method store
      w16(ch, 12, modTime);
      w16(ch, 14, modDate);
      w32(ch, 16, crc);
      w32(ch, 20, data.length);
      w32(ch, 24, data.length);
      w16(ch, 28, nameBytes.length);
      // extra len 0 @30, comment 0 @32, disk 0 @34, int attr 0 @36
      w32(ch, 38, 0);      // ext attrs
      w32(ch, 42, offset); // local header offset
      ch.set(nameBytes, 46);
      centrals.push(ch);

      offset += lh.length + data.length;
    });

    const centralSize = centrals.reduce((sum, arr) => sum + arr.length, 0);

    const end = new Uint8Array(22);
    w32(end, 0, 0x06054b50);
    w16(end, 4, 0); // this disk
    w16(end, 6, 0); // start disk
    w16(end, 8, files.length);
    w16(end, 10, files.length);
    w32(end, 12, centralSize);
    w32(end, 16, offset);
    w16(end, 20, 0); // comment len

    const total = offset + centralSize + end.length;
    const out = new Uint8Array(total);
    let p = 0;
    parts.forEach(part => { out.set(part, p); p += part.length; });
    centrals.forEach(part => { out.set(part, p); p += part.length; });
    out.set(end, p);
    return new Blob([out], { type: 'application/zip' });
  }

  function crc32(bytes){
    let c = 0xffffffff;
    for (let i=0;i<bytes.length;i++){
      c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i=0;i<256;i++){
      let c = i;
      for (let k=0;k<8;k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function downloadZip(){
    if (!tiles.length) return;
    const blob = createZip(tiles);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiles.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function wireDragAndDrop(el){
    ['dragenter','dragover'].forEach(evt => el.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('drag');
    }));
    ['dragleave','drop'].forEach(evt => el.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag');
    }));
    el.addEventListener('drop', e => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    el.addEventListener('click', () => fileInput.click());
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        fileInput.click();
      }
    });
  }

  function wirePaste(){
    document.addEventListener('paste', e => {
      if (!e.clipboardData) return;
      const file = Array.from(e.clipboardData.items || [])
        .map(i => i.getAsFile && i.getAsFile())
        .find(f => f && f.type && f.type.startsWith('image/'));
      if (file) handleFile(file);
    });
  }

  colsInput.addEventListener('input', updateCalc);
  rowsInput.addEventListener('input', updateCalc);
  fileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    handleFile(file);
  });
  splitBtn.addEventListener('click', splitImage);
  scaleToggle.addEventListener('change', updateCalc);
  zipBtn.addEventListener('click', downloadZip);
  clearBtn.addEventListener('click', resetImage);

  wireDragAndDrop(drop);
  wirePaste();
  restoreState();
  updateCalc();
=======
// tools.js — Pre‑Warp (Board Slant) tool
(function(){
  const panel = document.getElementById('panel-tools');
  if(!panel) return;

  const els = {
    orientation: panel.querySelector('#skew-orientation'),
    autoresize: panel.querySelector('#skew-autoresize'),
    advanced: panel.querySelector('#skew-advanced'),
    advPanel: panel.querySelector('#skew-advanced-panel'),
    slant: panel.querySelector('#skew-slant'),
  slantNum: panel.querySelector('#skew-slant-num'),
    slantVal: panel.querySelector('#skew-slant-val'),
  persp: panel.querySelector('#skew-persp'),
  perspNum: panel.querySelector('#skew-persp-num'),
  perspVal: panel.querySelector('#skew-persp-val'),
  applyPersp: panel.querySelector('#skew-apply-persp'),
  gimpShear: panel.querySelector('#gimp-shear'),
  gimpSrcH: panel.querySelector('#gimp-srch'),
  gimpConvert: panel.querySelector('#gimp-convert'),
  gimpOut: panel.querySelector('#gimp-out'),
    hq: panel.querySelector('#skew-hq'),
    applySlant: panel.querySelector('#skew-apply-slant'),
    drop: panel.querySelector('#skew-drop'),
    file: panel.querySelector('#skew-file'),
    status: panel.querySelector('#skew-status'),
    canvas: panel.querySelector('#skew-preview'),
    run: panel.querySelector('#skew-run'),
    export: panel.querySelector('#skew-export'),
    copy: panel.querySelector('#skew-copy'),
    clear: panel.querySelector('#skew-clear')
  };
  // Split UI elements
  const splitEls = {
    x: panel.querySelector('#split-x'),
    y: panel.querySelector('#split-y'),
    mode: panel.querySelector('#split-mode'),
    center: panel.querySelector('#split-center'),
    apply: panel.querySelector('#split-apply-prewarp'),
    run: panel.querySelector('#split-run'),
    status: panel.querySelector('#split-status'),
    leftCanvas: panel.querySelector('#split-left'),
    rightCanvas: panel.querySelector('#split-right'),
    q3Canvas: panel.querySelector('#split-q3'),
    q4Canvas: panel.querySelector('#split-q4'),
    exportLeft: panel.querySelector('#split-export-left'),
    exportRight: panel.querySelector('#split-export-right'),
    exportQ3: panel.querySelector('#split-export-q3'),
    exportQ4: panel.querySelector('#split-export-q4'),
    copyLeft: panel.querySelector('#split-copy-left'),
    copyRight: panel.querySelector('#split-copy-right'),
    copyQ3: panel.querySelector('#split-copy-q3'),
    copyQ4: panel.querySelector('#split-copy-q4'),
    wrapQ3: panel.querySelector('#split-q3-wrap'),
    wrapQ4: panel.querySelector('#split-q4-wrap'),
    labelLeft: panel.querySelector('#split-label-left'),
    labelRight: panel.querySelector('#split-label-right')
  };

  let sourceBitmap = null; // ImageBitmap of user image
  let lastOutput = null;   // ImageData of pre-warped result
  let splitLeftData = null; // ImageData left board
  let splitRightData = null; // ImageData right board
  let splitQ3Data = null; // bottom-left for grid
  let splitQ4Data = null; // bottom-right for grid

  function setStatus(msg, color){
    if(!els.status) return;
    els.status.textContent = msg || '';
    els.status.style.color = color || '#6b7280';
  }

  async function importSkewLib() {
    // MV3: use relative path from popup context
    // eslint-disable-next-line no-undef
    return await import('../../src/lib/skew.js');
  }
  async function importSettings() {
    // eslint-disable-next-line no-undef
    return await import('../../src/lib/settings.js');
  }

  function showAdvanced(show){
    if(!els.advPanel) return;
    els.advPanel.style.display = show ? 'block' : 'none';
  }

  function drawToCanvas(imgData){
    const ctx = els.canvas.getContext('2d');
    const W = els.canvas.width, H = els.canvas.height;
    ctx.clearRect(0,0,W,H);
    // Paint ImageData to a temp canvas, then draw with contain scaling
    const tmp = document.createElement('canvas');
    tmp.width = imgData.width; tmp.height = imgData.height;
    const tctx = tmp.getContext('2d');
    tctx.putImageData(imgData, 0, 0);
    const iw = tmp.width, ih = tmp.height;
    const scale = Math.min(W/iw, H/ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (W - dw)/2;
    const dy = (H - dh)/2;
    ctx.drawImage(tmp, dx, dy, dw, dh);
  }

  async function init() {
    const [{ default: skew, preWarpImageData, ensurePresetMatrices, updateSlant, forceBoardSizeToCanvas, imageBitmapToImageData, imageElementToImageData, buildApproxPreset }, { getSettings, setSettings }] = await Promise.all([
      importSkewLib(), importSettings()
    ]);

    // Load settings and ensure presets exist
    let settings = await getSettings();
    settings = ensurePresetMatrices(settings);
    await setSettings({ skewPresets: settings.skewPresets });
  // Expose for split feature outside init scope
  panel.__preWarp = preWarpImageData;
  panel.__skewPresets = settings.skewPresets;

    // Initialize controls from settings
    els.orientation.value = settings.skewOrientation || 'right';
    els.autoresize.checked = !!settings.skewAutoResize;
    els.advanced.checked = !!settings.skewAdvanced;
    els.slant.value = settings.skewSlantPx != null ? settings.skewSlantPx : 60;
  if(els.slantNum) els.slantNum.value = els.slant.value;
    els.slantVal.textContent = `${els.slant.value} px`;
    els.hq.checked = settings.skewHQ !== false;
    showAdvanced(els.advanced.checked);
  if(els.persp){ els.persp.value = settings.skewPerspectivePct || 0; }
  if(els.perspNum){ els.perspNum.value = settings.skewPerspectivePct || 0; }
  if(els.perspVal){ els.perspVal.textContent = `${settings.skewPerspectivePct||0} %`; }
  if(els.gimpSrcH && sourceBitmap){ els.gimpSrcH.value = sourceBitmap.height || sourceBitmap.naturalHeight || ''; }

    // Wire events
    els.orientation.addEventListener('change', async ()=>{
      settings = await setSettings({ skewOrientation: els.orientation.value });
    });
    els.autoresize.addEventListener('change', async ()=>{
      settings = await setSettings({ skewAutoResize: els.autoresize.checked });
    });
    els.advanced.addEventListener('change', async ()=>{
      showAdvanced(els.advanced.checked);
      settings = await setSettings({ skewAdvanced: els.advanced.checked });
    });
    els.slant.addEventListener('input', ()=>{
      els.slantVal.textContent = `${els.slant.value} px`;
      if(els.slantNum) els.slantNum.value = els.slant.value;
    });
    if(els.slantNum){
      els.slantNum.addEventListener('input', ()=>{
        let v = parseInt(els.slantNum.value,10);
        if(Number.isNaN(v)) return;
        v = Math.max(parseInt(els.slant.min,10), Math.min(parseInt(els.slant.max,10), v));
        els.slant.value = v;
        els.slantVal.textContent = `${v} px`;
      });
    }
    if(els.persp){
      els.persp.addEventListener('input', ()=>{
        els.perspVal.textContent = `${els.persp.value} %`;
        if(els.perspNum) els.perspNum.value = els.persp.value;
      });
    }
    if(els.perspNum){
      els.perspNum.addEventListener('input', ()=>{
        let v = parseInt(els.perspNum.value,10);
        if(Number.isNaN(v)) return;
        v = Math.max(parseInt(els.persp.min,10), Math.min(parseInt(els.persp.max,10), v));
        els.persp.value = v; els.perspVal.textContent = `${v} %`;
      });
    }
    if(els.applyPersp){
      els.applyPersp.addEventListener('click', async ()=>{
        const persp = parseInt(els.persp?.value,10) || 0;
        settings = await setSettings({ skewPerspectivePct: persp });
        // Rebuild both presets with new perspective
        const { updatePerspective } = await importSkewLib();
        settings = updatePerspective(settings, { perspPct: persp });
        settings = await setSettings({ skewPresets: settings.skewPresets });
        panel.__skewPresets = settings.skewPresets;
        setStatus(`Perspective applied (${persp}%).`);
        if(sourceBitmap){ await runWarp(); }
      });
    }
    els.applySlant.addEventListener('click', async ()=>{
      const dir = els.orientation.value;
      const px = parseInt(els.slant.value, 10) || 60;
      settings = updateSlant(settings, { direction: dir, slantPx: px });
      settings = await setSettings({ skewPresets: settings.skewPresets, skewSlantPx: px });
      panel.__skewPresets = settings.skewPresets; // keep external reference fresh
      setStatus(`Preset updated for ${dir} (${px}px).`);
      // If we have a result, re-run preview using new preset
      if(sourceBitmap){ await runWarp(); }
    });
    els.hq.addEventListener('change', async ()=>{
      settings = await setSettings({ skewHQ: els.hq.checked });
      if(sourceBitmap && lastOutput){ await runWarp(); }
    });

    // Drag-drop/paste
  els.drop.addEventListener('click', ()=> { els.file.value = ''; els.file.click(); });
    els.drop.addEventListener('dragover', (e)=>{ e.preventDefault(); els.drop.classList.add('drag'); });
    els.drop.addEventListener('dragleave', ()=> els.drop.classList.remove('drag'));
    els.drop.addEventListener('drop', async (e)=>{
      e.preventDefault(); els.drop.classList.remove('drag');
      const file = e.dataTransfer.files?.[0];
      if(file) await handleFile(file);
    });
    els.file.addEventListener('change', async ()=>{
      const file = els.file.files?.[0];
      if(file) await handleFile(file);
    });
    window.addEventListener('paste', async (e)=>{
      if(!panel.classList.contains('is-active')) return;
      const item = [...(e.clipboardData?.items||[])].find(it=> it.type.startsWith('image/'));
      if(item){
        e.preventDefault();
        const blob = item.getAsFile();
        if(blob) await handleFile(blob);
      }
    });

    // GIMP shear converter logic
    if(els.gimpConvert){
      els.gimpConvert.addEventListener('click', ()=>{
        const shear = parseFloat(els.gimpShear?.value || '');
        if(Number.isNaN(shear)) { if(els.gimpOut) els.gimpOut.textContent = 'Enter a Shear Y value.'; return; }
        // Determine source height
        let srcH = parseInt(els.gimpSrcH?.value || '', 10);
        const fromImage = sourceBitmap ? (sourceBitmap.height || sourceBitmap.naturalHeight) : undefined;
        if(!srcH && fromImage) srcH = fromImage;
        // If auto-resize is ON, normalization is not needed
        let slant = shear;
        if(!els.autoresize.checked){
          if(!srcH || srcH <= 0){ if(els.gimpOut){ els.gimpOut.textContent = 'Provide Source H (original image height).'; } return; }
          slant = Math.round(shear * (260 / srcH));
        }
        // Clamp to slider bounds
        const min = parseInt(els.slant.min,10)||20; const max = parseInt(els.slant.max,10)||200;
        slant = Math.max(min, Math.min(max, slant));
        els.slant.value = slant; if(els.slantNum) els.slantNum.value = slant; els.slantVal.textContent = `${slant} px`;
        if(els.gimpOut){
          const msg = els.autoresize.checked ? `Slant set to ${slant}px (Auto‑resize ON).` : `Slant set to ${slant}px from Shear ${shear}px @ srcH ${srcH}.`;
          els.gimpOut.textContent = msg;
        }
      });
    }

    async function handleFile(file){
      try{
        setStatus('Loading image...');
        sourceBitmap = await loadBlobAsImage(file);
        const w = sourceBitmap.width || sourceBitmap.naturalWidth;
        const h = sourceBitmap.height || sourceBitmap.naturalHeight;
        setStatus(`${w}×${h} loaded.`);
        if(els.gimpSrcH) els.gimpSrcH.value = h;
        els.export.disabled = true; els.copy.disabled = true; lastOutput = null;
        // Draw original as placeholder (contain)
        drawContainPreview(sourceBitmap);
        // allow selecting the same file again next time
        if (els.file) els.file.value = '';
      }catch(err){
        console.error(err);
        setStatus(`Failed to load image${err && err.message ? `: ${err.message}`:''}.`, '#b00020');
      }
    }

    function drawContainPreview(bitmap){
      const ctx = els.canvas.getContext('2d');
      const W = els.canvas.width, H = els.canvas.height;
      ctx.clearRect(0,0,W,H);
      const iw = bitmap.width || bitmap.naturalWidth;
      const ih = bitmap.height || bitmap.naturalHeight;
      const scale = Math.min(W/iw, H/ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (W - dw)/2;
      const dy = (H - dh)/2;
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    }

    async function loadBlobAsImage(blob){
      if (window.createImageBitmap) {
        try { return await createImageBitmap(blob); } catch(_) { /* fallback */ }
      }
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.decoding = 'async';
        const p = new Promise((res, rej)=>{
          img.onload = ()=> res(img);
          img.onerror = ()=> rej(new Error('decode failed'));
        });
        img.src = url;
        const out = await p;
        return out;
      } finally {
        setTimeout(()=> URL.revokeObjectURL(url), 3000);
      }
    }

    function sourceToImageData(src){
      const isBitmap = typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap;
      if (isBitmap) return imageBitmapToImageData(src);
      return imageElementToImageData(src);
    }

    async function runWarp(){
      if(!sourceBitmap){ setStatus('Load an image first.', '#b00020'); return; }
      try{
        setStatus('Pre‑warping...');
        // Ensure size
        let srcData = sourceToImageData(sourceBitmap);
        const dir = els.orientation.value;
        let preset;
        if(els.autoresize.checked){
          if(srcData.width !== 390 || srcData.height !== 260){
            srcData = forceBoardSizeToCanvas(sourceBitmap, 390, 260);
          }
          preset = settings.skewPresets?.[dir];
        } else {
          // Build a size-specific approximate preset so we don't stretch artificially
            // Normalize shear using board baseline height (260) so totalShiftPx represents the same perceived slant
            preset = buildApproxPreset(dir, srcData.width, 260 /* baseline */, parseInt(els.slant.value, 10) || 70, parseInt(els.persp?.value,10)|| (settings.skewPerspectivePct||0));
          if(srcData.width !== 390 || srcData.height !== 260){
            setStatus('Non-standard size: using dynamic preset (no resize).', '#555');
          }
        }
        const out = preWarpImageData(srcData, preset, { hq: els.hq.checked });
        lastOutput = out;
        drawToCanvas(out);
        els.export.disabled = false; els.copy.disabled = false;
        setStatus('Done.');
      }catch(err){
        console.error(err);
        setStatus('Failed to pre‑warp.', '#b00020');
      }
    }

    els.run.addEventListener('click', runWarp);
    els.clear.addEventListener('click', ()=>{
      sourceBitmap = null; lastOutput = null;
      splitLeftData = null; splitRightData = null;
      const ctx = els.canvas.getContext('2d');
      ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
      els.export.disabled = true; els.copy.disabled = true;
      disableSplitExports();
      if (els.file) els.file.value = '';
      setStatus('Cleared. Load a new image.');
    });
    els.export.addEventListener('click', ()=>{
      if(!lastOutput){ setStatus('Nothing to export.', '#b00020'); return; }
      const cvs = document.createElement('canvas');
      cvs.width = lastOutput.width; cvs.height = lastOutput.height;
      const ctx = cvs.getContext('2d');
      ctx.putImageData(lastOutput, 0, 0);
      cvs.toBlob((blob)=>{
        if(!blob){ setStatus('Export failed.', '#b00020'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ywp-prewarp.png';
        a.click();
        setTimeout(()=> URL.revokeObjectURL(url), 2500);
      });
    });
    els.copy.addEventListener('click', async ()=>{
      if(!lastOutput){ setStatus('Nothing to copy.', '#b00020'); return; }
      const cvs = document.createElement('canvas');
      cvs.width = lastOutput.width; cvs.height = lastOutput.height;
      const ctx = cvs.getContext('2d');
      ctx.putImageData(lastOutput, 0, 0);
      cvs.toBlob(async (blob)=>{
        if(!blob){ setStatus('Copy failed.', '#b00020'); return; }
        try{
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          setStatus('Copied to clipboard.');
        }catch(err){
          console.error(err);
          setStatus('Clipboard not available.', '#9a6b00');
        }
      });
    });

    setStatus('Ready. Load an image to begin.');

    // Split feature wiring
    initSplitFeature();
  }

  // Ensure panel is present before init
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function splitSetStatus(msg, color){
    if(!splitEls.status) return; splitEls.status.textContent = msg||''; splitEls.status.style.color = color||'#6b7280';
  }
  function disableSplitExports(){
    splitEls.exportLeft.disabled = true; splitEls.exportRight.disabled = true; splitEls.copyLeft.disabled = true; splitEls.copyRight.disabled = true;
    if(splitEls.exportQ3) splitEls.exportQ3.disabled = true; if(splitEls.exportQ4) splitEls.exportQ4.disabled = true;
    if(splitEls.copyQ3) splitEls.copyQ3.disabled = true; if(splitEls.copyQ4) splitEls.copyQ4.disabled = true;
  }
  function enableSplitExports(){
    splitEls.exportLeft.disabled = !splitLeftData; splitEls.exportRight.disabled = !splitRightData; splitEls.copyLeft.disabled = !splitLeftData; splitEls.copyRight.disabled = !splitRightData;
    if(splitEls.exportQ3) splitEls.exportQ3.disabled = !splitQ3Data; if(splitEls.exportQ4) splitEls.exportQ4.disabled = !splitQ4Data;
    if(splitEls.copyQ3) splitEls.copyQ3.disabled = !splitQ3Data; if(splitEls.copyQ4) splitEls.copyQ4.disabled = !splitQ4Data;
  }
  function initSplitFeature(){
    if(!splitEls.run) return;
    updateSplitModeUI();
    splitEls.mode.addEventListener('change', updateSplitModeUI);
    splitEls.center.addEventListener('click', ()=>{
      if(!sourceBitmap){ splitSetStatus('Load image first.', '#b00020'); return; }
      const w = sourceBitmap.width || sourceBitmap.naturalWidth;
      const h = sourceBitmap.height || sourceBitmap.naturalHeight;
      const { windowW: targetW, windowH: targetH } = currentWindowSize();
      const x = Math.max(0, Math.round((w - targetW)/2));
      const y = Math.max(0, Math.round((h - targetH)/2));
      splitEls.x.value = x; splitEls.y.value = y;
      splitSetStatus(`Centered at (${x}, ${y}).`);
    });
    splitEls.run.addEventListener('click', async ()=>{
      if(!sourceBitmap){ splitSetStatus('Load image first.', '#b00020'); return; }
      const iw = sourceBitmap.width || sourceBitmap.naturalWidth;
      const ih = sourceBitmap.height || sourceBitmap.naturalHeight;
      const ox = parseInt(splitEls.x.value, 10) || 0;
      const oy = parseInt(splitEls.y.value, 10) || 0;
      const { windowW, windowH } = currentWindowSize();
      if(ox < 0 || oy < 0 || ox + windowW > iw || oy + windowH > ih){
        splitSetStatus('Window out of bounds.', '#b00020'); disableSplitExports(); return;
      }
      splitSetStatus('Splitting...');
      try{
        // Draw source to tmp canvas
        const tmp = document.createElement('canvas');
        tmp.width = iw; tmp.height = ih;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(sourceBitmap, 0, 0);
        resetSplitData();
        const mode = splitEls.mode.value;
        if(mode === 'h2'){ // horizontal two boards
          const leftCvs = document.createElement('canvas'); leftCvs.width = 390; leftCvs.height = 260;
          const rightCvs = document.createElement('canvas'); rightCvs.width = 390; rightCvs.height = 260;
          leftCvs.getContext('2d').drawImage(tmp, ox, oy, 390, 260, 0, 0, 390, 260);
          rightCvs.getContext('2d').drawImage(tmp, ox+390, oy, 390, 260, 0, 0, 390, 260);
          splitLeftData = leftCvs.getContext('2d').getImageData(0,0,390,260);
          splitRightData = rightCvs.getContext('2d').getImageData(0,0,390,260);
        } else if(mode === 'v2'){ // vertical two boards
          const topCvs = document.createElement('canvas'); topCvs.width = 390; topCvs.height = 260;
          const bottomCvs = document.createElement('canvas'); bottomCvs.width = 390; bottomCvs.height = 260;
          topCvs.getContext('2d').drawImage(tmp, ox, oy, 390, 260, 0, 0, 390, 260);
          bottomCvs.getContext('2d').drawImage(tmp, ox, oy+260, 390, 260, 0, 0, 390, 260);
          splitLeftData = topCvs.getContext('2d').getImageData(0,0,390,260);
          splitRightData = bottomCvs.getContext('2d').getImageData(0,0,390,260);
        } else if(mode === 'grid2'){ // 2x2 grid
          const tl = document.createElement('canvas'); tl.width = 390; tl.height = 260;
          const tr = document.createElement('canvas'); tr.width = 390; tr.height = 260;
          const bl = document.createElement('canvas'); bl.width = 390; bl.height = 260;
          const br = document.createElement('canvas'); br.width = 390; br.height = 260;
          tl.getContext('2d').drawImage(tmp, ox, oy, 390, 260, 0,0,390,260);
          tr.getContext('2d').drawImage(tmp, ox+390, oy, 390,260, 0,0,390,260);
          bl.getContext('2d').drawImage(tmp, ox, oy+260, 390,260, 0,0,390,260);
          br.getContext('2d').drawImage(tmp, ox+390, oy+260, 390,260, 0,0,390,260);
          splitLeftData = tl.getContext('2d').getImageData(0,0,390,260);
          splitRightData = tr.getContext('2d').getImageData(0,0,390,260);
          splitQ3Data = bl.getContext('2d').getImageData(0,0,390,260);
          splitQ4Data = br.getContext('2d').getImageData(0,0,390,260);
        }
        if(splitEls.apply.checked){
          const presets = panel.__skewPresets;
          const preWarp = panel.__preWarp;
          if(presets && preWarp){
            const orientation = els.orientation.value; // user-selected
            const leftPreset = presets.left;
            const rightPreset = presets.right;
            const currentPreset = presets[orientation] || rightPreset;
            const warp = (data, preset)=> preset && preset.Hinv ? preWarp(data, preset, { hq: els.hq?.checked !== false }) : data;
            if(mode === 'h2'){
              splitLeftData = warp(splitLeftData, leftPreset);
              splitRightData = warp(splitRightData, rightPreset);
            } else if(mode === 'v2'){
              // Use selected orientation for both vertical slices (can adjust later if needed)
              splitLeftData = warp(splitLeftData, currentPreset);
              splitRightData = warp(splitRightData, currentPreset);
            } else if(mode === 'grid2'){
              splitLeftData = warp(splitLeftData, leftPreset); // TL
              splitRightData = warp(splitRightData, rightPreset); // TR
              if(splitQ3Data) splitQ3Data = warp(splitQ3Data, leftPreset); // BL
              if(splitQ4Data) splitQ4Data = warp(splitQ4Data, rightPreset); // BR
            }
          }
        }
        // Draw scaled previews to small canvases (contain) using stored data vars
        drawSplitPreview(splitEls.leftCanvas, splitLeftData);
        drawSplitPreview(splitEls.rightCanvas, splitRightData);
        if(splitQ3Data){ drawSplitPreview(splitEls.q3Canvas, splitQ3Data); }
        if(splitQ4Data){ drawSplitPreview(splitEls.q4Canvas, splitQ4Data); }
        enableSplitExports();
        splitSetStatus('Done.');
      }catch(err){
        console.error(err); splitSetStatus('Split failed.', '#b00020'); disableSplitExports();
      }
    });
    splitEls.exportLeft.addEventListener('click', ()=> exportImageData(splitLeftData, 'ywp-split-left.png'));
    splitEls.exportRight.addEventListener('click', ()=> exportImageData(splitRightData, 'ywp-split-right.png'));
    if(splitEls.exportQ3) splitEls.exportQ3.addEventListener('click', ()=> exportImageData(splitQ3Data, 'ywp-split-bl.png'));
    if(splitEls.exportQ4) splitEls.exportQ4.addEventListener('click', ()=> exportImageData(splitQ4Data, 'ywp-split-br.png'));
    splitEls.copyLeft.addEventListener('click', ()=> copyImageData(splitLeftData));
    splitEls.copyRight.addEventListener('click', ()=> copyImageData(splitRightData));
    if(splitEls.copyQ3) splitEls.copyQ3.addEventListener('click', ()=> copyImageData(splitQ3Data));
    if(splitEls.copyQ4) splitEls.copyQ4.addEventListener('click', ()=> copyImageData(splitQ4Data));
  }
  function currentWindowSize(){
    const mode = splitEls.mode.value;
    if(mode === 'h2') return { windowW: 780, windowH: 260 };
    if(mode === 'v2') return { windowW: 390, windowH: 520 };
    if(mode === 'grid2') return { windowW: 780, windowH: 520 };
    return { windowW: 780, windowH: 260 };
  }
  function updateSplitModeUI(){
    const mode = splitEls.mode.value;
    const showGrid = mode === 'grid2';
    if(splitEls.wrapQ3) splitEls.wrapQ3.style.display = showGrid ? 'block':'none';
    if(splitEls.wrapQ4) splitEls.wrapQ4.style.display = showGrid ? 'block':'none';
    // Labels for vertical mode
    if(mode === 'v2'){
      if(splitEls.labelLeft) splitEls.labelLeft.textContent = 'Top (390×260)';
      if(splitEls.labelRight) splitEls.labelRight.textContent = 'Bottom (390×260)';
    } else if(mode === 'h2'){
      if(splitEls.labelLeft) splitEls.labelLeft.textContent = 'Left (390×260)';
      if(splitEls.labelRight) splitEls.labelRight.textContent = 'Right (390×260)';
    } else if(mode === 'grid2'){
      if(splitEls.labelLeft) splitEls.labelLeft.textContent = 'Top‑Left (390×260)';
      if(splitEls.labelRight) splitEls.labelRight.textContent = 'Top‑Right (390×260)';
    }
    disableSplitExports();
    splitSetStatus('Select offsets then Split.');
  }
  function resetSplitData(){ splitLeftData = null; splitRightData = null; splitQ3Data = null; splitQ4Data = null; }
  function drawSplitPreview(canvas, imgData){
    if(!canvas || !imgData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const tmp = document.createElement('canvas'); tmp.width = imgData.width; tmp.height = imgData.height;
    tmp.getContext('2d').putImageData(imgData,0,0);
    const scale = Math.min(W/imgData.width, H/imgData.height);
    const dw = imgData.width*scale; const dh = imgData.height*scale;
    const dx = (W-dw)/2; const dy = (H-dh)/2;
    ctx.drawImage(tmp, dx, dy, dw, dh);
  }
  function exportImageData(imgData, filename){
    if(!imgData){ splitSetStatus('Nothing to export.', '#b00020'); return; }
    const cvs = document.createElement('canvas');
    cvs.width = imgData.width; cvs.height = imgData.height;
    cvs.getContext('2d').putImageData(imgData,0,0);
    cvs.toBlob((blob)=>{
      if(!blob){ splitSetStatus('Export failed.', '#b00020'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 2500);
    });
  }
  function copyImageData(imgData){
    if(!imgData){ splitSetStatus('Nothing to copy.', '#b00020'); return; }
    const cvs = document.createElement('canvas');
    cvs.width = imgData.width; cvs.height = imgData.height;
    cvs.getContext('2d').putImageData(imgData,0,0);
    cvs.toBlob(async (blob)=>{
      if(!blob){ splitSetStatus('Copy failed.', '#b00020'); return; }
      try{
        await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
        splitSetStatus('Copied.');
      }catch(err){ console.error(err); splitSetStatus('Clipboard unavailable.', '#9a6b00'); }
    });
  }
>>>>>>> 96b33af609ee747521d38d06199b9bf683a5ef1b
})();
