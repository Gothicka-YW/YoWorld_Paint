
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
      const url = Array.isArray(o.img) ? (o.img[0] || "") : "";
      const enabled = Array.isArray(o.img) ? !!o.img[1] : false;
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
