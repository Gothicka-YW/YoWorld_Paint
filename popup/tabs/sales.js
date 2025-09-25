// popup/tabs/sales.js (clean v2.3 — preview + export only)
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
  const capInputs = qa('input[data-role="caption"]');

  const fontSel  = q('#sales-font');
  const sizeSel  = q('#sales-size');
  const btnExport = q('#btn-export');
  const btnClear  = q('#btn-clear');

  const STORE_KEY = 'salesBoard';
  const DEF = {
    slots: Array.from({ length: 6 }, () => ({ url: '', caption: '' })),
    font: 'Segoe UI (tight)',
    size: 12,
  };

  function getState(cb) {
    chrome.storage?.local?.get?.({ [STORE_KEY]: DEF }, (o) => {
      const st = o?.[STORE_KEY] || DEF;
      if (!st.slots || st.slots.length !== 6) st.slots = DEF.slots.slice();
      if (!st.font) st.font = DEF.font;
      if (!st.size) st.size = DEF.size;
      cb(st);
    });
  }

  function setState(update) {
    getState((st) => {
      const next = (typeof update === 'function') ? update(st) : Object.assign({}, st, update);
      chrome.storage?.local?.set?.({ [STORE_KEY]: next }, () => render(next));
    });
  }

  function loadUI() {
    getState((st) => {
      urlInputs.forEach((inp, i) => { if (inp) inp.value = st.slots[i]?.url || ''; });
      capInputs.forEach((inp, i) => { if (inp) inp.value = st.slots[i]?.caption || ''; });
      if (fontSel) fontSel.value = st.font;
      if (sizeSel) sizeSel.value = String(st.size);
      render(st);
    });
  }

  function attachHandlers() {
    urlInputs.forEach((inp, i) => {
      const save = () => setState((st) => {
        const copy = st.slots.slice();
        copy[i] = { url: inp.value.trim(), caption: copy[i]?.caption || '' };
        return { slots: copy };
      });
      inp.addEventListener('change', save);
      inp.addEventListener('paste', () => setTimeout(save, 0));
      inp.addEventListener('blur', save);
    });

    capInputs.forEach((inp, i) => {
      const save = () => setState((st) => {
        const copy = st.slots.slice();
        copy[i] = { url: copy[i]?.url || '', caption: inp.value.trim() };
        return { slots: copy };
      });
      inp.addEventListener('input', save);
      inp.addEventListener('blur', save);
    });

    if (fontSel) fontSel.addEventListener('change', () => setState({ font: fontSel.value }));
    if (sizeSel) sizeSel.addEventListener('change', () => setState({ size: Math.max(8, Math.min(16, parseInt(sizeSel.value,10) || 12)) }));

    if (btnClear) btnClear.addEventListener('click', () => {
      // reset storage/state
      setState({ slots: Array.from({ length: 6 }, () => ({ url: '', caption: '' })) });
      // immediately clear visible inputs and preview
      urlInputs.forEach(inp => inp && (inp.value = ''));
      capInputs.forEach(inp => inp && (inp.value = ''));
      const wrap = q('.sales-preview') || PANEL;
      if (wrap) wrap.innerHTML = '';
    });

    if (btnExport) btnExport.addEventListener('click', exportPNG);
  }

  function render(st) {
    const wrap = q('.sales-preview') || PANEL;
    if (!wrap) return;
    wrap.innerHTML = '';
    wrap.classList.add('sales-preview');
    for (let i = 0; i < 6; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      const imgWrap = document.createElement('div');
      imgWrap.className = 'img-wrap';
      const img = document.createElement('img');
      img.alt = '';
      if (st.slots[i].url) img.src = st.slots[i].url;
      imgWrap.appendChild(img);
      const capWrap = document.createElement('div');
      capWrap.className = 'cap-wrap';
      const cap = (st.slots[i].caption || '').trim();
      if (cap) {
        capWrap.style.fontFamily = `\"${st.font}\", Tahoma, Verdana, sans-serif`;
        capWrap.style.fontSize = (st.size || 12) + 'px';
        capWrap.textContent = cap;
      } else {
        capWrap.innerHTML = '&nbsp;';
      }
      tile.appendChild(imgWrap);
      tile.appendChild(capWrap);
      wrap.appendChild(tile);
    }
  }

  // -------- Export PNG --------
  const CANVAS_W = 390, CANVAS_H = 260, COLS = 3, ROWS = 2;
  const CAP_H = 26;
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
      const cv = document.createElement('canvas');
      cv.width = CANVAS_W; cv.height = CANVAS_H;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const GUTTER = 6, RADIUS = 8, INPAD = 6;
      const cellW = (CANVAS_W - GUTTER * (COLS + 1)) / COLS;
      const cellH = (CANVAS_H - GUTTER * (ROWS + 1)) / ROWS;
      const imgH  = cellH - CAP_H;

      await ensureFontLoaded(st.font, st.size || 12);
      const imgs = await Promise.all(st.slots.map(s => loadImageSafe(s.url)));
      imgs.forEach((img, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const x = GUTTER + col * (cellW + GUTTER);
        const y = GUTTER + row * (cellH + GUTTER);

        ctx.save();
        roundRect(ctx, x, y, cellW, cellH, RADIUS);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        ctx.save();
        roundRect(ctx, x, y, cellW, cellH, RADIUS);
        ctx.clip();

        if (img) {
          const availW = cellW - INPAD * 2;
          const availH = imgH  - INPAD * 2;
          const scale = Math.min(availW / img.width, availH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const dx = x + (cellW - w) / 2;
          const dy = y + (imgH - h) / 2;
          ctx.drawImage(img, dx, dy, w, h);
        }

        ctx.fillStyle = CAP_BG;
        ctx.fillRect(x, y + imgH, cellW, CAP_H);

        const cap = (st.slots[idx].caption || '').trim();
        if (cap) {
          let size = st.size || 12;
          size = Math.max(8, Math.min(16, size));
          ctx.font = `${size}px "${st.font}", Tahoma, Verdana, sans-serif`;
          const maxWidth = cellW - 10;
          let lines = wrapText(ctx, cap, maxWidth, 2);
          while (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth && size > 10) {
            size -= 1;
            ctx.font = `${size}px "${st.font}", Tahoma, Verdana, sans-serif`;
            lines = wrapText(ctx, cap, maxWidth, 2);
          }
          ctx.fillStyle = CAP_COLOR;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (lines.length === 1) {
            ctx.fillText(lines[0], x + cellW / 2, y + imgH + CAP_H / 2 + 0.5);
          } else {
            const mid = y + imgH + CAP_H / 2;
            ctx.fillText(lines[0], x + cellW / 2, mid - size * 0.6);
            ctx.fillText(lines[1], x + cellW / 2, mid + size * 0.6);
          }
        }

        ctx.restore();
        ctx.save();
        roundRect(ctx, x, y, cellW, cellH, RADIUS);
        ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });

      const a = document.createElement('a');
      a.download = 'ywp-sales-board.png';
      a.href = cv.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 0);
    });
  }

  // Init
  attachHandlers();
  loadUI();
})();
