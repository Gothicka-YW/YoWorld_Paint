console.log("YoWorld Art MV3 worker running (storage-connected).");

const SIDE_PANEL_PAGE = "popup/sidepanel.html";
const SIDE_PANEL_REVISION = "ui-recovery-1";
const DEFAULT_SIDE_PANEL = `${SIDE_PANEL_PAGE}?build=${encodeURIComponent(
    `${chrome.runtime.getManifest().version}-${SIDE_PANEL_REVISION}`
)}`;
const DEFAULT_POPUP = "popup/popup.html";
const DEFAULT_VIEW_MODE = "sidepanel";
const YOWORLD_IMAGE_PROXY = "https://api.yoworld.info/extension.php?x=";
const IMGBB_RELAY = "https://wsrv.nl/?url=";

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
        const isImgBbCdn = parsed.protocol === "https:" &&
            (parsed.hostname === "i.ibb.co" || parsed.hostname === "image.ibb.co");

        if (isImgBbCdn) {
            // api.yoworld.info currently receives a solid-black fallback when
            // it fetches ImgBB's CDN server-to-server. wsrv.nl can retrieve
            // and cache the same public image, so redirect ImgBB files there
            // directly and avoid the failing server-side hop.
            const relaySource = parsed.host + parsed.pathname + parsed.search;
            return IMGBB_RELAY + encodeURIComponent(relaySource) + "&output=png";
        }
    } catch (_) {
        // Invalid input is handled by updateRedirectRules below.
    }
    return YOWORLD_IMAGE_PROXY + encodeURIComponent(safeImgUrl);
}

function updateRedirectRules(imgUrl, enableRedirect) {
    const enabled = !!enableRedirect;
    const safeImgUrl = (imgUrl || "").trim();
    const targetUrl = buildPaintBoardUrl(safeImgUrl);
    console.log("Updating rules. enableRedirect =", enabled, "imgUrl =", safeImgUrl);

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [1],
            addRules: (enabled && safeImgUrl && /^https?:\/\//i.test(targetUrl))
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
                            resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
                        }
                    }
                ]
                : []
        },
        () => {
            if (logChromeLastError("Error updating rules")) {
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
    chrome.storage.local.get({ img: ["", false] }, (e) => {
        if (logChromeLastError("Error loading storage")) {
            return;
        }
        if (e.img && e.img.length) {
            updateRedirectRules(e.img[0], e.img[1]);
        } else {
            updateRedirectRules("https://i.imgur.com/j146uKh.png", false);
        }
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
