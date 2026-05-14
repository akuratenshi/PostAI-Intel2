// api/generate.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;
const ADMIN_EMAILS = ["akuratenshii@gmail.com", "v.crypto.t@gmail.com"];

// ─── Системный промпт ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — профессиональный SMM-копирайтер и контент-стратег.
Ты специализируешься на создании вирального, вовлекающего контента для социальных сетей.

АЛГОРИТМ:
1. Сначала найди актуальные новости и данные по теме через web_search.
2. Если тема не указана — выбери самую горячую тему в нише прямо сейчас.
3. Если указаны конкуренты — изучи их стиль через web_search, сделай посты заметно лучше.
4. Напиши 3 варианта поста, каждый с кардинально разным углом подачи.

ПРАВИЛА ФОРМАТОВ:
- Топ-5: Хук → нумерованный список с пояснениями → вывод + CTA
- Новость: Хук-заголовок → суть → контекст → оценка → CTA
- Обзор: Хук → плюсы → минусы → для кого → оценка → CTA
- Советы: Хук → 3-5 советов с пояснением → итог → CTA
- История: Хук → завязка → кульминация → вывод → CTA
- Мнение: Провокационный тезис → аргументы → позиция → CTA

АДАПТАЦИЯ ПОД ПЛАТФОРМУ:
- Telegram: 800-1500 символов, эмодзи умеренно, хештеги не обязательны
- Instagram: 300-800 символов, 5-10 хештегов в конце, активные эмодзи
- Facebook: 400-1000 символов, разговорный стиль, минимум хештегов

СТРОГИЕ ПРАВИЛА:
- НЕ выдумывай факты, даты, события — только реальные данные из поиска
- Каждый из 3 вариантов ОБЯЗАН отличаться по структуре и углу подачи
- Каждый пост начинай СТРОГО с маркера: ===ПОСТ 1===, ===ПОСТ 2===, ===ПОСТ 3===
- Каждый пост должен быть готов к публикации без правок
- Первые 1-2 строки — сильный хук (интрига, цифра, вопрос или провокация)
- Заканчивай призывом к действию (вопрос, репост, подписка)`;

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens = 2000, email } = req.body;

    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    if (!email)  return res.status(400).json({ error: "email is required" });

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    const usageKey = `usage:${normalizedEmail}`;

    // Проверка лимита
    if (!isAdmin) {
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
    }

    // Вызов Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14", // включаем если нужно, иначе убери
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 2,
          },
        ],
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic error:", JSON.stringify(err));

      // Отдельная обработка ошибки биллинга
      if (response.status === 529 || err.error?.type === "overloaded_error") {
        return res.status(503).json({ error: "Сервис временно перегружен. Попробуйте через минуту." });
      }

      return res.status(response.status).json({
        error: err.error?.message ?? "Anthropic error",
      });
    }

    const data = await response.json();

    // Собираем только текстовые блоки (пропускаем tool_use и tool_result)
    const text = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return res.status(500).json({ error: "Модель не вернула текст. Попробуйте снова." });
    }

    // Счётчик
    let newCount = FREE_LIMIT;
    if (!isAdmin) {
      newCount = await redis.incr(usageKey);
      // TTL 30 дней — сброс лимита раз в месяц (опционально)
      // await redis.expire(usageKey, 60 * 60 * 24 * 30);
    }

    const remaining = isAdmin ? 999 : Math.max(0, FREE_LIMIT - newCount);

    return res.status(200).json({
      text,
      usage: {
        used:      isAdmin ? 0 : newCount,
        limit:     isAdmin ? 999 : FREE_LIMIT,
        remaining,
        warning:
          !isAdmin && remaining === 1
            ? "Остался 1 бесплатный пост. После этого потребуется подписка."
            : !isAdmin && remaining === 0
            ? "Это был ваш последний бесплатный пост. Оформите подписку для продолжения."
            : null,
      },
    });
  } catch (err) {
    console.error("generate error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
