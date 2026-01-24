
// home.js — donor storage format, live preview
(function(){
  const input   = document.getElementById('img-url');
  const btn     = document.getElementById('btn-set');
  const toggle  = document.getElementById('enable-redirect');
  const glowFixEl = document.getElementById('glow-fix');
  const glowMatteModeEl = document.getElementById('glow-matte-mode');
  const glowSmoothnessEl = document.getElementById('glow-smoothness');
  const glowMatteEl = document.getElementById('glow-matte');
  const preview = document.querySelector('.preview');

  function setPreview(url) {
    if (!preview) return;
    // Ensure an <img> child shows the image, keeping the checkerboard background visible
    let img = preview.querySelector('img');
    if (!img){
      img = document.createElement('img');
      img.alt = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      preview.appendChild(img);
    }
    if (url){ img.src = url; img.style.display = ''; }
    else { img.remove(); }
  }

  function load() {
    chrome.storage.local.get({ img: ["", false], glowFixEnabled: false, glowFixMatte: '#ffffff', glowFixMatteMode: 'color', glowFixSmoothness: 1 }, (o)=>{
      let url = Array.isArray(o.img) ? (o.img[0] || "") : "";
      const enabled = Array.isArray(o.img) ? !!o.img[1] : false;
      const glowFixEnabled = o.glowFixEnabled === true;
      const glowFixMatte = (typeof o.glowFixMatte === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.glowFixMatte)) ? o.glowFixMatte : '#ffffff';
      const glowFixMatteMode = (o.glowFixMatteMode === 'transparent') ? 'transparent' : 'color';
      const glowFixSmoothness = (o.glowFixSmoothness === 2 || o.glowFixSmoothness === 0) ? o.glowFixSmoothness : 1;
      // If no image is set, use the sticky default
  // Default fallback image
  if (!url) url = "https://i.postimg.cc/VLh6mKGY/20250924-1934-Celestial-Cartoon-Background-remix-01k5z13k9cf4jrwgtmak9dqwjr.png";
      if (input)  input.value = url;
      if (toggle) toggle.checked = enabled;
      if (glowFixEl) glowFixEl.checked = glowFixEnabled;
      if (glowMatteModeEl) glowMatteModeEl.value = glowFixMatteMode;
      if (glowSmoothnessEl) glowSmoothnessEl.value = String(glowFixSmoothness);
      if (glowMatteEl) glowMatteEl.value = glowFixMatte;
      updateGlowMatteUi();
      setPreview(url);
    });
  }

  function saveUrl() {
    const url = (input && input.value || "").trim();
    chrome.storage.local.get({ img: ["", false] }, (o)=>{
      const enabled = Array.isArray(o.img) ? !!o.img[1] : false;
      // immediate preview
      setPreview(url);
      chrome.storage.local.set({ img: [url, enabled] });
    });
  }

  function saveToggle() {
    const enabled = !!(toggle && toggle.checked);
    chrome.storage.local.get({ img: ["", false] }, (o)=>{
      const url = Array.isArray(o.img) ? (o.img[0] || "") : "";
      chrome.storage.local.set({ img: [url, enabled] });
    });
  }

  function saveGlowFix() {
    const enabled = !!(glowFixEl && glowFixEl.checked);
    const matteMode = (glowMatteModeEl && glowMatteModeEl.value === 'transparent') ? 'transparent' : 'color';
    const smoothness = glowSmoothnessEl ? Math.max(0, Math.min(2, parseInt(glowSmoothnessEl.value, 10) || 0)) : 1;
    const matte = (glowMatteEl && /^#[0-9a-fA-F]{6}$/.test(glowMatteEl.value)) ? glowMatteEl.value : '#ffffff';
    chrome.storage.local.set({ glowFixEnabled: enabled, glowFixMatte: matte, glowFixMatteMode: matteMode, glowFixSmoothness: smoothness });
    updateGlowMatteUi();
  }

  function updateGlowMatteUi(){
    if (!glowMatteEl || !glowMatteModeEl) return;
    const enabled = !!(glowFixEl && glowFixEl.checked);
    const isTransparent = glowMatteModeEl.value === 'transparent';

    // Matte mode dropdown is only relevant when Glow Fix is enabled
    glowMatteModeEl.disabled = !enabled;
    glowMatteModeEl.style.opacity = enabled ? '1' : '0.5';

    // Matte color only applies in Color mode
    glowMatteEl.disabled = !enabled || isTransparent;
    glowMatteEl.style.opacity = (!enabled || isTransparent) ? '0.5' : '1';

    // Smoothness only applies in Transparent mode
    if (glowSmoothnessEl){
      glowSmoothnessEl.disabled = !enabled || !isTransparent;
      glowSmoothnessEl.style.opacity = (!enabled || !isTransparent) ? '0.5' : '1';
    }
  }

  if (btn)   btn.addEventListener('click', saveUrl);
  if (input) input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); saveUrl(); }});
  if (toggle) toggle.addEventListener('change', saveToggle);
  if (glowFixEl) glowFixEl.addEventListener('change', saveGlowFix);
  if (glowMatteModeEl) glowMatteModeEl.addEventListener('change', saveGlowFix);
  if (glowSmoothnessEl) glowSmoothnessEl.addEventListener('change', saveGlowFix);
  if (glowMatteEl) glowMatteEl.addEventListener('change', saveGlowFix);

  load();
})();

