import { Logo }   from "../components/Logo.jsx";
import { TgSvg } from "../components/TgSvg.jsx";
import { NICHES, PLANS, UI_LANGS, TG } from "../data/constants.js";
import { UI }    from "../data/translations.js";
import { SignInButton, useAuth } from "@clerk/clerk-react";

export function LandingPage({ uiLang, setUiLang, yearly, setYearly, onEnterApp }) {
  const t = UI[uiLang];
  const { isSignedIn } = useAuth();

  // Если уже залогинен — сразу переходим в приложение, иначе открываем Clerk
  const handleLogin = () => {
    if (isSignedIn) {
      onEnterApp();
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(7,6,15,0.92)",
          backdropFilter: "blur(24px)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <Logo size={28} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              gap: "3px",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "3px",
            }}
          >
            {UI_LANGS.map((c) => (
              <button
                key={c}
                onClick={() => setUiLang(c)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  background:
                    uiLang === c
                      ? "linear-gradient(135deg,var(--accent),var(--accent2))"
                      : "transparent",
                  color: uiLang === c ? "white" : "var(--text-dim)",
                  cursor: "pointer",
                  transition: "all .2s",
                  textTransform: "uppercase",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Кнопка Войти через Clerk */}
          {isSignedIn ? (
            <button
              className="btn-ghost"
              style={{ padding: "5px 20px", fontSize: "12px" }}
              onClick={onEnterApp}
            >
              {t.nav_login}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                className="btn-ghost"
                style={{ padding: "5px 20px", fontSize: "12px" }}
              >
                {t.nav_login}
              </button>
            </SignInButton>
          )}
        </div>

        {/* Кнопка CTA через Clerk */}
        {isSignedIn ? (
          <button
            className="btn-primary"
            style={{ padding: "9px 18px", fontSize: "13px" }}
            onClick={onEnterApp}
          >
            {t.nav_cta}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button
              className="btn-primary"
              style={{ padding: "9px 18px", fontSize: "13px" }}
            >
              {t.nav_cta}
            </button>
          </SignInButton>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          padding: "80px 24px 60px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle,rgba(124,92,252,0.12) 0%,transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="fu1" style={{ marginBottom: "20px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(124,92,252,0.1)",
              border: "1px solid var(--border-accent)",
              borderRadius: "20px",
              fontSize: "13px",
              color: "var(--accent)",
            }}
          >
            {t.hero_tag}
          </span>
        </div>

        <h1
          className="fu2"
          style={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: "clamp(30px,5.5vw,62px)",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginBottom: "24px",
          }}
        >
          {t.hero_h1a}
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#A855F7,#3B6EF7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.hero_h1b}
          </span>
        </h1>

        <p
          className="fu3"
          style={{
            fontSize: "17px",
            color: "var(--text-dim)",
            maxWidth: "560px",
            margin: "0 auto 20px",
            lineHeight: 1.7,
          }}
        >
          {t.hero_sub}
        </p>

        <div
          className="fu3"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "36px",
          }}
        >
          {NICHES.slice(0, 6).map((n) => (
            <span
              key={n.id}
              style={{
                padding: "5px 13px",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                fontSize: "13px",
                color: "var(--text-mid)",
              }}
            >
              {n.icon} {t[n.tk]}
            </span>
          ))}
        </div>

        <div className="fu4">
          {isSignedIn ? (
            <button
              className="btn-primary"
              style={{ fontSize: "16px", padding: "15px 36px" }}
              onClick={onEnterApp}
            >
              {t.hero_cta}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                className="btn-primary"
                style={{ fontSize: "16px", padding: "15px 36px" }}
              >
                {t.hero_cta}
              </button>
            </SignInButton>
          )}
        </div>
        <p className="fu4" style={{ marginTop: "14px", fontSize: "13px", color: "var(--text-dim)" }}>
          {t.hero_note}
        </p>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "40px 24px 60px", maxWidth: "700px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "clamp(22px,3vw,34px)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          {t.how_title}
        </h2>
        {t.how.map(([icon, title, desc], i) => (
          <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "var(--bg3)",
                  border: "1px solid var(--border-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              {i < 3 && <div className="step-line" />}
            </div>
            <div style={{ paddingTop: "10px", paddingBottom: i < 3 ? "24px" : 0 }}>
              <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>{title}</div>
              <div style={{ fontSize: "14px", color: "var(--text-dim)", lineHeight: 1.6 }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "20px 24px 80px", maxWidth: "980px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "clamp(24px,3vw,36px)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          {t.price_title}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "15px", marginBottom: "24px" }}>
          {t.price_sub}
        </p>

        {/* Billing toggle */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              gap: "3px",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "4px",
            }}
          >
            {[
              { label: t.monthly, val: false },
              { label: t.yearly,  val: true  },
            ].map(({ label, val }) => (
              <button
                key={String(val)}
                onClick={() => setYearly(val)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  background:
                    yearly === val
                      ? "linear-gradient(135deg,var(--accent),var(--accent2))"
                      : "transparent",
                  color: yearly === val ? "white" : "var(--text-dim)",
                  cursor: "pointer",
                  transition: "all .2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {label}
                {val && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "rgba(79,214,160,0.15)",
                      color: "#4FD6A0",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      border: "1px solid rgba(79,214,160,0.3)",
                    }}
                  >
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
          {yearly && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "#4FD6A0" }}>
              💚 {t.yearly_save}
            </p>
          )}
        </div>

        {/* Plan cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: "18px",
          }}
        >
          {PLANS.map((plan) => {
            const { pk } = plan;
            const price    = yearly && plan.py ? plan.py : plan.price;
            const features = t[pk + "f"] || [];
            return (
              <div
                key={pk}
                style={{
                  background: plan.primary
                    ? "linear-gradient(135deg,rgba(124,92,252,0.08),var(--bg3))"
                    : "var(--bg3)",
                  borderRadius: "20px",
                  padding: "26px",
                  border: plan.primary
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  position: "relative",
                  boxShadow: plan.primary ? "0 8px 40px rgba(124,92,252,0.15)" : "none",
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,var(--accent),var(--accent2))",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 14px",
                      borderRadius: "20px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⚡ {t.pp}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    fontFamily: "'Syne',sans-serif",
                    marginBottom: "4px",
                    color: plan.primary ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {t[pk + "n"]}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "14px" }}>
                  {t[pk + "d"]}
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "6px" }}>
                  <span
                    style={{
                      fontFamily: "'Syne',sans-serif",
                      fontSize: "42px",
                      fontWeight: 800,
                      color: plan.primary ? "var(--accent)" : "var(--text)",
                      lineHeight: 1,
                    }}
                  >
                    ${price}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: "13px", marginBottom: "6px" }}>
                    {plan.period}
                  </span>
                </div>

                {plan.py && yearly ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#4FD6A0",
                      marginBottom: "12px",
                      padding: "3px 10px",
                      background: "rgba(79,214,160,0.08)",
                      border: "1px solid rgba(79,214,160,0.2)",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}
                  >
                    💚 -${(plan.price - plan.py) * 12}/yr
                  </div>
                ) : (
                  <div style={{ marginBottom: "12px" }} />
                )}

                <div style={{ marginBottom: "20px" }}>
                  {features.map((f, j) => {
                    const neg = f.startsWith("—");
                    return (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ color: neg ? "var(--text-dim)" : "var(--accent)", minWidth: "14px" }}>
                          {neg ? "—" : "✓"}
                        </span>
                        <span style={{ color: neg ? "var(--text-dim)" : "var(--text-mid)" }}>
                          {neg ? f.slice(2) : f}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isSignedIn ? (
                  <button
                    className={plan.primary ? "btn-primary" : "btn-ghost"}
                    style={{ width: "100%", padding: "12px", fontSize: "13px" }}
                    onClick={onEnterApp}
                  >
                    {t[pk + "b"]}
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button
                      className={plan.primary ? "btn-primary" : "btn-ghost"}
                      style={{ width: "100%", padding: "12px", fontSize: "13px" }}
                    >
                      {t[pk + "b"]}
                    </button>
                  </SignInButton>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
            💳 Stripe
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "36px 24px", textAlign: "center" }}>
        <div style={{ marginBottom: "14px" }}>
          <Logo size={26} />
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
          {t.footer_sub}
        </p>
        <a
          href={TG}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 22px",
            borderRadius: "14px",
            background: "rgba(124,92,252,0.1)",
            border: "1px solid var(--border-accent)",
            textDecoration: "none",
          }}
        >
          <TgSvg />
          <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--accent)" }}>
            {t.contact}
          </span>
        </a>
      </footer>
    </div>
  );
}
