import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { NETWORKS, LANGS, FREE_LIMIT } from "../data/constants.js";

// ─── Вспомогательные ─────────────────────────────────────────────────────────

async function callApi(path, body, token) {
  const res = await fetch(path, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Разбивает текст с маркерами ===ПОСТ N=== на массив строк.
 * Работает даже если модель добавила пробелы или другой регистр.
 */
function parsePosts(rawText) {
  const parts = rawText
    .split(/={2,}ПОСТ\s*\d+={2,}/i)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.length >= 2 ? parts : [rawText];
}

/**
 * Строит структурированный промпт.
 * Системный промпт живёт на сервере (generate.js), здесь только пользовательская часть.
 */
function buildPrompt({ nicheLabel, topic, formatLabel, fmt, networkLabel, langLabel, comp }) {
  const lines = [
    `Ниша: ${nicheLabel}`,
    topic ? `Тема: ${topic}` : "Тема: выбери самую актуальную в нише прямо сейчас",
    `Формат постов: ${formatLabel || fmt}`,
    `Платформа: ${networkLabel}`,
    `Язык: ${langLabel}`,
  ];

  if (comp) {
    lines.push(`Конкуренты для анализа стиля: ${comp} — изучи их последние посты через поиск и сделай лучше`);
  }

  lines.push(
    "",
    "Создай 3 варианта поста. Каждый с разным углом подачи: эмоциональный, экспертный, провокационный.",
    "Пиши плотно — только факты и смысл, никакой воды и повторений.",
    "Каждый пост начинай СТРОГО с: ===ПОСТ 1===, ===ПОСТ 2===, ===ПОСТ 3==="
  );

  return lines.join("\n");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePostGenerator() {
  const { getToken } = useAuth();
  const { user }     = useUser();

  const [loading,   setLoading]   = useState(false);
  const [loadSt,    setLoadSt]    = useState(0); // 0=idle 1=searching 2=writing
  const [posts,     setPosts]     = useState([]);
  const [imgs,      setImgs]      = useState([]);
  const [used,      setUsed]      = useState(0);
  const [warning,   setWarning]   = useState(null);
  const [error,     setError]     = useState(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  // Загружаем счётчик при авторизации
  useEffect(() => {
    if (!email) return;
    fetch(`/api/usage?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => setUsed(data.used ?? 0))
      .catch(() => {});
  }, [email]);

  // Фоновая загрузка картинок (Unsplash)
  const fetchImgs = async (query, token) => {
    try {
      const { keywords } = await callApi("/api/keywords", { query }, token);
      const kw = encodeURIComponent(keywords);
      setImgs(
        [0, 1, 2].map(
          (i) => `https://source.unsplash.com/800x450/?${kw}&sig=${Date.now() + i * 4321}`
        )
      );
    } catch {
      const kw = encodeURIComponent(query.split(" ").slice(0, 3).join(","));
      setImgs(
        [0, 1, 2].map(
          (i) => `https://source.unsplash.com/800x450/?${kw}&sig=${Date.now() + i * 4321}`
        )
      );
    }
  };

  // ─── Основная функция генерации ───────────────────────────────────────────

  const generate = async ({ niche, nicheLabel, topic, fmt, net, pLang, comp, formatLabel }) => {
    if (used >= FREE_LIMIT) return { limitReached: true };

    if (!email) {
      console.error("Email не найден — пользователь не авторизован");
      return { success: false };
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    setPosts([]);
    setImgs([]);
    setLoadSt(1); // "Ищем актуальные данные..."

    const token = await getToken();

    // Картинки параллельно
    fetchImgs(nicheLabel + (topic ? " " + topic : ""), token);

    const networkLabel = NETWORKS.find((n) => n.id === net)?.label ?? net;
    const langLabel    = LANGS.find((l) => l.id === pLang)?.label ?? pLang;

    const prompt = buildPrompt({ nicheLabel, topic, formatLabel, fmt, networkLabel, langLabel, comp });

    try {
      setLoadSt(2); // "Пишем посты..."

      const data = await callApi(
        "/api/generate",
        { prompt, maxTokens: 2000, email },
        token
      );

      const parsed = parsePosts(data.text);
      setPosts(parsed);

      if (data.usage) {
        setUsed(data.usage.used);
        if (data.usage.warning) setWarning(data.usage.warning);
      }

      return { success: true };

    } catch (err) {
      if (err.message === "free_limit_reached") {
        setUsed(FREE_LIMIT);
        return { limitReached: true };
      }

      const msg = err.message.includes("overloaded") || err.message.includes("503")
        ? "Сервис перегружен. Попробуйте через минуту."
        : "Ошибка соединения. Попробуйте снова.";

      setError(msg);
      setPosts([]);
      console.error("generate error:", err);
      return { success: false };

    } finally {
      setLoading(false);
      setLoadSt(0);
    }
  };

  return {
    loading,
    loadSt,
    posts,
    imgs,
    used,
    warning,
    error,
    generate,
    setPosts,
  };
}
