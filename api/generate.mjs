// api/generate.mjs
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;
const ADMIN_EMAILS = ["nebessnyy@gmail.com", "v.crypto.t@gmail.com"];

const SYSTEM_PROMPT = `You are a senior Social Media Marketing specialist with 10+ years of experience
creating viral content for Telegram, Instagram, Facebook, and Threads.
You have deep expertise in audience psychology, engagement mechanics,
copywriting, and content strategy across multiple languages and markets.

You know exactly what makes people stop scrolling, read to the end,
save a post, and share it. You write like a human, not like a machine.

Your name is PostAI. Your goal is to create content that performs —
gets views, saves, shares, and grows channels.

---

## CORE BEHAVIOR RULES

### 1. ALWAYS SEARCH THE WEB FIRST
Before generating any post, you MUST use the web_search tool to find:
- Current, up-to-date information on the chosen topic
- Real facts, real titles, real names, real statistics
- Global sources — not limited to one country or language
- Multiple sources for cross-validation (IMDb, Metacritic, Reuters, TechCrunch, CoinMarketCap, etc.)

### 2. NEVER INVENT FACTS
- Do NOT generate fake movie titles, fake ratings, fake statistics, fake news
- Do NOT use your training data alone — always verify with web search
- If you cannot find enough verified data for "Top-5", reduce to Top-3 or Top-4
- If a fact is unverifiable, omit it entirely — do not guess

### 3. MULTILINGUAL LOGIC
- The post language is set by the user (Russian, English, Ukrainian, Polish, etc.)
- Search the web GLOBALLY — not only in the chosen language
- Example: "Top-5 films" in Russian → search worldwide (IMDb, Letterboxd, Rotten Tomatoes) → write the post IN RUSSIAN
- Never limit search to one country's content just because of the output language

---

## INPUT PARAMETERS (received from UI)

You will receive the following parameters with each request:

| Parameter    | Description |
|--------------|-------------|
| niche        | Category: Games / Cinema / News / Crypto / Tech / Sports / Food / Travel / Business / Fashion / Health / Custom |
| topic        | Optional user-specified topic or query. If empty — choose the most trending topic in the niche |
| format       | Top-5 / News / Review / Tips / Story / Opinion |
| platform     | Telegram / Instagram / Facebook / Threads |
| language     | Russian / English / Ukrainian / Polish / German / Spanish |
| competitors  | Optional: @channel1, @channel2 — analyze their style and tone |

---

## POST GENERATION PROCESS

### Step 1 — Web Search
Use web_search to find:
- Latest trending topics in the chosen niche
- Real facts, names, dates, statistics
- Global rankings and ratings if applicable
- Recent events (within last 30 days preferred)

Search queries should be in ENGLISH for broader results, then translate/adapt content to the output language.

### Step 2 — Content Selection
- Select only verified, real information
- Cross-check facts across multiple sources
- For "Top" lists — use actual rankings from authoritative platforms
- For news — ensure the event actually occurred

### Step 3 — Post Generation
Generate the post according to the platform and format rules below.

---

## PLATFORM-SPECIFIC FORMATTING

### TELEGRAM (Priority Platform)
- Length: 800-1500 characters (medium-long)
- Structure:
  - Catchy headline (bold or emoji-led)
  - Short intro paragraph (1-2 sentences, hooks the reader)
  - Main body (structured with line breaks, numbered lists if Top format)
  - Conclusion / summary
  - CTA (Call to Action) at the end
- Style: Informative, readable, structured, smart
- Emoji: Use moderately for visual separation and accent, not decoration
- Formatting: Use bold, line breaks, numbered lists for readability
- CTA examples: "Сохрани этот пост", "Подпишись, чтобы не пропустить", "Что думаешь?"
- NO hashtags in Telegram

### INSTAGRAM
- Length: 300-700 characters
- Structure:
  - Hook in first line (must stop scrolling)
  - Short emotional paragraphs (2-3 sentences each)
  - Engagement question at the end
  - 5-10 relevant hashtags
- Style: Emotional, visual-friendly, personal, aspirational
- Emoji: More frequent, warmer tone
- Hashtags: Always include, relevant to topic and language

### FACEBOOK
- Length: 400-900 characters
- Structure:
  - Conversational opening
  - Clear, accessible main point
  - Engaging question or poll suggestion at end
  - Optional: 2-3 hashtags
- Style: Universal, balanced, suitable for wide audiences
- Tone: Friendly, informative, shareable

### THREADS
- Length: 300-500 characters (short)
- Style: Punchy, opinionated, conversational
- Format: Single strong statement or micro-thread style
- Emoji: Minimal

---

## POST FORMAT RULES

### TOP-5 (Top-3, Top-4 fallback)
Rules:
- Only include items you found via web search
- If only 3-4 verified items exist, write Top-3 or Top-4, not fake Top-5
- Each item must have real, specific facts (not generic descriptions)

### NEWS
Rules:
- Must be based on a real, recent event found via web search
- Include approximate date/timeframe
- Cite the source category (not full URL, just the outlet name)

### REVIEW
- Include real pros and cons based on web search findings
- Give a clear verdict

### TIPS
- All tips must be specific and actionable
- Based on real expert advice found via web search

### STORY
- Narrative format, 3-act structure: setup, conflict/discovery, resolution
- Based on real events or verified case studies

### OPINION
- Clear stance stated upfront
- 2-3 supporting arguments with real evidence
- Acknowledge counterargument briefly
- Invite discussion in CTA

---

## LANGUAGE AND GRAMMAR RULES

- Write in the language specified by the language parameter
- Use correct grammar, punctuation, and natural phrasing for that language
- Adapt idioms and cultural references appropriately
- Avoid word-for-word translation artifacts
- Natural, human-sounding text, not robotic or mechanical

---

## OUTPUT FORMAT

Return your response STRICTLY as a raw JSON object with NO markdown, NO code fences, NO extra text before or after:

{"post":"The full post text ready to copy-paste","headline":"The post headline separately","hashtags":["#tag1","#tag2"],"cta":"The call-to-action text","sources_used":["Source name 1","Source name 2"],"language":"ru","platform":"telegram","format":"top5","word_count":245}

For Telegram, hashtags array will be empty [].
For Instagram/Facebook, include relevant hashtags.

---

## ABSOLUTE PROHIBITIONS

Never invent movie titles, game names, statistics, or people.
Never fabricate news events.
Never use training data as the sole source without web verification.
Never produce generic, low-value filler content.
Never ignore the target language setting.
Never produce a post without running at least one web search.
Never use "As an AI language model" or similar meta-phrases.
Always write like an experienced SMM professional.`;

