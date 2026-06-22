import { useState } from "react";
import { Logo }      from "../components/Logo.jsx";
import { Steps }     from "../components/Steps.jsx";
import { PostImage } from "../components/PostImage.jsx";
import { Paywall }   from "../components/Paywall.jsx";
import { ScheduleModal } from "../components/ScheduleModal.jsx";
import { NetworkIcon }   from "../components/NetworkIcon.jsx";
import { NetworkSelect } from "../components/NetworkSelect.jsx";
import { useUser } from "@clerk/clerk-react";
import { usePostGenerator } from "../hooks/usePostGenerator.js";
import { NICHES, FORMATS, NETWORKS, LANGS } from "../data/constants.js";
import { UI } from "../data/translations.js";

const FREE_LIMIT = 1;

function cleanPost(raw) {
  if (!raw) return raw;
  const lines = raw.split("\n");
  const metaPatterns = [
    /помогу тебе/i, /найду/i, /создаю\s+\d/i, /варианта? поста/i,
    /актуальн/i, /на основе этой информации/i, /^—+$/, /^-{2,}$/, /^_{2,}$/,
  ];
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const isMeta = metaPatterns.some((re) => re.test(line));
    if (isMeta) { startIdx = i + 1; } else { break; }
  }
  const summaryPatterns = [
    /все\s+\d+\s+пост/i, /готов[ыа]\s+к\s+публикаци/i,
    /\*\*пост\s*[1-9]\*\*\s*[–—-]/i, /пост\s*[1-9]\s*[–—-]/i,
  ];
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= startIdx; i--) {
    const line = lines[i].trim();
    if (!line || line.match(/^[—\-_]+$/)) { continue; }
    const isSummary = summaryPatterns.some((re) => re.test(line));
    if (isSummary) {
      let sepIdx = i;
      for (let j = i - 1; j >= startIdx; j--) {
        if (lines[j].trim().match(/^[—\-_*]+$/) || !lines[j].trim()) { sepIdx = j; } else { break; }
      }
      endIdx = sepIdx;
      break;
    } else { break; }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim() || raw.trim();
}

