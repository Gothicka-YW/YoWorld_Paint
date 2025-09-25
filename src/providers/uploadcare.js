export async function uploadToUploadcare({ blob, filename, publicKey, store = "auto", signal }) {
  if (!publicKey) {
    return { ok: false, error: "Missing Uploadcare public key", provider: "uploadcare" };
  }
  const form = new FormData();
  form.append("UPLOADCARE_PUB_KEY", publicKey);
  form.append("UPLOADCARE_STORE", store);
  form.append("file", blob, filename || "image.png");

  const res = await fetch("https://upload.uploadcare.com/base/", { method: "POST", body: form, signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${text}`, provider: "uploadcare" };
  }

  const data = await res.json().catch(() => ({}));
  const uuid = data && data.file;
  if (!uuid) {
    return { ok: false, error: "No UUID returned from Uploadcare", provider: "uploadcare", raw: data };
  }
  const safeName = encodeURIComponent(filename || "image.png");
  const url = `https://ucarecdn.com/${uuid}/${safeName}`;
  return { ok: true, url, provider: "uploadcare", uuid, raw: data };
}