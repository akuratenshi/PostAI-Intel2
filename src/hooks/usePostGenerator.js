import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { NETWORKS, LANGS, FREE_LIMIT } from "../data/constants.js";

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

export function usePostGenerator() {
  const { getToken } = useAuth();
  const { user }     = useUser(); // ← берём email из Clerk

  const [loading, setLoading] = useState(false);
  const [loadSt,  setLoadSt]  = useState(0);
  const [posts,   setPosts]   = useState([]);
  const [imgs,    setImgs]    = useState([]);
  const [used,    setUsed]    = useState(0);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  // Загружаем счётчик с сервера при старте
  useEffect(() => {
    if (!email) return;
    fetch(`/api/usage?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => setUsed(data.used ?? 0))
      .catch(() => {});
  }, [email]);

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

  const generate = async ({ niche, nicheLabel, topic, fmt, net, pLang, comp, formatLabel }) => {
    // Проверяем лимит до запроса
    if (used >= FREE_LIMIT) return { limitReached: true };

    if (!email) {
      console.error("Email не найден — пользователь не авторизован?");
      return { success: false };
    }

    setLoading(true);
    setPosts([]);
    setImgs([]);
    setLoadSt(1);

    const token = await getToken();
    fetchImgs(nicheLabel + (topic ? " " + topic : ""), token);

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

      // Передаём email — сервер сам считает и проверяет лимит
      const data = await callApi("/api/generate", { prompt, maxTokens: 1000, email }, token);

      const parts = data.text.split(/===ПОСТ \d+===/i).filter((p) => p.trim());
      setPosts(parts.length > 1 ? parts : [data.text]);

      // Обновляем счётчик из ответа сервера
      if (data.usage) {
        setUsed(data.usage.used);
      }

      return { success: true };
    } catch (err) {
      // Лимит исчерпан — сервер вернул 429
      if (err.message === "free_limit_reached") {
        setUsed(FREE_LIMIT);
        return { limitReached: true };
      }
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
