import { useState } from "react";

export function PostImage({ src }) {
  const [st, setSt] = useState("loading");

  if (!src) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: "var(--bg4)",
        overflow: "hidden",
      }}
    >
      {st === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "22px", animation: "pulse 1.5s infinite" }}>📸</div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Загрузка фото…</div>
        </div>
      )}

      {st === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            fontSize: "13px",
          }}
        >
          🖼️
        </div>
      )}

      <img
        src={src}
        alt=""
        onLoad={() => setSt("ok")}
        onError={() => setSt("error")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: st === "ok" ? "block" : "none",
        }}
      />

      {st === "ok" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "48px",
              background: "linear-gradient(to bottom,rgba(0,0,0,0.55),transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "9px",
              left: "9px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(7,6,15,0.78)",
              borderRadius: "7px",
              padding: "4px 9px",
              border: "1px solid rgba(124,92,252,0.4)",
              backdropFilter: "blur(6px)",
              pointerEvents: "none",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#A855F7" />
                  <stop offset="1" stopColor="#3B6EF7" />
                </linearGradient>
              </defs>
              <path d="M24 3L42 13.5V34.5L24 45L6 34.5V13.5L24 3Z" fill="url(#wm)" />
              <path
                d="M26 9L15 27H23L20 40L33 21H25L26 9Z"
                fill="white"
                opacity=".95"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 800,
                fontSize: "11px",
                color: "#fff",
              }}
            >
              Post
            </span>
            <span
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 800,
                fontSize: "11px",
                background: "linear-gradient(135deg,#A855F7,#3B6EF7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </div>
        </>
      )}
    </div>
  );
}
