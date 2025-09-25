import { setSettings, getSettings } from "../lib/settings.js";
export async function mountResourcesTab(rootEl) {
  const keyInput = rootEl.querySelector('[data-id="uploadcare-public-key"]');
  const saveBtn = rootEl.querySelector('[data-id="save-uploadcare-key"]');
  const preferSelect = rootEl.querySelector('[data-id="upload-prefer"]');

  const state = await getSettings();
  if (keyInput) keyInput.value = state.uploadcarePublicKey || "";
  if (preferSelect) preferSelect.value = state.prefer || "uploadcare";

  saveBtn?.addEventListener("click", async () => {
    const newKey = keyInput?.value?.trim() || "";
    const prefer = preferSelect?.value || "uploadcare";
    await setSettings({ uploadcarePublicKey: newKey, prefer });
    const status = rootEl.querySelector('[data-id="save-status"]');
    if (status) { status.textContent = "Saved"; setTimeout(() => (status.textContent = ""), 1500); }
  });
}