
(function(){
  const tabs = document.querySelectorAll('nav.tabs .tab');
  const panels = {
    home: document.getElementById('panel-home'),
    sales: document.getElementById('panel-sales'),
    faq: document.getElementById('panel-faq'),
    resources: document.getElementById('panel-resources')
  };

  const LAST_TAB_KEY='ywp:lastTab';
  function activate(name){
    // tabs
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // panels
    Object.entries(panels).forEach(([k, el])=>{
      el.classList.toggle('is-active', k === name);
    });
    // body flag for FAQ (prevents any future bleed)
    document.body.classList.toggle('faq-active', name === 'faq');
    try{ localStorage.setItem(LAST_TAB_KEY, name); }catch(e){}
  }

  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
  // default
  let start='home';
  try{ start = localStorage.getItem(LAST_TAB_KEY) || 'home'; }catch(e){}
  if (!panels[start]) start='home';
  activate(start);
})();
