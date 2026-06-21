// api/schedule-post.js
// Принимает данные из формы и сохраняет в Supabase
// Поддерживает: разовый пост (конкретная дата/время) и регулярный (каждый день в указанное время)

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    user_email,
    channel_username,
    niche,
    topic,
    format,
    competitor,
    language,
    mode,              // 'once' | 'recurring'
    scheduled_at,       // для mode = 'once' — ISO строка
    recurrence_time,    // для mode = 'recurring' — "09:00" (UTC)
    recurrence_days,    // для mode = 'recurring' — "daily" | "weekdays" | "mon,wed,fri"
  } = req.body;

  if (!user_email || !channel_username) {
    return res.status(400).json({ error: 'user_email и channel_username обязательны' });
  }

  if (mode === 'once' && !scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at обязателен для разового поста' });
  }

  if (mode === 'recurring' && !recurrence_time) {
    return res.status(400).json({ error: 'recurrence_time обязателен для регулярного поста' });
  }

  try {
    let row;

    if (mode === 'recurring') {
      // Вычисляем ближайшее время следующего запуска
      const nextRun = computeNextRun(recurrence_time, recurrence_days || 'daily');
      row = {
        user_email,
        channel_username: normalizeChannel(channel_username),
        niche:      niche      || null,
        topic:      topic      || null,
        format:     format     || 'news',
        competitor: competitor || null,
        platform:   'telegram',
        language:   language   || 'ru',
        scheduled_at: nextRun,
        status: 'pending',
        is_recurring: true,
        recurrence_time,
        recurrence_days: recurrence_days || 'daily',
      };
    } else {
      row = {
        user_email,
        channel_username: normalizeChannel(channel_username),
        niche:      niche      || null,
        topic:      topic      || null,
        format:     format     || 'news',
        competitor: competitor || null,
        platform:   'telegram',
        language:   language   || 'ru',
        scheduled_at,
        status: 'pending',
        is_recurring: false,
      };
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(row),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Supabase insert error');
    }

    return res.status(200).json({ success: true, post: data[0] });

  } catch (err) {
    console.error('[schedule-post] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Приводит @channel или channel к единому формату с @
function normalizeChannel(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

// Вычисляет ISO-время следующего запуска для регулярного поста
// recurrence_time: "09:00" (часы:минуты UTC)
// recurrence_days: "daily" | "weekdays" | "mon,wed,fri"
function computeNextRun(time, days) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();

  const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  let allowedDays;

  if (days === 'daily') {
    allowedDays = [0, 1, 2, 3, 4, 5, 6];
  } else if (days === 'weekdays') {
    allowedDays = [1, 2, 3, 4, 5];
  } else {
    allowedDays = days.split(',').map(d => dayMap[d.trim().toLowerCase()]).filter(d => d !== undefined);
  }

  // Ищем ближайший подходящий день начиная с сегодня
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setUTCDate(now.getUTCDate() + offset);
    candidate.setUTCHours(hours, minutes, 0, 0);

    if (allowedDays.includes(candidate.getUTCDay()) && candidate > now) {
      return candidate.toISOString();
    }
  }

  // fallback — завтра в указанное время
  const fallback = new Date(now);
  fallback.setUTCDate(now.getUTCDate() + 1);
  fallback.setUTCHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}
