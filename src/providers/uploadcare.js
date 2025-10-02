export async function uploadToImgBB(file, apiKey){
	if (!apiKey) throw new Error('ImgBB API key missing.');
	const form = new FormData();
	form.append('image', file, file.name || 'image');
	const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(endpoint, { method:'POST', body:form });
	const json = await res.json();
	if (!res.ok) throw new Error(`ImgBB HTTP ${res.status}`);
	const direct = json?.data?.image?.url || json?.data?.url || json?.data?.display_url;
	if (!direct) throw new Error('ImgBB response missing URL');
	return direct;
}
