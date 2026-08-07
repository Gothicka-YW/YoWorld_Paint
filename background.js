console.log("YoWorld Paint MV3 worker running.");

const REDIRECT_RULE_ID = 1;
const COMPAT_HEADER_RULE_ID = 2;
const DEFAULT_TRANSPORT_MODE = "proxy";
const DEFAULT_VIEW_MODE = "sidepanel";
const VIEW_DEFAULT_MIGRATION_KEY = "ywpSidePanelDefaultV1";

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

function normalizeTransportMode(value) {
    if (value === "direct") return "direct";
    if (value === "direct-headers") return "direct-headers";
    return DEFAULT_TRANSPORT_MODE;
}

function normalizeViewMode(value) {
    return value === "popup" ? "popup" : DEFAULT_VIEW_MODE;
}

function normalizeHttpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
        return parsed.href;
    } catch (_) {
        return "";
    }
}

function buildTargetUrl(imgUrl, transportMode) {
    const safeImgUrl = normalizeHttpUrl(imgUrl);
    if (!safeImgUrl) return "";

    const mode = normalizeTransportMode(transportMode);
    if (mode === "direct" || mode === "direct-headers") {
        // Experimental paths: redirect straight to the hosted image without
        // resizing, re-encoding, alpha repair, quantization, or a second image.
        return safeImgUrl;
    }

    // Proven v3.4 compatibility path. Retained as the control while direct
    // routes are tested for save and reopen persistence.
    return "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
}

function isImgBbDeliveryUrl(value) {
    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname === "i.ibb.co" || hostname.endsWith(".i.ibb.co");
    } catch (_) {
        return false;
    }
}

function buildDynamicRules(enabled, targetUrl, transportMode) {
    if (!enabled || !targetUrl) return [];

    const mode = normalizeTransportMode(transportMode);
    const rules = [
        {
            id: REDIRECT_RULE_ID,
            priority: 2,
            action: {
                type: "redirect",
                redirect: { url: targetUrl }
            },
            condition: {
                urlFilter: "paint_board",
                resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
            }
        }
    ];

    // The first direct test displayed the correct RGBA image but did not
    // persist after redirect was disabled. This second test keeps the exact
    // image body and changes only cross-origin compatibility response headers.
    // It is intentionally limited to ImgBB delivery URLs for which the
    // extension has explicit host permission.
    if (mode === "direct-headers" && isImgBbDeliveryUrl(targetUrl)) {
        rules.push({
            id: COMPAT_HEADER_RULE_ID,
            priority: 1,
            action: {
                type: "modifyHeaders",
                responseHeaders: [
                    {
                        header: "Access-Control-Allow-Origin",
                        operation: "set",
                        value: "*"
                    },
                    {
                        header: "Cross-Origin-Resource-Policy",
                        operation: "set",
                        value: "cross-origin"
                    },
                    {
                        header: "Timing-Allow-Origin",
                        operation: "set",
                        value: "*"
                    },
                    {
                        header: "Content-Disposition",
                        operation: "set",
                        value: "inline"
                    }
                ]
            },
            condition: {
                requestDomains: ["i.ibb.co"],
                initiatorDomains: ["yoworld.com"],
                resourceTypes: ["image", "xmlhttprequest"]
            }
        });
    }

    return rules;
}

function updateRedirectRules(imgUrl, enableRedirect, transportMode) {
    const enabled = !!enableRedirect;
    const mode = normalizeTransportMode(transportMode);
    const targetUrl = buildTargetUrl(imgUrl, mode);
    const addRules = buildDynamicRules(enabled, targetUrl, mode);

    console.log("Updating paint-board rules.", {
        enabled,
        transportMode: mode,
        hasImage: !!targetUrl,
        ruleCount: addRules.length
    });

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [REDIRECT_RULE_ID, COMPAT_HEADER_RULE_ID],
            addRules
        },
        () => {
            if (logChromeLastError("Error updating paint-board rules")) return;
            console.log("Paint-board rules updated successfully.");
        }
    );
}

function loadImageSettings() {
    chrome.storage.local.get(
        {
            img: ["", false],
            transportMode: DEFAULT_TRANSPORT_MODE
        },
        (settings) => {
            if (logChromeLastError("Error loading image settings")) return;
            const img = Array.isArray(settings.img) ? settings.img : ["", false];
            updateRedirectRules(img[0], img[1], settings.transportMode);
        }
    );
}

async function applyViewMode(value) {
    const mode = normalizeViewMode(value);
    try {
        if (mode === "popup") {
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
            await chrome.action.setPopup({ popup: "popup/popup.html" });
        } else {
            // A toolbar popup overrides the side-panel action, so clear it when
            // Side Panel mode is active.
            await chrome.action.setPopup({ popup: "" });
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        }
        console.log("Applied view mode:", mode);
    } catch (error) {
        console.error("Unable to apply view mode:", error);
    }
}

function loadViewSettings({ migrateToSidePanel = false } = {}) {
    chrome.storage.sync.get(
        {
            viewMode: null,
            [VIEW_DEFAULT_MIGRATION_KEY]: false
        },
        (settings) => {
            if (logChromeLastError("Error loading view settings")) return;

            if (migrateToSidePanel && !settings[VIEW_DEFAULT_MIGRATION_KEY]) {
                chrome.storage.sync.set(
                    {
                        viewMode: DEFAULT_VIEW_MODE,
                        [VIEW_DEFAULT_MIGRATION_KEY]: true
                    },
                    () => {
                        if (logChromeLastError("Error saving Side Panel default")) return;
                        applyViewMode(DEFAULT_VIEW_MODE);
                    }
                );
                return;
            }

            applyViewMode(normalizeViewMode(settings.viewMode));
        }
    );
}

chrome.runtime.onInstalled.addListener(() => {
    loadViewSettings({ migrateToSidePanel: true });
    loadImageSettings();
});

chrome.runtime.onStartup.addListener(() => {
    loadViewSettings();
    loadImageSettings();
});

// Initialize whenever the service worker starts.
loadViewSettings();
loadImageSettings();

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.img || changes.transportMode)) {
        loadImageSettings();
    }

    if (areaName === "sync" && changes.viewMode) {
        applyViewMode(changes.viewMode.newValue);
    }
});
