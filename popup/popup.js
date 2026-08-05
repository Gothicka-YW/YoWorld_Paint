
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
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([k, el])=>{
      if (el) el.classList.toggle('is-active', k === name);
    });
    document.body.classList.toggle('faq-active', name === 'faq');
    try{ localStorage.setItem(LAST_TAB_KEY, name); }catch(e){}
  }

  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
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

  // View mode wiring. New and migrated installs default to Side Panel.
  const viewModeSel = document.getElementById('res-view-mode');
  if (viewModeSel){
    try {
      chrome.storage.sync.get(['viewMode'], st => {
        const saved = (st && (st.viewMode === 'popup' || st.viewMode === 'sidepanel')) ? st.viewMode : 'sidepanel';
        viewModeSel.value = saved;
      });
    } catch(_) {
      viewModeSel.value = 'sidepanel';
    }

    viewModeSel.addEventListener('change', async () => {
      const mode = (viewModeSel.value === 'popup') ? 'popup' : 'sidepanel';
      try { await chrome.storage.sync.set({ viewMode: mode }); } catch(_) {}

      if (mode === 'sidepanel' && chrome.sidePanel && chrome.windows){
        try {
          const win = await chrome.windows.getCurrent();
          if (win && typeof win.id === 'number') {
            await chrome.sidePanel.open({ windowId: win.id });
            if (window.innerWidth < 650) window.close();
          }
        } catch(err) {
          console.error('Unable to open side panel:', err);
        }
      }
    });
  }

  // Home transport selector. Added at runtime so popup and side-panel pages
  // share one implementation without duplicating large HTML documents.
  const redirectToggle = document.getElementById('enable-redirect');
  const redirectRow = redirectToggle && redirectToggle.closest('.row.switch');
  if (redirectRow && !document.getElementById('transport-mode')){
    const card = document.createElement('div');
    card.className = 'transport-mode-card';
    card.style.cssText = 'display:flex; flex-direction:column; gap:6px; margin:2px 0 10px; padding:8px 10px; border:1px solid var(--frame-border); border-radius:10px; background:var(--panel-bg);';

    const label = document.createElement('label');
    label.htmlFor = 'transport-mode';
    label.textContent = 'Board Image Route';
    label.style.cssText = 'font-size:12px; font-weight:700;';

    const select = document.createElement('select');
    select.id = 'transport-mode';
    select.className = 'input';
    select.setAttribute('aria-describedby', 'transport-mode-note');

    const proxy = document.createElement('option');
    proxy.value = 'proxy';
    proxy.textContent = 'Compatibility Proxy — v3.4 fallback';

    const direct = document.createElement('option');
    direct.value = 'direct';
    direct.textContent = 'Direct Image — use with compatible PNG-8';

    const directHeaders = document.createElement('option');
    directHeaders.value = 'direct-headers';
    directHeaders.textContent = 'Direct Image + compatibility headers — test 2';

    select.append(proxy, direct, directHeaders);

    const note = document.createElement('div');
    note.id = 'transport-mode-note';
    note.className = 'note';
    note.style.margin = '0';

    function normalizeMode(value){
      if (value === 'direct') return 'direct';
      if (value === 'direct-headers') return 'direct-headers';
      return 'proxy';
    }

    function updateNote(mode){
      if (mode === 'direct'){
        note.textContent = 'Direct Image persists when the uploaded file is a 390×260 indexed PNG-8 with multi-level alpha. Quick Upload can create that format automatically.';
        note.style.color = '';
      } else if (mode === 'direct-headers'){
        note.textContent = 'Test 2 did not improve persistence for ordinary RGBA PNGs. Retained only for comparison during development.';
        note.style.color = '#9a6700';
      } else {
        note.textContent = 'Compatibility Proxy keeps the known v3.4 save behavior but flattens partial transparency and depends on YoWorld.info.';
        note.style.color = '';
      }
    }

    chrome.storage.local.get({ transportMode: 'proxy' }, data => {
      const mode = normalizeMode(data.transportMode);
      select.value = mode;
      updateNote(mode);
    });

    select.addEventListener('change', () => {
      const mode = normalizeMode(select.value);
      updateNote(mode);
      chrome.storage.local.set({ transportMode: mode });
    });

    card.append(label, select, note);
    redirectRow.insertAdjacentElement('afterend', card);
  }
})();

