// popup/tabs/sales-boards.js — 3x2 crop from yoworld.info
(function(){
  const PANEL = document.getElementById('panel-sales-boards');
  if (!PANEL) return;
  const q = sel => PANEL.querySelector(sel);
  const btnPick = q('#sb-pick');
  const btnReset = q('#sb-reset');
  const btnPreview = q('#sb-preview');
  const btnExport = q('#sb-export');
  const btnRestore = q('#sb-restore');
  const statusEl = q('#sb-status');
  const previewEl = q('#sb-preview-img');

  let lastDataUrl = '';

  function setStatus(msg, isErr){ if (statusEl){ statusEl.textContent = msg || ''; statusEl.style.color = isErr ? '#7e1212' : '#6b7280'; } }
  function setPreview(url){ if (!previewEl) return; previewEl.style.backgroundImage = url ? `url("${url}")` : 'none'; previewEl.style.backgroundSize='contain'; previewEl.style.backgroundPosition='center'; previewEl.style.backgroundRepeat='no-repeat'; }

  async function getActiveTab(){ const [tab] = await chrome.tabs.query({active:true, currentWindow:true}); return tab; }

  function isYoWorldInfo(url){ return /^https?:\/\/(?:[^.]+\.)?yoworld\.info\//i.test(url||''); }
  async function sendToActiveTab(msg){
    const tab = await getActiveTab();
    if (!tab) throw new Error('No active tab');
    if (!isYoWorldInfo(tab.url)) throw new Error('Open yoworld.info/template and try again.');
    try {
      return await chrome.tabs.sendMessage(tab.id, msg);
    } catch (e) {
      // Fallback: try injecting the content script if not present
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/sb_capture.js'] });
        return await chrome.tabs.sendMessage(tab.id, msg);
      } catch (e2) {
        throw new Error('Could not reach page script. Reload the page and try again.');
      }
    }
  }

  async function captureAndCrop(rect){
    // rect in CSS pixels relative to viewport
    const dpr = window.devicePixelRatio || 1;
    const shot = await chrome.tabs.captureVisibleTab({format:'png'});
    // Draw, crop, and scale to 390x260 (contain on white background)
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=shot; });
    const sx = Math.max(0, Math.round(rect.left * dpr));
    const sy = Math.max(0, Math.round(rect.top * dpr));
    const sw = Math.round(rect.width * dpr);
    const sh = Math.round(rect.height * dpr);
    const srcCanvas = document.createElement('canvas'); srcCanvas.width = sw; srcCanvas.height = sh;
    const sctx = srcCanvas.getContext('2d'); sctx.imageSmoothingEnabled=true; sctx.imageSmoothingQuality='high';
    sctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const dstW = 390, dstH = 260;
    const out = document.createElement('canvas'); out.width=dstW; out.height=dstH; const octx=out.getContext('2d'); octx.fillStyle='#fff'; octx.fillRect(0,0,dstW,dstH);
    const scale = Math.min(dstW / sw, dstH / sh);
    const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
    const dx = Math.round((dstW - dw)/2), dy = Math.round((dstH - dh)/2);
    octx.imageSmoothingEnabled=true; octx.imageSmoothingQuality='high';
    octx.drawImage(srcCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
    return out.toDataURL('image/png');
  }

  async function doPreview(){
    setStatus('Preparing…'); setPreview(''); lastDataUrl='';
    try{
      const prep = await sendToActiveTab({ type:'YWP_SB_PREPARE_RECT' });
      if (!prep || !prep.ok) throw new Error(prep?.error || 'Could not determine 3×2 area. Pick selector on yoworld.info first.');
      if (prep.tooTall) setStatus('Tip: Maximize your window so the 3×2 grid fits on screen.', false);
      const dataUrl = await captureAndCrop(prep.rect);
      lastDataUrl = dataUrl; setPreview(dataUrl); setStatus('Ready.');
    } catch(e){ setStatus(e.message || 'Preview failed', true); }
  }

  async function doExport(){
    if (!lastDataUrl){ await doPreview(); if (!lastDataUrl) return; }
    try{
      // Save for Home tab bridge
      try { localStorage.setItem('ywp:lastExportPng', lastDataUrl); } catch(_){ }
      const a = document.createElement('a'); a.download = 'ywp-sales-crop.png'; a.href = lastDataUrl; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(), 0);
      setStatus('Exported.');
    } catch(e){ setStatus('Export failed', true); }
  }

  if (btnPick) btnPick.addEventListener('click', async ()=>{
    setStatus('Click a card on yoworld.info…');
    try{ const r = await sendToActiveTab({ type:'YWP_SB_PICK' }); if (r && r.ok) setStatus('Selector saved.'); else setStatus('Pick canceled or failed.', true);} catch(e){ setStatus('Not on yoworld.info?', true); }
  });
  if (btnReset) btnReset.addEventListener('click', async ()=>{
    try{ await sendToActiveTab({ type:'YWP_SB_RESET' }); setStatus('Selectors cleared.'); } catch(e){ setStatus('Reset failed', true); }
  });
  if (btnPreview) btnPreview.addEventListener('click', doPreview);
  if (btnExport) btnExport.addEventListener('click', doExport);
  if (btnRestore) btnRestore.addEventListener('click', async ()=>{
    try{ await sendToActiveTab({ type:'YWP_SB_RESTORE' }); setStatus('Restored.'); } catch(e){ setStatus('Restore failed', true); }
  });
})();