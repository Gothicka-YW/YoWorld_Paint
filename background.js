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

const TRACE_LIMIT = 500;
const PROTECTION_STATE_KEY = "ywpProtectionState";
const traceEvents = [];
const DIRECT_DISABLE_GRACE_MS = 30000;
const DIRECT_DISABLE_MAX_MS = 45000;
const FINALIZER_AUTO_RELEASE_MS = 5000;
const RECENT_TOUCH_RESTORE_MAX_AGE_MS = 5 * 60 * 1000;
const PERSISTENCE_PROBE_DELAY_MS = 1500;
const PERSISTENCE_BLANK_MAX_BYTES = 1024;
const PERSISTENCE_RESCUE_MAX_ATTEMPTS = 3;
const HOLD_DISCOVERY_DEBOUNCE_MS = 1200;
const HOLD_STALE_MATCH_MS = 5000;
const HOLD_CANDIDATE_MAX_AGE_MS = 30000;
const PROTECTION_RESTORE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PINNED_PROTECTION_LIMIT = 12;
const PINNED_PROTECTION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PINNED_RULE_START_ID = 100;
const DIRECT_CORS_RULE_IDS = [7, 8];
const RESTORED_HOLD_FAST_STALE_MS = 1000;
const RESTORED_HOLD_FAST_WINDOW_MS = 15000;
const RESTORED_HOLD_FAST_MIN_AGE_MS = 30000;
// Persistent board holds made erased boards reappear with the last direct image.
// Redirect OFF keeps a short touched-board finalize window through the saveable route.
const PERSISTENCE_HOLD_ENABLED = false;
const DIRECT_DISABLE_GRACE_ENABLED = true;
const MULTI_BOARD_MODE_ENABLED = true;
const MULTI_BOARD_SESSION_LIMIT = PINNED_PROTECTION_LIMIT;
let disableGraceTimer = null;
let graceDisablePending = false;
let graceDisableStartedAt = 0;
let persistenceProbeTimer = null;
let persistenceRescueCount = 0;
let persistenceHoldActive = false;
let persistenceHoldBoardUrl = "";
let persistenceHoldLastMatchedAt = 0;
let restoredProtectionFastTrackUntil = 0;
let restoredProtectionBoardUrl = "";
let protectionSessionVersion = 0;
let holdDiscoveryTimer = null;
let holdDiscoveryCandidates = new Map();
let pinnedBoardProtections = new Map();
let multiBoardTouchedBoards = new Map();
let recentBoardFinalizers = new Map();
let finalizerReleaseTimers = new Map();
let requestedPlacementBoardUrl = "";
let lastRedirectedPaintBoard = {
    url: "",
    ts: 0,
    ruleId: null,
    resourceType: ""
};
let currentRoutingState = {
    enabled: false,
    requestedEnabled: false,
    persistenceHoldActive: false,
    pinnedProtectionCount: 0,
    directMode: false,
    multiBoardMode: MULTI_BOARD_MODE_ENABLED,
    multiBoardGraceCount: 0,
    recentFinalizerCount: 0,
    scopedBoardUrl: "",
    safeImgUrl: "",
    imageTargetUrl: "",
    compatTargetUrl: "",
    imgMeta: null,
    claimedBoardUrl: "",
    updatedAt: new Date().toISOString()
};

function buildCompatTarget(imgUrl) {
    const normalizedUrl = (imgUrl || "").trim();
    if (!normalizedUrl) return "";
    return getDirectUrlFromYoworldProxy(normalizedUrl) || normalizedUrl;
}

function buildRoutingTargets(safeImgUrl, directMode, imgMeta) {
    const normalizedSafeImgUrl = (safeImgUrl || "").trim();
    const normalizedImgMeta = normalizeImgMeta(imgMeta);
    const compatSourceUrl = normalizedImgMeta.compatSaveUrl || normalizedSafeImgUrl;
    const compatTarget = buildCompatTarget(compatSourceUrl);
    return {
        imageTargetUrl: directMode ? buildRedirectTarget(normalizedSafeImgUrl, normalizedImgMeta) : compatTarget,
        compatTargetUrl: compatTarget
    };
}

function getPinnedProtectionEntries() {
    const now = Date.now();
    for (const [boardUrl, entry] of pinnedBoardProtections.entries()) {
        const lastUpdatedAt = Number(entry && (entry.updatedAt || entry.createdAt) || 0);
        if (!boardUrl || !entry || !entry.safeImgUrl || !lastUpdatedAt || (now - lastUpdatedAt) > PINNED_PROTECTION_MAX_AGE_MS) {
            pinnedBoardProtections.delete(boardUrl);
        }
    }

    return Array.from(pinnedBoardProtections.values())
        .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));
}

function trimPinnedBoardProtections() {
    const staleProtectedEntries = getPinnedProtectionEntries();
    for (const entry of staleProtectedEntries.slice(PINNED_PROTECTION_LIMIT)) {
        if (entry && entry.boardUrl) {
            pinnedBoardProtections.delete(entry.boardUrl);
        }
    }
}

function getPinnedProtectionSnapshots() {
    if (!PERSISTENCE_HOLD_ENABLED) return [];
    return getPinnedProtectionEntries()
        .slice(0, PINNED_PROTECTION_LIMIT)
        .map((entry) => ({
            boardUrl: entry.boardUrl,
            safeImgUrl: entry.safeImgUrl,
            directMode: !!entry.directMode,
            createdAt: Number(entry.createdAt || 0),
            updatedAt: Number(entry.updatedAt || 0)
        }));
}

function mergePinnedProtectionsFromSnapshot(rawState) {
    if (!PERSISTENCE_HOLD_ENABLED) {
        pinnedBoardProtections.clear();
        return;
    }

    const rawProtections = rawState && Array.isArray(rawState.pinnedProtections)
        ? rawState.pinnedProtections
        : [];

    for (const rawProtection of rawProtections) {
        const boardUrl = normalizePaintBoardUrl(rawProtection && rawProtection.boardUrl);
        const safeImgUrl = String((rawProtection && rawProtection.safeImgUrl) || "").trim();
        const directMode = !!(rawProtection && rawProtection.directMode);
        if (!boardUrl || !safeImgUrl || !directMode) continue;

        const existing = pinnedBoardProtections.get(boardUrl) || null;
        const targets = buildRoutingTargets(safeImgUrl, directMode);
        pinnedBoardProtections.set(boardUrl, {
            boardUrl,
            safeImgUrl,
            directMode,
            imageTargetUrl: targets.imageTargetUrl,
            compatTargetUrl: targets.compatTargetUrl,
            createdAt: Number((rawProtection && rawProtection.createdAt) || (existing && existing.createdAt) || Date.now()),
            updatedAt: Number((rawProtection && rawProtection.updatedAt) || (rawProtection && rawProtection.savedAt) || (existing && existing.updatedAt) || Date.now())
        });
    }

    trimPinnedBoardProtections();
}

function removePinnedBoardProtection(boardUrl, reason) {
    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    if (!normalizedBoardUrl || !pinnedBoardProtections.has(normalizedBoardUrl)) return false;
    pinnedBoardProtections.delete(normalizedBoardUrl);
    pushTrace("pinned-protection-removed", {
        reason: reason || "removed",
        boardUrl: normalizedBoardUrl,
        count: pinnedBoardProtections.size
    });
    return true;
}

function upsertPinnedBoardProtection(boardUrl, safeImgUrl, directMode, options = {}) {
    if (!PERSISTENCE_HOLD_ENABLED) return null;

    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    const normalizedSafeImgUrl = String(safeImgUrl || "").trim();
    if (!normalizedBoardUrl || !normalizedSafeImgUrl || !directMode) return null;

    const existing = pinnedBoardProtections.get(normalizedBoardUrl) || null;
    const now = Date.now();
    const targets = buildRoutingTargets(normalizedSafeImgUrl, true);
    const nextEntry = {
        boardUrl: normalizedBoardUrl,
        safeImgUrl: normalizedSafeImgUrl,
        directMode: true,
        imageTargetUrl: targets.imageTargetUrl,
        compatTargetUrl: targets.compatTargetUrl,
        createdAt: existing ? Number(existing.createdAt || now) : now,
        updatedAt: now
    };

    pinnedBoardProtections.set(normalizedBoardUrl, nextEntry);
    trimPinnedBoardProtections();
    pushTrace("pinned-protection-upserted", {
        reason: options.reason || "hold",
        boardUrl: normalizedBoardUrl,
        safeImgUrl: normalizedSafeImgUrl,
        count: pinnedBoardProtections.size
    });
    return nextEntry;
}

function getPinnedProtectionRuleIds() {
    const ruleIds = [];
    for (let index = 0; index < PINNED_PROTECTION_LIMIT; index += 1) {
        const baseRuleId = PINNED_RULE_START_ID + (index * 2);
        ruleIds.push(baseRuleId, baseRuleId + 1);
    }
    return ruleIds;
}

function isScopedBoardRedirectRuleId(ruleId) {
    const numericRuleId = Number(ruleId);
    if (!Number.isFinite(numericRuleId)) return false;
    const offset = numericRuleId - PINNED_RULE_START_ID;
    return offset >= 0 && offset < (PINNED_PROTECTION_LIMIT * 2);
}

function isPaintBoardRedirectRuleId(ruleId) {
    return ruleId === 1 || ruleId === 2 || isScopedBoardRedirectRuleId(ruleId);
}