(function(){
  const pick = document.querySelector('#file-pick');
  if (!pick) return;
  pick.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const png = await resizeExactPngFromFile(f, 390, 260);
    let url = null;
    try { url = await uploadPreferred(png); } catch(e){ console.warn('uploadPreferred error', e); }
    if (!url) return alert('Upload failed. Check Resources settings.');
    const toggle = document.querySelector('#panel-home #enable-redirect');
    if (toggle && !toggle.checked){ toggle.checked = true; toggle.dispatchEvent(new Event('change', {bubbles:true})); }
    const input = document.querySelector('#panel-home #img-url');
    if (input){ input.value = url; input.dispatchEvent(new Event('input', {bubbles:true})); }
    const btn = document.querySelector('#panel-home #btn-set');
    if (btn) btn.click();
  });
})();


// --- Added: exact resize helper (referenced previously but missing) ---
async function resizeExactPngFromFile(file, w, h){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
    fr.onload = e => { img.src = e.target.result; };
    fr.onerror = reject;
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0,0,w,h);
      // Fit contain inside target, then center (avoid distortion)
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale; const dh = img.height * scale;
      const dx = (w - dw)/2; const dy = (h - dh)/2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);
      try { maybeApplyGlowFix(ctx, w, h); } catch(_){ /* non-fatal */ }
      cv.toBlob(b => {
        if (!b) return reject(new Error('Canvas toBlob failed'));
        resolve(b);
      }, 'image/png');
    };
    fr.readAsDataURL(file);
  });
}

async function toPngBlobFromFile(file){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
    fr.onload = e => { img.src = e.target.result; };
    fr.onerror = reject;
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      try { maybeApplyGlowFix(ctx, cv.width, cv.height); } catch(_){ /* non-fatal */ }
      cv.toBlob(b => {
        if (!b) return reject(new Error('Canvas toBlob failed'));
        resolve(b);
      }, 'image/png');
    };
    fr.readAsDataURL(file);
  });
}

