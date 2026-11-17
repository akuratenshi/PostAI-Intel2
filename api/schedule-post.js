import { endpoint, HttpError } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { db, ownedChannel } from '../server/db.js';
import { rateLimit } from '../server/quota.js';
import { validatePhoto } from '../server/photo.js';
import { scheduleRow } from '../server/schedule.js';

export default endpoint(['GET', 'POST'], async req => {
  const user = await authenticate(req);
  if (req.method === 'GET') {
    const posts = await db('scheduled_posts', { query: {
      user_id: `eq.${user.id}`,
      status: 'in.(pending,processing,publishing,unknown)',
      order: 'scheduled_at.asc',
      limit: 100,
      select: 'id,channel_username,status,scheduled_at,is_recurring,recurrence_time,recurrence_days',
    } });
    return { posts };
  }
  const body = req.body || {};
  if (body.action === 'cancel') {
    if (typeof body.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(body.id)) {
      throw new HttpError(400, 'Invalid task ID');
    }
    // The pending condition makes cancellation race safely with the worker claim.
    const removed = await db('scheduled_posts', { method: 'DELETE', query: {
      id: `eq.${body.id}`, user_id: `eq.${user.id}`, status: 'eq.pending',
    } });
    if (!removed.length) {
      throw new HttpError(409, 'Задача уже обрабатывается или недоступна. Обновите список.');
    }
    return { success: true };
  }
  if (body.action !== undefined) throw new HttpError(400, 'Invalid action');
  const row = scheduleRow(body, user);
  row.photo_data = validatePhoto(body.photo_data);
  if (row.photo_data && row.post_text && row.post_text.length > 900) throw new HttpError(400, 'Сократите подпись до 900 символов');
  await ownedChannel(user.id, row.channel_username);
  await rateLimit(user.id, 'schedule', 20);
  const posts = await db('scheduled_posts', { method: 'POST', body: row });
  return { success: true, post: posts[0] ? { id: posts[0].id, scheduled_at: posts[0].scheduled_at } : null };
});