function rememberMultiBoardTouchedBoard(boardUrl, req) {
    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    if (!normalizedBoardUrl) return;

    const now = Date.now();
    const existing = multiBoardTouchedBoards.get(normalizedBoardUrl) || null;
    multiBoardTouchedBoards.set(normalizedBoardUrl, {
        boardUrl: normalizedBoardUrl,
        firstSeenAt: existing ? Number(existing.firstSeenAt || now) : now,
        lastSeenAt: now,
        matchCount: existing ? Number(existing.matchCount || 0) + 1 : 1,
        resourceType: (req && (req.type || req.resourceType)) || (existing && existing.resourceType) || ""
    });

    const entries = Array.from(multiBoardTouchedBoards.values())
        .sort((left, right) => Number(right.lastSeenAt || 0) - Number(left.lastSeenAt || 0));
    multiBoardTouchedBoards = new Map(
        entries
            .slice(0, MULTI_BOARD_SESSION_LIMIT)
            .map((entry) => [entry.boardUrl, entry])
    );
}

function rememberRecentBoardFinalizer(boardUrl, req) {
    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    const safeImgUrl = String(currentRoutingState.safeImgUrl || "").trim();
    if (!normalizedBoardUrl || !safeImgUrl || !currentRoutingState.directMode) return;

    const now = Date.now();
    const existing = recentBoardFinalizers.get(normalizedBoardUrl) || null;
    recentBoardFinalizers.set(normalizedBoardUrl, {
        boardUrl: normalizedBoardUrl,
        safeImgUrl,
        imageTargetUrl: currentRoutingState.imageTargetUrl || safeImgUrl,
        compatTargetUrl: currentRoutingState.compatTargetUrl || buildCompatTarget(safeImgUrl),
        imgMeta: currentRoutingState.imgMeta || null,
        firstSeenAt: existing && existing.safeImgUrl === safeImgUrl ? Number(existing.firstSeenAt || now) : now,
        lastSeenAt: now,
        matchCount: existing && existing.safeImgUrl === safeImgUrl ? Number(existing.matchCount || 0) + 1 : 1,
        resourceType: (req && (req.type || req.resourceType)) || (existing && existing.resourceType) || ""
    });

    trimRecentBoardFinalizers();
}

function getRecentBoardFinalizerEntries() {
    const now = Date.now();
    for (const [boardUrl, entry] of recentBoardFinalizers.entries()) {
        const lastSeenAt = Number(entry && entry.lastSeenAt || entry && entry.firstSeenAt || 0);
        if (!boardUrl || !entry || !entry.safeImgUrl || !lastSeenAt || (now - lastSeenAt) > RECENT_TOUCH_RESTORE_MAX_AGE_MS) {
            recentBoardFinalizers.delete(boardUrl);
        }
    }

    return Array.from(recentBoardFinalizers.values())
        .sort((left, right) => Number(left.firstSeenAt || 0) - Number(right.firstSeenAt || 0))
        .slice(0, MULTI_BOARD_SESSION_LIMIT);
}

function trimRecentBoardFinalizers() {
    const entries = getRecentBoardFinalizerEntries()
        .sort((left, right) => Number(right.lastSeenAt || 0) - Number(left.lastSeenAt || 0));
    recentBoardFinalizers = new Map(
        entries
            .slice(0, MULTI_BOARD_SESSION_LIMIT)
            .map((entry) => [entry.boardUrl, entry])
    );
}

function clearFinalizerReleaseTimers() {
    for (const timer of finalizerReleaseTimers.values()) {
        clearTimeout(timer);
    }
    finalizerReleaseTimers.clear();
}

function getNextFinalizerBoardEntry() {
    const recentEntry = getRecentBoardFinalizerEntries()[0] || null;
    if (recentEntry && recentEntry.boardUrl) return recentEntry;

    return Array.from(multiBoardTouchedBoards.values())
        .sort((left, right) => Number(left.firstSeenAt || 0) - Number(right.firstSeenAt || 0))[0] || null;
}

function releaseFinalizerBoard(boardUrl, reason, applySafeImgUrl, applyImgMeta) {
    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    if (!normalizedBoardUrl) return;

    const timer = finalizerReleaseTimers.get(normalizedBoardUrl);
    if (timer) {
        clearTimeout(timer);
        finalizerReleaseTimers.delete(normalizedBoardUrl);
    }

    const removedRecent = recentBoardFinalizers.delete(normalizedBoardUrl);
    const removedTouched = multiBoardTouchedBoards.delete(normalizedBoardUrl);
    const wasLastRedirected = normalizePaintBoardUrl(lastRedirectedPaintBoard.url || "") === normalizedBoardUrl;
    if (!removedRecent && !removedTouched && !wasLastRedirected) return;

    if (wasLastRedirected) {
        const nextEntry = getNextFinalizerBoardEntry();
        if (nextEntry && nextEntry.boardUrl) {
            lastRedirectedPaintBoard = {
                url: normalizePaintBoardUrl(nextEntry.boardUrl),
                ts: Date.now(),
                ruleId: null,
                resourceType: nextEntry.resourceType || "xmlhttprequest"
            };
        } else {
            clearLastRedirectedPaintBoard();
        }
    }

    const hasRemainingFinalizers = recentBoardFinalizers.size > 0 || multiBoardTouchedBoards.size > 0;
    pushTrace("finalizer-board-released", {
        reason: reason || "consumed",
        boardUrl: normalizedBoardUrl,
        removedRecent,
        removedTouched,
        remainingFinalizers: recentBoardFinalizers.size,
        remainingTouchedBoards: multiBoardTouchedBoards.size
    });

    updateRedirectRulesInternal(applySafeImgUrl || currentRoutingState.safeImgUrl, false, currentRoutingState.directMode, {
        skipGrace: !hasRemainingFinalizers,
        forceGraceStart: hasRemainingFinalizers,
        allowRestoredProtection: hasRemainingFinalizers,
        preserveRequestedSession: true,
        imgMeta: applyImgMeta || currentRoutingState.imgMeta,
        multiBoardMode: MULTI_BOARD_MODE_ENABLED
    });
}

function scheduleFinalizerBoardRelease(boardUrl, ruleId) {
    const normalizedBoardUrl = normalizePaintBoardUrl(boardUrl);
    if (!normalizedBoardUrl || currentRoutingState.requestedEnabled || !currentRoutingState.directMode) return;

    const existing = finalizerReleaseTimers.get(normalizedBoardUrl);
    if (existing) {
        clearTimeout(existing);
    }

    const applySafeImgUrl = currentRoutingState.safeImgUrl;
    const applyImgMeta = currentRoutingState.imgMeta;
    finalizerReleaseTimers.set(normalizedBoardUrl, setTimeout(() => {
        releaseFinalizerBoard(normalizedBoardUrl, "finalizer-match", applySafeImgUrl, applyImgMeta);
    }, FINALIZER_AUTO_RELEASE_MS));

    pushTrace("finalizer-board-release-scheduled", {
        boardUrl: normalizedBoardUrl,
        ruleId: ruleId || null,
        delayMs: FINALIZER_AUTO_RELEASE_MS
    });
}

function getMultiBoardTouchedBoardUrls() {
    const urls = Array.from(multiBoardTouchedBoards.values())
        .sort((left, right) => Number(left.firstSeenAt || 0) - Number(right.firstSeenAt || 0))
        .map((entry) => normalizePaintBoardUrl(entry.boardUrl))
        .filter(Boolean);

    const fallbackUrl = normalizePaintBoardUrl(lastRedirectedPaintBoard.url || "");
    if (fallbackUrl && !urls.includes(fallbackUrl)) {
        urls.push(fallbackUrl);
    }

    return urls.slice(0, MULTI_BOARD_SESSION_LIMIT);
}

function buildRecentBoardFinalizerRules(entries) {
    return (entries || []).flatMap((entry, index) => {
        const boardUrl = normalizePaintBoardUrl(entry && entry.boardUrl || "");
        const compatTargetUrl = String(entry && entry.compatTargetUrl || "").trim();
        if (!boardUrl || !compatTargetUrl) return [];

        const baseRuleId = PINNED_RULE_START_ID + (index * 2);
        const regexFilter = buildHoldRegexFilter(boardUrl);
        return [
            {
                id: baseRuleId,
                priority: 3,
                action: {
                    type: "redirect",
                    redirect: {
                        url: compatTargetUrl
                    }
                },
                condition: {
                    regexFilter,
                    resourceTypes: ["image", "xmlhttprequest"],
                    requestMethods: ["get"]
                }
            },
            {
                id: baseRuleId + 1,
                priority: 3,
                action: {
                    type: "redirect",
                    redirect: {
                        url: compatTargetUrl
                    }
                },
                condition: {
                    regexFilter,
                    resourceTypes: ["sub_frame", "main_frame"],
                    requestMethods: ["get"]
                }
            }
        ];
    });
}

