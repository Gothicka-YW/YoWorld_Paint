
(function(){
  const compat = globalThis.YWPCompat;

  // The published v3.4 markup contains a second, obsolete Tools panel with the
  // same id and no backing JavaScript. Remove it before wiring the live UI.
  document.querySelectorAll('#panel-tools').forEach((panel, index) => {
    if (index > 0) panel.remove();
  });

  const tabs = document.querySelectorAll('nav.tabs .tab');
  const panels = {
    home: document.getElementById('panel-home'),
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
      if (el) el.classList.toggle('is-active', k === name);
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
  // Load settings from sync storage when supported, otherwise local storage.
  (async () => {
    try {
      const st = await compat.settingsGet({ theme: DEFAULT_THEME });
      const raw = st && st.theme ? String(st.theme) : localStorage.getItem(THEME_KEY);
      const saved = applyThemeName(raw || DEFAULT_THEME);
      if (themeSel) themeSel.value = saved;
    } catch (_) {
      const saved = applyThemeName(localStorage.getItem(THEME_KEY) || DEFAULT_THEME);
      if (themeSel) themeSel.value = saved;
    }
  })();

  if (themeSel){
    themeSel.addEventListener('change', () => {
      const val = applyThemeName(themeSel.value || DEFAULT_THEME);
      themeSel.value = val;
      compat.settingsSet({ theme: val }).catch(() => localStorage.setItem(THEME_KEY, val));
    });
  }

  // Side Panel is the default for new users. The saved choice is applied by
  // the background worker with mutually exclusive toolbar behaviors.
  const viewModeSel = document.getElementById('res-view-mode');
  if (viewModeSel){
    const supportsSidePanel = compat.hasSidePanel();
    const sidePanelOption = viewModeSel.querySelector('option[value="sidepanel"]');
    if (!supportsSidePanel && sidePanelOption) {
      sidePanelOption.disabled = true;
      sidePanelOption.textContent = 'Side Panel (not supported in this browser)';
    }

    compat.settingsGet({ viewMode: 'sidepanel' })
      .then((settings) => {
        const savedMode = settings.viewMode === 'popup' ? 'popup' : 'sidepanel';
        viewModeSel.value = supportsSidePanel ? savedMode : 'popup';
        viewModeSel.dataset.savedMode = viewModeSel.value;
      })
      .catch((error) => {
        console.error('Unable to load default view:', error);
        viewModeSel.value = 'popup';
        viewModeSel.dataset.savedMode = 'popup';
      });

    viewModeSel.addEventListener('change', async () => {
      const mode = supportsSidePanel && viewModeSel.value === 'sidepanel' ? 'sidepanel' : 'popup';
      const previous = viewModeSel.dataset.savedMode || 'popup';
      const isSidePanelPage = document.body.classList.contains('sidepanel-ui');

      // Start opening immediately within the change gesture. Awaiting storage
      // first can cause Chrome to reject sidePanel.open as no longer user-driven.
      let openPanel = null;
      if (
        mode === 'sidepanel' &&
        !isSidePanelPage &&
        typeof chrome.sidePanel?.open === 'function' &&
        chrome.windows
      ) {
        openPanel = chrome.sidePanel
          .open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
          .then(() => true)
          .catch((error) => {
            console.error('Unable to open side panel:', error);
            return false;
          });
      }

      try {
        await compat.settingsSet({ viewMode: mode });
        viewModeSel.dataset.savedMode = mode;
        if (typeof showToast === 'function') {
          showToast(mode === 'popup' ? 'Popup is now the default' : 'Side Panel is now the default');
        }
        if (openPanel && await openPanel) window.close();
      } catch (error) {
        console.error('Unable to save default view:', error);
        viewModeSel.value = previous;
      }
    });
  }
})();
