
// home.js — donor storage format, live preview
(function(){
  const input   = document.getElementById('img-url');
  const btn     = document.getElementById('btn-set');
  const toggle  = document.getElementById('enable-redirect');
  const preview = document.querySelector('.preview');

  function setPreview(url) {
    if (!preview) return;
    if (url) {
      preview.style.backgroundImage = `url("${url}")`;
      preview.style.backgroundSize = "contain";
      preview.style.backgroundPosition = "center";
      preview.style.backgroundRepeat = "no-repeat";
    } else {
      preview.style.backgroundImage = "none";
    }
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

async function tryDirectYoWorld(dataURL){
  try{
    const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
    if (!tab || !/^https?:\/\/(.*\.)?yoworld\.com\//.test(tab.url||'')) return null;
    return await new Promise((resolve)=>{
      chrome.tabs.sendMessage(tab.id, {type:'YWP_DIRECT_UPLOAD', dataURL}, (resp)=>{
        if (resp && resp.ok && resp.url) resolve(resp.url); else resolve(null);
      });
    });
  }catch(e){ return null; }
}

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
  if (!hostSel || !fileEl || !btnUpload) return;

  let lastUrl = '';
  let clipboardBlob = null;
  let pickedFile = null; // single source for chosen/dropped file

  function setStatus(msg, isErr){ if (statusEl){ statusEl.textContent = msg || ''; statusEl.style.color = isErr ? '#b00020' : '#6b7280'; } }
  function setResult(url){ if (resultEl){ if (url){ resultEl.style.display='block'; resultEl.textContent = url; } else { resultEl.style.display='none'; resultEl.textContent=''; } } }

  // Load preferred host & key presence
  chrome.storage.sync.get(['quickUploadHost','imgbbKey'], data => {
    if (data.quickUploadHost && hostSel) hostSel.value = data.quickUploadHost;
    toggleKeyWarning();
  });

  hostSel.addEventListener('change', () => {
    chrome.storage.sync.set({ quickUploadHost: hostSel.value });
    toggleKeyWarning();
  });

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

  btnUpload.addEventListener('click', async () => {
  const host = hostSel.value;
  // Prefer fresh file input; fall back to dropped/pasted
  const file = (fileEl.files && fileEl.files[0]) || pickedFile || clipboardBlob;
    if (!file){ setStatus('Select or paste an image.', true); return; }
    if (host === 'imgbb'){
      const { imgbbKey } = await chrome.storage.sync.get(['imgbbKey']);
      if (!imgbbKey){ setStatus('ImgBB key missing.', true); toggleKeyWarning(true); return; }
    }
    btnUpload.disabled = true; btnCopy.disabled = true; setStatus('Resizing…'); setResult(''); lastUrl='';
    try {
      const resized = await resizeExactPngFromFile(file, 390, 260);
      setStatus('Uploading…');
      const blobFile = new File([resized], file.name || 'image.png', { type:'image/png' });
      const { uploadImage } = await import('../../src/lib/uploader.js');
      const url = await uploadImage(blobFile, { host });
      lastUrl = url; setResult(url);
      try { await navigator.clipboard.writeText(url); setStatus('Uploaded & copied.'); btnCopy.disabled=false; }
      catch { setStatus('Uploaded. Use Copy button.', true); btnCopy.disabled=false; }
      // Auto-set as current image
      if (autoChk && autoChk.checked){
        const mainInput = document.getElementById('img-url');
        if (mainInput){ mainInput.value = url; mainInput.dispatchEvent(new Event('input', {bubbles:true})); }
        const btn = document.getElementById('btn-set'); if (btn) btn.click();
      }
      showToast('Upload complete');
      // reset transient sources after success
      pickedFile = null; clipboardBlob = null; if (fileEl) fileEl.value = '';
    } catch(e){ setStatus('Upload failed: ' + e.message, true); }
    finally { btnUpload.disabled = false; }
  });

  function toggleKeyWarning(force){
    chrome.storage.sync.get(['imgbbKey'], d => {
      const missing = !d.imgbbKey && hostSel.value === 'imgbb';
      if (warnEl) warnEl.style.display = (missing || force) ? 'block' : 'none';
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
