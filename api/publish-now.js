import { endpoint, channelName, text } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { ownedChannel } from '../server/db.js';
import { rateLimit } from '../server/quota.js';
import { sendText } from '../server/telegram.js';
import { validatePhoto } from '../server/photo.js';
export default endpoint(['POST'], async req => {
  const user = await authenticate(req);
  const name = channelName(req.body?.channel_username);
  const photo = validatePhoto(req.body?.photo_data);
  const content = text(req.body?.post_text, photo ? 900 : 4096);
  await ownedChannel(user.id, name);
  await rateLimit(user.id, 'publish', 20);
  return { success: true, message_id: await sendText(name, content, photo) };
});
