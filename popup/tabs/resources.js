// resources.js - handles uploader settings UI
(function(){
  const keyInput = document.getElementById('res-imgbb-key');
  const saveBtn = document.getElementById('btn-save-imgbb');
  const statusEl = document.getElementById('res-imgbb-status');
  if (!keyInput || !saveBtn) return;

  function setStatus(msg, good){
    if (!statusEl) return; statusEl.textContent = msg || ''; statusEl.style.color = good ? '#067647' : '#7e1212';
  }

  function load(){
    chrome.storage.sync.get(['imgbbKey'], data => {
      if (data && typeof data.imgbbKey === 'string') keyInput.value = data.imgbbKey;
    });
  }

  saveBtn.addEventListener('click', () => {
    const val = (keyInput.value || '').trim();
    chrome.storage.sync.set({ imgbbKey: val }, () => {
      const err = chrome.runtime.lastError; if (err) { setStatus('Save failed: ' + err.message, false); return; }
      setStatus('Saved', true); setTimeout(()=> setStatus('', true), 1600);
    });
  });

  load();
})();
