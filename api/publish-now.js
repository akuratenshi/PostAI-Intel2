// api/publish-now.js
// Публикует пост в Telegram немедленно, без постановки в очередь Supabase

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channel_username, post_text } = req.body;

  if (!channel_username || !post_text) {
    return res.status(400).json({ error: "channel_username и post_text обязательны" });
  }

  try {
    const messageId = await sendToTelegram(channel_username, post_text);
    return res.status(200).json({ success: true, message_id: messageId });
  } catch (err) {
    console.error("[publish-now] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function sendToTelegram(channelUsername, text) {
  const send = async (parseMode) => {
    const body = { chat_id: channelUsername, text };
    if (parseMode) body.parse_mode = parseMode;
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    return r.json();
  };

  // Сначала пробуем с Markdown форматированием
  let data = await send("Markdown");
  // Если не получилось (например, неэкранированные спецсимволы) — пробуем без форматирования
  if (!data.ok) data = await send(null);
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);

  return data.result.message_id;
}
