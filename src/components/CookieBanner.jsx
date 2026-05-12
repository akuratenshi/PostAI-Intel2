import { useState, useEffect } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setVisible(false);
    // Включаем Google Analytics
    window.gtag && window.gtag("consent", "update", {
      analytics_storage: "granted",
    });
  };

  const decline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 40px)",
      maxWidth: "520px",
      background: "var(--bg2, #1a1a2e)",
      border: "1px solid var(--border, rgba(255,255,255,0.1))",
      borderRadius: "16px",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
      zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <p style={{
        fontSize: "13px",
        color: "var(--text-dim, #aaa)",
        margin: 0,
        flex: 1,
        minWidth: "200px",
        lineHeight: 1.5,
      }}>
        🍪 Мы используем cookies для улучшения сайта и аналитики.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={decline}
          style={{
            background: "none",
            border: "1px solid var(--border, rgba(255,255,255,0.1))",
            borderRadius: "8px",
            padding: "7px 14px",
            fontSize: "13px",
            color: "var(--text-dim, #aaa)",
            cursor: "pointer",
          }}
        >
          Отказать
        </button>
        <button
          onClick={accept}
          style={{
            background: "var(--accent, #7c5cfc)",
            border: "none",
            borderRadius: "8px",
            padding: "7px 14px",
            fontSize: "13px",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Принять
        </button>
      </div>
    </div>
  );
}
