import { required, HttpError } from './core.js';
import { validatePhoto } from './photo.js';
export async function telegram(method, body) {
  const multipart = body instanceof FormData;
  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${required('TELEGRAM_BOT_TOKEN')}/${method}`, {
      method: 'POST',
      headers: multipart ? undefined : { 'Content-Type': 'application/json' },
      body: multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Telegram rejected request');
    return data.result;
  } catch {
    // Never automatically resend: Telegram may have accepted a timed-out request.
    throw new HttpError(502, 'Результат отправки неизвестен. Проверьте Telegram-канал перед повторной публикацией.');
  }
}
export async function sendText(channel, text, photoData = null) {
  const photo = validatePhoto(photoData);
  const limit = photo ? 900 : 4096;
  if (typeof text !== 'string' || !text.trim() || text.length > limit) throw new HttpError(400, `Текст должен содержать от 1 до ${limit} символов`);
  if (!photo) {
    const message = await telegram('sendMessage', { chat_id: channel, text });
    return message.message_id;
  }
  const [header, base64] = photo.split(',');
  const mime = header.includes('image/png') ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  form.set('chat_id', channel);
  form.set('caption', text);
  form.set('photo', new Blob([Buffer.from(base64, 'base64')], { type: mime }), mime === 'image/png' ? 'photo.png' : 'photo.jpg');
  const message = await telegram('sendPhoto', form);
  return message.message_id;
}
