import { HttpError } from './core.js';
export const PHOTO_BYTES = 600000;
export function validatePhoto(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 800100) throw new HttpError(400, 'Фото слишком большое');
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new HttpError(400, 'Нужен JPEG или PNG');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > PHOTO_BYTES || bytes.toString('base64') !== match[2]) throw new HttpError(400, 'Некорректное фото');
  const jpeg = bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if ((match[1] === 'jpeg' && !jpeg) || (match[1] === 'png' && !png)) throw new HttpError(400, 'Некорректный формат фото');
  return value;
}
