import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Logo } from "../components/Logo.jsx";
import { Steps } from "../components/Steps.jsx";
import { Paywall } from "../components/Paywall.jsx";
import { ScheduleModal } from "../components/ScheduleModal.jsx";
import { NetworkIcon } from "../components/NetworkIcon.jsx";
import { NetworkSelect } from "../components/NetworkSelect.jsx";
import { usePostGenerator } from "../hooks/usePostGenerator.js";
import {
  NICHES,
  FORMATS,
  NETWORKS,
  LANGS,
  FREE_LIMIT,
} from "../data/constants.js";
import { UI } from "../data/translations.js";

function readSettings(key) {
  if (!key) return {};

  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "{}");

    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

const fieldStyle = { marginBottom: "18px" };

const titleStyle = {
  fontFamily: "'Syne',sans-serif",
  fontSize: "24px",
  fontWeight: 700,
  marginBottom: "6px",
};

export function AppPage({ uiLang, onBack, step, onStepChange }) {
  const { user } = useUser();
  const settingsKey = user?.id
    ? `postai:settings:v1:${user.id}`
    : null;

  const [saved] = useState(() => readSettings(settingsKey));
  const t = UI[uiLang] || UI.en;
  const setStep = onStepChange;

  const [niche, setNiche] = useState(
    () => NICHES.some(item => item.id === saved.niche)
      ? saved.niche
      : null
  );
  const [custom, setCustom] = useState(
    typeof saved.custom === "string" ? saved.custom : ""
  );
  const [topic, setTopic] = useState(
    typeof saved.topic === "string" ? saved.topic : ""
  );
  const [fmt, setFmt] = useState(
    () => FORMATS.some(item => item.id === saved.fmt)
      ? saved.fmt
      : "top5"
  );
  const [net, setNet] = useState(
    () => NETWORKS.some(item => item.id === saved.net)
      ? saved.net
      : "telegram"
  );
  const [pLang, setPLang] = useState(
    () => LANGS.some(item => item.id === saved.pLang)
      ? saved.pLang
      : uiLang
  );
  const [comp, setComp] = useState(
    typeof saved.comp === "string" ? saved.comp : ""
  );

  const [copied, setCopied] = useState(null);
  const [pw, setPw] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [settingsWarning, setSettingsWarning] = useState("");

  const {
    loading,
    loadSt,
    posts,
    used,
    generate,
    setPosts,
    error,
    warning,
  } = usePostGenerator();

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    if (!settingsKey) return;

    try {
      sessionStorage.setItem(
        settingsKey,
        JSON.stringify({ niche, custom, topic, fmt, net, pLang, comp })
      );
      setSettingsWarning("");
    } catch {
      setSettingsWarning(
        "Не удалось сохранить настройки в этой вкладке."
      );
    }
  }, [settingsKey, niche, custom, topic, fmt, net, pLang, comp]);

  const nicheObj = NICHES.find(item => item.id === niche);
  const nicheLabel = niche === "custom"
    ? custom
    : nicheObj
      ? t[nicheObj.tk]
      : "";

  const currentNetwork = NETWORKS.find(item => item.id === net);
  const readyPosts = posts.filter(
    post => typeof post === "string" && post.trim()
  );

  const copyPost = async (post, index) => {
    try {
      await navigator.clipboard.writeText(post.trim());
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setSettingsWarning(
        "Не удалось скопировать автоматически. Выделите и скопируйте текст."
      );
    }
  };

  const handleGenerate = async () => {
    if (!niche || loading) return;
    if (niche === "custom" && !custom.trim()) return;

    const formatLabel =
      t[FORMATS.find(item => item.id === fmt)?.tk] || fmt;

    const result = await generate({
      niche,
      nicheLabel,
      topic,
      fmt,
      net,
      pLang,
      comp,
      formatLabel,
    });

    if (result?.limitReached) {
      setPw(true);
      return;
    }

    if (result?.success) setStep(2);
  };

  const startNew = () => {
    setScheduleFor(null);
    setPosts([]);
    setNiche(null);
    setCustom("");
    setTopic("");
    setComp("");
    setStep(0);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px" }}>
      {pw && <Paywall t={t} onClose={() => setPw(false)} />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "760px",
          margin: "0 auto 28px",
          gap: "12px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {t.back}
        </button>

        <button
          onClick={onBack}
          title="На главную"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Logo size={26} />
        </button>

        <div
          onClick={() => used >= FREE_LIMIT && setPw(true)}
          style={{
            fontSize: "12px",
            padding: "5px 12px",
            borderRadius: "20px",
            cursor: used >= FREE_LIMIT ? "pointer" : "default",
            border: "1px solid var(--border)",
            background: "var(--bg3)",
            color: used >= FREE_LIMIT
              ? "#F76E6E"
              : "var(--text-dim)",
          }}
        >
          {used >= FREE_LIMIT
            ? t.limit_buy
            : `${t.free_left} ${Math.max(0, FREE_LIMIT - used)} ${t.of} ${FREE_LIMIT}`}
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Steps current={step} labels={[t.sn, t.ss, t.sr]} />

        {error && (
          <p role="alert" style={{ color: "#F76E6E", margin: "16px 0" }}>
            {error}
          </p>
        )}

        {(warning || settingsWarning) && (
          <p
            role="status"
            style={{ color: "var(--text-mid)", margin: "16px 0" }}
          >
            {warning || settingsWarning}
          </p>
        )}

        {step !== 2 && readyPosts.length > 0 && (
          <button
            className="btn-sm"
            style={{ marginBottom: "20px" }}
            onClick={() => setStep(2)}
          >
            Открыть сохранённый пост
          </button>
        )}

        {step === 0 && (
          <div className="fi">
            <h2 style={titleStyle}>{t.s0t}</h2>

            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              {t.s0s}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {NICHES.map(item => (
                <div
                  key={item.id}
                  className={`niche-card ${niche === item.id ? "active" : ""}`}
                  onClick={() => setNiche(item.id)}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                    {item.icon}
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      marginBottom: "4px",
                      color: niche === item.id
                        ? "var(--accent)"
                        : "var(--text)",
                    }}
                  >
                    {t[item.tk]}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-dim)",
                      lineHeight: 1.4,
                    }}
                  >
                    {t[item.tk + "d"]}
                  </div>
                </div>
              ))}
            </div>

            {niche === "custom" && (
              <div style={fieldStyle}>
                <label className="label">{t.s0cl}</label>
                <input
                  placeholder={t.s0cp}
                  value={custom}
                  onChange={event => setCustom(event.target.value)}
                />
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "15px", fontSize: "15px" }}
              onClick={() => setStep(1)}
              disabled={!niche || (niche === "custom" && !custom.trim())}
            >
              {t.s0n}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="fi">
            <h2 style={titleStyle}>
              {nicheObj?.icon} {nicheLabel || "Выберите тему"}
            </h2>

            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              {t.s1s}
            </p>

            <div style={fieldStyle}>
              <label className="label">{t.s1tl}</label>
              <input
                placeholder={t.s1tl + "..."}
                value={topic}
                onChange={event => setTopic(event.target.value)}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  marginTop: "6px",
                }}
              >
                {t.s1th}
              </p>
            </div>

            <div style={fieldStyle}>
              <label className="label">{t.s1fl}</label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {FORMATS.map(item => (
                  <div
                    key={item.id}
                    className={`chip ${fmt === item.id ? "active" : ""}`}
                    onClick={() => setFmt(item.id)}
                  >
                    {t[item.tk] || item.id}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label className="label">{t.s1nl}</label>
                <NetworkSelect value={net} onChange={setNet} />
              </div>

              <div>
                <label className="label">{t.s1ll}</label>
                <select
                  value={pLang}
                  onChange={event => setPLang(event.target.value)}
                >
                  {LANGS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="label">{t.s1cl}</label>
              <input
                placeholder={t.s1cp}
                value={comp}
                onChange={event => setComp(event.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "15px", fontSize: "15px" }}
              onClick={handleGenerate}
              disabled={
                loading ||
                !niche ||
                (niche === "custom" && !custom.trim())
              }
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <span className="spinner" />
                  {t.s1gi}
                </span>
              ) : t.s1g}
            </button>

            {loading && (
              <div style={{ marginTop: "16px" }}>
                {[t.s1p1, t.s1p2].map((label, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 0",
                      fontSize: "13px",
                      color: loadSt > index + 1
                        ? "var(--accent)"
                        : "var(--text-dim)",
                    }}
                  >
                    {loadSt > index + 1 ? (
                      <span>✓</span>
                    ) : (
                      <span
                        className="spinner"
                        style={{ width: "12px", height: "12px" }}
                      />
                    )}
                    {label}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-ghost"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={() => setStep(0)}
              disabled={loading}
            >
              {t.s1b}
            </button>
          </div>
        )}

        {step === 2 && readyPosts.length === 0 && (
          <div style={{ margin: "24px 0" }}>
            <p style={{ marginBottom: "16px" }}>
              Сохранённого поста в этой вкладке нет.
            </p>
            <button className="btn-sm" onClick={() => setStep(0)}>
              Вернуться к выбору темы
            </button>
          </div>
        )}

        {step === 2 && readyPosts.length > 0 && (
          <div className="fi">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <h2 style={{ ...titleStyle, fontSize: "22px" }}>
                  {nicheObj?.icon} {readyPosts.length} {t.s2r}
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-dim)",
                    marginTop: "4px",
                  }}
                >
                  {t.s2ni} {nicheLabel} · {currentNetwork?.label}
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-sm"
                  onClick={() => setStep(niche ? 1 : 0)}
                >
                  {t.s2rg}
                </button>
                <button className="btn-sm" onClick={startNew}>
                  {t.s2nw}
                </button>
              </div>
            </div>

            {readyPosts.map((post, index) => (
              <div key={index} className="post-card">
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--accent)",
                        fontWeight: 600,
                      }}
                    >
                      {t.s2v} {index + 1}
                    </span>
                    <NetworkIcon id={net} size={14} />
                    <span style={{ fontSize: "12px" }}>
                      {currentNetwork?.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-sm"
                      onClick={() => copyPost(post, index)}
                    >
                      {copied === index ? t.s2cd : t.s2c}
                    </button>

                    {net === "telegram" && (
                      <button
                        className="btn-sm"
                        onClick={() => setScheduleFor(index)}
                      >
                        Запланировать
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: "16px" }}>
                  <pre
                    style={{
                      fontFamily: "'Manrope',sans-serif",
                      fontSize: "14px",
                      lineHeight: "1.8",
                      color: "var(--text-mid)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {post.trim()}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {scheduleFor !== null && readyPosts[scheduleFor] && (
        <ScheduleModal
          post={readyPosts[scheduleFor]}
          niche={niche}
          fmt={fmt}
          net={net}
          pLang={pLang}
          comp={comp}
          userEmail={userEmail}
          onClose={() => setScheduleFor(null)}
        />
      )}
    </div>
  );
}

