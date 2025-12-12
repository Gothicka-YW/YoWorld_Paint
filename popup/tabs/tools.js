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
})();
