import { randomUUID } from 'node:crypto';
import { nextRun } from './schedule.js';
import { validatePhoto } from './photo.js';
export async function processOne(deps) {
  const { db, ownedChannel, generateContent, reserve, sendText } = deps;
  const now = new Date().toISOString();
  const posts = await db('scheduled_posts', { query: { status: 'eq.pending', user_id: 'not.is.null', scheduled_at: `lte.${now}`, order: 'scheduled_at.asc', limit: 1 } });
  if (!posts.length) return { processed: 0 };
  const post = posts[0], claim = randomUUID();
  const update = body => db('scheduled_posts', { method: 'PATCH', query: { id: `eq.${post.id}`, claim_token: `eq.${claim}` }, body });
  const claimed = await db('scheduled_posts', { method: 'PATCH', query: { id: `eq.${post.id}`, status: 'eq.pending' }, body: { status: 'processing', claim_token: claim, processing_started_at: now, error_message: null } });
  if (!claimed.length) return { processed: 0 };
  let sending = false;
  try {
    await ownedChannel(post.user_id, post.channel_username);
    const photo = validatePhoto(post.photo_data);
    let content = post.post_text;
    if (content?.trim().startsWith('{')) {
      try { const value = JSON.parse(content); if (typeof value.post === 'string') content = value.post; } catch {}
    }
    if (!content) {
      const quota = await reserve({ id: post.user_id, email: post.user_email });
      try { content = (await generateContent({ ...post, withPhoto: Boolean(photo) })).post; }
      catch (error) { await quota.refund(); throw error; }
      await update({ post_text: content });
    }
    if (typeof content !== 'string' || !content.trim() || content.length > (photo ? 900 : 4096)) throw new Error(photo ? 'Сократите подпись до 900 символов' : 'Invalid Telegram text length');
    // Calculate recurrence before sending so invalid settings cannot cause a partial success.
    const next = post.is_recurring ? nextRun(post.recurrence_time, post.recurrence_days, new Date()) : null;
    await update({ status: 'publishing' });
    sending = true;
    const messageId = await sendText(post.channel_username, content, photo);
    const body = { status: 'published', published_at: new Date().toISOString(), telegram_message_id: messageId, error_message: null, claim_token: null, processing_started_at: null };
    if (post.is_recurring) Object.assign(body, { status: 'pending', scheduled_at: next, post_text: null });
    else body.photo_data = null;
    await update(body);
    return { processed: 1, status: post.is_recurring ? 'rescheduled' : 'published', id: post.id };
  } catch (error) {
    try { await update({ status: sending ? 'unknown' : 'failed', error_message: String(error.message).slice(0,300), claim_token: null, processing_started_at: null }); } catch {}
    return { processed: 1, status: sending ? 'unknown' : 'failed', id: post.id };
  }
}
