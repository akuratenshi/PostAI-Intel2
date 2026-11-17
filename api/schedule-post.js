import { endpoint, HttpError } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { db, ownedChannel } from '../server/db.js';
import { rateLimit } from '../server/quota.js';
import { scheduleRow } from '../server/schedule.js';

export default endpoint(['GET', 'POST'], async req => {
  const user = await authenticate(req);

  if (req.method === 'GET') {
    const posts = await db('scheduled_posts', {
      query: {
        user_id: `eq.${user.id}`,
        status: 'in.(pending,processing,publishing,unknown)',
        order: 'scheduled_at.asc',
        limit: 100,
      },
    });

    return { posts };
  }

  const body = req.body || {};

  if (body.action === 'cancel') {
    if (
      typeof body.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(body.id)
    ) {
      throw new HttpError(400, 'Invalid task ID');
    }

    const removed = await db('scheduled_posts', {
      method: 'DELETE',
      query: {
        id: `eq.${body.id}`,
        user_id: `eq.${user.id}`,
        status: 'eq.pending',
      },
    });

    if (!removed.length) {
      throw new HttpError(
        409,
        'Задача уже обрабатывается или недоступна. Обновите список.'
      );
    }

    return { success: true };
  }

  if (body.action !== undefined) {
    throw new HttpError(400, 'Invalid action');
  }

  const row = scheduleRow(body, user);

  await ownedChannel(user.id, row.channel_username);
  await rateLimit(user.id, 'schedule', 20);

  const posts = await db('scheduled_posts', {
    method: 'POST',
    body: row,
  });

  return {
    success: true,
    post: posts[0],
  };
});