export function AppPage({ uiLang, onBack, step, onStepChange }) {
  const t = UI[uiLang];
  const setStep = onStepChange;

  const [niche,  setNiche]  = useState(null);
  const [custom, setCustom] = useState("");
  const [topic,  setTopic]  = useState("");
  const [fmt,    setFmt]    = useState("top5");
  const [net,    setNet]    = useState("telegram");
  const [pLang,  setPLang]  = useState(uiLang);
  const [comp,   setComp]   = useState("");
  const [copied, setCopied] = useState(null);
  const [pw,     setPw]     = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);

  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const { loading, loadSt, posts, imgs, used, generate, setPosts } = usePostGenerator();

  const nicheObj      = NICHES.find((n) => n.id === niche);
  const nicheLabel    = niche === "custom" ? custom : nicheObj ? t[nicheObj.tk] : "";
  const currentNetwork = NETWORKS.find((n) => n.id === net);
  const cleanedPosts  = posts.map(cleanPost);

  const cp = (txt, i) => {
    navigator.clipboard.writeText(txt.trim());
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    if (!niche) return;
    const formatLabel = t[FORMATS.find((f) => f.id === fmt)?.tk] || fmt;
    const result = await generate({ niche, nicheLabel, topic, fmt, net, pLang, comp, formatLabel });
    if (result?.limitReached) { setPw(true); return; }
    if (result?.success)       setStep(2);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px" }}>

      {pw && <Paywall t={t} onClose={() => setPw(false)} />}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "760px", margin: "0 auto 28px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "14px", cursor: "pointer" }}>
          {t.back}
        </button>
        <div onClick={onBack} style={{ cursor: "pointer" }} title="На главную">
          <Logo size={26} />
        </div>
        <div
          onClick={() => used >= FREE_LIMIT && setPw(true)}
          style={{
            fontSize: "12px", padding: "5px 12px", borderRadius: "20px",
            cursor: used >= FREE_LIMIT ? "pointer" : "default",
            border: `1px solid ${used >= FREE_LIMIT ? "rgba(247,110,110,0.4)" : "var(--border)"}`,
            background: used >= FREE_LIMIT ? "rgba(247,110,110,0.1)" : "var(--bg3)",
            color: used >= FREE_LIMIT ? "#F76E6E" : "var(--text-dim)",
          }}
        >
          {used >= FREE_LIMIT ? t.limit_buy : `${t.free_left} ${FREE_LIMIT - used} ${t.of} ${FREE_LIMIT}`}
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Steps current={step} labels={[t.sn, t.ss, t.sr]} />

        {/* ── STEP 0 ── */}
        {step === 0 && (
          <div className="fi">
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: 700, marginBottom: "6px" }}>{t.s0t}</h2>
            <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px" }}>{t.s0s}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "10px", marginBottom: "20px" }}>
              {NICHES.map((n) => (
                <div key={n.id} className={`niche-card ${niche === n.id ? "active" : ""}`} onClick={() => setNiche(n.id)}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>{n.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px", color: niche === n.id ? "var(--accent)" : "var(--text)" }}>
                    {t[n.tk]}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.4 }}>{t[n.tk + "d"]}</div>
                </div>
              ))}
            </div>
            {niche === "custom" && (
              <div style={{ marginBottom: "16px" }} className="fi">
                <label className="label">{t.s0cl}</label>
                <input placeholder={t.s0cp} value={custom} onChange={(e) => setCustom(e.target.value)} />
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

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="fi">
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: 700, marginBottom: "6px" }}>
              {nicheObj?.icon} {nicheLabel}
            </h2>
            <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px" }}>{t.s1s}</p>

            <div style={{ marginBottom: "18px" }}>
              <label className="label">{t.s1tl}</label>
              <input placeholder={t.s1tl + "..."} value={topic} onChange={(e) => setTopic(e.target.value)} />
              <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "6px" }}>{t.s1th}</p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label className="label">{t.s1fl}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {FORMATS.map((f) => (
                  <div key={f.id} className={`chip ${fmt === f.id ? "active" : ""}`} onClick={() => setFmt(f.id)}>
                    {t[f.tk] || f.id}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
              <div>
                <label className="label">{t.s1nl}</label>
                {/* Кастомный дропдаун с иконками */}
                <NetworkSelect value={net} onChange={setNet} />
              </div>
              <div>
                <label className="label">{t.s1ll}</label>
                <select value={pLang} onChange={(e) => setPLang(e.target.value)}>
                  {LANGS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="label">{t.s1cl}</label>
              <input placeholder={t.s1cp} value={comp} onChange={(e) => setComp(e.target.value)} />
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "15px", fontSize: "15px" }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span className="spinner" />{t.s1gi}
                </span>
              ) : t.s1g}
            </button>

            {loading && (
              <div style={{ marginTop: "16px" }}>
                {[t.s1p1, t.s1p2].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", fontSize: "13px", color: loadSt > i + 1 ? "var(--accent)" : "var(--text-dim)" }}>
                    <span>{loadSt > i + 1 ? "✓" : <span className="spinner" style={{ width: "12px", height: "12px" }} />}</span>
                    {s}
                  </div>
                ))}
              </div>
            )}

            <button className="btn-ghost" style={{ width: "100%", marginTop: "12px" }} onClick={() => setStep(0)}>
              {t.s1b}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="fi">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: 700 }}>
                  {nicheObj?.icon} {cleanedPosts.length} {t.s2r}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px" }}>
                  {t.s2ni} {nicheLabel} · {currentNetwork?.label}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn-sm" onClick={() => { setStep(1); setPosts([]); }}>{t.s2rg}</button>
                <button className="btn-sm" onClick={() => { setStep(0); setPosts([]); setNiche(null); }}>{t.s2nw}</button>
              </div>
            </div>

            {cleanedPosts.map((post, i) => (
              <div key={i} className="post-card">
                <PostImage src={imgs[i]} />
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                    <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, letterSpacing: "0.05em" }}>
                      {t.s2v} {i + 1}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-dim)" }}>
                      <NetworkIcon id={net} size={14} />
                      {currentNetwork?.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn-sm" onClick={() => cp(post, i)}>
                      {copied === i ? t.s2cd : t.s2c}
                    </button>
                    <button className="btn-sm" onClick={() => setScheduleFor(i)}>
                      📅 Запланировать
                    </button>
                  </div>
                </div>
                <div style={{ padding: "16px" }}>
                  <pre style={{ fontFamily: "'Manrope',sans-serif", fontSize: "14px", lineHeight: "1.8", color: "var(--text-mid)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {post.trim()}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {scheduleFor !== null && (
        <ScheduleModal
          post={cleanedPosts[scheduleFor]}
          niche={niche} fmt={fmt} net={net} pLang={pLang} comp={comp}
          userEmail={userEmail}
          onClose={() => setScheduleFor(null)}
        />
      )}
    </div>
  );
}


