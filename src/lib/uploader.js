import { getSettings } from "./settings.js";
import { uploadToUploadcare } from "../providers/uploadcare.js";
import { uploadToCatbox } from "../providers/catbox.js";

function withTimeout(promiseFactory, ms, label = "operation") {
  if (!ms || ms <= 0) return promiseFactory();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(`${label} timed out after ${ms}ms`), ms);
  return Promise.race([
    promiseFactory(controller.signal),
    new Promise((_, rej) => controller.signal.addEventListener("abort", () => rej(new Error(`${label} timed out after ${ms}ms`))))
  ]).finally(() => clearTimeout(t));
}

export async function uploadImage({ blob, filename }, opts = {}) {
  const cfg = await getSettings();
  const timeoutMs = opts.timeoutMs ?? cfg.uploadTimeoutMs ?? 25000;
  const prefer = (opts.prefer ?? cfg.prefer ?? "uploadcare").toLowerCase();
  const store = opts.store ?? cfg.storeUploads ?? "auto";
  const publicKey = (opts.uploadcarePublicKey ?? cfg.uploadcarePublicKey || "").trim();

  const tryUploadcare = (signal) => uploadToUploadcare({ blob, filename, publicKey, store, signal });
  const tryCatbox = (signal) => uploadToCatbox({ blob, filename, signal });

  const tryWithTimeout = (fn, label) => withTimeout((signal) => fn(signal), timeoutMs, label);

  if (prefer === "catbox") {
    const r1 = await tryWithTimeout(tryCatbox, "Catbox upload").catch(err => ({ ok: false, error: String(err), provider: "catbox" }));
    if (r1.ok) return r1;
    const r2 = await tryWithTimeout(tryUploadcare, "Uploadcare upload").catch(err => ({ ok: false, error: String(err), provider: "uploadcare" }));
    return r2.ok ? r2 : r1.ok ? r1 : { ok: false, error: r2.error || r1.error || "All providers failed" };
  }

  if (publicKey) {
    const r1 = await tryWithTimeout(tryUploadcare, "Uploadcare upload").catch(err => ({ ok: false, error: String(err), provider: "uploadcare" }));
    if (r1.ok) return r1;
    const r2 = await tryWithTimeout(tryCatbox, "Catbox upload").catch(err => ({ ok: false, error: String(err), provider: "catbox" }));
    return r2.ok ? r2 : r1;
  } else {
    const r = await tryWithTimeout(tryCatbox, "Catbox upload").catch(err => ({ ok: false, error: String(err), provider: "catbox" }));
    return r;
  }
}