function hexToRgb(hex){
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return { r: 255, g: 255, b: 255 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function maybeApplyGlowFix(ctx, w, h){
  const glowFixEl = document.getElementById('glow-fix');
  const enabled = !!(glowFixEl && glowFixEl.checked);
  if (!enabled) return;
  const glowMatteModeEl = document.getElementById('glow-matte-mode');
  const matteMode = (glowMatteModeEl && glowMatteModeEl.value === 'transparent') ? 'transparent' : 'color';
  const glowSmoothnessEl = document.getElementById('glow-smoothness');
  const smoothness = glowSmoothnessEl ? Math.max(0, Math.min(2, parseInt(glowSmoothnessEl.value, 10) || 0)) : 1;
  const glowMatteEl = document.getElementById('glow-matte');
  const matteHex = (glowMatteEl && glowMatteEl.value) ? glowMatteEl.value : '#ffffff';
  const matte = hexToRgb(matteHex);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  function blurAlpha(alpha, passes){
    if (!passes) return alpha;
    let src = alpha;
    let dst = new Uint8ClampedArray(alpha.length);
    for (let pass = 0; pass < passes; pass++){
      for (let y = 0; y < h; y++){
        const y0 = y > 0 ? y - 1 : y;
        const y1 = y;
        const y2 = y < h - 1 ? y + 1 : y;
        for (let x = 0; x < w; x++){
          const x0 = x > 0 ? x - 1 : x;
          const x1 = x;
          const x2 = x < w - 1 ? x + 1 : x;
          const sum =
            src[y0 * w + x0] + src[y0 * w + x1] + src[y0 * w + x2] +
            src[y1 * w + x0] + src[y1 * w + x1] + src[y1 * w + x2] +
            src[y2 * w + x0] + src[y2 * w + x1] + src[y2 * w + x2];
          dst[y * w + x] = (sum / 9) | 0;
        }
      }
      const tmp = src;
      src = dst;
      dst = tmp;
    }
    return src;
  }

  // 8×8 Bayer ordered dither matrix values 0..63
  const bayer8 = [
    0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];

  // Pull alpha channel for optional smoothing
  let alpha = null;
  if (matteMode === 'transparent' && smoothness > 0){
    alpha = new Uint8ClampedArray(w * h);
    for (let p = 0, di = 0; p < alpha.length; p++, di += 4){
      alpha[p] = d[di + 3];
    }
    alpha = blurAlpha(alpha, smoothness);
  }

  for (let i = 0; i < d.length; i += 4){
    const p = (i / 4) | 0;
    const a = (alpha && matteMode === 'transparent') ? alpha[p] : d[i + 3];
    if (a === 0) continue; // keep fully transparent pixels transparent
    if (a === 255) continue; // keep fully opaque pixels unchanged
    if (matteMode === 'transparent'){
      // Keep true transparency by dithering alpha into binary coverage.
      // This avoids the "transparent => black" look and often restores a glow-like pixel spread.
      const x = p % w;
      const y = (p / w) | 0;
      const t = bayer8[(x & 7) + ((y & 7) << 3)];
      // Map 0..63 -> threshold ~0..255
      const thresh = t * 4 + 2;
      d[i + 3] = (a >= thresh) ? 255 : 0;
    } else {
      // Convert soft alpha into a visible gradient by blending toward matte,
      // then force alpha to opaque (binary alpha) so YoWorld can't flatten it.
      const inv = 255 - a;
      d[i]     = (d[i]     * a + matte.r * inv) / 255;
      d[i + 1] = (d[i + 1] * a + matte.g * inv) / 255;
      d[i + 2] = (d[i + 2] * a + matte.b * inv) / 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
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
  const autoChk = document.getElementById('qu-autoset');
  const resizeChk = document.getElementById('qu-autoresize');
  const clearBtn = document.getElementById('qu-clear');
  const bridgeBtn = document.getElementById('btn-upload-last');
  if (!hostSel || !fileEl || !btnUpload) return;

  let lastUrl = '';
  let clipboardBlob = null;
  let pickedFile = null; // single source for chosen/dropped file

  function setStatus(msg, isErr){ if (statusEl){ statusEl.textContent = msg || ''; statusEl.style.color = isErr ? '#b00020' : '#6b7280'; } }
  function setResult(url){ if (resultEl){ if (url){ resultEl.style.display='block'; resultEl.textContent = url; } else { resultEl.style.display='none'; resultEl.textContent=''; } } }

  // Load preferred host, key, and auto-resize (default OFF unless explicitly enabled)
  chrome.storage.sync.get(['quickUploadHost','imgbbKey','quickUploadAutoResize'], data => {
    if (data.quickUploadHost && hostSel) hostSel.value = data.quickUploadHost;
    if (resizeChk) resizeChk.checked = (data.quickUploadAutoResize === true); // default OFF
    toggleKeyWarning();
  });

  hostSel.addEventListener('change', () => {
    chrome.storage.sync.set({ quickUploadHost: hostSel.value });
    toggleKeyWarning();
  });

  if (resizeChk){
    resizeChk.addEventListener('change', () => {
      chrome.storage.sync.set({ quickUploadAutoResize: !!resizeChk.checked });
    });
  }

  document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items||[])].find(i => i.type && i.type.startsWith('image/'));
    if (item){
      clipboardBlob = item.getAsFile();
      setStatus('Image pasted. Ready to upload.');
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
        showToast('Image added');
      }
    });
  }

  // Reflect file selection changes (first click reliability)
  fileEl.addEventListener('change', () => {
    pickedFile = (fileEl.files && fileEl.files[0]) || null;
    if (pickedFile){ setStatus('File selected.'); showToast('Image selected'); }
  });

  if (clearBtn){
    clearBtn.addEventListener('click', () => {
      pickedFile = null; clipboardBlob = null; lastUrl='';
      if (fileEl) fileEl.value='';
      setStatus(''); setResult('');
      btnCopy.disabled = true;
      showToast('Cleared');
    });
  }

  btnUpload.addEventListener('click', async () => {
  const host = hostSel.value;
  // Prefer fresh file input; fall back to dropped/pasted
  const file = (fileEl.files && fileEl.files[0]) || pickedFile || clipboardBlob;
    if (!file){ setStatus('Select or paste an image.', true); return; }
    if (host === 'imgbb'){
      const { imgbbKey } = await chrome.storage.sync.get(['imgbbKey']);
      if (!imgbbKey){ setStatus('ImgBB key missing.', true); toggleKeyWarning(true); return; }
    }
    const glowFixEl = document.getElementById('glow-fix');
    const glowFixEnabled = !!(glowFixEl && glowFixEl.checked);
    const doResize = !resizeChk || resizeChk.checked;
    btnUpload.disabled = true;
    btnCopy.disabled = true;
    setStatus(doResize ? 'Resizing…' : (glowFixEnabled ? 'Processing…' : 'Uploading…'));
    setResult('');
    lastUrl='';
    try {
      let uploadFile = file;
      if (doResize){
        const resized = await resizeExactPngFromFile(file, 390, 260);
        setStatus('Uploading…');
        uploadFile = new File([resized], file.name || 'image.png', { type:'image/png' });
      } else if (glowFixEnabled) {
        // Glow Fix requires a processing pass even when not resizing.
        const processed = await toPngBlobFromFile(file);
        setStatus('Uploading…');
        uploadFile = new File([processed], file.name || 'image.png', { type:'image/png' });
      }
      const { uploadImage } = await import('../../src/lib/uploader.js');
      const url = await uploadImage(uploadFile, { host });
      lastUrl = url; setResult(url);
      try { await navigator.clipboard.writeText(url); setStatus('Uploaded & copied.'); btnCopy.disabled=false; }
      catch { setStatus('Uploaded. Use Copy button.', true); btnCopy.disabled=false; }
      // Auto-set as current image
      if (autoChk && autoChk.checked){
        const mainInput = document.getElementById('img-url');
        if (mainInput){ mainInput.value = url; mainInput.dispatchEvent(new Event('input', {bubbles:true})); }
        const btn = document.getElementById('btn-set'); if (btn) btn.click();
        if (!doResize) showToast('Warning: Original size may stretch in YoWorld');
      }
      showToast('Upload complete');
      // reset transient sources after success
      pickedFile = null; clipboardBlob = null; if (fileEl) fileEl.value = '';
    } catch(e){
      const msg = (e && e.message) ? e.message : String(e);
      setStatus('Upload failed: ' + msg, true);
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
