// api/generate.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;
const ADMIN_EMAILS = ["akuratenshii@gmail.com", "v.crypto.t@gmail.com"];

// ─── Системный промпт ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — профессиональный SMM-копирайтер. Пишешь готовые посты для социальных сетей.

ГЛАВНОЕ ПРАВИЛО ВЫВОДА:
Твой ответ начинается СРАЗУ с ===ПОСТ 1=== — без вступлений, без фраз типа "Сейчас найду информацию", "Готую пости", "Ось що я знайшов", без пояснений своих действий. Никакого текста до первого маркера.

АЛГОРИТМ (выполняй молча):
1. Найди актуальные данные по теме через web_search.
2. Если тема не указана — выбери самую горячую в нише прямо сейчас.
3. Если указаны конкуренты — изучи их через web_search, сделай лучше.
4. Напиши 3 поста с кардинально разными углами подачи.

СТРУКТУРА ОТВЕТА — строго:
===ПОСТ 1===
[текст поста]

===ПОСТ 2===
[текст поста]

===ПОСТ 3===
[текст поста]

ПРАВИЛА ФОРМАТОВ:
- Топ-5: Хук → нумерованный список с пояснениями → CTA
- Новость: Хук → суть → контекст → CTA
- Обзор: Хук → плюсы/минусы → вывод → CTA
- Советы: Хук → 3-5 советов → CTA
- История: Хук → завязка → кульминация → вывод → CTA
- Мнение: Провокационный тезис → аргументы → CTA

АДАПТАЦИЯ ПОД ПЛАТФОРМУ:
- Telegram: 800-1500 символов, умеренные эмодзи, хештеги не обязательны
- Instagram: 300-800 символов, 5-10 хештегов в конце, активные эмодзи
- Facebook: 400-1000 символов, разговорный стиль, минимум хештегов

ПЛОТНОСТЬ — ОБЯЗАТЕЛЬНО:
- Каждое предложение = новая информация. Если можно удалить без потери смысла — удали.
- Не повторяй одну мысль разными словами.
- Пиши плотно: факт → контекст → вывод. Никакой воды.

ЗАПРЕЩЕНО — ФОРМАТИРОВАНИЕ (критично):
- Точка, запятая или тире в самом начале строки: ". текст", ", текст", "— текст" — это баг
- Разрыв предложения на две строки переносом — пиши предложение целиком в одну строку
- Пустые строки между пунктами списка — список идёт компактно
- КАПСЛОК в заголовках поста
- "---", "___", "——" в конце поста

ЗАПРЕЩЕНО — СТИЛЬ:
- Любой текст до ===ПОСТ 1=== — вступления, объяснения, "сейчас найду"
- "В современном мире...", "Друзья,", "Сегодня хочу рассказать..."
- Слова: уникальный, инновационный, революционный, эксклюзивный
- Выдумывать факты — только реальные данные из поиска
- Одинаковая структура у всех трёх постов
- Смешивать языки внутри поста — даже одно слово на другом языке запрещено
- Разрывать предложение на две строки — пиши каждое предложение целиком без переноса`;

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
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
      console.error("Anthropic error full:", JSON.stringify(err), "status:", response.status);

      if (response.status === 529 || err.error?.type === "overloaded_error") {
        return res.status(503).json({ error: "Сервис временно перегружен. Попробуйте через минуту." });
      }

      // Возвращаем полную ошибку клиенту для диагностики
      return res.status(response.status).json({
        error: err.error?.message ?? "Anthropic error",
        debug_type: err.error?.type,
        debug_status: response.status,
      });
    }

    const data = await response.json();

    // Собираем только текстовые блоки (пропускаем tool_use и tool_result)
    const rawText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!rawText) {
      return res.status(500).json({ error: "Модель не вернула текст. Попробуйте снова." });
    }

    // Убираем любой текст до первого маркера ===ПОСТ — преамбулы и объяснения модели
    const markerIndex = rawText.search(/={2,}ПОСТ\s*\d+={2,}/i);
    const stripped = markerIndex > 0 ? rawText.slice(markerIndex) : rawText;

    // ─── Постобработка текста ─────────────────────────────────────────────
    const text = stripped
      .replace(/\n([.,;:!?\u2026])\s*/g, "$1 ")
      .replace(/^\s*[.,;:!?\u2026]\s*$/gm, "")
      .replace(/\n\n(\d)/g, "\n$1")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\bЕсли\b/g, "\u042f\u043a\u0449\u043e")
      .replace(/\bесли\b/g, "\u044f\u043a\u0449\u043e")
      .replace(/\bсмотреть\b/gi, "\u0434\u0438\u0432\u0438\u0442\u0438\u0441\u044f")
      .replace(/\bчемпионаты\b/gi, "\u0447\u0435\u043c\u043f\u0456\u043e\u043d\u0430\u0442\u0438")
      .replace(/\bчемпионат\b/gi, "\u0447\u0435\u043c\u043f\u0456\u043e\u043d\u0430\u0442")
      .trim();

    // Счётчик
    let newCount = FREE_LIMIT;
    if (!isAdmin) {
      newCount = await redis.incr(usageKey);
      // await redis.expire(usageKey, 60 * 60 * 24 * 30); // TTL 30 дней
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
