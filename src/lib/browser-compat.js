(function initYoWorldPaintBrowserCompat(root) {
  if (root.YWPCompat) return;

  const api = root.chrome;
  let forceLocalSettings = false;

  function getLastErrorMessage() {
    const error = api?.runtime?.lastError;
    return error && (error.message || String(error));
  }

  function getLocalArea() {
    const area = api?.storage?.local;
    return area && typeof area.get === 'function' && typeof area.set === 'function'
      ? area
      : null;
  }

  function getSyncArea() {
    if (forceLocalSettings) return null;
    const area = api?.storage?.sync;
    return area && typeof area.get === 'function' && typeof area.set === 'function'
      ? area
      : null;
  }

  function readArea(area, defaults) {
    return new Promise((resolve, reject) => {
      try {
        area.get(defaults, (result) => {
          const errorMessage = getLastErrorMessage();
          if (errorMessage) reject(new Error(errorMessage));
          else resolve(result || { ...defaults });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function writeArea(area, values) {
    return new Promise((resolve, reject) => {
      try {
        area.set(values, () => {
          const errorMessage = getLastErrorMessage();
          if (errorMessage) reject(new Error(errorMessage));
          else resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function settingsGet(defaults = {}) {
    const syncArea = getSyncArea();
    if (syncArea) {
      try {
        return await readArea(syncArea, defaults);
      } catch (error) {
        forceLocalSettings = true;
        console.warn('[compat] Sync storage unavailable; using local storage.', error);
      }
    }

    const localArea = getLocalArea();
    if (!localArea) return { ...defaults };
    return readArea(localArea, defaults);
  }

  async function settingsSet(values) {
    const syncArea = getSyncArea();
    if (syncArea) {
      try {
        await writeArea(syncArea, values);
        return 'sync';
      } catch (error) {
        forceLocalSettings = true;
        console.warn('[compat] Sync storage unavailable; saving locally.', error);
      }
    }

    const localArea = getLocalArea();
    if (!localArea) throw new Error('Browser storage is unavailable.');
    await writeArea(localArea, values);
    return 'local';
  }

  function hasSidePanel() {
    const sidePanel = api?.sidePanel;
    return !!(
      sidePanel &&
      typeof sidePanel.setOptions === 'function' &&
      typeof sidePanel.setPanelBehavior === 'function'
    );
  }

  function hasRedirectRules() {
    const dnr = api?.declarativeNetRequest;
    return !!(
      dnr &&
      typeof dnr.updateDynamicRules === 'function' &&
      typeof dnr.getDynamicRules === 'function'
    );
  }

  root.YWPCompat = Object.freeze({
    hasRedirectRules,
    hasSidePanel,
    settingsGet,
    settingsSet,
  });
})(globalThis);
