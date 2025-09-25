// yoworld direct uploader (smart fallback)
(function(){
  if (!location.hostname.includes('yoworld.com')) return;

  function getParams(){
    const u = new URL(location.href);
    const p = Object.fromEntries(u.searchParams.entries());
    try{
      document.querySelectorAll('input[name]').forEach(inp=>{
        const n=inp.name, v=inp.value;
        if(n && v && !p[n]) p[n]=v;
      });
    }catch(e){}
    return p;
  }

  async function postDirect(blob){
    const p = getParams();
    if (!p.snapi_auth || !p.yo_u){
      throw new Error('YoWorld auth parameters not detected on this page. Open the paintboard dialog first.');
    }
    const qs = new URLSearchParams({
      snapi_auth: p.snapi_auth || '',
      yo_u:       p.yo_u || '',
      yo_t:       p.yo_t || '',
      loc:        p.loc || '',
      piid:       p.piid || '',
      type: 'paintboard'
    });
    const fd = new FormData();
    fd.append('image', new File([blob], 'board.png', {type:'image/png'}));
    const res = await fetch('/gamecontrol/uc_uploads.php?'+qs.toString(), {
      method: 'POST', body: fd, credentials: 'include'
    });
    const text = await res.text();
    const m = text.match(/https?:\/\/\S+\.png/);
    return m ? m[0] : text;
  }

  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse)=>{
    if (msg && msg.type === 'YWP_DIRECT_UPLOAD'){
      try{
        let blob = msg.blob;
        if (!blob && msg.dataURL){
          const r = await fetch(msg.dataURL);
          blob = await r.blob();
        }
        const url = await postDirect(blob);
        sendResponse({ ok:true, url });
      }catch(e){
        sendResponse({ ok:false, error:String(e) });
      }
      return true;
    }
  });
})();