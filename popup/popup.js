
(function(){
  const tabs = document.querySelectorAll('nav.tabs .tab');
  const panels = {
    home: document.getElementById('panel-home'),
    'sales-boards': document.getElementById('panel-sales-boards'),
    sales: document.getElementById('panel-sales'),
    tools: document.getElementById('panel-tools'),
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

  // Theme boot + wiring
  const THEME_KEY = 'ywp:theme';
  const themeSel = document.getElementById('res-theme');
  function applyThemeName(name){
    const body = document.body;
    body.classList.remove('theme-crimson','theme-emerald','theme-midnight','theme-royal','theme-slate');
    switch((name||'').toLowerCase()){
      case 'emerald': body.classList.add('theme-emerald'); break;
      case 'midnight': body.classList.add('theme-midnight'); break;
      case 'royal': body.classList.add('theme-royal'); break;
      case 'slate': body.classList.add('theme-slate'); break;
      case 'crimson': default: body.classList.add('theme-crimson'); break;
    }
  }
  // load theme
  try {
    chrome.storage.sync.get(['theme'], st => {
      const saved = st && st.theme ? String(st.theme) : (localStorage.getItem(THEME_KEY) || 'crimson');
      applyThemeName(saved);
      if (themeSel) themeSel.value = saved;
    });
  } catch(_) {
    const saved = localStorage.getItem(THEME_KEY) || 'crimson';
    applyThemeName(saved);
    if (themeSel) themeSel.value = saved;
  }
  if (themeSel){
    themeSel.addEventListener('change', () => {
      const val = themeSel.value || 'crimson';
      applyThemeName(val);
      try{ chrome.storage.sync.set({ theme: val }); }catch(_){ localStorage.setItem(THEME_KEY, val); }
    });
  }
})();
