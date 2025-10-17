// content/sb_capture.js — compute 3x2 union rect and support picking on yoworld.info
(function(){
  const KEY_SEL = 'ywp:sb:cardSel';
  const KEY_CONT = 'ywp:sb:containerSel';
  const KEY_IDX = 'ywp:sb:pickedIndex';
  const KEY_SCROLL = 'ywp:sb:origScrollY';

  function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
  function load(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(_){ return d; } }

  function cssPath(el){
    if (!el) return '';
    const parts=[];
    while (el && el.nodeType===1 && parts.length<5){
      let sel = el.tagName.toLowerCase();
      if (el.id){ sel += '#'+cssEscape(el.id); parts.unshift(sel); break; }
      if (el.classList.length){ sel += '.'+[...el.classList].slice(0,3).map(cssEscape).join('.'); }
      // position among siblings of same tag
      const parent = el.parentElement; if (parent){
        const same = [...parent.children].filter(n => n.tagName===el.tagName);
        if (same.length>1){ const idx = same.indexOf(el)+1; sel += `:nth-of-type(${idx})`; }
      }
      parts.unshift(sel); el = el.parentElement;
    }
    return parts.join('>');
  }
  function cssEscape(s){ return (s||'').replace(/[^a-zA-Z0-9_-]/g, m=>`\\${m}`); }

  function findCardsBySignature(container, cardEl){
    if (!container || !cardEl) return [];
    const tag = cardEl.tagName;
    const classes = Array.from(cardEl.classList);
    // Get reference image src and item name text from picked card
    const refImg = cardEl.querySelector('img');
    const refImgSrc = refImg ? refImg.src : null;
    const refNameEl = cardEl.querySelector('.item-name');
    const refName = refNameEl ? refNameEl.textContent.trim() : null;
    // Find candidate cards by tag and classes
    let nodes = Array.from(container.children).filter(ch => ch.tagName === tag && classes.every(c => ch.classList.contains(c)));
    // Fallback: any descendants that match tag + all classes
    if (nodes.length < 6 && classes.length){
      const sel = tag.toLowerCase() + (classes.length ? ('.' + classes.map(cssEscape).join('.')) : '');
      nodes = Array.from(container.querySelectorAll(sel));
    }
    // Last fallback: siblings with same tag and at least one shared class and having an <img> inside
    if (nodes.length < 6){
      const direct = Array.from(container.children).filter(ch => ch.tagName === tag);
      nodes = direct.filter(ch => (Array.from(ch.classList).some(c => classes.includes(c))) && ch.querySelector('img'));
    }
    // Final filter: match by image src and item name text
    if (refImgSrc || refName) {
      nodes = nodes.filter(ch => {
        const img = ch.querySelector('img');
        const nameEl = ch.querySelector('.item-name');
        const imgMatch = refImgSrc ? (img && img.src === refImgSrc) : true;
        const nameMatch = refName ? (nameEl && nameEl.textContent.trim() === refName) : true;
        return imgMatch && nameMatch;
      });
    }
    return nodes;
  }

  function findCardsFlexible(){
    const contSel = load(KEY_CONT, '');
    const cardSel = load(KEY_SEL, '');
    const cont = contSel ? document.querySelector(contSel) : null;
    const card = cardSel ? document.querySelector(cardSel) : null;
    if (cont && card) {
      let nodes = findCardsBySignature(cont, card);
      if (nodes.length >= 2) return nodes;
    }
    // Fallback: try global querySelectorAll of saved cardSel
    if (cardSel) {
      const list = Array.from(document.querySelectorAll(cardSel));
      if (list.length >= 2) return list;
    }
    return [];
  }

  function rectForTile(card){
    // Build a rect that tightly hugs the image on top but includes the caption at the bottom.
    const rc = card.getBoundingClientRect();
    let imgRect = null; let area = 0;
    card.querySelectorAll('img').forEach(img => {
      const b = img.getBoundingClientRect();
      const a = Math.max(0, b.width) * Math.max(0, b.height);
      if (a > area) { area = a; imgRect = b; }
    });
    const left = Math.max(0, (rc.left + 6));
    const right = Math.max(left + 1, rc.right - 6);
    const top = Math.max(0, (imgRect ? (imgRect.top - 4) : (rc.top + 6))); // tighter on top
    const bottom = Math.max(top + 1, rc.bottom - 4); // include caption area
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function unionRect(rects){
    const u = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    rects.forEach(r=>{ u.left=Math.min(u.left,r.left); u.top=Math.min(u.top,r.top); u.right=Math.max(u.right,r.right); u.bottom=Math.max(u.bottom,r.bottom); });
    u.width = Math.max(0, u.right - u.left); u.height = Math.max(0, u.bottom - u.top); return u;
  }

  function addPadding(r, pad){ return { left:r.left-pad.l, top:r.top-pad.t, width:r.width+pad.l+pad.r, height:r.height+pad.t+pad.b }; }

  let picking = false; let highlightEl = null; let prevScrollY = null;

  function startPicker(){
    if (picking) return;
    picking = true; prevScrollY = window.scrollY; save(KEY_SCROLL, prevScrollY);
  const overlay = document.createElement('div'); overlay.id='ywp-sb-pick'; Object.assign(overlay.style, { position:'fixed', inset:'0', zIndex:999999, cursor:'crosshair', pointerEvents:'none' }); document.documentElement.appendChild(overlay);
  const highlight = document.createElement('div'); Object.assign(highlight.style, { position:'fixed', border:'2px solid #e11d48', borderRadius:'6px', background:'rgba(225,29,72,.08)', pointerEvents:'none' }); overlay.appendChild(highlight);
    const move = (e)=>{
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return; highlightEl = el.closest('*'); const r = highlightEl?.getBoundingClientRect(); if (!r) return; Object.assign(highlight.style, { left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px' });
    };
    const click = (e)=>{
      // Prevent navigation so we stay on the template page while picking
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
      const target = highlightEl || document.elementFromPoint(e.clientX, e.clientY);
      if (target) {
        // Always climb to the nearest .ui.card ancestor
        let card = target.closest('.ui.card');
        if (!card) {
          // fallback: previous logic if .ui.card not found
          card = target;
          for (let up=0; up<5 && card && card.parentElement; up++){
            const parent = card.parentElement;
            const siblings = Array.from(parent.children).filter(ch => ch.tagName === card.tagName);
            if (siblings.length >= 3) {
              if (card.querySelector('img')) break;
            }
            card = parent;
          }
        }
        const container = card && card.parentElement ? card.parentElement : document.body;
        const csel = cssPath(container);
        // Always use a general card selector for all cards in the container
        let cardSel = null;
        if (card.classList.contains('ui') && card.classList.contains('card')) {
          cardSel = csel + ' > .ui.card';
        } else {
          // fallback: use tag and classes
          cardSel = csel + ' > ' + card.tagName.toLowerCase();
        }
        save(KEY_CONT, csel);
        save(KEY_SEL, cardSel);
        // determine picked index among all cards
        const nodes = Array.from(container.querySelectorAll(cardSel.replace(csel + ' > ', '')));
        const idx = Math.max(0, nodes.indexOf(card));
        save(KEY_IDX, idx);
        console.log('[YWP_SB_PICK] Saved selectors:', {containerSelector: csel, cardSelector: cardSel, pickedIndex: idx, nodesFound: nodes.length});
      }
      cleanup();
      chrome.runtime.sendMessage({ type:'YWP_SB_PICK_DONE', ok: !!target });
    };
    const key = (e)=>{ if (e.key==='Escape'){ cleanup(); chrome.runtime.sendMessage({ type:'YWP_SB_PICK_DONE', ok:false }); }};
    function cleanup(){ picking=false; overlay.remove(); document.removeEventListener('mousemove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true); }
  document.addEventListener('mousemove', move, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  }

  function prepareRect(){
    const cardsAll = findCardsFlexible();
    const contSel = load(KEY_CONT, '');
    const cardSel = load(KEY_SEL, '');
    const idx = load(KEY_IDX, 0);
    console.log('[YWP_SB_PREPARE_RECT] Loaded selectors:', {containerSelector: contSel, cardSelector: cardSel, pickedIndex: idx, cardsAllLength: cardsAll.length});
    if (!cardsAll.length) return { ok:false, error:'No selector. Use Pick.' };
    // choose start index based on picked index if available
    let start = idx;
    if (start < 0) start = 0;
    if (start + 6 > cardsAll.length){
      // fallback to last full window or start of list
      start = Math.max(0, Math.min(start, Math.max(0, cardsAll.length - 6)));
    }
    const cards = cardsAll.slice(start, start + 6);
    console.log('[YWP_SB_PREPARE_RECT] Cards selected for crop:', {start, cardsLength: cards.length, cards});
    if (cards.length < 6) return { ok:false, error:`Found ${cards.length} cards from start. Scroll to top or adjust selector.` };
    const rects = cards.map(rectForTile);
    const u = unionRect(rects);
    const padded = addPadding(u, { t:2, r:6, b:16, l:6 });
    // Ensure fully in view: scroll so the top row is visible
    window.scrollTo({ top: Math.max(0, window.scrollY + padded.top - 10), behavior:'instant' });
    const tooTall = padded.height > window.innerHeight - 8;
    // Recompute after scroll
    const rects2 = cards.map(rectForTile);
    const u2 = unionRect(rects2);
    const padded2 = addPadding(u2, { t:2, r:6, b:16, l:6 });
    return { ok:true, rect: { left: Math.max(0, padded2.left), top: Math.max(0, padded2.top), width: Math.max(1, padded2.width), height: Math.max(1, padded2.height) }, tooTall };
  }

  function restore(){
    const y = load(KEY_SCROLL, null);
    if (typeof y === 'number') window.scrollTo({ top: y, behavior:'smooth' });
    return { ok:true };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'YWP_SB_PICK'){ startPicker(); sendResponse({ ok:true }); return; }
    if (msg.type === 'YWP_SB_RESET'){ save(KEY_SEL, ''); save(KEY_CONT, ''); sendResponse({ ok:true }); return; }
    if (msg.type === 'YWP_SB_PREPARE_RECT'){ const r = prepareRect(); sendResponse(r); return; }
    if (msg.type === 'YWP_SB_RESTORE'){ const r = restore(); sendResponse(r); return; }
  });
})();