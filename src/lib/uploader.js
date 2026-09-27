import { getSettings } from './settings.js';
import { uploadToPicrd } from '../providers/picrd.js';
import { uploadToImgBB } from '../providers/uploadcare.js';

export async function uploadImage(file, opts={}){
  if (!file) throw new Error('No file provided');
  const settings = await getSettings();
  const host = opts.host || settings.quickUploadHost || 'picrd';
  if (host === 'picrd') return uploadToPicrd(file);
  if (host === 'imgbb') return uploadToImgBB(file, settings.imgbbKey);
  throw new Error('Unsupported image host.');
}
