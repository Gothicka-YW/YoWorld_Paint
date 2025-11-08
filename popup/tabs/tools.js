// tools.js — placeholder logic for forthcoming Tools tab features.
(function(){
  const panel = document.getElementById('panel-tools');
  if(!panel) return;
  // Future wiring: perspective fixer + image splitter.
  // For now we just provide a simple toast when tab is first opened.
  let announced=false;
  function maybeAnnounce(){
    if(announced) return; announced=true;
    try {
      const tc=document.getElementById('toast-container');
      if(!tc) return;
      const el=document.createElement('div');
      el.className='toast';
      el.textContent='Tools tab is in design phase — features coming soon.';
      tc.appendChild(el);
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 4000);
    } catch(_){ }
  }
  // Observe activation via class change
  const obs=new MutationObserver(muts=>{
    muts.forEach(m=>{
      if(m.attributeName==='class' && panel.classList.contains('is-active')){
        maybeAnnounce();
      }
    });
  });
  obs.observe(panel, { attributes:true });
})();
