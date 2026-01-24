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

function updateRedirectRules(imgUrl, enableRedirect) {
    const enabled = !!enableRedirect;
    const safeImgUrl = (imgUrl || "").trim();
    const targetUrl = "https://api.yoworld.info/extension.php?x=" + encodeURIComponent(safeImgUrl);
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

// Run at startup
loadSettings();

// Watch for changes from popup
chrome.storage.onChanged.addListener((changes) => {
    console.log("Storage changed:", changes);
    loadSettings();
});