function buildMultiBoardGraceRules(boardUrls, imageTargetUrl, compatTargetUrl) {
    const normalizedUrls = Array.from(new Set(
        (boardUrls || [])
            .map((boardUrl) => normalizePaintBoardUrl(boardUrl))
            .filter(Boolean)
    )).slice(0, MULTI_BOARD_SESSION_LIMIT);

    return normalizedUrls.flatMap((boardUrl, index) => {
        const baseRuleId = PINNED_RULE_START_ID + (index * 2);
        const regexFilter = buildHoldRegexFilter(boardUrl);
        return [
            {
                id: baseRuleId,
                priority: 3,
                action: {
                    type: "redirect",
                    redirect: {
                        url: compatTargetUrl
                    }
                },
                condition: {
                    regexFilter,
                    resourceTypes: ["image", "xmlhttprequest"],
                    requestMethods: ["get"]
                }
            },
            {
                id: baseRuleId + 1,
                priority: 3,
                action: {
                    type: "redirect",
                    redirect: {
                        url: compatTargetUrl
                    }
                },
                condition: {
                    regexFilter,
                    resourceTypes: ["sub_frame", "main_frame"],
                    requestMethods: ["get"]
                }
            }
        ];
    });
}

function buildDirectCorsRules() {
    const responseHeaders = [
        {
            header: "Access-Control-Allow-Origin",
            operation: "set",
            value: "https://yoworld.com"
        },
        {
            header: "Access-Control-Allow-Credentials",
            operation: "set",
            value: "true"
        },
        {
            header: "Timing-Allow-Origin",
            operation: "set",
            value: "*"
        },
        {
            header: "Cross-Origin-Resource-Policy",
            operation: "set",
            value: "cross-origin"
        }
    ];

    return [
        {
            id: DIRECT_CORS_RULE_IDS[0],
            priority: 3,
            action: {
                type: "modifyHeaders",
                responseHeaders
            },
            condition: {
                regexFilter: "^https:\\/\\/i\\.ibb\\.co\\/",
                resourceTypes: ["image", "xmlhttprequest"]
            }
        },
        {
            id: DIRECT_CORS_RULE_IDS[1],
            priority: 3,
            action: {
                type: "modifyHeaders",
                responseHeaders
            },
            condition: {
                regexFilter: "^https:\\/\\/i\\.imgbb\\.com\\/",
                resourceTypes: ["image", "xmlhttprequest"]
            }
        }
    ];
}

function getMultiBoardTouchedBoardSnapshots() {
    return Array.from(multiBoardTouchedBoards.values())
        .sort((left, right) => Number(left.firstSeenAt || 0) - Number(right.firstSeenAt || 0))
        .slice(0, MULTI_BOARD_SESSION_LIMIT)
        .map((entry) => ({
            boardUrl: normalizePaintBoardUrl(entry && entry.boardUrl || ""),
            firstSeenAt: Number(entry && entry.firstSeenAt || 0),
            lastSeenAt: Number(entry && entry.lastSeenAt || 0),
            matchCount: Number(entry && entry.matchCount || 0),
            resourceType: String(entry && entry.resourceType || "")
        }))
        .filter((entry) => entry.boardUrl);
}

function getRecentBoardFinalizerSnapshots() {
    return getRecentBoardFinalizerEntries()
        .map((entry) => ({
            boardUrl: normalizePaintBoardUrl(entry && entry.boardUrl || ""),
            safeImgUrl: String(entry && entry.safeImgUrl || ""),
            imageTargetUrl: String(entry && entry.imageTargetUrl || ""),
            compatTargetUrl: String(entry && entry.compatTargetUrl || ""),
            imgMeta: entry && entry.imgMeta && typeof entry.imgMeta === "object" ? entry.imgMeta : null,
            firstSeenAt: Number(entry && entry.firstSeenAt || 0),
            lastSeenAt: Number(entry && entry.lastSeenAt || 0),
            matchCount: Number(entry && entry.matchCount || 0),
            resourceType: String(entry && entry.resourceType || "")
        }))
        .filter((entry) => entry.boardUrl && entry.safeImgUrl);
}

function buildPinnedProtectionRules(excludedBoardUrls = []) {
    if (!PERSISTENCE_HOLD_ENABLED) return [];

    const excludedBoardUrlSet = new Set(
        (excludedBoardUrls || [])
            .map((boardUrl) => normalizePaintBoardUrl(boardUrl))
            .filter(Boolean)
    );

    return getPinnedProtectionEntries()
        .filter((entry) => entry && entry.boardUrl && entry.safeImgUrl && !excludedBoardUrlSet.has(entry.boardUrl))
        .slice(0, PINNED_PROTECTION_LIMIT)
        .flatMap((entry, index) => {
            const baseRuleId = PINNED_RULE_START_ID + (index * 2);
            return [
                {
                    id: baseRuleId,
                    priority: 3,
                    action: {
                        type: "redirect",
                        redirect: {
                            url: entry.imageTargetUrl
                        }
                    },
                    condition: {
                        regexFilter: buildHoldRegexFilter(entry.boardUrl),
                        resourceTypes: ["image"],
                        requestMethods: ["get"]
                    }
                },
                {
                    id: baseRuleId + 1,
                    priority: 3,
                    action: {
                        type: "redirect",
                        redirect: {
                            url: entry.compatTargetUrl
                        }
                    },
                    condition: {
                        regexFilter: buildHoldRegexFilter(entry.boardUrl),
                        resourceTypes: ["xmlhttprequest", "sub_frame", "main_frame"],
                        requestMethods: ["get"]
                    }
                }
            ];
        });
}

function persistProtectionState() {
    const snapshot = {
        savedAt: Date.now(),
        safeImgUrl: currentRoutingState.safeImgUrl || "",
        requestedEnabled: !!currentRoutingState.requestedEnabled,
        directMode: !!currentRoutingState.directMode,
        enabled: !!currentRoutingState.enabled,
        multiBoardMode: !!currentRoutingState.multiBoardMode,
        scopedBoardUrl: normalizePaintBoardUrl(currentRoutingState.scopedBoardUrl || ""),
        persistenceHoldActive: PERSISTENCE_HOLD_ENABLED && !!persistenceHoldActive,
        persistenceHoldBoardUrl: PERSISTENCE_HOLD_ENABLED ? normalizePaintBoardUrl(persistenceHoldBoardUrl || "") : "",
        pinnedProtections: getPinnedProtectionSnapshots(),
        lastRedirectedPaintBoard: {
            url: normalizePaintBoardUrl(lastRedirectedPaintBoard.url || ""),
            ts: Number(lastRedirectedPaintBoard.ts || 0),
            ruleId: lastRedirectedPaintBoard.ruleId || null,
            resourceType: lastRedirectedPaintBoard.resourceType || ""
        },
        multiBoardTouchedBoards: getMultiBoardTouchedBoardSnapshots(),
        recentBoardFinalizers: getRecentBoardFinalizerSnapshots()
    };

    chrome.storage.local.set({ [PROTECTION_STATE_KEY]: snapshot }, () => {
        logChromeLastError("Error saving protection state");
    });
}

function getRestorableProtectionState(rawState, safeImgUrl, requestedEnabled, directMode) {
    if (!PERSISTENCE_HOLD_ENABLED) return null;
    if (!rawState || typeof rawState !== "object") return null;
    if (requestedEnabled || !directMode || !safeImgUrl) return null;
    if ((rawState.safeImgUrl || "") !== safeImgUrl) return null;

    const savedAt = Number(rawState.savedAt || 0);
    if (!savedAt || (Date.now() - savedAt) > PROTECTION_RESTORE_MAX_AGE_MS) {
        return null;
    }

    const boardUrl = normalizePaintBoardUrl(
        rawState.persistenceHoldBoardUrl
        || rawState.scopedBoardUrl
        || (rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.url)
        || ""
    );

    if (!boardUrl) return null;

    return {
        boardUrl,
        savedAt,
        lastRedirectedPaintBoard: {
            url: normalizePaintBoardUrl((rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.url) || boardUrl),
            ts: Number((rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.ts) || savedAt),
            ruleId: (rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.ruleId) || 1,
            resourceType: (rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.resourceType) || "xmlhttprequest"
        }
    };
}

function restoreRecentTouchedBoardState(rawState, safeImgUrl, directMode) {
    if (!rawState || typeof rawState !== "object") return false;
    if (!directMode || !safeImgUrl) return false;
    if ((rawState.safeImgUrl || "") !== safeImgUrl) return false;

    const savedAt = Number(rawState.savedAt || 0);
    if (!savedAt || (Date.now() - savedAt) > RECENT_TOUCH_RESTORE_MAX_AGE_MS) {
        return false;
    }

    const restoredEntries = [];
    const rawEntries = Array.isArray(rawState.multiBoardTouchedBoards)
        ? rawState.multiBoardTouchedBoards
        : [];

    for (const rawEntry of rawEntries) {
        const boardUrl = normalizePaintBoardUrl(rawEntry && rawEntry.boardUrl || "");
        if (!boardUrl) continue;
        restoredEntries.push({
            boardUrl,
            firstSeenAt: Number(rawEntry && rawEntry.firstSeenAt || savedAt),
            lastSeenAt: Number(rawEntry && rawEntry.lastSeenAt || savedAt),
            matchCount: Number(rawEntry && rawEntry.matchCount || 1),
            resourceType: String(rawEntry && rawEntry.resourceType || "xmlhttprequest")
        });
    }

    const lastBoardUrl = normalizePaintBoardUrl(rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.url || "");
    if (lastBoardUrl && !restoredEntries.some((entry) => entry.boardUrl === lastBoardUrl)) {
        restoredEntries.push({
            boardUrl: lastBoardUrl,
            firstSeenAt: Number(rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.ts || savedAt),
            lastSeenAt: Number(rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.ts || savedAt),
            matchCount: 1,
            resourceType: String(rawState.lastRedirectedPaintBoard && rawState.lastRedirectedPaintBoard.resourceType || "xmlhttprequest")
        });
    }

    if (!restoredEntries.length) return false;

    multiBoardTouchedBoards = new Map(
        restoredEntries
            .slice(0, MULTI_BOARD_SESSION_LIMIT)
            .map((entry) => [entry.boardUrl, entry])
    );

    const lastRaw = rawState.lastRedirectedPaintBoard || {};
    const fallback = restoredEntries[restoredEntries.length - 1];
    lastRedirectedPaintBoard = {
        url: normalizePaintBoardUrl(lastRaw.url || fallback.boardUrl),
        ts: Number(lastRaw.ts || fallback.lastSeenAt || savedAt),
        ruleId: lastRaw.ruleId || 1,
        resourceType: String(lastRaw.resourceType || fallback.resourceType || "xmlhttprequest")
    };

    pushTrace("recent-board-touch-restored", {
        count: multiBoardTouchedBoards.size,
        savedAt: new Date(savedAt).toISOString(),
        ageMs: Date.now() - savedAt
    });
    return true;
}

