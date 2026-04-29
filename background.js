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

function updateRedirectRules(imgUrl, enableRedirect, imgMeta) {
    const enabled = !!enableRedirect;
    const safeImgUrl = (imgUrl || "").trim();
    const safeMeta = normalizeImgMeta(imgMeta);
    const targetUrl = buildRedirectTarget(safeImgUrl, safeMeta);
    console.log("Updating rules. enableRedirect =", enabled, "imgUrl =", safeImgUrl, "meta =", safeMeta);

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

function buildRedirectTarget(imgUrl, imgMeta) {
    const safeImgUrl = (imgUrl || "").trim();
    const safeMeta = normalizeImgMeta(imgMeta);
    if (safeMeta.forceProxy) {
        if (isYoworldProxyUrl(safeImgUrl)) {
            return safeImgUrl;
        }
        return "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
    }
    const unwrappedDirect = getDirectUrlFromYoworldProxy(safeImgUrl);
    if (isDirectTransparentPngUrl(unwrappedDirect)) {
        return unwrappedDirect;
    }
    if (isYoworldProxyUrl(safeImgUrl)) {
        return safeImgUrl;
    }
    if (isDirectTransparentPngUrl(safeImgUrl)) {
        return safeImgUrl;
    }
    return "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
}

function getDirectUrlFromYoworldProxy(urlString) {
    if (!isYoworldProxyUrl(urlString)) return "";
    try {
        const url = new URL(urlString);
        const nested = (url.searchParams.get("x") || "").trim();
        if (!/^https?:\/\//i.test(nested)) return "";
        return nested;
    } catch (_) {
        return "";
    }
}

function isYoworldProxyUrl(urlString) {
    if (!/^https?:\/\//i.test(urlString || "")) return false;
    try {
        const url = new URL(urlString);
        const host = url.hostname.toLowerCase();
        return host === "api.yoworld.info" && /\/extension\.php$/i.test(url.pathname || "");
    } catch (_) {
        return false;
    }
}

function normalizeImgMeta(rawMeta) {
    if (!rawMeta || typeof rawMeta !== "object") {
        return { forceProxy: false, sourceHasTransparency: false, hasTransparency: false, sourceWidth: 0, sourceHeight: 0, mode: "" };
    }
    const sourceWidth = Number(rawMeta.sourceWidth) || 0;
    const sourceHeight = Number(rawMeta.sourceHeight) || 0;
    const mode = typeof rawMeta.mode === "string" ? rawMeta.mode : "";
    const sourceHasTransparency = !!rawMeta.sourceHasTransparency;
    const hasTransparency = !!rawMeta.hasTransparency;
    const forceProxy = !!rawMeta.forceProxy && !hasTransparency;
    return {
        forceProxy,
        sourceHasTransparency,
        hasTransparency,
        sourceWidth,
        sourceHeight,
        mode
    };
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
    chrome.storage.local.get({ img: ["", false, null] }, (e) => {
        if (logChromeLastError("Error loading storage")) {
            return;
        }
        if (e.img && e.img.length) {
            const meta = (Array.isArray(e.img) && e.img.length > 2 && e.img[2] && typeof e.img[2] === "object")
                ? e.img[2]
                : null;
            updateRedirectRules(e.img[0], e.img[1], meta);
        } else {
            updateRedirectRules("https://i.imgur.com/j146uKh.png", false, null);
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
