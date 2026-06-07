// api/publish-scheduled.js
// Этот файл вызывается Vercel Cron каждую минуту
// Проверяет таблицу scheduled_posts и публикует посты у которых пришло время

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const POSTAI_EMAIL     = process.env.POSTAI_EMAIL;

export default async function handler(req, res) {
  // Защита — только Vercel Cron может вызывать этот эндпоинт
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Получаем посты которые нужно опубликовать прямо сейчас
    const pendingPosts = await getPendingPosts();

    if (pendingPosts.length === 0) {
      return res.status(200).json({ message: 'Нет постов для публикации', published: 0 });
    }

    console.log(`[Cron] Найдено ${pendingPosts.length} постов для публикации`);

    const results = [];

    for (const post of pendingPosts) {
      try {
        let content = post.post_text;

        // Если текст поста не заполнен — генерируем через PostAI
        if (!content) {
          content = await generatePost(post);
          await updatePostText(post.id, content);
        }

        // Публикуем в Telegram
        const messageId = await sendToTelegram(post.channel_username, content);

        // Помечаем как опубликованный
        await markPublished(post.id, messageId);

        results.push({ id: post.id, status: 'published', channel: post.channel_username });
        console.log(`[Cron] ✅ Опубликован пост ${post.id} в ${post.channel_username}`);

      } catch (err) {
        console.error(`[Cron] ❌ Ошибка поста ${post.id}:`, err.message);
        await markFailed(post.id, err.message);
        results.push({ id: post.id, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({
      message: `Обработано ${pendingPosts.length} постов`,
      published: results.filter(r => r.status === 'published').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });

  } catch (err) {
    console.error('[Cron] Критическая ошибка:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Supabase: получить посты для публикации ──────────────
async function getPendingPosts() {
  const now = new Date().toISOString();

  const response = await supabaseFetch(
    `/rest/v1/scheduled_posts?status=eq.pending&scheduled_at=lte.${now}&select=*`,
    'GET'
  );

  return response;
}

// ── Supabase: обновить текст поста ───────────────────────
async function updatePostText(id, text) {
  await supabaseFetch(
    `/rest/v1/scheduled_posts?id=eq.${id}`,
    'PATCH',
    { post_text: text }
  );
}

// ── Supabase: пометить как опубликованный ────────────────
async function markPublished(id, messageId) {
  await supabaseFetch(
    `/rest/v1/scheduled_posts?id=eq.${id}`,
    'PATCH',
    {
      status: 'published',
      published_at: new Date().toISOString(),
      telegram_message_id: messageId,
    }
  );
}

// ── Supabase: пометить как ошибка ────────────────────────
async function markFailed(id, errorMessage) {
  await supabaseFetch(
    `/rest/v1/scheduled_posts?id=eq.${id}`,
    'PATCH',
    {
      status: 'failed',
      error_message: errorMessage,
    }
  );
}

// ── PostAI: сгенерировать пост ───────────────────────────
async function generatePost(post) {
  const prompt =
    `Niche: ${post.niche || 'Новости'}\n` +
    (post.topic ? `Topic: ${post.topic}\n` : '') +
    `Format: ${post.format || 'Новость'}\n` +
    `Platform: ${post.platform || 'Telegram'}\n` +
    `Output language: 🇷🇺 Русский\n` +
    (post.competitor ? `Competitor channel for style analysis: ${post.competitor}\n` : '') +
    `\nIMPORTANT:\n` +
    `1. First use web_search to find current, real information\n` +
    `2. Search globally, not limited to Russian-speaking content\n` +
    `3. Write the final post in Russian language\n` +
    `4. Generate ONE post only — not two, not three, exactly one\n` +
    `5. Return result as a raw JSON object — no markdown, no code fences, no extra text`;

  const response = await fetch('https://postai.ink/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: POSTAI_EMAIL,
      maxTokens: 2000,
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`PostAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.post || data.text;

  if (!content) throw new Error('PostAI вернул пустой ответ');
  return content;
}

// ── Telegram: отправить сообщение ───────────────────────
async function sendToTelegram(channelUsername, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelUsername,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result.message_id;
}

// ── Supabase: базовый fetch ──────────────────────────────
async function supabaseFetch(path, method, body) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (method === 'GET') {
    return response.json();
  }
  return response;
}
