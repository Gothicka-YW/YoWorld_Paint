export async function uploadToImgBB(file, apiKey){
	if (!apiKey) throw new Error('ImgBB API key missing.');
	const form = new FormData();
	// ImgBB accepts multipart with key=image
	form.append('image', file, file.name || 'image');
	// Optional: pass a name for nicer URLs (sanitized)
	try { if (file && file.name) form.append('name', (file.name || '').replace(/\.[a-zA-Z0-9]+$/, '').slice(0, 100)); } catch(_){}

	const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(endpoint, { method:'POST', body:form, headers: { 'Accept': 'application/json' } });

	// Read as text first to avoid JSON parse errors on HTML error pages
	const text = await res.text();
	let json = null;
	try { json = text ? JSON.parse(text) : null; } catch(_) { /* non-JSON (likely HTML error page) */ }

	if (!res.ok){
		const snippet = (text || '').trim().slice(0, 140).replace(/\s+/g, ' ');
		const retry = res.status === 429 ? ' (rate limited — try again later)' : '';
		throw new Error(`ImgBB HTTP ${res.status}${retry}${snippet ? ` — ${snippet}` : ''}`);
	}

	const direct = json?.data?.image?.url || json?.data?.url || json?.data?.display_url;
	if (!direct){
		const snippet = (text || '').trim().slice(0, 140).replace(/\s+/g, ' ');
		throw new Error(`ImgBB response missing URL${snippet ? ` — ${snippet}` : ''}`);
	}
	return direct;
}
