export async function getSettings() {
  try {
    const data = await chrome.storage.sync.get({
      uploadcarePublicKey: "",
      uploadTimeoutMs: 25000,
      prefer: "uploadcare",
      storeUploads: "auto",
  quickUploadHost: "imgbb",
      imgbbKey: "",
      skewOrientation: "right", // 'right' | 'left'
      skewAutoResize: true,
      skewAdvanced: false,
  skewSlantPx: 70,
      skewHQ: true,
      skewCalibration: {
        right: null, // { corners: [ [x,y],...4 ] }
        left: null
      },
      skewPerspectivePct: 0,
      skewPresets: {
        right: { H: null, Hinv: null },
        left: { H: null, Hinv: null }
      }
    });
    return data;
  } catch (err) {
    console.warn("[settings] read failed, using defaults", err);
    return {
      uploadcarePublicKey: "",
      uploadTimeoutMs: 25000,
      prefer: "uploadcare",
      storeUploads: "auto",
  quickUploadHost: "imgbb",
      imgbbKey: "",
      skewOrientation: "right",
      skewAutoResize: true,
      skewAdvanced: false,
  skewSlantPx: 70,
      skewHQ: true,
      skewCalibration: {
        right: null,
        left: null
      },
      skewPerspectivePct: 0,
      skewPresets: {
        right: { H: null, Hinv: null },
        left: { H: null, Hinv: null }
      }
    };
  }
}

export async function setSettings(patch) {
  const curr = await getSettings();
  const next = { ...curr, ...patch };
  await chrome.storage.sync.set(next);
  return next;
}