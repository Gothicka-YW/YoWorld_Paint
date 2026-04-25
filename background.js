console.log("YoWorld Art MV3 worker running (storage-connected).");

const DEFAULT_VIEW_MODE = "sidepanel";

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

function updateRedirectRules(imgUrl, enableRedirect) {
    const enabled = !!enableRedirect;
    const safeImgUrl = (imgUrl || "").trim();
    const targetUrl = buildRedirectTarget(safeImgUrl);
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

function buildRedirectTarget(imgUrl) {
    const safeImgUrl = (imgUrl || "").trim();
    if (isDirectTransparentPngUrl(safeImgUrl)) {
        return safeImgUrl;
    }
    return "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
}

function isDirectTransparentPngUrl(urlString) {
    if (!/^https?:\/\//i.test(urlString || "")) return false;
    try {
        const url = new URL(urlString);
        const host = url.hostname.toLowerCase();
        const path = url.pathname.toLowerCase();
        const isImgBbDirectHost = host === "i.ibb.co" || host === "i.imgbb.com";
        return isImgBbDirectHost && /\.png$/i.test(path);
    } catch (_) {
        return false;
    }
}

function applyViewModeBehavior(mode) {
    if (!chrome.sidePanel || typeof chrome.sidePanel.setPanelBehavior !== "function") {
        return;
    }

    chrome.sidePanel.setPanelBehavior(
        { openPanelOnActionClick: mode === "sidepanel" },
        () => {
            logChromeLastError("Error applying side panel behavior");
        }
    );
}

function loadViewMode() {
    if (!chrome.storage?.sync) {
        applyViewModeBehavior(DEFAULT_VIEW_MODE);
        return;
    }

    chrome.storage.sync.get({ viewMode: DEFAULT_VIEW_MODE }, (result) => {
        if (logChromeLastError("Error loading view mode")) {
            applyViewModeBehavior(DEFAULT_VIEW_MODE);
            return;
        }

        const mode = result && (result.viewMode === "popup" || result.viewMode === "sidepanel")
            ? result.viewMode
            : DEFAULT_VIEW_MODE;
        applyViewModeBehavior(mode);

        if (!result || (result.viewMode !== "popup" && result.viewMode !== "sidepanel")) {
            chrome.storage.sync.set({ viewMode: DEFAULT_VIEW_MODE }, () => {
                logChromeLastError("Error saving default view mode");
            });
        }
    });
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

// Run at startup
loadSettings();
loadViewMode();

chrome.runtime.onInstalled.addListener(() => {
    loadViewMode();
});

// Watch for changes from popup
chrome.storage.onChanged.addListener((changes) => {
    console.log("Storage changed:", changes);
    loadSettings();
    if (changes.viewMode) {
        const next = changes.viewMode.newValue;
        const mode = (next === "popup" || next === "sidepanel") ? next : DEFAULT_VIEW_MODE;
        applyViewModeBehavior(mode);
    }
});
