export async function getSettings() {
  try {
    const data = await chrome.storage.sync.get({
      uploadcarePublicKey: "",
      uploadTimeoutMs: 25000,
      prefer: "uploadcare",
      storeUploads: "auto",
  quickUploadHost: "imgbb",
      imgbbKey: ""
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
      imgbbKey: ""
    };
  }
}

export async function setSettings(patch) {
  const curr = await getSettings();
  const next = { ...curr, ...patch };
  await chrome.storage.sync.set(next);
  return next;
}