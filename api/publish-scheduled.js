// api/publish-scheduled.js
// Vercel Cron — каждую минуту проверяет scheduled_posts и публикует

const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior Social Media Marketing specialist with 10+ years of experience
creating viral content for Telegram, Instagram, Facebook, and Threads.
You have deep expertise in audience psychology, engagement mechanics,
copywriting, and content strategy across multiple languages and markets.
You know exactly what makes people stop scrolling, read to the end,
save a post, and share it. You write like a human, not like a machine.
Your name is PostAI. Your goal is to create content that performs.

CORE RULES:
1. ALWAYS use web_search tool first to find current real information
2. NEVER invent facts, titles, statistics or names
3. Write in the language specified by the user
4. Search globally in English, then write in the target language

OUTPUT FORMAT — return ONLY raw JSON, no markdown, no code fences:
{"post":"full post text","headline":"headline","hashtags":[],"cta":"call to action","sources_used":["source1"],"language":"ru","platform":"telegram","format":"top5","word_count":245}`;

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isManual     = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isGet        = req.method === 'GET';

  if (!isVercelCron && !isManual && !isGet) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pendingPosts = await getPendingPosts();

    if (pendingPosts.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'Нет постов для публикации',
        published: 0,
        time: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Найдено ${pendingPosts.length} постов`);
    const results = [];

    for (const post of pendingPosts) {
      try {
        let content = post.post_text;

        // Если текст не заполнен — генерируем через Anthropic API
        if (!content) {
          console.log(`[Cron] Генерирую пост для ${post.channel_username}...`);
          content = await generatePost(post);
          await updatePostText(post.id, content);
        }

        // Публикуем в Telegram
        const messageId = await sendToTelegram(post.channel_username, content);
        await markPublished(post.id, messageId);

        results.push({ id: post.id, status: 'published', channel: post.channel_username });
        console.log(`[Cron] ✅ Опубликован в ${post.channel_username}`);

      } catch (err) {
        console.error(`[Cron] ❌ Ошибка поста ${post.id}:`, err.message);
        await markFailed(post.id, err.message);
        results.push({ id: post.id, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({
      ok: true,
      published: results.filter(r => r.status === 'published').length,
      failed:    results.filter(r => r.status === 'failed').length,
      results,
    });

  } catch (err) {
    console.error('[Cron] Критическая ошибка:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ── Anthropic API: генерация поста ───────────────────────
async function generatePost(post) {
  const langMap = { ru: 'Russian', uk: 'Ukrainian', en: 'English', de: 'German', es: 'Spanish' };
  const langLabel = langMap[post.language] || 'Russian';

  const userPrompt =
    `Generate exactly ONE social media post with these parameters:\n` +
    `- Niche: ${post.niche || 'News'}\n` +
    `- Topic: ${post.topic || 'Choose the most trending topic in this niche right now'}\n` +
    `- Format: ${post.format || 'news'}\n` +
    `- Platform: ${post.platform || 'Telegram'}\n` +
    `- Output language: ${langLabel}\n` +
    (post.competitor ? `- Competitor channels for style reference: ${post.competitor}\n` : '') +
    `\nIMPORTANT:\n` +
    `1. First use web_search to find current, real information\n` +
    `2. Search globally, not limited to ${langLabel}-speaking content\n` +
    `3. Write the final post in ${langLabel} language\n` +
    `4. Generate ONE post only — exactly one\n` +
    `5. Return result as a raw JSON object — no markdown, no code fences, no extra text`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-5',
      max_tokens: 2000,
      system:     SYSTEM_PROMPT,
      tools: [{
        type:     'web_search_20250305',
        name:     'web_search',
        max_uses: 3,
      }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API ${response.status}: ${err?.error?.message || 'unknown error'}`);
  }

  const data = await response.json();

  const rawText = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  if (!rawText) throw new Error('Anthropic вернул пустой ответ');

  // Парсим JSON из ответа
  let parsed = null;
  try {
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      parsed = JSON.parse(fenceMatch[1].trim());
    } else {
      const start = rawText.indexOf('{');
      const end   = rawText.lastIndexOf('}');
      if (start !== -1 && end > start) {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } else {
        parsed = JSON.parse(rawText);
      }
    }
  } catch {
    parsed = { post: rawText };
  }

  const content = parsed?.post || parsed?.text || rawText;
  if (!content) throw new Error('Не удалось извлечь текст поста');
  return content;
}

// ── Telegram: отправка ────────────────────────────────────
async function sendToTelegram(channelUsername, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:                  channelUsername,
        text,
        parse_mode:               'Markdown',
        disable_web_page_preview: false,
      }),
    }
  );

  const data = await response.json();
  if (!data.ok) {
    // Пробуем без Markdown если ошибка форматирования
    if (data.description?.includes('parse')) {
      const retry = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: channelUsername, text }),
        }
      );
      const retryData = await retry.json();
      if (!retryData.ok) throw new Error(`Telegram: ${retryData.description}`);
      return retryData.result.message_id;
    }
    throw new Error(`Telegram: ${data.description}`);
  }
  return data.result.message_id;
}

// ── Supabase ──────────────────────────────────────────────
async function getPendingPosts() {
  const now = new Date().toISOString();
  return supabaseFetch(
    `/rest/v1/scheduled_posts?status=eq.pending&scheduled_at=lte.${encodeURIComponent(now)}&select=*`,
    'GET'
  );
}

async function updatePostText(id, text) {
  await supabaseFetch(`/rest/v1/scheduled_posts?id=eq.${id}`, 'PATCH', { post_text: text });
}

async function markPublished(id, messageId) {
  await supabaseFetch(`/rest/v1/scheduled_posts?id=eq.${id}`, 'PATCH', {
    status:             'published',
    published_at:       new Date().toISOString(),
    telegram_message_id: messageId,
  });
}

async function markFailed(id, errorMessage) {
  await supabaseFetch(`/rest/v1/scheduled_posts?id=eq.${id}`, 'PATCH', {
    status:        'failed',
    error_message: errorMessage,
  });
}

async function supabaseFetch(path, method, body) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (method === 'GET') return response.json();
  return response;
}
