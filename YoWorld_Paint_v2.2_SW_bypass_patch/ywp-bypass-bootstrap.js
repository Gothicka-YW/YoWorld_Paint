// ywp-bypass-bootstrap.js
// Runs inside the popup to register/unregister the SW-bypass content script dynamically.
// Requires "scripting" permission in manifest. Host permission for https://yoworld.com/* will be requested at runtime.

(async () => {
  const SCRIPT_ID = "ywp-sw-bypass";
  const MATCHES = ["https://yoworld.com/*"];

  async function ensureHostPermission() {
    try {
      if (!chrome.permissions) return;
      const have = await chrome.permissions.contains({ origins: MATCHES });
      if (!have) {
        await chrome.permissions.request({ origins: MATCHES });
      }
    } catch (e) {
      console.warn("Host permission request failed:", e);
    }
  }

  async function register() {
    try {
      await ensureHostPermission();
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] }).catch(() => []);
      const spec = { id: SCRIPT_ID, js: ["ywp-sw-bypass.js"], matches: MATCHES, runAt: "document_start", allFrames: true };
      if (existing && existing.length) {
        await chrome.scripting.updateContentScripts([spec]);
      } else {
        await chrome.scripting.registerContentScripts([spec]);
      }
      // Nudge: update any open game tabs by reloading if user wants immediate effect (optional, kept silent).
    } catch (e) {
      console.warn("registerContentScripts failed:", e);
    }
  }

  async function unregister() {
    try { await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }); }
    catch (e) { /* no-op */ }
  }

  function syncFromStorage() {
    chrome.storage.local.get(["enableRedirect"], (st) => {
      if (st && !!st.enableRedirect) register(); else unregister();
    });
  }

  // Initial sync and react to changes from the popup toggle.
  syncFromStorage();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.enableRedirect)) {
      syncFromStorage();
    }
  });
})();