function restoreRecentBoardFinalizerState(rawState) {
    if (!rawState || typeof rawState !== "object") return false;

    const savedAt = Number(rawState.savedAt || 0);
    if (!savedAt || (Date.now() - savedAt) > RECENT_TOUCH_RESTORE_MAX_AGE_MS) {
        return false;
    }

    const rawEntries = Array.isArray(rawState.recentBoardFinalizers)
        ? rawState.recentBoardFinalizers
        : [];
    const restoredEntries = [];

    for (const rawEntry of rawEntries) {
        const boardUrl = normalizePaintBoardUrl(rawEntry && rawEntry.boardUrl || "");
        const safeImgUrl = String(rawEntry && rawEntry.safeImgUrl || "").trim();
        if (!boardUrl || !safeImgUrl) continue;

        const targets = buildRoutingTargets(safeImgUrl, true, rawEntry && rawEntry.imgMeta);
        restoredEntries.push({
            boardUrl,
            safeImgUrl,
            imageTargetUrl: buildCompatTarget(String(rawEntry && rawEntry.imageTargetUrl || targets.imageTargetUrl || safeImgUrl)),
            compatTargetUrl: buildCompatTarget(String(rawEntry && rawEntry.compatTargetUrl || targets.compatTargetUrl || "")),
            imgMeta: rawEntry && rawEntry.imgMeta && typeof rawEntry.imgMeta === "object" ? rawEntry.imgMeta : null,
            firstSeenAt: Number(rawEntry && rawEntry.firstSeenAt || savedAt),
            lastSeenAt: Number(rawEntry && rawEntry.lastSeenAt || savedAt),
            matchCount: Number(rawEntry && rawEntry.matchCount || 1),
            resourceType: String(rawEntry && rawEntry.resourceType || "xmlhttprequest")
        });
    }

    if (!restoredEntries.length) return false;

    recentBoardFinalizers = new Map(
        restoredEntries
            .slice(0, MULTI_BOARD_SESSION_LIMIT)
            .map((entry) => [entry.boardUrl, entry])
    );

    pushTrace("recent-board-finalizers-restored", {
        count: recentBoardFinalizers.size,
        savedAt: new Date(savedAt).toISOString(),
        ageMs: Date.now() - savedAt
    });
    return true;
}

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

function normalizePaintBoardUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
        const u = new URL(rawUrl);
        return u.origin + u.pathname;
    } catch (_) {
        return rawUrl.split("?")[0];
    }
}

