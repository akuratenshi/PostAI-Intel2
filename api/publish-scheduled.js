const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior Social Media Marketing specialist with 10+ years of experience creating viral content for Telegram. Write like a human, not like a machine. Your name is PostAI.

CORE RULES:
1. ALWAYS use web_search tool first to find current real information
2. NEVER invent facts, titles, statistics or names
3. Write in the language specified by the user
4. Do NOT include any XML tags, cite tags, or HTML in the output

OUTPUT FORMAT — return ONLY raw JSON, no markdown, no code fences:
{"post":"full post text","headline":"headline","hashtags":[],"cta":"call to action","sources_used":["source1"],"language":"ru","platform":"telegram","format":"top5","word_count":245}`;

function cleanPost(text) {
  if (!text) return text;
  return text
    .replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, '$1')
    .replace(/<\/?cite[^>]*>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isManual     = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isGet        = req.method === 'GET';

  if (!isVercelCron && !isManual && !isGet) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pendingPosts = await getPendingPosts();

    if (!pendingPosts || pendingPosts.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'Нет постов для публикации',
        published: 0,
        time: new Date().toISOString(),
      });
    }

    const results = [];

    for (const post of pendingPosts) {
      try {
        let content = post.post_text;

        if (!content) {
          content = await generatePost(post);
          await updatePostText(post.id, content);
        }

        const messageId = await sendToTelegram(post.channel_username, content);
        await markPublished(post.id, messageId);
        results.push({ id: post.id, status: 'published', channel: post.channel_username });

      } catch (err) {
        console.error(`[Cron] Ошибка поста ${post.id}:`, err.message);
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

async function getPendingPosts() {
  const now = new Date().toISOString();
  const url = `${SUPABASE_URL}/rest/v1/scheduled_posts?select=*&status=eq.pending&scheduled_at=lte.${now}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
    },
  });

  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

async function updatePostText(id, text) {
  await supabasePatch(`/rest/v1/scheduled_posts?id=eq.${id}`, { post_text: text });
}

async function markPublished(id, messageId) {
  await supabasePatch(`/rest/v1/scheduled_posts?id=eq.${id}`, {
    status:              'published',
    published_at:        new Date().toISOString(),
    telegram_message_id: messageId,
  });
}

async function markFailed(id, errorMessage) {
  await supabasePatch(`/rest/v1/scheduled_posts?id=eq.${id}`, {
    status:        'failed',
    error_message: errorMessage,
  });
}

async function supabasePatch(path, body) {
  await fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function generatePost(post) {
  const langMap   = { ru: 'Russian', uk: 'Ukrainian', en: 'English', de: 'German', es: 'Spanish' };
  const langLabel = langMap[post.language] || 'Russian';

  const userPrompt =
    `Generate exactly ONE social media post:\n` +
    `- Niche: ${post.niche || 'News'}\n` +
    `- Topic: ${post.topic || 'Choose the most trending topic right now'}\n` +
    `- Format: ${post.format || 'news'}\n` +
    `- Platform: ${post.platform || 'Telegram'}\n` +
    `- Output language: ${langLabel}\n` +
    (post.competitor ? `- Competitor: ${post.competitor}\n` : '') +
    `\nReturn ONLY raw JSON. No markdown. No code fences. No HTML tags.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-5',
      max_tokens: 2000,
      system:     SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic ${response.status}: ${err?.error?.message || 'error'}`);
  }

  const data    = await response.json();
  const rawText = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!rawText) throw new Error('Пустой ответ');

  let parsed;
  try {
    const start = rawText.indexOf('{');
    const end   = rawText.lastIndexOf('}');
    parsed = JSON.parse(start !== -1 ? rawText.slice(start, end + 1) : rawText);
  } catch {
    parsed = { post: rawText };
  }

  return cleanPost(parsed?.post || parsed?.text || rawText);
}

async function sendToTelegram(channelUsername, text) {
  const send = async (parseMode) => {
    const body = { chat_id: channelUsername, text };
    if (parseMode) body.parse_mode = parseMode;
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    return r.json();
  };

  let data = await send('Markdown');
  if (!data.ok) data = await send(null);
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
  return data.result.message_id;
}
