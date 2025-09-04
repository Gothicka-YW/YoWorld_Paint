console.log("YoWorld Art MV3 worker running (storage-connected).");

function updateRedirectRules(imgUrl, enableRedirect) {
    console.log("Updating rules. enableRedirect =", enableRedirect, "imgUrl =", imgUrl);

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [1],
            addRules: enableRedirect
                ? [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: "redirect",
                            redirect: {
                                url: "https://api.yoworld.info/extension.php?x=" + imgUrl
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
            if (chrome.runtime.lastError) {
                console.error("Error updating rules:", chrome.runtime.lastError);
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
    chrome.storage.local.get("img", (e) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading storage:", chrome.runtime.lastError);
            return;
        }
        if (e.img && e.img.length) {
            updateRedirectRules(e.img[0], e.img[1]);
        } else {
            updateRedirectRules("https://i.imgur.com/kcVh1HW.png", false);
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
