// resources.js - handles uploader settings UI
(function(){
  const keyInput = document.getElementById('res-imgbb-key');
  const saveBtn = document.getElementById('btn-save-imgbb');
  const testBtn = document.getElementById('btn-test-imgbb');
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

  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const key = (keyInput.value || '').trim();
      if (!key) { setStatus('Enter your ImgBB key first.', false); return; }
      setStatus('Testing…', true);
      try {
        // create a 1x1 PNG blob
        const cv = document.createElement('canvas'); cv.width=1; cv.height=1;
        const blob = await new Promise(res => cv.toBlob(b => res(b), 'image/png'));
        const form = new FormData();
        form.append('image', blob, 'test.png');
        const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`;
        const resp = await fetch(endpoint, { method:'POST', body: form });
        const json = await resp.json().catch(()=>({}));
        if (!resp.ok) {
          const code = (json && json.error && json.error.code) || resp.status;
          const msg = (json && json.error && json.error.message) || 'HTTP ' + resp.status;
          throw new Error(`ImgBB ${code}: ${msg}`);
        }
        const url = json?.data?.display_url || json?.data?.url || json?.data?.image?.url;
        if (!url) throw new Error('Response missing URL');
        setStatus('Key OK ✔', true);
      } catch (e) {
        setStatus('Test failed: ' + (e.message || 'Unknown error'), false);
      }
    });
  }

  load();
})();