function escapeRegexLiteral(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHoldRegexFilter(boardUrl) {
    const normalized = normalizePaintBoardUrl(boardUrl);
    if (!normalized) return "";
    return "^" + escapeRegexLiteral(normalized) + "(?:\\?.*)?$";
}

function getRequestUrl(rawUrl) {
    try {
        return new URL(String(rawUrl || ""));
    } catch (_) {
        return null;
    }
}

function choosePreferredBlankCandidate(blankCandidates, candidateMetaMap) {
    if (!blankCandidates.length) return null;
    if (blankCandidates.length === 1) {
        const candidate = blankCandidates[0];
        const meta = candidateMetaMap.get(normalizePaintBoardUrl(candidate.boardUrl)) || null;
        return {
            candidate,
            liveMatchCount: meta ? Number(meta.liveMatchCount || 0) : 0,
            lastSeenAt: meta ? Number(meta.lastSeenAt || 0) : 0,
            firstSeenAt: meta ? Number(meta.firstSeenAt || 0) : 0
        };
    }

    const ranked = blankCandidates
        .map((candidate) => {
            const meta = candidateMetaMap.get(normalizePaintBoardUrl(candidate.boardUrl)) || null;
            return {
                candidate,
                liveMatchCount: meta ? Number(meta.liveMatchCount || 0) : 0,
                lastSeenAt: meta ? Number(meta.lastSeenAt || 0) : 0,
                firstSeenAt: meta ? Number(meta.firstSeenAt || 0) : 0
            };
        })
        .sort((left, right) => {
            if (right.liveMatchCount !== left.liveMatchCount) {
                return right.liveMatchCount - left.liveMatchCount;
            }
            if (right.lastSeenAt !== left.lastSeenAt) {
                return right.lastSeenAt - left.lastSeenAt;
            }
            return right.firstSeenAt - left.firstSeenAt;
        });

    return ranked[0] || null;
}

function getHeldBoardStaleThresholdMs(heldBoardUrl) {
    const normalizedHeldBoardUrl = normalizePaintBoardUrl(heldBoardUrl);
    if (
        normalizedHeldBoardUrl
        && normalizedHeldBoardUrl === normalizePaintBoardUrl(restoredProtectionBoardUrl)
        && Date.now() <= restoredProtectionFastTrackUntil
    ) {
        return RESTORED_HOLD_FAST_STALE_MS;
    }
    return HOLD_STALE_MATCH_MS;
}

function getProtectedBoardUrl() {
    return normalizePaintBoardUrl(
        persistenceHoldActive
            ? persistenceHoldBoardUrl
            : (currentRoutingState.scopedBoardUrl || "")
    );
}

function clearLastRedirectedPaintBoard() {
    lastRedirectedPaintBoard = {
        url: "",
        ts: 0,
        ruleId: null,
        resourceType: ""
    };
}

function invalidateProtectionSession(reason, options = {}) {
    const clearTrackedBoard = !!options.clearTrackedBoard;
    const hadState = !!(
        disableGraceTimer
        || graceDisablePending
        || persistenceProbeTimer
        || holdDiscoveryTimer
        || holdDiscoveryCandidates.size
        || multiBoardTouchedBoards.size
        || recentBoardFinalizers.size
        || finalizerReleaseTimers.size
        || persistenceHoldActive
        || persistenceHoldBoardUrl
        || persistenceHoldLastMatchedAt
        || restoredProtectionBoardUrl
        || restoredProtectionFastTrackUntil
        || persistenceRescueCount
        || (clearTrackedBoard && lastRedirectedPaintBoard.url)
    );

    protectionSessionVersion += 1;

    if (holdDiscoveryTimer) {
        clearTimeout(holdDiscoveryTimer);
        holdDiscoveryTimer = null;
    }
    holdDiscoveryCandidates.clear();
    multiBoardTouchedBoards.clear();
    recentBoardFinalizers.clear();
    clearFinalizerReleaseTimers();

    if (persistenceProbeTimer) {
        clearTimeout(persistenceProbeTimer);
        persistenceProbeTimer = null;
    }

    cancelPendingGrace(reason || "session-reset");

    persistenceRescueCount = 0;
    persistenceHoldActive = false;
    persistenceHoldBoardUrl = "";
    persistenceHoldLastMatchedAt = 0;
    restoredProtectionFastTrackUntil = 0;
    restoredProtectionBoardUrl = "";
    requestedPlacementBoardUrl = "";

    if (clearTrackedBoard) {
        clearLastRedirectedPaintBoard();
    }

    if (hadState) {
        pushTrace("protection-session-reset", {
            reason: reason || "session-reset",
            clearTrackedBoard
        });
    }
}

async function probeBoardUrlForBlank(boardUrl) {
    const probeUrl = normalizePaintBoardUrl(boardUrl) + "?ywp_hold_probe=" + Date.now();
    const resp = await fetch(probeUrl, { cache: "no-store" });
    const bytes = (await resp.arrayBuffer()).byteLength;
    return {
        boardUrl: normalizePaintBoardUrl(boardUrl),
        status: resp.status,
        ok: resp.ok,
        bytes,
        blankSuspected: resp.ok && bytes > 0 && bytes <= PERSISTENCE_BLANK_MAX_BYTES
    };
}

function scheduleHoldDiscoveryEvaluation(delayMs = HOLD_DISCOVERY_DEBOUNCE_MS) {
    if (holdDiscoveryTimer) {
        clearTimeout(holdDiscoveryTimer);
        holdDiscoveryTimer = null;
    }

    const sessionVersion = protectionSessionVersion;

    holdDiscoveryTimer = setTimeout(async () => {
        holdDiscoveryTimer = null;

        if (sessionVersion !== protectionSessionVersion) {
            pushTrace("hold-discovery-aborted", {
                reason: "session-changed-before-start"
            });
            return;
        }

        const protectedBoardUrl = getProtectedBoardUrl();
        if (!currentRoutingState.enabled || currentRoutingState.requestedEnabled || !protectedBoardUrl) {
            holdDiscoveryCandidates.clear();
            return;
        }

        const heldBoardUrl = protectedBoardUrl;
        const heldStaleThresholdMs = getHeldBoardStaleThresholdMs(heldBoardUrl);
        const heldRecentlyMatched = persistenceHoldLastMatchedAt
            && (Date.now() - persistenceHoldLastMatchedAt) <= heldStaleThresholdMs;

        if (heldRecentlyMatched) {
            const heldAgeMs = Date.now() - persistenceHoldLastMatchedAt;
            const retryDelayMs = Math.max(250, heldStaleThresholdMs - heldAgeMs + 50);
            pushTrace("hold-discovery-skipped", {
                reason: "held-board-still-matching",
                heldBoardUrl,
                heldAgeMs,
                staleThresholdMs: heldStaleThresholdMs,
                retryDelayMs,
                retainedCandidateCount: holdDiscoveryCandidates.size
            });
            scheduleHoldDiscoveryEvaluation(retryDelayMs);
            return;
        }

        const now = Date.now();
        const candidateEntries = Array.from(holdDiscoveryCandidates.entries())
            .filter(([, meta]) => meta && (now - Number(meta.lastSeenAt || 0)) <= HOLD_CANDIDATE_MAX_AGE_MS);
        const candidateMetaMap = new Map(candidateEntries);
        const candidateUrls = candidateEntries
            .map(([url]) => normalizePaintBoardUrl(url))
            .filter((url) => url && url !== heldBoardUrl);
        holdDiscoveryCandidates.clear();

        if (!candidateUrls.length) {
            pushTrace("hold-discovery-skipped", {
                reason: "no-candidates",
                heldBoardUrl
            });
            return;
        }

        pushTrace("hold-discovery-probe-start", {
            heldBoardUrl,
            candidateCount: candidateUrls.length,
            candidates: candidateUrls
        });

        const results = [];
        for (const candidateUrl of candidateUrls) {
            if (sessionVersion !== protectionSessionVersion) {
                pushTrace("hold-discovery-aborted", {
                    reason: "session-changed-during-probe",
                    heldBoardUrl,
                    completedProbeCount: results.length,
                    candidateCount: candidateUrls.length
                });
                return;
            }
            try {
                results.push(await probeBoardUrlForBlank(candidateUrl));
            } catch (err) {
                results.push({
                    boardUrl: candidateUrl,
                    ok: false,
                    error: (err && err.message) ? err.message : String(err)
                });
            }
        }

        if (sessionVersion !== protectionSessionVersion) {
            pushTrace("hold-discovery-aborted", {
                reason: "session-changed-after-probe",
                heldBoardUrl,
                candidateCount: candidateUrls.length
            });
            return;
        }

        const blankCandidates = results.filter((result) => result && result.blankSuspected);
        const preferredBlankCandidate = choosePreferredBlankCandidate(blankCandidates, candidateMetaMap);
        pushTrace("hold-discovery-probe-result", {
            heldBoardUrl,
            results,
            blankCandidateCount: blankCandidates.length,
            preferredBlankCandidate: preferredBlankCandidate ? preferredBlankCandidate.candidate.boardUrl : ""
        });

        if (!preferredBlankCandidate) {
            pushTrace("hold-discovery-no-migration", {
                reason: blankCandidates.length ? "ambiguous-blank-candidates" : "no-blank-candidate",
                heldBoardUrl,
                blankCandidateCount: blankCandidates.length
            });
            return;
        }

        if (blankCandidates.length > 1) {
            pushTrace("hold-discovery-preferred-blank-candidate", {
                heldBoardUrl,
                blankCandidateCount: blankCandidates.length,
                boardUrl: preferredBlankCandidate.candidate.boardUrl,
                liveMatchCount: preferredBlankCandidate.liveMatchCount,
                lastSeenAt: preferredBlankCandidate.lastSeenAt
            });
        }

        const migratedBoardUrl = normalizePaintBoardUrl(preferredBlankCandidate.candidate.boardUrl);
        removePinnedBoardProtection(heldBoardUrl, "hold-migrated");
        persistenceHoldActive = true;
        persistenceHoldBoardUrl = migratedBoardUrl;
        persistenceHoldLastMatchedAt = 0;
        if (normalizePaintBoardUrl(restoredProtectionBoardUrl) !== migratedBoardUrl) {
            restoredProtectionFastTrackUntil = 0;
            restoredProtectionBoardUrl = "";
        }
        pushTrace("hold-discovery-migrated", {
            previousBoardUrl: heldBoardUrl,
            boardUrl: migratedBoardUrl
        });
        updateRedirectRulesInternal(currentRoutingState.safeImgUrl, false, true, {
            skipGrace: true,
            forcePinnedEnable: true
        });
    }, HOLD_DISCOVERY_DEBOUNCE_MS);
}

function trackHoldDiscoveryCandidate(req) {
    if (!PERSISTENCE_HOLD_ENABLED) return;

    const protectedBoardUrl = getProtectedBoardUrl();
    if (!currentRoutingState.enabled || currentRoutingState.requestedEnabled || !protectedBoardUrl) return;
    const reqUrl = getRequestUrl((req && req.url) || "");
    if (!reqUrl) return;
    if (reqUrl.searchParams.has("ywp_hold_probe")) return;
    const initiator = String((req && req.initiator) || "");
    if (/^chrome-extension:\/\//i.test(initiator)) return;

    const normalized = normalizePaintBoardUrl(reqUrl.toString());
    if (!normalized || normalized === protectedBoardUrl) return;
    const now = Date.now();
    const prev = holdDiscoveryCandidates.get(normalized);
    holdDiscoveryCandidates.set(normalized, {
        firstSeenAt: prev ? prev.firstSeenAt : now,
        lastSeenAt: now,
        liveMatchCount: prev ? (Number(prev.liveMatchCount || 0) + 1) : 1,
        resourceType: req.type || req.resourceType || ""
    });
    pushTrace("hold-discovery-candidate", {
        boardUrl: normalized,
        resourceType: req.type || req.resourceType || ""
    });
    scheduleHoldDiscoveryEvaluation();
}

function trackRedirectedPaintBoard(ruleId, req) {
    const url = (req && req.url) ? String(req.url) : "";
    if (!url || url.indexOf("paint_board") === -1) return;
    const method = String((req && req.method) || "").toUpperCase();
    if (method && method !== "GET") return;

    lastRedirectedPaintBoard = {
        url: normalizePaintBoardUrl(url),
        ts: Date.now(),
        ruleId: ruleId || null,
        resourceType: req.type || req.resourceType || ""
    };

    pushTrace("paint-board-tracked", {
        ruleId: ruleId || null,
        boardUrl: lastRedirectedPaintBoard.url,
        resourceType: lastRedirectedPaintBoard.resourceType
    });

    if (currentRoutingState.requestedEnabled && currentRoutingState.multiBoardMode) {
        rememberMultiBoardTouchedBoard(lastRedirectedPaintBoard.url, req);
        rememberRecentBoardFinalizer(lastRedirectedPaintBoard.url, req);
        pushTrace("multi-board-touched", {
            boardUrl: lastRedirectedPaintBoard.url,
            count: multiBoardTouchedBoards.size,
            finalizerCount: recentBoardFinalizers.size
        });
    }

    persistProtectionState();
}

function schedulePersistenceProbe(applyUrl) {
    if (!PERSISTENCE_HOLD_ENABLED) {
        pushTrace("persistence-probe-skipped", {
            reason: "persistence-hold-disabled"
        });
        return;
    }

    if (persistenceProbeTimer) {
        clearTimeout(persistenceProbeTimer);
        persistenceProbeTimer = null;
    }

    if (!lastRedirectedPaintBoard.url) {
        pushTrace("persistence-probe-skipped", {
            reason: "no-tracked-board"
        });
        return;
    }

    const tracked = {
        url: lastRedirectedPaintBoard.url,
        ts: lastRedirectedPaintBoard.ts,
        ruleId: lastRedirectedPaintBoard.ruleId,
        resourceType: lastRedirectedPaintBoard.resourceType
    };
    const sessionVersion = protectionSessionVersion;
    const expectedSafeImgUrl = (applyUrl || currentRoutingState.safeImgUrl || "").trim();

    pushTrace("persistence-probe-scheduled", {
        delayMs: PERSISTENCE_PROBE_DELAY_MS,
        boardUrl: tracked.url,
        trackedAgeMs: Math.max(0, Date.now() - tracked.ts)
    });

    persistenceProbeTimer = setTimeout(async () => {
        persistenceProbeTimer = null;

        if (
            sessionVersion !== protectionSessionVersion
            || expectedSafeImgUrl !== (currentRoutingState.safeImgUrl || "")
        ) {
            pushTrace("persistence-probe-skipped", {
                reason: "session-changed",
                boardUrl: tracked.url,
                expectedSafeImgUrl,
                currentSafeImgUrl: currentRoutingState.safeImgUrl || ""
            });
            return;
        }

        if (currentRoutingState.enabled || currentRoutingState.requestedEnabled) {
            pushTrace("persistence-probe-skipped", {
                reason: "routing-still-enabled",
                routing: {
                    enabled: currentRoutingState.enabled,
                    requestedEnabled: currentRoutingState.requestedEnabled
                }
            });
            return;
        }

        const probeUrl = tracked.url + "?ywp_probe=" + Date.now();
        pushTrace("persistence-probe-start", {
            boardUrl: tracked.url,
            probeUrl
        });

        try {
            const resp = await fetch(probeUrl, { cache: "no-store" });
            const bytes = (await resp.arrayBuffer()).byteLength;
            const blankSuspected = resp.ok && bytes > 0 && bytes <= PERSISTENCE_BLANK_MAX_BYTES;

            if (
                sessionVersion !== protectionSessionVersion
                || expectedSafeImgUrl !== (currentRoutingState.safeImgUrl || "")
            ) {
                pushTrace("persistence-probe-skipped", {
                    reason: "session-changed-after-fetch",
                    boardUrl: tracked.url,
                    expectedSafeImgUrl,
                    currentSafeImgUrl: currentRoutingState.safeImgUrl || ""
                });
                return;
            }

            pushTrace("persistence-probe-result", {
                boardUrl: tracked.url,
                status: resp.status,
                ok: resp.ok,
                bytes,
                blankSuspected,
                threshold: PERSISTENCE_BLANK_MAX_BYTES
            });

            if (!blankSuspected) {
                return;
            }

            if (persistenceRescueCount >= PERSISTENCE_RESCUE_MAX_ATTEMPTS) {
                pushTrace("persistence-probe-rescue-aborted", {
                    reason: "max-attempts",
                    attempts: persistenceRescueCount,
                    maxAttempts: PERSISTENCE_RESCUE_MAX_ATTEMPTS
                });
                return;
            }

            persistenceRescueCount += 1;
            persistenceHoldActive = true;
            persistenceHoldBoardUrl = tracked.url;
            pushTrace("persistence-probe-hold-enabled", {
                attempt: persistenceRescueCount,
                maxAttempts: PERSISTENCE_RESCUE_MAX_ATTEMPTS,
                boardUrl: tracked.url,
                applyUrl: applyUrl || currentRoutingState.safeImgUrl
            });

            updateRedirectRulesInternal(applyUrl || currentRoutingState.safeImgUrl, false, true, {
                skipGrace: true,
                forcePinnedEnable: true
            });
        } catch (err) {
            pushTrace("persistence-probe-error", {
                boardUrl: tracked.url,
                message: (err && err.message) ? err.message : String(err)
            });
        }
    }, PERSISTENCE_PROBE_DELAY_MS);
}

function cancelPendingGrace(reason) {
    const hadTimer = !!disableGraceTimer;
    const hadPending = !!graceDisablePending;
    if (!hadTimer && !hadPending) return;
    if (disableGraceTimer) {
        clearTimeout(disableGraceTimer);
        disableGraceTimer = null;
    }
    graceDisablePending = false;
    graceDisableStartedAt = 0;
    pushTrace("grace-disable-cancelled", { reason: reason || "state-change" });
}

function commitGraceDisable(reason, fallbackUrl) {
    if (!graceDisablePending && !disableGraceTimer) return;
    if (disableGraceTimer) {
        clearTimeout(disableGraceTimer);
        disableGraceTimer = null;
    }
    graceDisablePending = false;
    const startedAt = graceDisableStartedAt;
    graceDisableStartedAt = 0;
    const elapsedMs = startedAt ? (Date.now() - startedAt) : null;

    chrome.storage.local.get({ img: ["", false, false, null, true] }, (st) => {
        if (logChromeLastError("Error loading storage during grace disable")) {
            return;
        }
        const arr = Array.isArray(st.img) ? st.img : ["", false, false];
        const latestUrl = arr[0] || fallbackUrl || "";
        const latestEnabled = !!arr[1];
        const latestDirect = !!arr[2];
        const latestMultiBoardMode = MULTI_BOARD_MODE_ENABLED;

        if (latestEnabled) {
            pushTrace("grace-disable-aborted", {
                reason: "reenabled",
                trigger: reason || "unknown",
                img: [latestUrl, latestEnabled, latestDirect]
            });
            return;
        }

        pushTrace("grace-disable-commit", {
            reason: reason || "timer",
            elapsedMs,
            img: [latestUrl, latestEnabled, latestDirect]
        });
        updateRedirectRulesInternal(latestUrl, false, latestDirect, {
            skipGrace: true,
            multiBoardMode: latestMultiBoardMode,
            onApplied: () => {
                if (latestDirect && latestUrl) {
                    schedulePersistenceProbe(latestUrl);
                }
            }
        });
    });
}

function scheduleGraceDisable(reason, fallbackUrl) {
    if (!graceDisablePending) return;
    const now = Date.now();
    if (!graceDisableStartedAt) {
        graceDisableStartedAt = now;
    }

    const deadlineAt = graceDisableStartedAt + DIRECT_DISABLE_MAX_MS;
    const remainingMaxMs = deadlineAt - now;
    if (remainingMaxMs <= 0) {
        pushTrace("grace-disable-max-elapsed", {
            reason: reason || "quiet-period",
            maxMs: DIRECT_DISABLE_MAX_MS
        });
        commitGraceDisable("max-elapsed", fallbackUrl);
        return;
    }

    const delayMs = Math.min(DIRECT_DISABLE_GRACE_MS, remainingMaxMs);
    if (disableGraceTimer) {
        clearTimeout(disableGraceTimer);
        disableGraceTimer = null;
    }
    pushTrace("grace-disable-timer-reset", {
        reason: reason || "quiet-period",
        delayMs,
        remainingMaxMs
    });
    disableGraceTimer = setTimeout(() => {
        commitGraceDisable("quiet-period", fallbackUrl);
    }, delayMs);
}

if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
    try {
        chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
            const req = (info && info.request) ? info.request : {};
            const rule = (info && info.rule) ? info.rule : {};
            const normalizedReqUrl = normalizePaintBoardUrl(req.url || "");
            const claimedBoardUrl = normalizePaintBoardUrl(requestedPlacementBoardUrl || "");
            const multiBoardMode = !!currentRoutingState.multiBoardMode;

            if (rule.ruleId === 1 || rule.ruleId === 2) {
                const shouldSkipTracking = currentRoutingState.requestedEnabled
                    && !multiBoardMode
                    && !!claimedBoardUrl
                    && !!normalizedReqUrl
                    && normalizedReqUrl !== claimedBoardUrl;

                if (shouldSkipTracking) {
                    pushTrace("paint-board-track-skipped", {
                        reason: "claimed-board-mismatch",
                        ruleId: rule.ruleId || null,
                        boardUrl: normalizedReqUrl,
                        claimedBoardUrl
                    });
                } else {
                    trackRedirectedPaintBoard(rule.ruleId, req);
                }

                if (
                    currentRoutingState.requestedEnabled
                    && !multiBoardMode
                    && normalizedReqUrl
                    && !claimedBoardUrl
                ) {
                    requestedPlacementBoardUrl = normalizedReqUrl;
                    pushTrace("requested-placement-claimed", {
                        boardUrl: normalizedReqUrl,
                        ruleId: rule.ruleId || null,
                        resourceType: req.type || req.resourceType || ""
                    });
                    updateRedirectRulesInternal(currentRoutingState.safeImgUrl, true, currentRoutingState.directMode, {
                        skipGrace: true,
                        preserveRequestedSession: true,
                        multiBoardMode
                    });
                }

                if (normalizedReqUrl && normalizedReqUrl === getProtectedBoardUrl()) {
                    persistenceHoldLastMatchedAt = Date.now();
                }
            }

            if (rule.ruleId === 6) {
                trackHoldDiscoveryCandidate(req);
            }

            pushTrace("dnr-rule-match", {
                ruleId: rule.ruleId || null,
                request: {
                    url: req.url || "",
                    method: req.method || "",
                    resourceType: req.type || req.resourceType || "",
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

            // During direct-mode grace, just record paint_board matches; do not
            // auto-commit on first hit because save handoff can involve delayed requests.
            if (
                graceDisablePending
                && isPaintBoardRedirectRuleId(rule.ruleId)
                && currentRoutingState.enabled
                && !currentRoutingState.requestedEnabled
                && currentRoutingState.directMode
            ) {
                pushTrace("grace-disable-observed-match", {
                    ruleId: rule.ruleId,
                    request: {
                        url: req.url || "",
                        method: req.method || "",
                        resourceType: req.type || req.resourceType || "",
                        initiator: req.initiator || ""
                    }
                });
                if (isScopedBoardRedirectRuleId(rule.ruleId) && normalizedReqUrl) {
                    scheduleFinalizerBoardRelease(normalizedReqUrl, rule.ruleId);
                } else {
                    scheduleGraceDisable("activity-match", currentRoutingState.safeImgUrl);
                }
            }
        });
    } catch (err) {
        console.error("Failed to attach onRuleMatchedDebug listener:", err);
    }
}

function updateRedirectRules(imgUrl, enableRedirect, preferDirectTransparent) {
    updateRedirectRulesInternal(imgUrl, enableRedirect, preferDirectTransparent, { skipGrace: false });
}

function updateRedirectRulesInternal(imgUrl, enableRedirect, preferDirectTransparent, options = {}) {
    const skipGrace = !!options.skipGrace;
    const forceGraceStart = !!options.forceGraceStart;
    const forcePinnedEnable = !!options.forcePinnedEnable;
    const allowRestoredProtection = !!options.allowRestoredProtection;
    const preserveRequestedSession = !!options.preserveRequestedSession;
    const onApplied = (options && typeof options.onApplied === "function") ? options.onApplied : null;
    const requestedEnabled = !!enableRedirect;
    const directMode = !!preferDirectTransparent;
    const multiBoardMode = MULTI_BOARD_MODE_ENABLED;
    const safeImgUrl = (imgUrl || "").trim();
    const rawImgMeta = Object.prototype.hasOwnProperty.call(options, "imgMeta")
        ? options.imgMeta
        : currentRoutingState.imgMeta;
    const normalizedImgMeta = normalizeImgMeta(rawImgMeta);
    const hasValidUrl = !!(safeImgUrl && /^https?:\/\//i.test(safeImgUrl));
    const imageChanged = safeImgUrl !== currentRoutingState.safeImgUrl;

    if (!PERSISTENCE_HOLD_ENABLED && (persistenceHoldActive || persistenceHoldBoardUrl || pinnedBoardProtections.size)) {
        pinnedBoardProtections.clear();
        persistenceHoldActive = false;
        persistenceHoldBoardUrl = "";
        persistenceHoldLastMatchedAt = 0;
        restoredProtectionFastTrackUntil = 0;
        restoredProtectionBoardUrl = "";
        pushTrace("persistence-hold-cleared", {
            reason: "disabled"
        });
    }

    if ((!requestedEnabled || multiBoardMode) && requestedPlacementBoardUrl) {
        requestedPlacementBoardUrl = "";
    }

    const shouldResetProtectionSession = (!preserveRequestedSession && requestedEnabled)
        || (!requestedEnabled && !directMode)
        || !hasValidUrl
        || (imageChanged && !allowRestoredProtection);

    if (shouldResetProtectionSession) {
        const resetReason = requestedEnabled
            ? "redirect-requested"
            : (!directMode
                ? "direct-mode-disabled"
                : (!hasValidUrl ? "invalid-image-url" : "image-changed"));
        invalidateProtectionSession(resetReason, {
            clearTrackedBoard: imageChanged || !directMode || !hasValidUrl
        });
    }

    const shouldGraceDisable = DIRECT_DISABLE_GRACE_ENABLED
        && !skipGrace
        && !requestedEnabled
        && directMode
        && hasValidUrl
        && (!imageChanged || allowRestoredProtection)
        && !!normalizePaintBoardUrl(lastRedirectedPaintBoard.url)
        && (currentRoutingState.enabled === true || forceGraceStart);
    if (!requestedEnabled && !shouldGraceDisable && multiBoardTouchedBoards.size) {
        multiBoardTouchedBoards.clear();
        pushTrace("multi-board-touched-cleared", {
            reason: "redirect-disabled"
        });
    }
    if (!requestedEnabled && !shouldGraceDisable && recentBoardFinalizers.size) {
        recentBoardFinalizers.clear();
        pushTrace("recent-board-finalizers-cleared", {
            reason: "redirect-disabled"
        });
    }
    const shouldCarryPinnedHold = PERSISTENCE_HOLD_ENABLED && !imageChanged && persistenceHoldActive;
    const shouldPinEnabled = PERSISTENCE_HOLD_ENABLED
        && !requestedEnabled
        && directMode
        && hasValidUrl
        && (shouldCarryPinnedHold || forcePinnedEnable)
        && !!normalizePaintBoardUrl(persistenceHoldBoardUrl || lastRedirectedPaintBoard.url);
    const multiBoardGraceUrls = (shouldGraceDisable && multiBoardMode)
        ? getMultiBoardTouchedBoardUrls()
        : [];
    const recentFinalizerEntries = (shouldGraceDisable && multiBoardMode)
        ? getRecentBoardFinalizerEntries()
        : [];
    const shouldUseMultiBoardGraceRules = shouldGraceDisable
        && multiBoardMode
        && (recentFinalizerEntries.length > 0 || multiBoardGraceUrls.length > 0);
    const shouldScopeGraceToBoard = shouldGraceDisable
        && !multiBoardMode
        && !!normalizePaintBoardUrl(lastRedirectedPaintBoard.url);
    const claimedBoardUrl = (requestedEnabled && !multiBoardMode) ? normalizePaintBoardUrl(requestedPlacementBoardUrl) : "";
    const shouldScopeRequestedPlacementToBoard = requestedEnabled && !multiBoardMode && !!claimedBoardUrl;

    const holdBoardUrl = normalizePaintBoardUrl(persistenceHoldBoardUrl || lastRedirectedPaintBoard.url);
    const holdRegexFilter = shouldPinEnabled ? buildHoldRegexFilter(holdBoardUrl) : "";
    const graceBoardUrl = normalizePaintBoardUrl(lastRedirectedPaintBoard.url);
    const graceRegexFilter = shouldScopeGraceToBoard ? buildHoldRegexFilter(graceBoardUrl) : "";
    const scopedCurrentBoardUrl = shouldPinEnabled
        ? holdBoardUrl
        : (shouldScopeGraceToBoard ? graceBoardUrl : claimedBoardUrl);
    const scopedCurrentRegexFilter = scopedCurrentBoardUrl ? buildHoldRegexFilter(scopedCurrentBoardUrl) : "";
    const shouldUseScopedCurrentRules = shouldPinEnabled || shouldScopeGraceToBoard || shouldScopeRequestedPlacementToBoard;

    if (shouldPinEnabled && holdBoardUrl) {
        upsertPinnedBoardProtection(holdBoardUrl, safeImgUrl, directMode, {
            reason: forcePinnedEnable ? "force-pinned-enable" : "persistence-hold"
        });
    }

    const pinnedProtectionRules = (requestedEnabled && !shouldScopeRequestedPlacementToBoard)
        ? []
        : buildPinnedProtectionRules([
            shouldPinEnabled ? holdBoardUrl : "",
            shouldScopeGraceToBoard ? graceBoardUrl : "",
            shouldScopeRequestedPlacementToBoard ? claimedBoardUrl : ""
        ]);

    if (!shouldGraceDisable) {
        cancelPendingGrace("state-change");
    }

    const enabled = (
        (shouldGraceDisable && (!multiBoardMode || shouldUseMultiBoardGraceRules))
        || shouldPinEnabled
        || requestedEnabled
        || pinnedProtectionRules.length > 0
    );
    const currentTargets = buildRoutingTargets(safeImgUrl, directMode, normalizedImgMeta);
    const imageTargetUrl = currentTargets.imageTargetUrl;
    const compatTargetUrl = currentTargets.compatTargetUrl;
    currentRoutingState = {
        enabled,
        requestedEnabled,
        persistenceHoldActive: shouldPinEnabled,
        persistenceHoldBoardUrl: shouldPinEnabled ? holdBoardUrl : "",
        pinnedProtectionCount: getPinnedProtectionEntries().length,
        directMode,
        multiBoardMode,
        multiBoardGraceCount: shouldUseMultiBoardGraceRules ? (recentFinalizerEntries.length || multiBoardGraceUrls.length) : 0,
        recentFinalizerCount: recentBoardFinalizers.size,
        scopedBoardUrl: shouldPinEnabled ? holdBoardUrl : (shouldScopeGraceToBoard ? graceBoardUrl : ""),
        safeImgUrl,
        imageTargetUrl,
        compatTargetUrl,
        imgMeta: normalizedImgMeta,
        claimedBoardUrl,
        updatedAt: new Date().toISOString()
    };
    pushTrace("rules-update-requested", {
        routing: currentRoutingState
    });
    console.log("Updating rules. requestedEnable =", requestedEnabled, "activeEnable =", enabled, "directMode =", directMode, "imgUrl =", safeImgUrl);

    if (shouldGraceDisable) {
        if (!graceDisablePending) {
            graceDisableStartedAt = Date.now();
        }
        graceDisablePending = true;
        pushTrace("grace-disable-start", {
            quietMs: DIRECT_DISABLE_GRACE_MS,
            maxMs: DIRECT_DISABLE_MAX_MS,
            forceGraceStart,
            scopedBoardUrl: shouldScopeGraceToBoard ? graceBoardUrl : "",
            routing: currentRoutingState
        });
    }

    if (shouldPinEnabled) {
        pushTrace("persistence-hold-active", {
            forcePinnedEnable,
            routing: currentRoutingState
        });
    }

    const scopedAllowRule = {
        id: 6,
        priority: 1,
        action: {
            type: "allow"
        },
        condition: {
            urlFilter: "paint_board",
            resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"],
            requestMethods: ["get"]
        }
    };
    const shouldRedirectCurrentImages = requestedEnabled || shouldPinEnabled;
    const currentImageResourceTypes = directMode && requestedEnabled
        ? ["image", "xmlhttprequest"]
        : ["image"];
    const currentCompatResourceTypes = directMode && requestedEnabled
        ? ["sub_frame", "main_frame"]
        : ["xmlhttprequest", "sub_frame", "main_frame"];
    const currentProtectionRules = (hasValidUrl && shouldUseMultiBoardGraceRules)
        ? [
            ...(recentFinalizerEntries.length
                ? buildRecentBoardFinalizerRules(recentFinalizerEntries)
                : buildMultiBoardGraceRules(multiBoardGraceUrls, imageTargetUrl, compatTargetUrl)),
            scopedAllowRule
        ]
        : (hasValidUrl && (requestedEnabled || shouldGraceDisable || shouldPinEnabled))
            ? [
            ...(shouldRedirectCurrentImages ? [
                {
                    id: 1,
                    priority: shouldUseScopedCurrentRules ? 2 : 1,
                    action: {
                        type: "redirect",
                        redirect: {
                            url: imageTargetUrl
                        }
                    },
                    condition: {
                        ...(shouldUseScopedCurrentRules
                            ? { regexFilter: scopedCurrentRegexFilter }
                            : { urlFilter: "paint_board" }),
                        resourceTypes: currentImageResourceTypes,
                        requestMethods: ["get"]
                    }
                }
            ] : []),
            {
                id: 2,
                priority: shouldUseScopedCurrentRules ? 2 : 1,
                action: {
                    type: "redirect",
                    redirect: {
                        url: compatTargetUrl
                    }
                },
                condition: {
                    ...(shouldUseScopedCurrentRules
                        ? { regexFilter: scopedCurrentRegexFilter }
                        : { urlFilter: "paint_board" }),
                    resourceTypes: currentCompatResourceTypes,
                    requestMethods: ["get"]
                }
            },
            ...(shouldUseScopedCurrentRules ? [scopedAllowRule] : [])
        ]
            : [];

    const fallbackAllowRules = (!currentProtectionRules.length && hasValidUrl)
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
                    regexFilter: "^https:\\/\\/i\\.ibb\\.co\\/",
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
                    regexFilter: "^https:\\/\\/i\\.imgbb\\.com\\/",
                    resourceTypes: ["image", "xmlhttprequest", "sub_frame", "main_frame"]
                }
            }
        ]
        : [];
    const directCorsRules = (hasValidUrl && directMode)
        ? buildDirectCorsRules()
        : [];

    chrome.declarativeNetRequest.updateDynamicRules(
        {
            removeRuleIds: [1, 2, 3, 4, 5, 6, ...DIRECT_CORS_RULE_IDS, ...getPinnedProtectionRuleIds()],
            addRules: [
                ...currentProtectionRules,
                ...pinnedProtectionRules,
                ...fallbackAllowRules,
                ...directCorsRules
            ]
        },
        () => {
            if (logChromeLastError("Error updating rules")) {
                pushTrace("rules-update-error", {
                    message: getChromeLastErrorMessage() || "Unknown updateDynamicRules error",
                    routing: currentRoutingState
                });
                return;
            }

            console.log("Rules updated successfully.");
            chrome.declarativeNetRequest.getDynamicRules((rules) => {
                console.log("Active rules:", rules);
                pushTrace("rules-updated", {
                    routing: currentRoutingState,
                    rules: (rules || []).map((r) => ({
                        id: r.id,
                        actionType: r.action ? r.action.type : "",
                        resourceTypes: (r.condition && r.condition.resourceTypes) ? r.condition.resourceTypes : [],
                        redirectUrl: (r.action && r.action.redirect) ? (r.action.redirect.url || "") : "",
                        responseHeaders: (r.action && r.action.responseHeaders) ? r.action.responseHeaders : []
                    }))
                });

                persistProtectionState();

                if (shouldGraceDisable) {
                    scheduleGraceDisable("initial", safeImgUrl);
                }

                if (onApplied) {
                    try {
                        onApplied();
                    } catch (err) {
                        pushTrace("on-applied-callback-error", {
                            message: (err && err.message) ? err.message : String(err)
                        });
                    }
                }
            });
        }
    );
}

