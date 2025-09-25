export async function uploadToCatbox({ blob, filename, signal }) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", blob, filename || "image.png");

  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form, signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${text}`, provider: "catbox" };
  }

  const text = await res.text();
  if (!/^https?:\/\//i.test(text)) {
    return { ok: false, error: text || "Catbox returned a non-URL response", provider: "catbox", raw: text };
  }
  return { ok: true, url: text.trim(), provider: "catbox", raw: text };
}