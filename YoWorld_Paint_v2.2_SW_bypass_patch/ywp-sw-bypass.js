// ywp-sw-bypass.js
// Injected at document_start on yoworld.com to bypass service worker & CORS.
// Rewrites the game's paint_board image URL to the Imgur (or other) URL saved in chrome.storage.local.

(()=>{
  const PAINT_RE = /\/user\/images\/paint_board\/\d+\/\d+\/\d+\.(?:png|jpg|jpeg|webp)(?:\?.*)?$/i;

  function getReplacementUrl() {
    return new Promise((resolve) => {
      try {
        chrome.storage?.local.get(["enableRedirect","imgUrl"], (st) => {
          const enabled = !!st?.enableRedirect;
          const src = (st?.imgUrl || "").trim();
          if (!enabled || !src) return resolve(null);
          const bust = "cb=" + Date.now().toString(36);
          const sep = src.includes("?") ? "&" : "?";
          resolve(src + sep + bust);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Patch HTMLImageElement.src setter to catch early assignments.
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (desc && desc.set) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: function(v) {
        const val = String(v || "");
        if (PAINT_RE.test(val)) {
          getReplacementUrl().then((newUrl) => {
            try {
              if (newUrl) {
                this.crossOrigin = "anonymous";
                desc.set.call(this, newUrl);
              } else {
                desc.set.call(this, v);
              }
            } catch {
              desc.set.call(this, v);
            }
          });
        } else {
          desc.set.call(this, v);
        }
      }
    });
  }

  // Observe attribute changes so late swaps are also handled.
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "attributes" && m.attributeName === "src") {
        const el = m.target;
        if (el && el.tagName === "IMG") {
          const raw = el.getAttribute("src") || "";
          if (PAINT_RE.test(raw)) {
            getReplacementUrl().then((newUrl) => {
              if (newUrl && el.src !== newUrl) {
                el.crossOrigin = "anonymous";
                el.src = newUrl;
              }
            });
          }
        }
      }
    }
  });
  mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["src"] });

  // Prime any already-present nodes after DOM is ready.
  const runPrime = () => {
    document.querySelectorAll("img[src]").forEach((img) => {
      const s = img.getAttribute("src") || "";
      if (PAINT_RE.test(s)) {
        getReplacementUrl().then((newUrl) => {
          if (newUrl) {
            img.crossOrigin = "anonymous";
            img.src = newUrl;
          }
        });
      }
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPrime, { once: true });
  } else {
    runPrime();
  }
})();