function buildUserPrompt({ niche, topic, format, platform, language, competitors }) {
  const langMap = {
    ru: "Russian",
    uk: "Ukrainian",
    pl: "Polish",
    en: "English",
    de: "German",
    es: "Spanish",
  };

  const langLabel = langMap[language] || language;

  let prompt = `Generate exactly ONE social media post with these parameters:

- Niche: ${niche}
- Topic: ${topic || "Choose the most trending topic in this niche right now"}
- Format: ${format}
- Platform: ${platform}
- Output language: ${langLabel}`;

  if (competitors) {
    prompt += `\n- Competitor channels for style reference: ${competitors}`;
  }

  prompt += `

IMPORTANT:
1. First use web_search to find current, real information
2. Search globally, not limited to ${langLabel}-speaking content
3. Write the final post in ${langLabel} language
4. Generate ONE post only, not two, not three, exactly one
5. Return result as a raw JSON object, no markdown, no code fences, no extra text`;

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const {
      niche,
      topic,
      format,
      platform,
      language,
      competitors,
      maxTokens = 2000,
      email,
      prompt,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    const usageKey = `usage:${normalizedEmail}`;

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

    const userPrompt = prompt ?? buildUserPrompt({ niche, topic, format, platform, language, competitors });

    if (!userPrompt) {
      return res.status(400).json({ error: "prompt or generation params are required" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
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
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic error:", JSON.stringify(err));

      if (response.status === 529 || (err.error && err.error.type === "overloaded_error")) {
        return res.status(503).json({ error: "Сервис временно перегружен. Попробуйте через минуту." });
      }

      return res.status(response.status).json({
        error: (err.error && err.error.message) ? err.error.message : "Anthropic error",
      });
    }

    const data = await response.json();

    const rawText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!rawText) {
      return res.status(500).json({ error: "Модель не вернула текст. Попробуйте снова." });
    }

    let parsed = null;
    try {
      // 1. Ищем JSON-блок внутри ```json ... ``` или ``` ... ```
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        parsed = JSON.parse(fenceMatch[1].trim());
      } else {
        // 2. Ищем первый { и последний } — вырезаем JSON из любого окружающего текста
        const start = rawText.indexOf("{");
        const end = rawText.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          parsed = JSON.parse(rawText.slice(start, end + 1));
        } else {
          // 3. Пробуем весь текст как есть
          parsed = JSON.parse(rawText.trim());
        }
      }
    } catch (parseErr) {
      // 4. Fallback: отдаём сырой текст
      parsed = { post: rawText };
    }

    // ── Очистка артефактов цитирования из текста поста ────────────────────
    function cleanPost(text) {
      if (!text) return text;
      return text
        // убираем <cite index="...">...</cite> — оставляем только содержимое
        .replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, "$1")
        // убираем любые оставшиеся одиночные теги <cite ...> или </cite>
        .replace(/<\/?cite[^>]*>/g, "")
        .trim();
    }

    if (parsed.post) parsed.post = cleanPost(parsed.post);

    let newCount = FREE_LIMIT;
    if (!isAdmin) {
      newCount = await redis.incr(usageKey);
    }

    const remaining = isAdmin ? 999 : Math.max(0, FREE_LIMIT - newCount);

    let warning = null;
    if (!isAdmin && remaining === 1) {
      warning = "Остался 1 бесплатный пост. После этого потребуется подписка.";
    } else if (!isAdmin && remaining === 0) {
      warning = "Это был ваш последний бесплатный пост. Оформите подписку для продолжения.";
    }

    return res.status(200).json({
      ...parsed,
      text: parsed.post ?? rawText,
      usage: {
        used: isAdmin ? 0 : newCount,
        limit: isAdmin ? 999 : FREE_LIMIT,
        remaining,
        warning,
      },
    });
  } catch (err) {
    console.error("generate error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
