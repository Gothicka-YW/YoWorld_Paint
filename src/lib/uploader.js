import { getSettings } from './settings.js';
import { uploadToImgBB } from '../providers/uploadcare.js';

export async function uploadImage(file, opts={}){
  if (!file) throw new Error('No file provided');
  const settings = await getSettings();
  const host = opts.host || settings.quickUploadHost || 'imgbb';
  if (host !== 'imgbb') throw new Error('Only ImgBB is supported now.');
  return uploadToImgBB(file, settings.imgbbKey);
}