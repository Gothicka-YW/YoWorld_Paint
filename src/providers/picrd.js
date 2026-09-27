export async function uploadToPicrd(file) {
  if (!file) throw new Error('No image was provided.');

  const form = new FormData();
  form.append('file', file, file.name || 'image.png');
  form.append('visibility', 'unlisted');

  const response = await fetch('https://picrd.com/api/upload', {
    method: 'POST',
    body: form,
    headers: { 'Accept': 'application/json' }
  });

  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* handled below */ }

  if (!response.ok) {
    const detail = json?.detail || json?.error || text.trim().slice(0, 140);
    const retry = response.status === 429 ? ' (rate limited — try again later)' : '';
    throw new Error(`Picrd HTTP ${response.status}${retry}${detail ? ` — ${detail}` : ''}`);
  }

  const directUrl = json?.image_url;
  if (!directUrl || !/^https:\/\/i\.picrd\.com\//i.test(directUrl)) {
    throw new Error('Picrd response did not include a valid direct image URL.');
  }
  return directUrl;
}
