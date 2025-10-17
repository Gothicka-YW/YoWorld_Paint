// popup/tabs/sales.js (enhanced with dynamic caption sizing)
(function () {
  async function ensureFontLoaded(name, px = 14) {
    try {
      if (document && document.fonts && document.fonts.load) {
        await document.fonts.load(`${px}px "${name}"`);
      }
    } catch (e) { /* ignore */ }
  }

  const PANEL = document.getElementById('panel-sales');
  if (!PANEL) return;

  const q  = (sel) => PANEL.querySelector(sel);
  const qa = (sel) => Array.from(PANEL.querySelectorAll(sel));

  // Inputs
  const urlInputs = qa('input[data-role="img-url"]').sort((a,b)=> (+(a.dataset.slot||0)) - (+(b.dataset.slot||0)));
  const priceInputs = qa('input[data-role="price"]');
  const fontSel  = q('#sales-font');
  const sizeSel  = q('#sales-size');
  const fitSel   = q('#sales-fit');
  // action buttons present in popup.html
  const btnExport = q('#btn-export');
  const btnClear  = q('#btn-clear');

  const STORE_KEY = 'salesBoard';
  // Layout registry (initial set)
  const CANVAS_W = 390, CANVAS_H = 260;
  const GUT = 6; // base gutter
  function gridRegions(cols, rows, startSlot=0){
    const regions = [];
    const cellW = (CANVAS_W - GUT * (cols + 1)) / cols;
    const cellH = (CANVAS_H - GUT * (rows + 1)) / rows;
    let slot = startSlot;
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        regions.push({ slot: slot++, x: GUT + c*(cellW+GUT), y: GUT + r*(cellH+GUT), w: cellW, h: cellH, captionMode:'below'});
      }
    }
    return regions;
  }
  const LAYOUTS = {
    classic_3x2_1: { id:'classic_3x2_1', name:'Classic 3×2 (1 Line)', slots:6, twoLine:false, regions: gridRegions(3,2) },
    classic_3x2_2: { id:'classic_3x2_2', name:'Classic 3×2 (2 Lines)', slots:6, twoLine:true, regions: gridRegions(3,2) },
    classic_overlay: { id:'classic_overlay', name:'Classic 3×2 Overlay', slots:6, twoLine:true, regions: gridRegions(3,2), overlay:true },
    quad_2x2: { id:'quad_2x2', name:'2×2 Large', slots:4, twoLine:true, regions: gridRegions(2,2) },
    banner_1_3: { id:'banner_1_3', name:'Banner + 3 (Balanced)', slots:4, twoLine:true, regions:(() => {
      // Increase banner prominence (approx 1/3 of total after gutters)
      const bannerH = 84; // was 70
      const cellW = (CANVAS_W - GUT * 4) / 3; // 3 columns below
      const rowsH = CANVAS_H - GUT*3 - bannerH;
      const r = [];
      r.push({ slot:0, x:GUT, y:GUT, w:CANVAS_W - GUT*2, h:bannerH, captionMode:'overlay' });
      for (let c=0;c<3;c++){
        r.push({ slot:1+c, x:GUT + c*(cellW+GUT), y:GUT*2 + bannerH, w:cellW, h:rowsH, captionMode:'below'});
      }
      return r;
    })() },
    banner_1_3_alt: { id:'banner_1_3_alt', name:'Banner + 3 (All Overlay)', slots:4, twoLine:true, regions:(() => {
      const bannerH = 84;
      const cellW = (CANVAS_W - GUT * 4) / 3;
      const rowsH = CANVAS_H - GUT*3 - bannerH;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:CANVAS_W - GUT*2, h:bannerH, captionMode:'overlay' });
      for (let c=0;c<3;c++) r.push({ slot:1+c, x:GUT + c*(cellW+GUT), y:GUT*2 + bannerH, w:cellW, h:rowsH, captionMode:'overlay'});
      return r; })() },
    banner_1_3_clean: { id:'banner_1_3_clean', name:'Banner + 3 (No Overlay)', slots:4, twoLine:true, regions:(() => {
      // Same geometry as banner_1_3 but all captions below (no overlays)
      const bannerH = 84;
      const cellW = (CANVAS_W - GUT * 4) / 3;
      const rowsH = CANVAS_H - GUT*3 - bannerH;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:CANVAS_W - GUT*2, h:bannerH, captionMode:'below' });
      for (let c=0;c<3;c++) r.push({ slot:1+c, x:GUT + c*(cellW+GUT), y:GUT*2 + bannerH, w:cellW, h:rowsH, captionMode:'below'});
      return r; })() },
    hero_1_4: { id:'hero_1_4', name:'Hero + 4 (Optimized)', slots:5, twoLine:true, regions:(() => {
      // Slightly narrower hero to widen side tiles
      const heroW = Math.round((CANVAS_W - GUT*3) * 0.60);
      const smallW = CANVAS_W - GUT*3 - heroW;
      const smallH = (CANVAS_H - GUT*5)/4; // unchanged vertical formula
      const heroH = CANVAS_H - GUT*2;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:heroW, h:heroH, captionMode:'below'});
      for (let i=0;i<4;i++) r.push({ slot:1+i, x:GUT*2 + heroW, y:GUT + i*(smallH+GUT), w:smallW, h:smallH, captionMode:'overlay'});
      return r; })() },
    hero_1_4_right: { id:'hero_1_4_right', name:'Hero + 4 (Right Side)', slots:5, twoLine:true, regions:(() => {
      // Mirror of hero_1_4: small stack on left, hero on right
      const heroW = Math.round((CANVAS_W - GUT*3) * 0.60);
      const smallW = CANVAS_W - GUT*3 - heroW;
      const smallH = (CANVAS_H - GUT*5)/4;
      const heroH = CANVAS_H - GUT*2;
      const r=[];
      // small tiles first (left column)
      for (let i=0;i<4;i++) r.push({ slot:1+i, x:GUT, y:GUT + i*(smallH+GUT), w:smallW, h:smallH, captionMode:'overlay'});
      // hero on right
      r.push({ slot:0, x:GUT*2 + smallW, y:GUT, w:heroW, h:heroH, captionMode:'below'});
      return r; })() },
    hero_1_3: { id:'hero_1_3', name:'Hero + 3 Tall', slots:4, twoLine:true, regions:(() => {
      const heroW = Math.round((CANVAS_W - GUT*3) * 0.58);
      const smallW = CANVAS_W - GUT*3 - heroW;
      const smallH = (CANVAS_H - GUT*4)/3; // three stacked
      const heroH = CANVAS_H - GUT*2;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:heroW, h:heroH, captionMode:'below'});
      for (let i=0;i<3;i++) r.push({ slot:1+i, x:GUT*2 + heroW, y:GUT + i*(smallH+GUT), w:smallW, h:smallH, captionMode:'overlay'});
      return r; })() },
    hero_1_3_right: { id:'hero_1_3_right', name:'Hero + 3 Tall (Right Side)', slots:4, twoLine:true, regions:(() => {
      // Mirror of hero_1_3
      const heroW = Math.round((CANVAS_W - GUT*3) * 0.58);
      const smallW = CANVAS_W - GUT*3 - heroW;
      const smallH = (CANVAS_H - GUT*4)/3;
      const heroH = CANVAS_H - GUT*2;
      const r=[];
      // three stacked small on left
      for (let i=0;i<3;i++) r.push({ slot:1+i, x:GUT, y:GUT + i*(smallH+GUT), w:smallW, h:smallH, captionMode:'overlay'});
      // hero on right
      r.push({ slot:0, x:GUT*2 + smallW, y:GUT, w:heroW, h:heroH, captionMode:'below'});
      return r; })() },
    strip_4_h: { id:'strip_4_h', name:'4 Horizontal Strips', slots:4, twoLine:true, regions:(() => {
      const stripH = (CANVAS_H - GUT*5)/4;
      const r=[]; for (let i=0;i<4;i++) r.push({ slot:i, x:GUT, y:GUT + i*(stripH+GUT), w:CANVAS_W - GUT*2, h:stripH, captionMode:'overlay'});
      return r;
    })() },
    strip_4_h_lr: { id:'strip_4_h_lr', name:'4 Strips (Img Left, Text Right)', slots:4, twoLine:true, regions:(() => {
      // Same vertical sizing as strip_4_h but allocate side-by-side image + text area
      const stripH = (CANVAS_H - GUT*5)/4;
      const r=[]; for (let i=0;i<4;i++) r.push({ slot:i, x:GUT, y:GUT + i*(stripH+GUT), w:CANVAS_W - GUT*2, h:stripH, captionMode:'sideRight', imgRatio:0.42 });
      return r;
    })() },
    list_6_v: { id:'list_6_v', name:'Vertical List (6 Slim)', slots:6, twoLine:false, regions:(() => {
      // Single line for readability in tight rows
      const rowH = (CANVAS_H - GUT*7)/6;
      const r=[]; for (let i=0;i<6;i++) r.push({ slot:i, x:GUT, y:GUT + i*(rowH+GUT), w:CANVAS_W - GUT*2, h:rowH, captionMode:'sideRight', imgRatio:0.22 });
      return r; })() },
    list_5_v: { id:'list_5_v', name:'Vertical List (5 Roomy)', slots:5, twoLine:true, regions:(() => {
      const rowH = (CANVAS_H - GUT*6)/5; // more height per row
      const r=[]; for (let i=0;i<5;i++) r.push({ slot:i, x:GUT, y:GUT + i*(rowH+GUT), w:CANVAS_W - GUT*2, h:rowH, captionMode:'sideRight', imgRatio:0.20 });
      return r; })() },
    split_1t3: { id:'split_1t3', name:'1 Tall + 3', slots:4, twoLine:true, regions:(() => {
      const leftW = Math.round((CANVAS_W - GUT*3)*0.45);
      const rightW = CANVAS_W - GUT*3 - leftW;
      const smallH = (CANVAS_H - GUT*4)/3;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:leftW, h:CANVAS_H - GUT*2, captionMode:'overlay'}); // left now overlay
      for (let i=0;i<3;i++) r.push({ slot:1+i, x:GUT*2 + leftW, y:GUT + i*(smallH+GUT), w:rightW, h:smallH, captionMode:'overlay'});
      return r; })() },
    split_1t3_alt: { id:'split_1t3_alt', name:'1 Tall + 3 (Wider Right)', slots:4, twoLine:true, regions:(() => {
      const leftW = Math.round((CANVAS_W - GUT*3)*0.43);
      const rightW = CANVAS_W - GUT*3 - leftW;
      const smallH = (CANVAS_H - GUT*4)/3;
      const r=[];
      r.push({ slot:0, x:GUT, y:GUT, w:leftW, h:CANVAS_H - GUT*2, captionMode:'overlay'});
      for (let i=0;i<3;i++) r.push({ slot:1+i, x:GUT*2 + leftW, y:GUT + i*(smallH+GUT), w:rightW, h:smallH, captionMode:'overlay'});
      return r; })() },
    compact_4x2: { id:'compact_4x2', name:'4×2 Compact (8)', slots:8, twoLine:false, regions: gridRegions(4,2) },
    mosaic_6: { id:'mosaic_6', name:'Mosaic 6 (All Overlay)', slots:6, twoLine:true, regions:(() => {
      // Original: all regions overlay captions
      const r=[];
      const halfW = (CANVAS_W - GUT*3)/2;
      const topH = 80;
      r.push({ slot:0, x:GUT, y:GUT, w:halfW, h:topH, captionMode:'overlay'});
      r.push({ slot:1, x:GUT*2 + halfW, y:GUT, w:halfW, h:topH, captionMode:'overlay'});
      const midH = 64;
      r.push({ slot:2, x:GUT, y:GUT*2 + topH, w:CANVAS_W - GUT*2, h:midH, captionMode:'overlay'});
      const bottomY = GUT*3 + topH + midH;
      const thirdW = (CANVAS_W - GUT*4)/3;
      const bottomH = CANVAS_H - bottomY - GUT;
      for (let i=0;i<3;i++) r.push({ slot:3+i, x:GUT + i*(thirdW+GUT), y:bottomY, w:thirdW, h:bottomH, captionMode:'overlay'});
      return r;
    })() },
    mosaic_6_midbelow: { id:'mosaic_6_midbelow', name:'Mosaic 6 (Mid Below)', slots:6, twoLine:true, regions:(() => {
      // Variant: middle full-width region uses below caption to act like a banner
      const r=[];
      const halfW = (CANVAS_W - GUT*3)/2;
      const topH = 80;
      r.push({ slot:0, x:GUT, y:GUT, w:halfW, h:topH, captionMode:'overlay'});
      r.push({ slot:1, x:GUT*2 + halfW, y:GUT, w:halfW, h:topH, captionMode:'overlay'});
      const midH = 64;
      r.push({ slot:2, x:GUT, y:GUT*2 + topH, w:CANVAS_W - GUT*2, h:midH, captionMode:'below'});
      const bottomY = GUT*3 + topH + midH;
      const thirdW = (CANVAS_W - GUT*4)/3;
      const bottomH = CANVAS_H - bottomY - GUT;
      for (let i=0;i<3;i++) r.push({ slot:3+i, x:GUT + i*(thirdW+GUT), y:bottomY, w:thirdW, h:bottomH, captionMode:'overlay'});
      return r;
    })() }
  };

  function getLayoutDef(id){ return LAYOUTS[id] || LAYOUTS.classic_3x2_2; }

  const DEF = {
    layout: 'classic_3x2_2',
    slots: Array.from({ length: 8 }, () => ({ url: '', raw: '', price: '', price2: '' })),
    font: 'Segoe UI (tight)',
    size: 15,
    fit: 'contain'
  };
  const LAST_LAYOUT_KEY = 'ywp_last_sales_layout';

  // ---- Wrapping & measurement helpers ----
  const measureCtx = document.createElement('canvas').getContext('2d');
  function measureSetFont(fontFamily, size){
    try { measureCtx.font = `${size}px "${fontFamily}", Tahoma, Verdana, sans-serif`; } catch(_) {}
  }
  function wrapTwoLines(text, fontFamily, size, maxWidth){
    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ['', ''];
    measureSetFont(fontFamily, size);
    let line1 = '', line2 = '', cur = '';
    for (let i=0;i<words.length;i++){
      const test = cur ? cur + ' ' + words[i] : words[i];
      if (measureCtx.measureText(test).width <= maxWidth){ cur = test; }
      else {
        line1 = cur || words[i];
        const rest = words.slice(i);
        let cur2 = '';
        for (let j=0;j<rest.length;j++){
          const t2 = cur2 ? cur2 + ' ' + rest[j] : rest[j];
          if (measureCtx.measureText(t2).width <= maxWidth){ cur2 = t2; }
          else {
            while (cur2.length && measureCtx.measureText(cur2 + '…').width > maxWidth){ cur2 = cur2.slice(0,-1); }
            cur2 = cur2 + '…';
            break;
          }
        }
        line2 = cur2;
        return [line1, line2];
      }
    }
    if (!line1) line1 = cur;
    if (!line2 && line1 && (measureCtx.measureText(line1).width > maxWidth * 1.05 || words.length >= 4)) {
      const mid = Math.floor(line1.length / 2);
      let splitPos = -1;
      for (let o=0;o<mid;o++){
        const L = mid - o, R = mid + o;
        if (L > 3 && line1[L] === ' ') { splitPos = L; break; }
        if (R < line1.length - 3 && line1[R] === ' ') { splitPos = R; break; }
      }
      if (splitPos !== -1){
        const a = line1.slice(0, splitPos).trim();
        let b = line1.slice(splitPos+1).trim();
        if (measureCtx.measureText(b).width > maxWidth){
          while (b.length && measureCtx.measureText(b + '…').width > maxWidth) b = b.slice(0,-1);
          b += '…';
        }
        line1 = a; line2 = b;
      }
    }
    return [line1, line2];
  }

  // Derive up to two display lines from a slot's raw text according to layout
  function deriveTwoLine(slot, layout, fontFamily, size, maxWidth){
    if (layout !== 'footer2') return [(slot.price||'').trim(), ''];
    const raw = (slot.raw || ((slot.price||'') + (slot.price2? ('\n'+slot.price2):''))).trim();
    if (!raw) return ['', ''];
    if (raw.includes('\n')){
      const parts = raw.split('\n');
      return [(parts[0]||'').trim(), (parts.slice(1).join(' ')||'').trim()];
    }
    if (raw.includes('|')){
      const parts = raw.split('|');
      return [(parts[0]||'').trim(), (parts.slice(1).join('|')||'').trim()];
    }
    // fall back to auto wrap
    const lines = wrapTwoLines(raw, fontFamily, size, maxWidth);
    return [lines[0].trim(), (lines[1]||'').trim()];
  }

  // ---- Shrink-to-fit helpers ----
  const MIN_FONT = 8;
  const TEXT_SIDE_PAD = 4; // reduced side padding to widen usable text area
  function fitSingleLine(text, fontFamily, desiredSize, maxWidth){
    let size = desiredSize;
    let line = (text || '').trim();
    if (!line) return { line: '', fontSize: desiredSize };
    while (size >= MIN_FONT){
      measureSetFont(fontFamily, size);
      if (measureCtx.measureText(line).width <= maxWidth) return { line, fontSize: size };
      size--;
    }
    measureSetFont(fontFamily, MIN_FONT);
    while (line.length && measureCtx.measureText(line + '…').width > maxWidth){ line = line.slice(0,-1); }
    return { line: line + (line ? '…' : ''), fontSize: MIN_FONT };
  }
  function fitTwoLines(baseText1, baseText2, fontFamily, desiredSize, maxWidth){
    let size = desiredSize;
    let l1 = (baseText1 || '').trim();
    let l2 = (baseText2 || '').trim();
    while (size >= MIN_FONT){
      measureSetFont(fontFamily, size);
      if (!l2){
        const pair = wrapTwoLines(l1, fontFamily, size, maxWidth);
        l1 = pair[0]; l2 = pair[1];
      }
      const w1 = measureCtx.measureText(l1).width;
      const w2 = l2 ? measureCtx.measureText(l2).width : 0;
      if (w1 <= maxWidth && w2 <= maxWidth){
        return { line1: l1, line2: l2, fontSize: size };
      }
      size--; if (!baseText2) l2='';
    }
    measureSetFont(fontFamily, MIN_FONT);
    if (l1 && measureCtx.measureText(l1).width > maxWidth){
      while (l1.length && measureCtx.measureText(l1 + '…').width > maxWidth) l1 = l1.slice(0,-1);
      l1 += '…'; l2='';
    }
    if (l2 && measureCtx.measureText(l2).width > maxWidth){
      while (l2.length && measureCtx.measureText(l2 + '…').width > maxWidth) l2 = l2.slice(0,-1);
      l2 += '…';
    }
    return { line1: l1, line2: l2, fontSize: MIN_FONT };
  }
  function getState(cb) {
    chrome.storage?.local?.get?.({ [STORE_KEY]: DEF }, (o) => {
      const st = o?.[STORE_KEY] || DEF;
  if (!st.slots) st.slots = DEF.slots.slice();
  else if (st.slots.length < 6) {
    while (st.slots.length < 6) st.slots.push({ url:'', raw:'', price:'', price2:'' });
  }
  if (!st.layout) st.layout = 'standard';
  // Normalize legacy layout ids immediately so downstream code always sees new IDs
  if (st.layout === 'standard') st.layout = 'classic_3x2_1';
  else if (st.layout === 'footer2') st.layout = 'classic_3x2_2';
  // migrate old footer & single price to two-line if needed
  st.slots.forEach(s => { if (typeof s.price2 === 'undefined') s.price2 = ''; });
      // migration: add raw if missing (reconstruct from price/price2)
      st.slots.forEach(s => {
        if (typeof s.raw === 'undefined') {
          if (s.price2) s.raw = (s.price + '\n' + s.price2).trim();
          else s.raw = (s.price || '').trim();
        }
      });
      // If layout missing or defaulted and we have a remembered last layout, apply it
      try {
        const remembered = localStorage.getItem(LAST_LAYOUT_KEY);
        if (remembered && (remembered === 'standard' || remembered === 'footer2')) {
          st.layout = st.layout || remembered;
        }
      } catch(_) {}
      // Patch in missing price fields for backward compatibility
      st.slots.forEach((slot, i) => {
        if (typeof slot.price === 'undefined') slot.price = '';
        // Remove caption if present
        if ('caption' in slot) delete slot.caption;
      });
      if (!st.font) st.font = DEF.font;
      if (!st.size) st.size = DEF.size;
      if (!st.fit) st.fit = DEF.fit;
      cb(st);
    });
  }

  function setState(update) {
    getState((st) => {
      let patch;
      if (typeof update === 'function') {
        try { patch = update(st) || {}; } catch(e){ patch = {}; }
      } else {
        patch = update || {};
      }
      const next = Object.assign({}, st, patch); // always merge to preserve layout/font/etc.
      chrome.storage?.local?.set?.({ [STORE_KEY]: next }, () => render(next));
    });
  }

  function populateLayoutSelect(current){
    const sel = document.getElementById('sales-layout');
    if (!sel) return;
    sel.innerHTML='';
    // Only expose layouts that fit existing 6 input rows (skip 8-slot for now)
    Object.values(LAYOUTS).filter(def => def.slots <= 6).forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.id; opt.textContent = def.name; if (def.id===current) opt.selected = true; sel.appendChild(opt);
    });
  }
  function loadUI() {
    getState((st) => {
      if (st.layout === 'standard') st.layout = 'classic_3x2_1';
      else if (st.layout === 'footer2') st.layout = 'classic_3x2_2';
      const def = getLayoutDef(st.layout);
      populateLayoutSelect(def.id);
      updateInputVisibility(def);
      urlInputs.forEach((inp, i) => { if (inp) inp.value = st.slots[i]?.url || ''; });
      priceInputs.forEach((inp, i) => { if (inp) {
        const slot = st.slots[i]; if (!slot) return;
        if (slot.raw) inp.value = slot.raw; else inp.value = (slot.price || '') + (def.twoLine && slot.price2 ? ('\n'+slot.price2):'');
      }});
      if (fontSel) fontSel.value = st.font;
      if (sizeSel) sizeSel.value = String(st.size);
      if (fitSel) fitSel.value = st.fit || 'contain';
      render(st);
    });
  }

  function updateInputVisibility(def){
    const needed = def.slots;
    urlInputs.forEach((inp,i) => { if (!inp) return; inp.closest('.cell').style.display = (i < needed ? '' : 'none'); });
    priceInputs.forEach((inp,i) => { if (!inp) return; inp.closest('.cell').style.display = (i < needed ? '' : 'none'); });
  }

  function attachHandlers() {
    urlInputs.forEach((inp, i) => {
      const save = () => setState((st) => {
        const copy = st.slots.slice();
        copy[i] = { ...copy[i], url: inp.value.trim() };
        return { slots: copy };
      });
      inp.addEventListener('change', save);
      inp.addEventListener('blur', save);

      // Paste image from clipboard support
      inp.addEventListener('paste', async (e) => {
        if (e.clipboardData && e.clipboardData.items) {
          const item = Array.from(e.clipboardData.items).find(it => it.type.startsWith('image/'));
          if (item) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = function(ev) {
                inp.value = ev.target.result;
                save();
              };
              reader.readAsDataURL(file);
              e.preventDefault();
              return;
            }
          }
        }
        // fallback: paste as text
        setTimeout(save, 0);
      });
    });



    const priceCounters = qa('div.char-count[data-role="price-count"]');
    priceInputs.forEach((inp, i) => {
      const save = () => setState(st => {
        const copy = st.slots.slice();
        let raw = inp.value.replace(/\r/g,'');
        raw = raw.replace(/\n+/g,'\n'); // normalize
        let line1 = raw.trim();
        let line2 = '';
        if (st.layout === 'footer2') {
          if (raw.includes('\n')) {
            const parts = raw.split('\n');
            line1 = (parts[0] || '').trim();
            line2 = (parts.slice(1).join(' ') || '').trim();
          } else if (raw.includes('|')) {
            const parts = raw.split('|');
            line1 = (parts[0] || '').trim();
            line2 = (parts.slice(1).join('|') || '').trim();
          } else {
            const MAX_W = 114; // widened due to reduced side padding
            const lines = wrapTwoLines(raw, st.font, st.size || 15, MAX_W);
            line1 = lines[0];
            line2 = lines[1];
          }
        } else {
          // collapse multi-line/raw separators for single-line layout display
            if (raw.includes('\n') || raw.includes('|')) {
              line1 = raw.replace(/[|\n]+/g,' ').replace(/\s+/g,' ').trim();
              line2 = '';
            }
        }
        copy[i] = { ...copy[i], raw, price: line1.trim(), price2: line2.trim() };
        return { slots: copy };
      });
      const updateCounter = () => {
        const counter = priceCounters[i];
        if (!counter) return;
        const len = inp.value.length;
        counter.textContent = len + '/160';
        counter.classList.toggle('warn', len > 140);
      };
      inp.addEventListener('input', () => { updateCounter(); save(); });
      inp.addEventListener('blur', save);
      updateCounter();
    });

  if (fontSel) fontSel.addEventListener('change', () => setState({ font: fontSel.value }));
  if (sizeSel) sizeSel.addEventListener('change', () => setState({ size: Math.max(8, Math.min(16, parseInt(sizeSel.value,10) || 15)) }));
  if (fitSel) fitSel.addEventListener('change', () => setState({ fit: (fitSel.value === 'cover' ? 'cover' : 'contain') }));

    if (btnClear) btnClear.addEventListener('click', () => {
      // Reset slot content but preserve layout/font settings
      setState(st => ({
        slots: Array.from({ length: 6 }, () => ({ url: '', raw: '', price: '', price2: '' })),
        layout: st.layout
      }));
      urlInputs.forEach(inp => inp && (inp.value = ''));
      priceInputs.forEach(inp => inp && (inp.value = ''));
      const wrap = q('.sales-preview') || PANEL;
      if (wrap) wrap.innerHTML = '';
    });

    if (btnExport) btnExport.addEventListener('click', exportPNG);

    // Layout + footer handlers
    const layoutSel = document.getElementById('sales-layout');
    if (layoutSel) layoutSel.addEventListener('change', () => {
      const newId = layoutSel.value;
      // Optimistic update without immediate re-fetch to avoid race with chrome.storage
      getState(current => {
        if (current.layout === newId) return; // nothing to do
        const defNew = getLayoutDef(newId);
        const copy = current.slots.slice();
        while (copy.length < defNew.slots) copy.push({ url:'', raw:'', price:'', price2:'' });
        const next = { ...current, layout: newId, slots: copy };
        try { localStorage.setItem(LAST_LAYOUT_KEY, newId); } catch(_) {}
        // Update visibility & inputs (raw stays the same)
        updateInputVisibility(defNew);
        // No need to rewrite text inputs; raw content is layout-agnostic
        render(next);
        // Persist
        chrome.storage?.local?.set?.({ [STORE_KEY]: next });
      });
    });

    // ---- Tile direct image interactions (click/drag/paste) ----
    const hiddenFile = document.getElementById('sales-file-input');
    function handleFilesForSlot(files, slotIdx){
      if (!files || !files.length) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        setState(st => {
          const copy = st.slots.slice();
          copy[slotIdx] = { ...copy[slotIdx], url: dataUrl };
          return { slots: copy };
        });
        // update matching input field
        const matchInput = urlInputs[slotIdx];
        if (matchInput) matchInput.value = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    function wireTileEvents(){
      const tiles = q('.sales-preview')?.querySelectorAll('.tile');
      if (!tiles) return;
      tiles.forEach((tile, idx) => {
        const imgWrap = tile.querySelector('.img-wrap');
        if (!imgWrap) return;
        imgWrap.addEventListener('click', () => {
          if (!hiddenFile) return;
          hiddenFile.onchange = (e) => {
            handleFilesForSlot(e.target.files, idx);
            hiddenFile.value='';
          };
          hiddenFile.click();
        });
        ['dragenter','dragover'].forEach(ev => imgWrap.addEventListener(ev, e => { e.preventDefault(); tile.classList.add('drag-over'); }));
        ['dragleave','drop'].forEach(ev => imgWrap.addEventListener(ev, e => { if(ev==='drop') return; tile.classList.remove('drag-over'); }));
        imgWrap.addEventListener('drop', e => {
          e.preventDefault(); tile.classList.remove('drag-over');
          if (e.dataTransfer?.files?.length) handleFilesForSlot(e.dataTransfer.files, idx);
        });
        // Paste support when focused by click
        imgWrap.addEventListener('paste', e => {
          if (e.clipboardData?.items){
            const item = Array.from(e.clipboardData.items).find(it => it.type.startsWith('image/'));
            if (item){
              const file = item.getAsFile();
              handleFilesForSlot([file], idx);
              e.preventDefault();
            }
          }
        });
      });
    }
    // initial wiring after first render (slight delay to ensure tiles exist)
    setTimeout(wireTileEvents, 50);
    // patch render to rewire after each render
    const _origRender = render;
    render = function(st){
      _origRender(st);
      wireTileEvents();
    };
  }

  function render(st) {
    const wrap = q('.sales-preview') || PANEL;
    if (!wrap) return;
  wrap.innerHTML='';
  // mark as dynamic so CSS can size it precisely (fixed 390x260)
  wrap.className = 'sales-preview dynamic';
    let layoutId = st.layout;
    if (layoutId === 'standard') layoutId = 'classic_3x2_1'; else if (layoutId === 'footer2') layoutId = 'classic_3x2_2';
    const def = getLayoutDef(layoutId);
    const regions = def.regions;
    wrap.style.position='relative';
    wrap.style.minHeight = CANVAS_H + 'px';
    regions.forEach(region => {
      const i = region.slot;
      const slot = st.slots[i] || { url:'', raw:'', price:'', price2:'' };
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.style.position='absolute';
      tile.style.left = region.x + 'px';
      tile.style.top = region.y + 'px';
      tile.style.width = region.w + 'px';
      tile.style.height = region.h + 'px';
      const imgWrap = document.createElement('div');
      imgWrap.className = 'img-wrap';
  const img = document.createElement('img'); img.alt=''; if (slot.url) img.src = slot.url; img.style.objectFit = (st.fit === 'cover') ? 'cover' : 'contain'; img.style.width='100%'; img.style.height='100%';
      imgWrap.appendChild(img);
      let isOverlay = region.captionMode === 'overlay';
      if (region.captionMode === 'sideRight'){
        // side-by-side: allocate left image box and right text box
        const imgW = Math.round(region.w * (region.imgRatio || 0.4));
        imgWrap.style.position='absolute';
        imgWrap.style.left='0'; imgWrap.style.top='0';
        imgWrap.style.width = imgW + 'px'; imgWrap.style.height='100%';
        imgWrap.style.display='flex'; imgWrap.style.alignItems='center'; imgWrap.style.justifyContent='center';
        tile.appendChild(imgWrap);
      } else {
        tile.appendChild(imgWrap);
      }
      const maxW = (region.captionMode === 'sideRight')
        ? Math.max(20, region.w - Math.round(region.w * (region.imgRatio || 0.4)) - (TEXT_SIDE_PAD*2 + 6))
        : region.w - (TEXT_SIDE_PAD*2 + 2);
      const priceWrap = document.createElement('div');
      if (def.twoLine){
        const derived = deriveTwoLine(slot, 'footer2', st.font, st.size || 15, maxW);
        const fit = fitTwoLines(derived[0], derived[1], st.font, st.size || 15, maxW);
        priceWrap.className='price-wrap dual';
        priceWrap.style.fontFamily = `"${st.font}", Tahoma, Verdana, sans-serif`;
        priceWrap.style.fontSize = fit.fontSize + 'px';
        priceWrap.style.color = '#7e1212';
        priceWrap.style.fontWeight='normal';
        priceWrap.style.marginTop='2px';
        priceWrap.style.padding = `0 ${TEXT_SIDE_PAD}px`;
        if (region.captionMode === 'sideRight'){
          priceWrap.style.position='absolute';
          const imgW = Math.round(region.w * (region.imgRatio || 0.4));
          priceWrap.style.left = (imgW + TEXT_SIDE_PAD) + 'px';
          priceWrap.style.top = '0';
          priceWrap.style.bottom = '0';
          priceWrap.style.right = TEXT_SIDE_PAD + 'px';
          priceWrap.style.display='flex';
          priceWrap.style.flexDirection='column';
          priceWrap.style.justifyContent='center';
          priceWrap.style.alignItems='flex-start';
          priceWrap.style.textAlign='left';
        } else if (isOverlay){
          priceWrap.style.position='absolute'; priceWrap.style.left='0'; priceWrap.style.right='0'; priceWrap.style.bottom='0';
          priceWrap.style.background='linear-gradient(to top, rgba(255,255,255,.92), rgba(255,255,255,.55))';
        }
        const span1=document.createElement('span'); span1.textContent = fit.line1 || '\u00A0';
        const span2=document.createElement('span'); span2.textContent = fit.line2 || '\u00A0';
        priceWrap.appendChild(span1); priceWrap.appendChild(span2);
      } else {
        const fit = fitSingleLine((slot.price||''), st.font, st.size || 15, maxW);
        priceWrap.className='price-wrap';
        priceWrap.style.fontFamily = `"${st.font}", Tahoma, Verdana, sans-serif`;
        priceWrap.style.fontSize = fit.fontSize + 'px';
        priceWrap.style.color='#7e1212';
        priceWrap.style.fontWeight='normal';
        priceWrap.style.marginTop='2px';
        priceWrap.style.padding = `0 ${TEXT_SIDE_PAD}px`;
        if (region.captionMode === 'sideRight'){
          priceWrap.style.position='absolute';
          const imgW = Math.round(region.w * (region.imgRatio || 0.4));
          priceWrap.style.left = (imgW + TEXT_SIDE_PAD) + 'px';
          priceWrap.style.top = '0';
          priceWrap.style.bottom = '0';
          priceWrap.style.right = TEXT_SIDE_PAD + 'px';
          priceWrap.style.display='flex';
          priceWrap.style.alignItems='flex-start';
          priceWrap.style.justifyContent='center';
          priceWrap.style.whiteSpace='normal';
          priceWrap.style.textAlign='left';
        } else if (isOverlay){
          priceWrap.style.position='absolute'; priceWrap.style.left='0'; priceWrap.style.right='0'; priceWrap.style.bottom='0';
          priceWrap.style.background='linear-gradient(to top, rgba(255,255,255,.92), rgba(255,255,255,.55))';
        }
        priceWrap.textContent = fit.line || '\u00A0';
      }
      tile.appendChild(priceWrap);
      wrap.appendChild(tile);
    });

    // --- Responsive scaling so preview never gets cut off ---
    try {
      const container = wrap.parentElement || PANEL;
      const available = container.clientWidth - 8; // allow small padding
      const targetW = CANVAS_W;
      const scale = Math.min(1, available / targetW);
      wrap.style.transformOrigin = 'top left';
      if (scale < 1) {
        wrap.style.transform = `scale(${scale})`;
        // Reserve layout space equal to scaled height by setting a min-height on a sibling spacer
        let spacer = container.querySelector('.sales-preview-spacer');
        if (!spacer){
          spacer = document.createElement('div');
          spacer.className = 'sales-preview-spacer';
          container.insertBefore(spacer, wrap.nextSibling);
        }
        spacer.style.height = (CANVAS_H * scale) + 'px';
        spacer.style.width = '100%';
      } else {
        wrap.style.transform = 'none';
        const spacer = container.querySelector('.sales-preview-spacer');
        if (spacer) spacer.remove();
      }
    } catch(_) {}
  }

  // -------- Export PNG --------
  // CANVAS_W / CANVAS_H already defined above for layout registry
  const COLS = 3, ROWS = 2; // retained for any legacy logic (classic fallback)
  const CAP_H_SINGLE = 26; // baseline default (may be overridden dynamically per layout)
  const CAP_H_DUAL = 38;   // baseline dual-line default
  const CAP_BG = 'rgba(255,255,255,0.85)';
  const CAP_COLOR = '#111';

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const words = (text || '').split(/\s+/).filter(Boolean);
    const lines = []; let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width <= maxWidth) { line = test; }
      else {
        if (line) lines.push(line); else lines.push(words[i]);
        line = '';
        if (lines.length === maxLines) break;
        line = words[i];
        if (ctx.measureText(line).width > maxWidth) {
          while (ctx.measureText(line).width > maxWidth && line.length > 0) {
            line = line.slice(0, -1);
          }
        }
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  function loadImageSafe(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      try { img.crossOrigin = 'anonymous'; } catch(_) {}
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function exportPNG() {
    getState(async (st) => {
      // Normalize to new layout ids
      let layoutId = st.layout;
      if (layoutId === 'standard') layoutId = 'classic_3x2_1'; else if (layoutId === 'footer2') layoutId = 'classic_3x2_2';
      const def = getLayoutDef(layoutId);
      const regions = def.regions;

      const cv = document.createElement('canvas');
      cv.width = CANVAS_W; cv.height = CANVAS_H;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

      await ensureFontLoaded(st.font, st.size || 15);
      // Preload only needed slot images
      const neededSlots = Math.max(...regions.map(r => r.slot))+1;
      const imgs = await Promise.all(Array.from({length:neededSlots}, (_,i)=> loadImageSafe(st.slots[i]?.url)));

      const INPAD = 6; const RADIUS = 8;
      regions.forEach(region => {
        const slot = st.slots[region.slot] || { url:'', raw:'', price:'', price2:'' };
        const img = imgs[region.slot];
        const isTwo = def.twoLine;
        const captionMode = region.captionMode || 'below';

        // Prepare text lines
        let line1='', line2='', fontSize = st.size || 15;
        const maxTextWidth = (captionMode === 'sideRight') ? Math.max(20, region.w - Math.round(region.w*(region.imgRatio||0.4)) - (TEXT_SIDE_PAD*2 + 6)) : region.w - (TEXT_SIDE_PAD*2 + 2);
        if (isTwo){
          const derived = deriveTwoLine(slot, 'footer2', st.font, st.size || 15, maxTextWidth);
            const fit = fitTwoLines(derived[0], derived[1], st.font, st.size || 15, maxTextWidth);
            line1 = fit.line1; line2 = fit.line2; fontSize = fit.fontSize;
        } else {
          const fit = fitSingleLine((slot.price||''), st.font, st.size || 15, maxTextWidth);
          line1 = fit.line; fontSize = fit.fontSize;
        }

        // Compute per-region caption metrics
        let captionHeight = 0; let lineGap = Math.max(2, Math.round(fontSize * 0.25));
        if (captionMode === 'below'){
          if (line1 || line2){
            if (line2) captionHeight = (fontSize*2) + lineGap + 8; else captionHeight = fontSize + 8;
          }
        }

        // Draw tile background & clipping
        ctx.save();
        roundRect(ctx, region.x, region.y, region.w, region.h, RADIUS);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.clip();

        if (img){
          const fitMode = st.fit || 'contain';
          if (captionMode === 'sideRight'){
            const imgW = Math.round(region.w * (region.imgRatio || 0.4));
            const availW = imgW; const availH = region.h;
            const scale = (fitMode === 'cover') ? Math.max(availW / img.width, availH / img.height)
                                               : Math.min(availW / img.width, availH / img.height);
            const w = img.width * scale; const h = img.height * scale;
            const dx = region.x + (imgW - w)/2; const dy = region.y + (region.h - h)/2;
            ctx.drawImage(img, dx, dy, w, h);
          } else {
            let imgAreaH = region.h;
            if (captionMode === 'below') imgAreaH = region.h - captionHeight;
            const availW = region.w; const availH = imgAreaH;
            const scale = (fitMode === 'cover') ? Math.max(availW / img.width, availH / img.height)
                                               : Math.min(availW / img.width, availH / img.height);
            const w = img.width * scale; const h = img.height * scale;
            const dx = region.x + (region.w - w)/2; const dy = region.y + (imgAreaH - h)/2;
            ctx.save();
            ctx.beginPath(); ctx.rect(region.x, region.y, region.w, imgAreaH); ctx.clip();
            ctx.drawImage(img, dx, dy, w, h);
            ctx.restore();
          }
        }

        // Overlay gradient if overlay
        if (captionMode === 'overlay' && (line1 || line2)){
          const gradH = line2 ? (fontSize*2 + lineGap + 10) : (fontSize + 10);
          const gy = region.y + region.h - gradH;
          const g = ctx.createLinearGradient(0, gy, 0, region.y + region.h);
          g.addColorStop(0, 'rgba(255,255,255,0.05)');
          g.addColorStop(0.55, 'rgba(255,255,255,0.65)');
          g.addColorStop(1, 'rgba(255,255,255,0.92)');
          ctx.fillStyle = g;
          ctx.fillRect(region.x, gy, region.w, gradH);
        }

        ctx.restore(); // remove clip for text drawing outside (but we want inside region) -> re-clip for text
        ctx.save();
        roundRect(ctx, region.x, region.y, region.w, region.h, RADIUS); ctx.clip();
        ctx.font = `${fontSize}px "${st.font}", Tahoma, Verdana, sans-serif`;
    ctx.fillStyle = '#000';
        ctx.textBaseline = 'middle';

        if (captionMode === 'below' && (line1 || line2)){
          ctx.textAlign = 'center';
          const imgAreaH = region.h - captionHeight;
          if (line2){
            const topY = region.y + imgAreaH + 4 + fontSize/2;
            if (line1) ctx.fillText(line1, region.x + region.w/2, topY);
            if (line2) ctx.fillText(line2, region.x + region.w/2, topY + fontSize + lineGap);
          } else {
            ctx.fillText(line1, region.x + region.w/2, region.y + imgAreaH + captionHeight/2);
          }
        } else if (captionMode === 'overlay' && (line1 || line2)){
          ctx.textAlign = 'center';
          if (line2){
            const totalH = fontSize*2 + lineGap;
            const baseY = region.y + region.h - (totalH/2) - 4;
            ctx.fillText(line1, region.x + region.w/2, baseY - (fontSize/2 + lineGap/2));
            ctx.fillText(line2, region.x + region.w/2, baseY + (fontSize/2 + lineGap/2));
          } else {
            ctx.fillText(line1, region.x + region.w/2, region.y + region.h - fontSize/2 - 4);
          }
        } else if (captionMode === 'sideRight' && (line1 || line2)){
          ctx.textAlign = 'left';
          const imgW = Math.round(region.w * (region.imgRatio || 0.4));
          const textX = region.x + imgW + TEXT_SIDE_PAD + 2;
          const textW = region.w - (imgW + TEXT_SIDE_PAD*2 + 4);
          // For multi-line, vertically center block
          if (line2){
            const blockH = fontSize*2 + lineGap;
            const centerY = region.y + region.h/2;
            ctx.fillText(line1, textX, centerY - (blockH/2) + fontSize/2);
            ctx.fillText(line2, textX, centerY + (blockH/2) - fontSize/2);
          } else {
            ctx.fillText(line1, textX, region.y + region.h/2);
          }
        }
        ctx.restore();

        // Stroke border again for crisp edge after gradients
        ctx.save();
        roundRect(ctx, region.x, region.y, region.w, region.h, RADIUS);
        ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });

      const dataUrl = cv.toDataURL('image/png');
      // Expose last export in local storage for Home tab bridge
      try { localStorage.setItem('ywp:lastExportPng', dataUrl); } catch(_) {}
      // Enable bridge button if present
      try {
        const bridgeBtn = document.getElementById('btn-upload-last');
        if (bridgeBtn) bridgeBtn.disabled = false;
      } catch(_) {}

      const a = document.createElement('a');
      a.download = 'ywp-sales-board.png';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 0);
    });
  }

  // Init
  attachHandlers();
  loadUI();
})();
