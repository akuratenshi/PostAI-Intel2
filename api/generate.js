// api/generate.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3; // 3 бесплатных поста — один раз навсегда

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens = 1000, email } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    // Нормализуем email
    const normalizedEmail = email.toLowerCase().trim();
    const usageKey = `usage:${normalizedEmail}`;

    // Проверка лимита
    const used = Number((await redis.get(usageKey)) ?? 0);

    if (used >= FREE_LIMIT) {
      return res.status(429).json({
        error: "free_limit_reached",
        message: "Вы использовали все 3 бесплатных поста. Для продолжения оформите подписку.",
        used,
        limit: FREE_LIMIT,
        remaining: 0,
        upgradeRequired: true,
      });
    }

    // Вызов Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message ?? "Anthropic error",
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Увеличиваем счётчик только после успешного ответа
    const newCount = await redis.incr(usageKey);
    const remaining = Math.max(0, FREE_LIMIT - newCount);

    return res.status(200).json({
      text,
      usage: {
        used: newCount,
        limit: FREE_LIMIT,
        remaining,
        warning:
          remaining === 1
            ? "Остался 1 бесплатный пост. После этого потребуется подписка."
            : remaining === 0
            ? "Это был ваш последний бесплатный пост. Оформите подписку для продолжения."
            : null,
      },
    });
  } catch (err) {
    console.error("generate error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
