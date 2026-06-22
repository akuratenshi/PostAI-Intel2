import { TG } from "../data/constants.js";

export function Paywall({ t, onClose }) {
  return (
    <div
      className="fi"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(7,6,15,0.95)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border-accent)",
          borderRadius: "24px",
          padding: "36px 28px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "18px",
            margin: "0 auto 18px",
            background: "linear-gradient(135deg,var(--accent),var(--accent2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
          }}
        >
          🔒
        </div>

        <h2
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          {t.pwt}
        </h2>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "14px",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          {t.pws}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {[
            { pk: "p1", price: "$19", primary: false },
            { pk: "p2", price: "$39", primary: true  },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                background: p.primary ? "rgba(124,92,252,0.1)" : "var(--bg)",
                border: `1px solid ${p.primary ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "14px",
                padding: "18px 14px",
              }}
            >
              {p.primary && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--accent)",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  {t.pwp}
                </div>
              )}
              <div
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "26px",
                  fontWeight: 800,
                  color: p.primary ? "var(--accent)" : "var(--text)",
                }}
              >
                {p.price}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "10px" }}>
                /мес
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-mid)",
                  marginBottom: "12px",
                }}
              >
                {t[p.pk + "n"]}
              </div>
              <button
                className={p.primary ? "btn-primary" : "btn-ghost"}
                style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                onClick={() => window.open(TG, "_blank")}
              >
                {t.pwb}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          {t.pwq}{" "}
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            @renellaice
          </a>
        </p>
      </div>
    </div>
  );
}
