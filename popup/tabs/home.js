
// home.js — donor storage format, live preview
const DEFAULT_IMAGE_URL = 'https://i.postimg.cc/VLh6mKGY/20250924-1934-Celestial-Cartoon-Background-remix-01k5z13k9cf4jrwgtmak9dqwjr.png';

function getCompatibleImageUrl(url) {
  const value = String(url || '').trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (parsed.hostname === 'wsrv.nl') return value;
    // Preserve the exact game-ready PNG bytes uploaded by the extension.
    const directImageHosts = new Set(['i.picrd.com', 'i.ibb.co', 'image.ibb.co', 'i.postimg.cc']);
    if (directImageHosts.has(parsed.hostname) || parsed.hostname.endsWith('.postimg.cc')) {
      return parsed.href;
    }
    const relaySource = parsed.host + parsed.pathname + parsed.search;
    return 'https://wsrv.nl/?url=' + encodeURIComponent(relaySource) + '&output=png';
  } catch (_) {}
  return '';
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
      if (!url) {
        url = DEFAULT_IMAGE_URL;
        chrome.storage.local.set({ img: [url, enabled] });
      }
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
      const storedUrl = Array.isArray(o.img) ? (o.img[0] || "") : "";
      const url = storedUrl || (input && input.value || '').trim() || DEFAULT_IMAGE_URL;
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
    setStatus(doResize ? 'Preparing a save-safe 390×260 image…' : 'Uploading original…');
    setResult('');
    lastUrl='';
    try {
      let uploadFile = file;
      if (doResize){
        const { prepareYoWorldIndexedPng } = await import('../../src/lib/indexed-png.js');
        const prepared = await prepareYoWorldIndexedPng(file, {
          width: 390,
          height: 260,
          allowResize: true,
          cleanTransparency,
          targetBytes: 34 * 1024
        });
        const sourceName = file.name || 'image';
        const pngName = `${sourceName.replace(/\.[^.]+$/, '') || 'image'}-yoworld.png`;
        const sizeKb = Math.ceil(prepared.byteLength / 1024);
        setStatus(prepared.targetMet
          ? `Uploading save-safe PNG (${sizeKb} KB)…`
          : `Uploading smallest available PNG (${sizeKb} KB)…`);
        uploadFile = new File([prepared.blob], pngName, { type:'image/png' });
      }
      const { uploadImage } = await import('../../src/lib/uploader.js');
      const url = await uploadImage(uploadFile, { host });
      const stored = await chrome.storage.local.get({ img: ['', false] });
      const enabled = Array.isArray(stored.img) ? !!stored.img[1] : false;
      const imageUpdate = {};
      if (autoChk && autoChk.checked) imageUpdate.img = [url, enabled];
      await chrome.storage.local.set(imageUpdate);
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
