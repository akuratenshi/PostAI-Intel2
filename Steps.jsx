export function Steps({ current, labels }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
      {labels.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < labels.length - 1 ? 1 : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  i < current
                    ? "linear-gradient(135deg,#7C5CFC,#A855F7)"
                    : i === current
                    ? "var(--glow)"
                    : "var(--bg3)",
                border:
                  i === current
                    ? "2px solid var(--accent)"
                    : i < current
                    ? "none"
                    : "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 700,
                color: i <= current ? "white" : "var(--text-dim)",
                transition: "all .3s",
              }}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: i === current ? "var(--accent)" : "var(--text-dim)",
                whiteSpace: "nowrap",
                fontWeight: i === current ? 600 : 400,
              }}
            >
              {s}
            </div>
          </div>

          {i < labels.length - 1 && (
            <div
              style={{
                flex: 1,
                height: "1px",
                background: i < current ? "var(--accent)" : "var(--border)",
                margin: "0 8px",
                marginBottom: "14px",
                opacity: i < current ? 0.6 : 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