function buildRedirectTarget(imgUrl, imgMeta) {
    const safeImgUrl = (imgUrl || "").trim();
    const safeMeta = normalizeImgMeta(imgMeta);
    if (safeMeta.forceProxy) {
        return buildCompatTarget(safeImgUrl);
    }
    const unwrappedDirect = getDirectUrlFromYoworldProxy(safeImgUrl);
    if (isDirectTransparentPngUrl(unwrappedDirect)) {
        return unwrappedDirect;
    }
    if (isYoworldProxyUrl(safeImgUrl)) {
        return unwrappedDirect || safeImgUrl;
    }
    if (isDirectTransparentPngUrl(safeImgUrl)) {
        return safeImgUrl;
    }
    return buildCompatTarget(safeImgUrl);
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
        return { forceProxy: false, sourceHasTransparency: false, hasTransparency: false, sourceWidth: 0, sourceHeight: 0, mode: "", compatSaveUrl: "", compatSaveMode: "" };
    }
    const sourceWidth = Number(rawMeta.sourceWidth) || 0;
    const sourceHeight = Number(rawMeta.sourceHeight) || 0;
    const mode = typeof rawMeta.mode === "string" ? rawMeta.mode : "";
    const sourceHasTransparency = !!rawMeta.sourceHasTransparency;
    const hasTransparency = !!rawMeta.hasTransparency;
    const forceProxy = !!rawMeta.forceProxy && !sourceHasTransparency;
    const rawCompatSaveUrl = String(rawMeta.compatSaveUrl || "").trim();
    const compatSaveUrl = /^https?:\/\//i.test(rawCompatSaveUrl)
        ? buildCompatTarget(rawCompatSaveUrl)
        : "";
    const compatSaveMode = typeof rawMeta.compatSaveMode === "string" ? rawMeta.compatSaveMode : "";
    return {
        forceProxy,
        sourceHasTransparency,
        hasTransparency,
        sourceWidth,
        sourceHeight,
        mode,
        compatSaveUrl,
        compatSaveMode
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
    chrome.storage.local.get({ img: ["", false, false, null, true], [PROTECTION_STATE_KEY]: null }, (e) => {
        if (logChromeLastError("Error loading storage")) {
            return;
        }
        if (e.img && e.img.length) {
            mergePinnedProtectionsFromSnapshot(e[PROTECTION_STATE_KEY]);
            const storedImgUrl = (e.img[0] || "").trim();
            const safeImgUrl = buildCompatTarget(storedImgUrl);
            const requestedEnabled = !!e.img[1];
            const directMode = !!e.img[2];
            const imgMeta = (Array.isArray(e.img) && e.img.length > 3 && e.img[3] && typeof e.img[3] === "object")
                ? e.img[3]
                : null;
            const multiBoardMode = MULTI_BOARD_MODE_ENABLED;
            if (safeImgUrl && safeImgUrl !== storedImgUrl) {
                const migratedImg = Array.from(e.img);
                migratedImg[0] = safeImgUrl;
                pushTrace("legacy-proxy-url-migrated", {
                    from: storedImgUrl,
                    to: safeImgUrl
                });
                chrome.storage.local.set({ img: migratedImg }, () => {
                    if (logChromeLastError("Error migrating legacy proxy URL")) {
                        updateRedirectRulesInternal(safeImgUrl, requestedEnabled, directMode, {
                            skipGrace: true,
                            imgMeta,
                            multiBoardMode
                        });
                    }
                });
                return;
            }
            const restoredProtection = getRestorableProtectionState(
                e[PROTECTION_STATE_KEY],
                safeImgUrl,
                requestedEnabled,
                directMode
            );
            const restoredRecentTouch = restoreRecentTouchedBoardState(
                e[PROTECTION_STATE_KEY],
                safeImgUrl,
                directMode
            );
            const restoredRecentFinalizers = restoreRecentBoardFinalizerState(e[PROTECTION_STATE_KEY]);

            if (restoredProtection) {
                lastRedirectedPaintBoard = restoredProtection.lastRedirectedPaintBoard;
                persistenceHoldActive = true;
                persistenceHoldBoardUrl = restoredProtection.boardUrl;
                persistenceHoldLastMatchedAt = 0;
                restoredProtectionBoardUrl = restoredProtection.boardUrl;
                restoredProtectionFastTrackUntil = (Date.now() - restoredProtection.savedAt) >= RESTORED_HOLD_FAST_MIN_AGE_MS
                    ? (Date.now() + RESTORED_HOLD_FAST_WINDOW_MS)
                    : 0;
                pushTrace("protection-state-restored", {
                    boardUrl: restoredProtection.boardUrl,
                    savedAt: new Date(restoredProtection.savedAt).toISOString(),
                    ageMs: Date.now() - restoredProtection.savedAt,
                    fastTrack: restoredProtectionFastTrackUntil > 0
                });
            }

            pushTrace("settings-loaded", {
                img: [safeImgUrl, requestedEnabled, directMode, multiBoardMode]
            });
            updateRedirectRulesInternal(safeImgUrl, requestedEnabled, directMode, restoredProtection
                ? {
                    skipGrace: true,
                    forcePinnedEnable: true,
                    allowRestoredProtection: true,
                    imgMeta,
                    multiBoardMode
                }
                : {
                    skipGrace: false,
                    forceGraceStart: (restoredRecentTouch || restoredRecentFinalizers) && !requestedEnabled && directMode,
                    allowRestoredProtection: (restoredRecentTouch || restoredRecentFinalizers) && !requestedEnabled && directMode,
                    imgMeta,
                    multiBoardMode
                });
        } else {
            updateRedirectRulesInternal("https://i.imgur.com/j146uKh.png", false, false, {
                skipGrace: true,
                imgMeta: null,
                multiBoardMode: MULTI_BOARD_MODE_ENABLED
            });
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
        const next = changes.viewMode.newValue;
        const mode = (next === "popup" || next === "sidepanel") ? next : DEFAULT_VIEW_MODE;
        applyViewModeBehavior(mode);
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