// YoWorld-compatible Quick Upload mode.
// This capture-phase handler runs before the legacy uploader only when the
// explicit compatibility checkbox is enabled.
(function(){
  const quickUpload = document.getElementById('quick-upload');
  const uploadButton = document.getElementById('qu-upload');
  const fileInput = document.getElementById('qu-file');
  const dropZone = document.getElementById('qu-drop');
  const hostSelect = document.getElementById('qu-host');
  const resizeCheckbox = document.getElementById('qu-autoresize');
  const autoSetCheckbox = document.getElementById('qu-autoset');
  const status = document.getElementById('qu-status');
  const result = document.getElementById('qu-result');
  const copyButton = document.getElementById('qu-copy');
  const clearButton = document.getElementById('qu-clear');
  if (!quickUpload || !uploadButton || !fileInput || !hostSelect) return;

  const settingsRow = resizeCheckbox && resizeCheckbox.closest('div');
  const label = document.createElement('label');
  label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'qu-yoworld-compatible';
  checkbox.checked = true;
  checkbox.setAttribute('aria-describedby', 'qu-yoworld-note qu-status');

  const labelText = document.createElement('span');
  labelText.textContent = 'Convert to YoWorld-compatible PNG-8';
  label.append(checkbox, labelText);

  const note = document.createElement('div');
  note.id = 'qu-yoworld-note';
  note.className = 'note';
  note.style.cssText = 'margin:0; font-size:11px;';
  note.textContent = 'Recommended for paint boards: 256-color indexed PNG, multi-level transparency, no dithering. Auto-resize is used only when checked.';

  if (settingsRow) {
    settingsRow.appendChild(label);
    settingsRow.insertAdjacentElement('afterend', note);
  } else {
    quickUpload.append(label, note);
  }

  chrome.storage.sync.get({ quickUploadYoWorldCompatible: true }, data => {
    checkbox.checked = data.quickUploadYoWorldCompatible !== false;
  });
  checkbox.addEventListener('change', () => {
    chrome.storage.sync.set({ quickUploadYoWorldCompatible: checkbox.checked });
  });

  let selectedFile = null;
  let pastedFile = null;
  let lastCompatibleUrl = '';

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  }, true);

  if (dropZone) {
    dropZone.addEventListener('drop', event => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) selectedFile = file;
    }, true);
  }

  document.addEventListener('paste', event => {
    const items = Array.from((event.clipboardData && event.clipboardData.items) || []);
    const imageItem = items.find(item => item.type && item.type.startsWith('image/'));
    if (imageItem) pastedFile = imageItem.getAsFile();
  }, true);

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message || '';
    status.style.color = isError ? '#b00020' : '#6b7280';
  }

  function setResult(url) {
    if (!result) return;
    if (url) {
      result.style.display = 'block';
      result.textContent = url;
    } else {
      result.style.display = 'none';
      result.textContent = '';
    }
  }

  async function runCompatibleUpload(event) {
    if (!checkbox.checked) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const file = (fileInput.files && fileInput.files[0]) || selectedFile || pastedFile;
    if (!file) {
      setStatus('Select, drop, or paste an image.', true);
      return;
    }

    const host = hostSelect.value;
    if (host === 'imgbb') {
      const { imgbbKey } = await chrome.storage.sync.get(['imgbbKey']);
      if (!imgbbKey) {
        setStatus('ImgBB key missing. Set it in Resources.', true);
        return;
      }
    }

    uploadButton.disabled = true;
    if (copyButton) copyButton.disabled = true;
    setResult('');
    lastCompatibleUrl = '';

    try {
      setStatus('Creating YoWorld-compatible PNG-8…');
      const { prepareYoWorldIndexedPng } = await import('../src/lib/indexed-png.js');
      const prepared = await prepareYoWorldIndexedPng(file, {
        width: 390,
        height: 260,
        maxColors: 256,
        allowResize: !!(resizeCheckbox && resizeCheckbox.checked)
      });

      const originalName = file.name || 'image.png';
      const stem = originalName.replace(/\.[^.]+$/, '') || 'image';
      const compatibleFile = new File(
        [prepared.blob],
        `${stem}-yoworld.png`,
        { type: 'image/png' }
      );

      setStatus(`Uploading PNG-8 (${prepared.paletteSize} colors, ${prepared.alphaLevels} alpha levels)…`);
      const { uploadImage } = await import('../src/lib/uploader.js');
      const url = await uploadImage(compatibleFile, { host });
      lastCompatibleUrl = url;
      setResult(url);

      // Compatible files use the direct route; the YoWorld.info proxy would
      // destroy the preserved alpha levels a second time.
      await chrome.storage.local.set({ transportMode: 'direct' });
      const routeSelect = document.getElementById('transport-mode');
      if (routeSelect) {
        routeSelect.value = 'direct';
        routeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      try {
        await navigator.clipboard.writeText(url);
        setStatus(`Uploaded & copied. ${prepared.paletteSize} colors, ${prepared.alphaLevels} alpha levels, no dithering.`);
      } catch (_) {
        setStatus(`Uploaded. ${prepared.paletteSize} colors, ${prepared.alphaLevels} alpha levels, no dithering.`);
      }
      if (copyButton) copyButton.disabled = false;

      if (autoSetCheckbox && autoSetCheckbox.checked) {
        const imageInput = document.getElementById('img-url');
        if (imageInput) imageInput.value = url;
        const setButton = document.getElementById('btn-set');
        if (setButton) setButton.click();
      }

      selectedFile = null;
      pastedFile = null;
      fileInput.value = '';
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      setStatus(`Compatible upload failed: ${message}`, true);
    } finally {
      uploadButton.disabled = false;
    }
  }

  uploadButton.addEventListener('click', runCompatibleUpload, true);

  if (copyButton) {
    copyButton.addEventListener('click', async event => {
      if (!checkbox.checked || !lastCompatibleUrl) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await navigator.clipboard.writeText(lastCompatibleUrl);
        setStatus('Link copied.');
      } catch (_) {
        setStatus('Copy failed—select the link manually.', true);
      }
    }, true);
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      selectedFile = null;
      pastedFile = null;
      lastCompatibleUrl = '';
    }, true);
  }
})();
