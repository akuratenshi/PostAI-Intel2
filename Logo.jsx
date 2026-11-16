export function Logo({ size = 32 }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#A855F7" />
            <stop offset="1" stopColor="#3B6EF7" />
          </linearGradient>
        </defs>
        <path d="M24 3L42 13.5V34.5L24 45L6 34.5V13.5L24 3Z" fill="url(#lg1)" />
        <path d="M24 3L42 13.5V24H6V13.5L24 3Z" fill="rgba(255,255,255,0.08)" />
        <path d="M26 9L15 27H23L20 40L33 21H25L26 9Z" fill="white" opacity="0.95" />
      </svg>
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.7,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "#fff" }}>Post</span>
        <span
          style={{
            background: "linear-gradient(135deg,#A855F7,#3B6EF7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI
        </span>
        <span
          style={{
            color: "var(--text-dim)",
            fontSize: size * 0.42,
            fontWeight: 500,
            marginLeft: "6px",
          }}
        >
        </span>
      </span>
    </div>
  );
}
