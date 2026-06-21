// api/user-channels.js
// GET    ?email=...                     → список каналов пользователя
// POST   { user_email, channel_username, channel_label } → добавить канал
// DELETE { id }                          → удалить канал

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

// ── Получить список каналов пользователя ──────────────────
async function handleGet(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email обязателен" });

  try {
    const url = `${SUPABASE_URL}/rest/v1/user_channels?user_email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc`;
    const response = await fetch(url, {
      headers: {
        apikey:        SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const channels = await response.json();
    return res.status(200).json({ channels });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Добавить новый канал ───────────────────────────────────
async function handlePost(req, res) {
  const { user_email, channel_username, channel_label } = req.body;

  if (!user_email || !channel_username) {
    return res.status(400).json({ error: "user_email и channel_username обязательны" });
  }

  const normalized = channel_username.trim().startsWith("@")
    ? channel_username.trim()
    : `@${channel_username.trim()}`;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:          SUPABASE_ANON_KEY,
        Authorization:   `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer:          "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_email,
        channel_username: normalized,
        channel_label: channel_label || null,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Ошибка добавления канала");

    return res.status(200).json({ success: true, channel: data[0] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Удалить канал ───────────────────────────────────────────
async function handleDelete(req, res) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id обязателен" });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_channels?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey:        SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
