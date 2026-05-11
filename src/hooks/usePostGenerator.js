import { useState } from "react";
import { NETWORKS, LANGS, FREE_LIMIT } from "../data/constants.js";

// Всі виклики йдуть через наші serverless-функції (/api/*)
// Ключ Anthropic зберігається тільки на сервері Vercel.

async function callApi(path, body) {
  const res = await fetch(path, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePostGenerator() {
  const [loading, setLoading] = useState(false);
  const [loadSt,  setLoadSt]  = useState(0);
  const [posts,   setPosts]   = useState([]);
  const [imgs,    setImgs]    = useState([]);
  const [used,    setUsed]    = useState(0);

  const fetchImgs = async (query) => {
    try {
      const { keywords } = await callApi("/api/keywords", { query });
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

  const generate = async ({ niche, nicheLabel, topic, fmt, net, pLang, comp, formatLabel }) => {
    if (used >= FREE_LIMIT) return { limitReached: true };

    setLoading(true);
    setPosts([]);
    setImgs([]);
    setLoadSt(1);

    fetchImgs(nicheLabel + (topic ? " " + topic : ""));

    const networkLabel = NETWORKS.find((n) => n.id === net)?.label ?? net;
    const langLabel    = LANGS.find((l) => l.id === pLang)?.label ?? pLang;

    const prompt =
      `Ты профессиональный SMM-специалист. Создай 3 разных поста для ${networkLabel} на ${langLabel} языке.\n` +
      `Ниша: ${nicheLabel}${topic ? "\nТема: " + topic : ""}\n` +
      `Формат: ${formatLabel || fmt}\n` +
      (comp ? `Стиль конкурентов: ${comp}\n` : "") +
      `Используй актуальные данные мая 2026. Напиши 3 РАЗНЫХ варианта.\n` +
      `Каждый начинай строго с: ===ПОСТ N===\n` +
      `Используй эмодзи, хештеги, живой вовлекающий стиль.`;

    try {
      setLoadSt(2);
      const { text } = await callApi("/api/generate", { prompt, maxTokens: 1000 });
      const parts = text.split(/===ПОСТ \d+===/i).filter((p) => p.trim());
      setPosts(parts.length > 1 ? parts : [text]);
      setUsed((u) => u + 1);
      return { success: true };
    } catch (err) {
      console.error("generate error:", err);
      setPosts(["Ошибка соединения. Попробуйте снова."]);
      return { success: false };
    } finally {
      setLoading(false);
      setLoadSt(0);
    }
  };

  return { loading, loadSt, posts, imgs, used, generate, setPosts };
}
