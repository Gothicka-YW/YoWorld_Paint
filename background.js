console.log("YoWorld Art MV3 worker running (storage-connected).");

const SIDE_PANEL_PAGE = "popup/sidepanel.html";
const SIDE_PANEL_REVISION = "ui-recovery-1";
const DEFAULT_SIDE_PANEL = `${SIDE_PANEL_PAGE}?build=${encodeURIComponent(
    `${chrome.runtime.getManifest().version}-${SIDE_PANEL_REVISION}`
)}`;
const DEFAULT_POPUP = "popup/popup.html";
const DEFAULT_VIEW_MODE = "sidepanel";
const DEFAULT_IMAGE_URL = "https://i.postimg.cc/VLh6mKGY/20250924-1934-Celestial-Cartoon-Background-remix-01k5z13k9cf4jrwgtmak9dqwjr.png";
const IMAGE_RELAY = "https://wsrv.nl/?url=";

function getChromeLastErrorMessage() {
    const err = chrome.runtime.lastError;
    if (!err) return null;
    if (typeof err === "string") return err;
    if (err && typeof err.message === "string") return err.message;
    try {
        return JSON.stringify(err);
    } catch (_) {
        return String(err);
    }
}

function logChromeLastError(context) {
    const msg = getChromeLastErrorMessage();
    if (!msg) return false;
    // Common during extension reload/update; not actionable.
    if (/extension context invalidated/i.test(msg)) return true;
    console.error(context + ":", msg, chrome.runtime.lastError);
    return true;
}

function buildPaintBoardUrl(imgUrl) {
    const safeImgUrl = (imgUrl || "").trim();

    try {
        const parsed = new URL(safeImgUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
        if (parsed.hostname === "wsrv.nl") return safeImgUrl;

        // Quick Upload prepares a compact indexed PNG before sending it to the
        // selected host. Keep those exact bytes intact: routing the image
        // through another image service can decode and re-encode it into a
        // much larger true-colour PNG that YoWorld may refuse to persist.
        const directImageHosts = new Set([
            "i.picrd.com",
            "i.ibb.co",
            "image.ibb.co",
            "i.postimg.cc"
        ]);
        if (directImageHosts.has(parsed.hostname) || parsed.hostname.endsWith(".postimg.cc")) {
            return parsed.href;
        }

        // Pasted links from other hosts still use the independent relay for a
        // browser-loadable PNG. The removed yoworld.info API is not required.
        const relaySource = parsed.host + parsed.pathname + parsed.search;
        return IMAGE_RELAY + encodeURIComponent(relaySource) + "&output=png";
    } catch (_) {
        return "";
    }
}

function updateRedirectRules(imgUrl, enableRedirect) {
    const enabled = !!enableRedirect;
    const safeImgUrl = (imgUrl || "").trim();
    const targetUrl = buildPaintBoardUrl(safeImgUrl);
    const validTarget = /^https?:\/\//i.test(targetUrl);
    console.log("Updating rules. enableRedirect =", enabled, "imgUrl =", safeImgUrl);

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [1],
            addRules: (enabled && safeImgUrl && validTarget)
                ? [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: "redirect",
                            redirect: {
                                url: targetUrl
                            }
                        },
                        condition: {
                            urlFilter: "paint_board",
                            resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"],
                            // Paint Board assets are loaded with GET requests. Limiting
                            // the redirect to GET keeps YoWorld's save/update POSTs on
                            // their original endpoint instead of sending them to the
                            // image relay.
                            requestMethods: ["get"]
                        }
                    }
                ]
                : []
        },
        () => {
            const errorMessage = getChromeLastErrorMessage();
            if (errorMessage) {
                console.error("Error updating rules:", errorMessage, chrome.runtime.lastError);
                return;
            } else {
                console.log("Rules updated successfully.");
                chrome.declarativeNetRequest.getDynamicRules((rules) => {
                    console.log("Active rules:", rules);
                });
            }
        }
    );
}

function loadSettings() {
    chrome.storage.local.get({
        img: ["", false]
    }, (e) => {
        if (logChromeLastError("Error loading storage")) {
            return;
        }
        const stored = Array.isArray(e.img) ? e.img : [];
        const url = String(stored[0] || DEFAULT_IMAGE_URL).trim();
        const enabled = !!stored[1];

        // Persist the visible default instead of only showing it in the UI.
        // This lets Redirect work on a fresh installation without requiring
        // the user to click Set New Image first.
        if (!stored[0]) {
            chrome.storage.local.set({ img: [url, enabled] });
        }
        updateRedirectRules(url, enabled);
    });
}

function normalizeViewMode(mode) {
    return mode === "popup" ? "popup" : DEFAULT_VIEW_MODE;
}

async function applyViewMode(mode) {
    const normalized = normalizeViewMode(mode);
    try {
        if (chrome.sidePanel) {
            await chrome.sidePanel.setOptions({
                path: DEFAULT_SIDE_PANEL,
                enabled: true
            });
        }

        if (normalized === "popup") {
            // Disable Chrome's panel action before assigning the popup so the
            // toolbar never has two competing default behaviors.
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
            await chrome.action.setPopup({ popup: DEFAULT_POPUP });
            await chrome.action.setTitle({ title: "Open YoWorld Paint popup" });
        } else {
            // Clear the popup before assigning the side-panel action for the
            // same reason. Side Panel is the default for new users.
            await chrome.action.setPopup({ popup: "" });
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
            await chrome.action.setTitle({ title: "Open YoWorld Paint side panel" });
        }

        await chrome.action.enable();
        console.log("Default view applied:", normalized);
    } catch (error) {
        console.error("Unable to apply default view:", error);
        // Restore the product default if a partially applied preference fails.
        try {
            await chrome.action.setPopup({ popup: "" });
            await chrome.sidePanel.setOptions({ path: DEFAULT_SIDE_PANEL, enabled: true });
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
            await chrome.action.setTitle({ title: "Open YoWorld Paint side panel" });
            await chrome.action.enable();
        } catch (fallbackError) {
            console.error("Unable to restore side-panel fallback:", fallbackError);
        }
    }
}

function loadViewMode() {
    chrome.storage.sync.get({ viewMode: DEFAULT_VIEW_MODE }, (settings) => {
        if (logChromeLastError("Error loading default view")) return;
        applyViewMode(settings.viewMode);
    });
}

// Run at startup
loadSettings();
loadViewMode();

chrome.runtime.onInstalled.addListener(loadViewMode);
chrome.runtime.onStartup.addListener(loadViewMode);

// Watch for changes from popup
chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log("Storage changed:", areaName, changes);
    if (areaName === "local" && changes.img) {
        loadSettings();
    }
    if (areaName === "sync" && changes.viewMode) {
        applyViewMode(changes.viewMode.newValue);
    }
});
