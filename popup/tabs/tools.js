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
})();
