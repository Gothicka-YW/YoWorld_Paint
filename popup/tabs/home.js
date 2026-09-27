
// home.js — donor storage format, live preview
function getCompatibleImageUrl(url) {
  const value = String(url || '').trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && (parsed.hostname === 'i.ibb.co' || parsed.hostname === 'image.ibb.co')) {
      const relaySource = parsed.host + parsed.pathname + parsed.search;
      return 'https://wsrv.nl/?url=' + encodeURIComponent(relaySource) + '&output=png';
    }
  } catch (_) {}
  return value;
}

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
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      preview.appendChild(img);
    }
    if (url){ img.src = getCompatibleImageUrl(url); img.style.display = ''; }
    else { img.remove(); }
  }

  function load() {
    chrome.storage.local.get({ img: ["", false] }, (o)=>{
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
    showToast(enabled
      ? 'Redirect ON — keep it on until the first YoWorld save is complete'
      : 'Redirect OFF — the first YoWorld save must already be complete');
  }



  if (btn)   btn.addEventListener('click', saveUrl);
  if (input) input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); saveUrl(); }});
  if (toggle) toggle.addEventListener('change', saveToggle);

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
async function resizeExactPngFromFile(file, w, h, cleanTransparency = false){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
    fr.onload = e => { img.src = e.target.result; };
    fr.onerror = reject;
    img.onload = () => {
      const exactPng = img.width === w && img.height === h && file.type === 'image/png';
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0,0,w,h);
      // Fit contain inside target, then center (avoid distortion)
      const scale = Math.min(w / img.width, h / img.height);
      const dw = Math.max(1, Math.round(img.width * scale));
      const dh = Math.max(1, Math.round(img.height * scale));
      const dx = Math.floor((w - dw) / 2);
      const dy = Math.floor((h - dh) / 2);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);

      // Preserve soft detail by default. For images with unwanted colored haze,
      // the optional cleanup converts partial alpha to a hard 50% edge.
      const alphaChanged = cleanTransparency
        ? cleanYoWorldTransparency(ctx, w, h)
        : false;

      // Preserve exact-size PNG bytes when they already use YoWorld-safe
      // transparency. This avoids an unnecessary canvas re-encode.
      if (exactPng && !alphaChanged) {
        resolve(file);
        return;
      }
      cv.toBlob(b => {
        if (!b) return reject(new Error('Canvas toBlob failed'));
        resolve(b);
      }, 'image/png');
    };
    fr.readAsDataURL(file);
  });
}

function cleanYoWorldTransparency(ctx, w, h, threshold = 128){
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  let changed = false;

  for (let i = 3; i < pixels.length; i += 4){
    const alpha = pixels[i];
    if (alpha === 0 || alpha === 255) continue;

    changed = true;
    if (alpha < threshold){
      // Clear hidden RGB as well as alpha so later encoders cannot reveal it.
      pixels[i - 3] = 0;
      pixels[i - 2] = 0;
      pixels[i - 1] = 0;
      pixels[i] = 0;
    } else {
      pixels[i] = 255;
    }
  }

  if (changed) ctx.putImageData(imageData, 0, 0);
  return changed;
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
      cv.toBlob(b => {
        if (!b) return reject(new Error('Canvas toBlob failed'));
        resolve(b);
      }, 'image/png');
    };
    fr.readAsDataURL(file);
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
  const autoChk = document.getElementById('qu-autoset');
  const resizeChk = document.getElementById('qu-autoresize');
  const cleanAlphaChk = document.getElementById('qu-clean-alpha');
  const clearBtn = document.getElementById('qu-clear');
  const bridgeBtn = document.getElementById('btn-upload-last');
  if (!hostSel || !fileEl || !btnUpload) return;

  let lastUrl = '';
  let clipboardBlob = null;
  let pickedFile = null; // single source for chosen/dropped file

  function setStatus(msg, isErr){ if (statusEl){ statusEl.textContent = msg || ''; statusEl.style.color = isErr ? '#b00020' : '#6b7280'; } }
  function setResult(url){ if (resultEl){ if (url){ resultEl.style.display='block'; resultEl.textContent = url; } else { resultEl.style.display='none'; resultEl.textContent=''; } } }

  // Game-ready sizing is ON by default. Users can explicitly disable it when
  // they truly need to upload an untouched original.
  chrome.storage.sync.get(['quickUploadHost','imgbbKey','quickUploadAutoResize','quickUploadCleanTransparency'], data => {
    if (hostSel) hostSel.value = data.quickUploadHost === 'imgbb' ? 'imgbb' : 'picrd';
    if (resizeChk) resizeChk.checked = (data.quickUploadAutoResize !== false);
    if (cleanAlphaChk) cleanAlphaChk.checked = data.quickUploadCleanTransparency === true;
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

  if (cleanAlphaChk){
    cleanAlphaChk.addEventListener('change', () => {
      chrome.storage.sync.set({ quickUploadCleanTransparency: !!cleanAlphaChk.checked });
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
    if (host === 'picrd') {
      let granted = false;
      try {
        granted = await chrome.permissions.request({ origins: ['https://picrd.com/*'] });
      } catch (error) {
        console.error('Unable to request Picrd access:', error);
      }
      if (!granted) {
        setStatus('Picrd access is required for Quick Upload.', true);
        return;
      }
    }
    if (host === 'imgbb'){
      const { imgbbKey } = await chrome.storage.sync.get(['imgbbKey']);
      if (!imgbbKey){ setStatus('ImgBB key missing.', true); toggleKeyWarning(true); return; }
    }
    const doResize = !resizeChk || resizeChk.checked;
    btnUpload.disabled = true;
    btnCopy.disabled = true;
    const cleanTransparency = !!cleanAlphaChk?.checked;
    setStatus(doResize ? 'Preparing 390×260 game image…' : 'Uploading original…');
    setResult('');
    lastUrl='';
    try {
      let uploadFile = file;
      if (doResize){
        const resized = await resizeExactPngFromFile(file, 390, 260, cleanTransparency);
        setStatus('Uploading…');
        uploadFile = new File([resized], file.name || 'image.png', { type:'image/png' });
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
