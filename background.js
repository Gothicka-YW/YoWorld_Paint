console.log("YoWorld Art MV3 worker running (storage-connected).");

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

const TRACE_LIMIT = 500;
const traceEvents = [];
let currentRoutingState = {
    enabled: false,
    directMode: false,
    safeImgUrl: "",
    imageTargetUrl: "",
    compatTargetUrl: "",
    updatedAt: new Date().toISOString()
};

function pushTrace(event, details) {
    const item = {
        ts: new Date().toISOString(),
        event,
        details: details || {}
    };
    traceEvents.push(item);
    if (traceEvents.length > TRACE_LIMIT) {
        traceEvents.splice(0, traceEvents.length - TRACE_LIMIT);
    }
}

if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
    try {
        chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
            const req = (info && info.request) ? info.request : {};
            const rule = (info && info.rule) ? info.rule : {};
            pushTrace("dnr-rule-match", {
                ruleId: rule.ruleId || null,
                request: {
                    url: req.url || "",
                    method: req.method || "",
                    resourceType: req.resourceType || "",
                    tabId: req.tabId,
                    frameId: req.frameId,
                    parentFrameId: req.parentFrameId,
                    initiator: req.initiator || "",
                    documentUrl: req.documentUrl || ""
                },
                routing: {
                    enabled: currentRoutingState.enabled,
                    directMode: currentRoutingState.directMode,
                    imageTargetUrl: currentRoutingState.imageTargetUrl,
                    compatTargetUrl: currentRoutingState.compatTargetUrl
                }
            });
        });
    } catch (err) {
        console.error("Failed to attach onRuleMatchedDebug listener:", err);
    }
}

function updateRedirectRules(imgUrl, enableRedirect, preferDirectTransparent) {
    const enabled = !!enableRedirect;
    const directMode = !!preferDirectTransparent;
    const safeImgUrl = (imgUrl || "").trim();
    const legacyEndpoint = "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
    const imageTargetUrl = directMode ? safeImgUrl : legacyEndpoint;
    const compatTargetUrl = legacyEndpoint;
    currentRoutingState = {
        enabled,
        directMode,
        safeImgUrl,
        imageTargetUrl,
        compatTargetUrl,
        updatedAt: new Date().toISOString()
    };
    pushTrace("rules-update-requested", {
        routing: currentRoutingState
    });
    console.log("Updating rules. enableRedirect =", enabled, "directMode =", directMode, "imgUrl =", safeImgUrl);

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [1, 2, 3, 4, 5],
            addRules: (enabled && safeImgUrl && /^https?:\/\//i.test(safeImgUrl))
                ? [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: "redirect",
                            redirect: {
                                url: imageTargetUrl
                            }
                        },
                        condition: {
                            urlFilter: "paint_board",
                            resourceTypes: directMode ? ["image", "xmlhttprequest"] : ["image"]
                        }
                    },
                    {
                        id: 2,
                        priority: 1,
                        action: {
                            type: "redirect",
                            redirect: {
                                url: compatTargetUrl
                            }
                        },
                        condition: {
                            urlFilter: "paint_board",
                            resourceTypes: directMode ? ["sub_frame", "main_frame"] : ["xmlhttprequest", "sub_frame", "main_frame"]
                        }
                    }
                ]
                : (safeImgUrl && /^https?:\/\//i.test(safeImgUrl))
                    ? [
                        {
                            id: 3,
                            priority: 1,
                            action: {
                                type: "allow"
                            },
                            condition: {
                                urlFilter: "paint_board",
                                resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
                            }
                        },
                        {
                            id: 4,
                            priority: 1,
                            action: {
                                type: "allow"
                            },
                            condition: {
                                urlFilter: "i.ibb.co/",
                                resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
                            }
                        },
                        {
                            id: 5,
                            priority: 1,
                            action: {
                                type: "allow"
                            },
                            condition: {
                                urlFilter: "i.imgbb.com/",
                                resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
                            }
                        }
                    ]
                : []
        },
        () => {
            if (logChromeLastError("Error updating rules")) {
                pushTrace("rules-update-error", {
                    message: getChromeLastErrorMessage() || "Unknown updateDynamicRules error",
                    routing: currentRoutingState
                });
                return;
            } else {
                console.log("Rules updated successfully.");
                chrome.declarativeNetRequest.getDynamicRules((rules) => {
                    console.log("Active rules:", rules);
                    pushTrace("rules-updated", {
                        routing: currentRoutingState,
                        rules: (rules || []).map((r) => ({
                            id: r.id,
                            resourceTypes: (r.condition && r.condition.resourceTypes) ? r.condition.resourceTypes : [],
                            redirectUrl: (r.action && r.action.redirect) ? (r.action.redirect.url || "") : ""
                        }))
                    });
                });
            }
        }
    );
}

function loadSettings() {
    chrome.storage.local.get({ img: ["", false, false] }, (e) => {
        if (logChromeLastError("Error loading storage")) {
            return;
        }
        if (e.img && e.img.length) {
            pushTrace("settings-loaded", {
                img: [e.img[0] || "", !!e.img[1], !!e.img[2]]
            });
            updateRedirectRules(e.img[0], e.img[1], e.img[2]);
        } else {
            updateRedirectRules("https://i.imgur.com/j146uKh.png", false, false);
        }
    });
}

function applyViewModeBehavior() {
    if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) return;
    chrome.storage.sync.get({ viewMode: "popup" }, (st) => {
        if (logChromeLastError("Error loading view mode")) {
            return;
        }
        const mode = (st && st.viewMode === "sidepanel") ? "sidepanel" : "popup";
        const openOnAction = mode === "sidepanel";
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: openOnAction }, () => {
            if (logChromeLastError("Error applying view mode behavior")) {
                return;
            }
            console.log("View mode behavior updated. openPanelOnActionClick =", openOnAction);
        });
    });
}

// Run at startup
loadSettings();
applyViewModeBehavior();

// Watch for changes from popup
chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log("Storage changed:", areaName, changes);
    pushTrace("storage-changed", {
        areaName,
        keys: Object.keys(changes || {})
    });
    if (areaName === "local" && changes.img) {
        loadSettings();
    }
    if (areaName === "sync" && changes.viewMode) {
        applyViewModeBehavior();
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "ywp_trace_mark") {
        const payload = (msg && msg.payload && typeof msg.payload === "object") ? msg.payload : {};
        pushTrace("marker", {
            payload,
            senderUrl: (sender && sender.url) ? sender.url : ""
        });
        sendResponse({ ok: true });
        return;
    }

    if (msg.type === "ywp_trace_clear") {
        traceEvents.length = 0;
        pushTrace("trace-cleared", {
            senderUrl: (sender && sender.url) ? sender.url : ""
        });
        sendResponse({ ok: true });
        return;
    }

    if (msg.type === "ywp_trace_get") {
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const errMsg = getChromeLastErrorMessage();
            sendResponse({
                ok: !errMsg,
                error: errMsg || null,
                routing: currentRoutingState,
                rules: rules || [],
                trace: traceEvents.slice()
            });
        });
        return true;
    }
});
