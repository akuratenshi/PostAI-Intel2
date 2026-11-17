import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { NETWORKS, LANGS, FREE_LIMIT } from "../data/constants.js";

async function callApi(path, body, token) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

function readDraft(key) {
  if (!key) return [];

  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");

    return Array.isArray(saved?.posts)
      ? saved.posts.filter(post => typeof post === "string" && post.trim())
      : [];
  } catch {
    return [];
  }
}

export function usePostGenerator() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const userId = user?.id || null;
  const storageKey = userId ? `postai:draft:v1:${userId}` : null;
  const activeUser = useRef(userId);
  activeUser.current = userId;

  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [loadSt, setLoadSt] = useState(0);
  const [draft, setDraft] = useState(() => ({
    key: storageKey,
    posts: readDraft(storageKey),
  }));
  const [used, setUsed] = useState(0);
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);

  const posts = draft.key === storageKey ? draft.posts : [];

  useEffect(() => {
    setDraft({
      key: storageKey,
      posts: readDraft(storageKey),
    });
    setUsed(0);
    setWarning(null);
    setError(null);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || draft.key !== storageKey) return;

    try {
      if (draft.posts.length) {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ posts: draft.posts })
        );
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      setWarning("Не удалось сохранить пост в этой вкладке. Скопируйте текст.");
    }
  }, [storageKey, draft]);

  const setPosts = value => {
    setDraft(previous => {
      const current = previous.key === storageKey ? previous.posts : [];
      const next = typeof value === "function" ? value(current) : value;

      return {
        key: storageKey,
        posts: Array.isArray(next) ? next : [],
      };
    });
  };

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadUsage() {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch("/api/usage", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!cancelled && Number.isFinite(data.used)) {
          setUsed(data.used);
        }
      } catch {
        if (!cancelled) {
          setWarning("Не удалось обновить лимит. Сервер проверит его при генерации.");
        }
      }
    }

    loadUsage();
    return () => { cancelled = true; };
  }, [userId, getToken]);

  const generate = async ({
    niche,
    nicheLabel,
    topic,
    fmt,
    net,
    pLang,
    comp,
    formatLabel,
  }) => {
    if (busy.current) return { success: false };
    if (used >= FREE_LIMIT) return { limitReached: true };

    if (!userId) {
      setError("Войдите в аккаунт.");
      return { success: false };
    }

    const requestUser = userId;
    busy.current = true;
    setLoading(true);
    setLoadSt(1);
    setError(null);
    setWarning(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");

      const networkLabel =
        NETWORKS.find(item => item.id === net)?.label || net;
      const langLabel =
        LANGS.find(item => item.id === pLang)?.label || pLang;

      const prompt = [
        `Niche: ${nicheLabel || niche}`,
        `Topic: ${topic || "Choose a current topic in this niche"}`,
        `Format: ${formatLabel || fmt}`,
        `Platform: ${networkLabel}`,
        `Output language: ${langLabel}`,
        comp ? `Competitor channels: ${comp}` : "",
        "",
        "First use web_search to verify current information.",
        "Generate exactly ONE post in the requested language.",
        "Return one raw JSON object with the complete post in the post field.",
        "No code fences or explanations outside JSON.",
      ].filter(Boolean).join("\n");

      setLoadSt(2);

      const data = await callApi("/api/generate", { prompt }, token);

      if (activeUser.current !== requestUser) {
        return { success: false };
      }

      const postText = data.post ?? data.text;

      if (typeof postText !== "string" || !postText.trim()) {
        throw new Error("Empty generation response");
      }

      const nextPosts = [postText.trim()];

      // Сохраняем сразу, до переключения на экран результата.
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ posts: nextPosts })
        );
      } catch {
        setWarning("Пост создан, но не сохранён в браузере. Скопируйте текст.");
      }

      setPosts(nextPosts);

      if (Number.isFinite(data.usage?.used)) {
        setUsed(data.usage.used);
      }

      return { success: true };
    } catch (err) {
      if (activeUser.current !== requestUser) {
        return { success: false };
      }

      if (err.message === "free_limit_reached") {
        setUsed(FREE_LIMIT);
        return { limitReached: true };
      }

      setError(
        err.message === "Sign in required"
          ? "Войдите в аккаунт заново."
          : "Не удалось создать пост. Попробуйте позже."
      );

      // При неудаче предыдущий готовый пост сохраняется.
      console.error("generate error:", err);
      return { success: false };
    } finally {
      busy.current = false;
      setLoading(false);
      setLoadSt(0);
    }
  };

  return {
    loading,
    loadSt,
    posts,
    imgs: [],
    used,
    warning,
    error,
    generate,
    setPosts,
  };
}
