
// YWP FAQ Creating Sales Text (safe insert) + Headings + Footer + Rename v21
(function(){
  function renameTabToFAQ(){
    try{
      var nav = document.querySelector('nav[data-v-598e593b]') || document.querySelector('nav');
      if (!nav) return;
      var buttons = nav.querySelectorAll('button, [role="tab"], .link button');
      for (var i=0;i<buttons.length;i++){
        var b = buttons[i];
        var txt = (b.textContent || '').trim();
        if (/^how\s*to\s*use$/i.test(txt)){
          if (b.textContent !== 'FAQ') b.textContent = 'FAQ';
          if (!b.title || /how\s*to\s*use/i.test(b.title)) b.title = 'FAQ';
        }
      }
      var info = document.querySelector('#panel-info');
      if (info && /how\s*to\s*use/i.test(info.getAttribute('aria-label') || '')){
        info.setAttribute('aria-label', 'FAQ');
      }
    }catch(e){}
  }

  function visible(el){
    if (!el) return false;
    var st = window.getComputedStyle(el);
    return st && st.display !== 'none' && el.offsetParent !== null;
  }

  function findFAQPanel(){
    var candidates = [];
    var idCandidate = document.querySelector('#panel-info');
    if (idCandidate) candidates.push(idCandidate);
    candidates = candidates.concat(Array.from(document.querySelectorAll('.info')));
    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (!el) continue;
      // Prefer the visible one when FAQ tab is open
      if (visible(el)) return el;
    }
    // fallback to first .info
    return candidates[0] || null;
  }

  function ensureHeadStyle(){
    try{
      if (document.getElementById('ywp-faq-head-style')) return;
      var style = document.createElement('style');
      style.id = 'ywp-faq-head-style';
      style.textContent = '.ywp-faq-head{font-size:14px;font-weight:700;margin:10px 0 6px;}';
      document.head.appendChild(style);
    }catch(e){}
  }

  function ensureCreatingSales(panel){
    try{
      if (!panel) return;
      if (panel.querySelector('#ywp-creating-sales')) {
        // Already present: ensure heading class
        var h = panel.querySelector('#ywp-creating-sales h3');
        if (h) h.classList.add('ywp-faq-head');
        return;
      }
      var block = document.createElement('div');
      block.id = 'ywp-creating-sales';
      block.innerHTML = ''
        + '<h3 class="ywp-faq-head">Creating Sales Boards</h3>'
        + '<ol>'
        + '<li>Paste up to 6 image URLs into the image fields (direct links recommended).</li>'
        + '<li>Type a caption for each image — max 80 characters. (Optional)</li>'
        + '<li>Pick a Caption Font and Size from the dropdowns for consistent styling. (Optional)</li>'
        + '<li>Watch the live preview update as you paste/type.</li>'
        + '<li>Click Export PNG to save your completed board as an image.</li>'
        + '</ol>'
        + '<p>⭐ <strong>Tip:</strong> In a new window, go to yoworld.info’s template → click “preview template” → now you can drag the image to the URL box. You can also Copy+Paste the text if you like!</p>';

      // Find anchors
      var headings = panel.querySelectorAll('h1,h2,h3,h4');
      var artH=null, linksH=null;
      for (var i=0;i<headings.length;i++){
        var el = headings[i];
        var t = (el.textContent || '').toLowerCase();
        if (!artH && (/how\s*to\s*make\s*art\??/.test(t) || /making\s*art\s*in\s*yw/.test(t))) artH = el;
        if (!linksH && /useful\s*links/.test(t)) linksH = el;
      }
      if (linksH && linksH.parentNode){
        linksH.parentNode.insertBefore(block, linksH);
      } else if (artH && artH.parentNode){
        if (artH.nextSibling) artH.parentNode.insertBefore(block, artH.nextSibling);
        else artH.parentNode.appendChild(block);
      } else {
        (panel.querySelector(':scope > .content') || panel).appendChild(block);
      }
    }catch(e){}
  }

  function normalizeOtherHeadings(panel){
    try{
      if (!panel) return;
      var headings = panel.querySelectorAll('h1,h2,h3,h4');
      for (var i=0;i<headings.length;i++){
        var el = headings[i];
        var t = (el.textContent || '').toLowerCase();
        if (/making\s*art\s*in\s*yw/.test(t) || /using\s*sales\s*boards/.test(t) || /creating\s*sales\s*boards/.test(t) || /useful\s*links/.test(t)){
          el.classList.add('ywp-faq-head');
        }
        if (/how\s*to\s*make\s*art\??/.test(t)){
          el.textContent = 'Making Art in YW';
          el.classList.add('ywp-faq-head');
        }
      }
    }catch(e){}
  }

  function ensureFooter(panel){
    try{
      if(!panel) return;
      if (panel.querySelector('#howto-footer-disclaimer')) return;
      var footer = document.createElement('div');
      footer.id = 'howto-footer-disclaimer';
      footer.setAttribute('role','contentinfo');
      footer.setAttribute('aria-label','Disclaimer');
      footer.style.cssText = [
        'font-size:11px',
        'color:rgba(0,0,0,0.65)',
        'padding:8px 12px 10px',
        'line-height:1.3',
        'margin-top:12px'
      ].join(';');
      footer.innerHTML = '<div style="height:1px;background:rgba(0,0,0,0.12);margin:10px 0 8px;"></div>' +
        '<p><span style="font-style:normal;margin-right:4px;">ⓘ</span>Unofficial fan tool — not affiliated with YoWorld/BVG.<br>' +
        'No data is collected. &nbsp; • &nbsp; Report Bugs: <a href="mailto:ywa.paint@gmail.com">ywa.paint@gmail.com</a></p>';
      (panel.querySelector(':scope > .content') || panel).appendChild(footer);
    }catch(e){}
  }

  
  function ensureDonation(panel){
    try{
      if(!panel) return;
      if (panel.querySelector('#ywp-donate-wrap')) return;
      var wrap = document.createElement('div');
      wrap.id = 'ywp-donate-wrap';
      wrap.style.textAlign = 'center';
      wrap.style.margin = '12px 0 6px';
      var a = document.createElement('a');
      a.href = 'https://buymeacoffee.com/ywpaint';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Buy Me a Coffee';
      a.setAttribute('aria-label', 'Buy Me a Coffee');
      a.style.display = 'inline-block';
      a.style.padding = '10px 16px';
      a.style.backgroundColor = '#FFDD00';
      a.style.color = '#000';
      a.style.fontWeight = '700';
      a.style.borderRadius = '8px';
      a.style.textDecoration = 'none';
      a.style.boxShadow = '0 1px 0 rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.15)';
      a.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
      a.style.fontSize = '13px';
      a.style.lineHeight = '1.2';
      a.addEventListener('mouseenter', function(){ a.style.filter = 'brightness(0.95)'; });
      a.addEventListener('mouseleave', function(){ a.style.filter = 'none'; });
      wrap.appendChild(a);
      (panel.querySelector(':scope > .content') || panel).appendChild(wrap);
    }catch(e){}
  }

function apply(){
    renameTabToFAQ();
    var panel = findFAQPanel();
    if (panel){
      ensureHeadStyle();
      ensureCreatingSales(panel);
      normalizeOtherHeadings(panel);
      ensureFooter(panel);
      ensureDonation(panel);
    }
  }

  function init(){
    // run after a micro delay as well to ensure Vue has mounted
    apply();
    setTimeout(apply, 50);
    setTimeout(apply, 200);
    var mo = new MutationObserver(apply);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.__YWP_LINKS_OVERRIDE = 'v21';
})();
