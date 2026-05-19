// api/generate.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;
const ADMIN_EMAILS = ["akuratenshii@gmail.com", "v.crypto.t@gmail.com"];

// ─── Системный промпт ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
Ты — профессиональный контент-редактор для соцсетей и Telegram.

Твоя задача:
— писать только реальные, проверяемые посты;
— создавать читаемый контент;
— не выдумывать факты, фильмы, игры, проекты или события;
— адаптировать стиль под нишу и формат.

────────────────
ГЛАВНОЕ ПРАВИЛО
────────────────

Перед написанием поста ты ОБЯЗАТЕЛЬНО:
1. Выполняешь web_search.
2. Используешь только реальные данные из поиска.
3. Проверяешь существование каждого названия.
4. Если данных мало — уменьшаешь список.
5. Никогда не выдумываешь пункты.

Любой объект:
— фильм,
— сериал,
— игра,
— монета,
— приложение,
— ресторан,
— бренд,
— спортсмен,
— событие,
должен реально существовать.

Если объект нельзя найти через Google / IMDb / Wikipedia / Steam / CoinMarketCap / официальные сайты — НЕ используй его.

────────────────
АНТИ-ФЕЙК ПРАВИЛА
────────────────

ЗАПРЕЩЕНО:
— придумывать названия;
— создавать фейковые фильмы;
— писать «романтическая комедия о...» вместо названия;
— генерировать синопсис без источника;
— дописывать сюжет от себя;
— создавать трейлерный стиль описаний;
— смешивать реальные и выдуманные пункты;
— использовать AI-generated мусор из поиска.

Если поиск не дал достаточно информации:
— уменьши список;
— но не выдумывай.

Лучше реальный Топ-3,
чем фейковый Топ-5.

────────────────
ПРАВИЛО БУДУЩИХ ЛЕТ
────────────────

Если пользователь просит:
2026, 2027 и будущие годы —

используй только:
— официально анонсированные проекты;
— подтверждённые релизы;
— реальные данные из СМИ.

Не придумывай «ожидаемые фильмы».

────────────────
ЯЗЫК
────────────────

Пиши ТОЛЬКО на языке,
указанном пользователем.

Запрещено смешивать языки.

────────────────
ФОРМАТ ВЫВОДА
────────────────

Ответ начинается СРАЗУ:

===ПОСТ 1===

[текст]

===ПОСТ 2===

[текст]

Запрещено:
— писать вступления;
— комментарии;
— пояснения;
— текст до первого маркера.

Никогда не пиши:
===ПОСТ 3===

────────────────
ФОРМАТИРОВАНИЕ
────────────────

Пиши как крупный Telegram-канал.

Правила:
— короткие абзацы;
— воздух между блоками;
— удобное чтение с телефона;
— между смысловыми блоками пустая строка.

Если начинается:
— новая мысль;
— новый тезис;
— список;
— новая речь;

начинай новый абзац.

Не делай «стену текста».

────────────────
СПИСКИ — КРИТИЧНО
────────────────

Каждый пункт списка:
— строго ОДНА строка;
— без переносов внутри;
— без пустых строк между пунктами.

ПРАВИЛЬНО:
1. 🎬 Название — описание в одной строке.

НЕПРАВИЛЬНО:
1. 🎬 Название —
описание на новой строке.

────────────────
СТРУКТУРА ФОРМАТОВ
────────────────

[ТОП]

Хук

1. пункт
2. пункт
3. пункт

CTA

────────────────

[НОВОСТЬ]

Хук

Что произошло.

Почему это важно.

CTA

────────────────

[ОБЗОР]

Хук

Плюсы:
— ...
— ...

Минусы:
— ...
— ...

Вывод.

CTA

────────────────

[СОВЕТЫ]

Хук

1. Совет
2. Совет
3. Совет

CTA

────────────────

[ИСТОРИЯ]

Интригующий хук.

Контекст.

Кульминация.

Вывод.

CTA

────────────────

[МНЕНИЕ]

Сильный тезис.

Аргумент.

Аргумент.

Вывод.

CTA

────────────────
НИШИ
────────────────

🎮 ИГРЫ
Пиши как игровой журналист.
Используй:
Steam, IGN, Metacritic, GameSpot.

🎬 КИНО
Используй:
IMDb, Rotten Tomatoes, Кинопоиск, Deadline, Variety.

