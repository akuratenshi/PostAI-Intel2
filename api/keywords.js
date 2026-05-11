// api/keywords.js
// Генерує ключові слова для Unsplash через Anthropic.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      model: "claude-sonnet-4-5",
        max_tokens: 60,
        messages: [
          {
            role:    "user",
            content: `3-5 English keywords comma-separated for Unsplash photo for social media post about: "${query}". Only keywords.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      // Якщо Anthropic повернув помилку — просто повертаємо сирий query
      return res.status(200).json({ keywords: query });
    }

    const data = await response.json();
    const keywords = (data.content?.[0]?.text ?? query)
      .trim()
      .split("\n")[0]
      .replace(/\./g, "");

    return res.status(200).json({ keywords });

  } catch (err) {
    console.error("keywords error:", err);
    // Не критична помилка — fallback на query
    return res.status(200).json({ keywords: req.body?.query ?? "" });
  }
}
