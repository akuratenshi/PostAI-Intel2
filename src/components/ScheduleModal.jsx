import { useState } from "react";

/**
 * Модалка планирования публикации.
 * Открывается по клику на "Запланировать" у готового поста.
 *
 * Props:
 *  - post: текст поста (уже сгенерированный)
 *  - niche, fmt, net, pLang, comp: параметры генерации (для регулярных повторов)
 *  - userEmail: email текущего пользователя (из Clerk)
 *  - onClose: закрыть модалку
 */
export function ScheduleModal({ post, niche, fmt, net, pLang, comp, userEmail, onClose }) {
  const [mode, setMode]               = useState("once"); // "now" | "once" | "recurring"
  const [channel, setChannel]         = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recTime, setRecTime]         = useState("09:00");
  const [recDays, setRecDays]         = useState(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const [saving, setSaving]           = useState(false);
  const [result, setResult]           = useState(null); // { ok, error }

  const DAYS = [
    { id: "mon", label: "Пн" },
    { id: "tue", label: "Вт" },
    { id: "wed", label: "Ср" },
    { id: "thu", label: "Чт" },
    { id: "fri", label: "Пт" },
    { id: "sat", label: "Сб" },
    { id: "sun", label: "Вс" },
  ];

  const toggleDay = (id) => {
    setRecDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!channel.trim()) {
      setResult({ ok: false, error: "Укажите канал" });
      return;
    }
    if (mode === "once" && !scheduledAt) {
      setResult({ ok: false, error: "Укажите дату и время" });
      return;
    }
    if (mode === "recurring" && recDays.length === 0) {
      setResult({ ok: false, error: "Выберите хотя бы один день" });
      return;
    }

    setSaving(true);
    setResult(null);

    // Режим "Сразу" вызывает отдельный эндпоинт публикации, без очереди
    if (mode === "now") {
      try {
        const res = await fetch("/api/publish-now", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel_username: channel.trim().startsWith("@") ? channel.trim() : `@${channel.trim()}`,
            post_text: post,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка публикации");
        setResult({ ok: true });
      } catch (err) {
        setResult({ ok: false, error: err.message });
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = {
      user_email:       userEmail,
      channel_username: channel.trim().startsWith("@") ? channel.trim() : `@${channel.trim()}`,
      niche,
      format:    fmt,
      language:  pLang,
      competitor: comp || null,
      platform:  net,
      mode,
      post_text: mode === "once" ? post : null, // регулярные посты всегда генерируются заново
    };

    if (mode === "once") {
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    } else {
      payload.recurrence_time = recTime;
      payload.recurrence_days = recDays.length === 7 ? "daily" : recDays.join(",");
    }

    try {
      const res  = await fetch("/api/schedule-post", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      setResult({ ok: true });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg2, #15151f)", border: "1px solid var(--border, #2a2a3a)",
          borderRadius: "16px", padding: "24px", maxWidth: "440px", width: "100%",
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Если успешно сохранено — показываем подтверждение */}
        {result?.ok ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "18px", marginBottom: "8px" }}>
              {mode === "now" ? "Пост опубликован" : mode === "once" ? "Пост запланирован" : "Регулярная публикация настроена"}
            </h3>
            <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "20px" }}>
              {mode === "now"
                ? `Пост уже опубликован в канале ${channel}.`
                : `Публикация в канал ${channel} произойдёт автоматически.`}
            </p>
            <button className="btn-primary" style={{ width: "100%", padding: "12px" }} onClick={onClose}>
              Готово
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "18px", fontWeight: 700 }}>
                📅 Запланировать публикацию
              </h3>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Переключатель режима */}
            <div style={{ display: "flex", background: "var(--bg3, #1c1c29)", borderRadius: "10px", padding: "4px", marginBottom: "18px" }}>
              {[
                { id: "now", label: "Сразу" },
                { id: "once", label: "Разовый" },
                { id: "recurring", label: "Регулярно" },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, textAlign: "center", padding: "9px", borderRadius: "7px",
                    fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    background: mode === m.id ? "var(--accent, #7c5cff)" : "transparent",
                    color: mode === m.id ? "white" : "var(--text-dim)",
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Канал */}
            <div style={{ marginBottom: "16px" }}>
              <label className="label">Telegram-канал</label>
              <input
                placeholder="@yourchannel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>

            {/* Разовый режим */}
            {mode === "once" && (
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Дата и время (UTC)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            {/* Регулярный режим */}
            {mode === "recurring" && (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label className="label">Время публикации (UTC, ежедневно)</label>
                  <input
                    type="time"
                    value={recTime}
                    onChange={(e) => setRecTime(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label className="label">Дни недели</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "6px" }}>
                    {DAYS.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => toggleDay(d.id)}
                        style={{
                          textAlign: "center", padding: "9px 0", borderRadius: "7px",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${recDays.includes(d.id) ? "var(--accent,#7c5cff)" : "var(--border,#2a2a3a)"}`,
                          background: recDays.includes(d.id) ? "var(--accent,#7c5cff)" : "var(--bg3,#1c1c29)",
                          color: recDays.includes(d.id) ? "white" : "var(--text-dim)",
                        }}
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {result?.error && (
              <div style={{
                background: "rgba(255,92,122,0.12)", border: "1px solid rgba(255,92,122,0.3)",
                color: "#ff5c7a", borderRadius: "9px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px",
              }}>
                ❌ {result.error}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "13px" }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving
                ? (mode === "now" ? "Публикую..." : "Сохраняю...")
                : (mode === "now" ? "🚀 Опубликовать сейчас" : "Запланировать")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

