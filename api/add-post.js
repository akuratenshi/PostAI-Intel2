// api/add-post.js
// Добавляет новый запланированный пост в Supabase
// Вызывается с фронтенда или из Telegram-бота

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    user_email,
    channel_username,  // @mychannel или -1001234567890
    niche,             // sport, crypto, cinema...
    topic,             // опционально — конкретная тема
    format,            // top5, news, review...
    platform,          // telegram
    competitor,        // @competitor_channel (опционально)
    scheduled_at,      // ISO строка: "2026-06-07T09:00:00Z"
    post_text,         // готовый текст (опционально, иначе сгенерируем)
  } = req.body;

  // Валидация обязательных полей
  if (!user_email || !channel_username || !scheduled_at) {
    return res.status(400).json({
      error: 'Обязательные поля: user_email, channel_username, scheduled_at'
    });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_email,
        channel_username,
        niche:       niche      || null,
        topic:       topic      || null,
        post_text:   post_text  || null,
        platform:    platform   || 'telegram',
        competitor:  competitor || null,
        format:      format     || 'news',
        scheduled_at,
        status: 'pending',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка Supabase');
    }

    return res.status(200).json({
      success: true,
      post: data[0],
    });

  } catch (err) {
    console.error('[add-post] Ошибка:', err);
    return res.status(500).json({ error: err.message });
  }
}
