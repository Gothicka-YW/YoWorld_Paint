
(function(){
  const tabs = document.querySelectorAll('nav.tabs .tab');
  const panels = {
    home: document.getElementById('panel-home'),
    'sales-boards': document.getElementById('panel-sales-boards'),
    transform: document.getElementById('panel-transform'),
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
  const DEFAULT_THEME = 'midnight';
  const KNOWN_THEMES = new Set(['aurora-rose','crimson','emerald','midnight','mint-frost','pastel-breeze','royal','slate','teal-contrast','violet-contrast']);
  const themeSel = document.getElementById('res-theme');
  function normalizeThemeName(name){
    const key = String(name || '').toLowerCase();
    return KNOWN_THEMES.has(key) ? key : DEFAULT_THEME;
  }
  function applyThemeName(name){
    const normalized = normalizeThemeName(name);
    const body = document.body;
    body.classList.remove('theme-crimson','theme-emerald','theme-midnight','theme-royal','theme-slate','theme-pastel-breeze','theme-mint-frost','theme-aurora-rose','theme-solar-gold','theme-teal-contrast','theme-violet-contrast');
    switch(normalized){
      case 'emerald': body.classList.add('theme-emerald'); break;
      case 'midnight': body.classList.add('theme-midnight'); break;
      case 'royal': body.classList.add('theme-royal'); break;
      case 'slate': body.classList.add('theme-slate'); break;
      case 'pastel-breeze': body.classList.add('theme-pastel-breeze'); break;
      case 'mint-frost': body.classList.add('theme-mint-frost'); break;
      case 'aurora-rose': body.classList.add('theme-aurora-rose'); break;
      case 'teal-contrast': body.classList.add('theme-teal-contrast'); break;
      case 'violet-contrast': body.classList.add('theme-violet-contrast'); break;
      case 'crimson': default: body.classList.add('theme-crimson'); break;
    }
    return normalized;
  }
  // load theme
  try {
    chrome.storage.sync.get(['theme'], st => {
      const raw = st && st.theme ? String(st.theme) : localStorage.getItem(THEME_KEY);
      const saved = applyThemeName(raw || DEFAULT_THEME);
      if (themeSel) themeSel.value = saved;
    });
  } catch(_) {
    const saved = applyThemeName(localStorage.getItem(THEME_KEY) || DEFAULT_THEME);
    if (themeSel) themeSel.value = saved;
  }
  if (themeSel){
    themeSel.addEventListener('change', () => {
      const val = applyThemeName(themeSel.value || DEFAULT_THEME);
      themeSel.value = val;
      try{ chrome.storage.sync.set({ theme: val }); }catch(_){ localStorage.setItem(THEME_KEY, val); }
    });
  }
})();