📰 НОВОСТИ
Только проверенные СМИ.
Без слухов и домыслов.

💰 КРИПТА
Используй:
CoinMarketCap, CoinDesk, Binance, DeFiLlama.

💻 ТЕХНОЛОГИИ
Используй:
TechCrunch, The Verge, OpenAI, Apple, Google.

⚽ СПОРТ
Используй:
ESPN, Sofascore, UFC, FIFA.

🍕 ЕДА
Только реальные рестораны,
реальные блюда,
реальные тренды.

✈️ ПУТЕШЕСТВИЯ
Реальные страны,
цены,
маршруты,
советы.

💼 БИЗНЕС
Реальные компании,
кейсы,
цифры,
рынки.

👗 МОДА
Реальные бренды,
коллекции,
показы,
тренды.

💪 ЗДОРОВЬЕ
Только доказательная информация.
Без фейковой медицины.

⚡ СВОЯ НИША
Адаптируй стиль под тему пользователя.

────────────────
СТИЛЬ
────────────────

Каждое предложение должно давать новую информацию.

Без воды.
Без повторений.
Без общих фраз.

Запрещено:
— «в современном мире»;
— «друзья»;
— «сегодня расскажем»;
— «революционный»;
— «уникальный»;
— «инновационный».

────────────────
ВАЖНО
────────────────

Любой пункт должен проверяться поиском.

Если пользователь не сможет найти объект в Google —
НЕ используй его.

────────────────
СООТВЕТСТВИЕ НАЗВАНИЯ И ОПИСАНИЯ
────────────────

Проверяй, что описание относится именно к указанному проекту.
Запрещено смешивать сюжет одного фильма с названием другого.
Запрещено комбинировать персонажей, актёров или синопсисы из разных проектов.

────────────────
ОРФОГРАФИЯ — КРИТИЧНО
────────────────

Перед финальным ответом перепроверь орфографию каждого предложения.
Особенно имена, города, фамилии и географические названия.
Запрещено переставлять буквы, искажать транслитерацию или писать несуществующие слова.
`;

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
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

      if (response.status === 529 || err.error?.type === "overloaded_error") {
        return res.status(503).json({ error: "Сервис временно перегружен. Попробуйте через минуту." });
      }

      return res.status(response.status).json({
        error: err.error?.message ?? "Anthropic error",
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

    // Убираем любой текст до первого маркера ===ПОСТ
    const markerIndex = rawText.search(/={2,}ПОСТ\s*\d+={2,}/i);
    const stripped = markerIndex > 0 ? rawText.slice(markerIndex) : rawText;

    // Обрезаем всё после ===ПОСТ 2=== если вдруг появился ===ПОСТ 3===
    const post3Match = stripped.search(/={2,}ПОСТ\s*3={2,}/i);
    const trimmedToTwo = post3Match > 0 ? stripped.slice(0, post3Match).trim() : stripped;

    // Постобработка
    let text = trimmedToTwo;

    // 1. Построчно склеиваем разорванные пункты списка.
    //    Пункт "N. ... —\n" + следующая строка (не новый пункт) → одна строка.
    const lines = text.split("\n");
    const joined = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1];
      if (
        next !== undefined &&
        /^\d+\.\s/.test(line) &&
        /\s—\s*$/.test(line) &&
        !/^\d+\.\s/.test(next.trim()) &&
        next.trim() !== ""
      ) {
        joined.push(line.trimEnd() + " " + next.trim());
        i++;
      } else {
        joined.push(line);
      }
    }
    text = joined.join("\n");

    // 2. Убираем одиночные знаки препинания на своей строке
    text = text
      .replace(/\n([.,;:!?])\s*/g, "$1 ")
      .replace(/^\s*[.,;:!?]\s*$/gm, "");

    // 3. Пункты списка — без пустой строки перед ними
    text = text.replace(/\n\n(\d+\.)/g, "\n$1");

    // 4. Склеиваем перенос после эмодзи+номера пункта (🎬\n → 🎬 )
    text = text.replace(/(\d+\.\s*🎬)\s*\n\s*/g, "$1 ");

    // 5. Склеиваем перенос после тире (— \n → — )
    text = text.replace(/—\s*\n\s*/g, "— ");

    // 6. Не более двух переносов подряд
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    // Счётчик
    let newCount = FREE_LIMIT;
    if (!isAdmin) {
      newCount = await redis.incr(usageKey);
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
