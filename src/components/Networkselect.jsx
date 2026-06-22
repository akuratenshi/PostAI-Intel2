import { useState, useRef, useEffect } from "react";
import { NetworkIcon } from "./NetworkIcon.jsx";
import { NETWORKS } from "../data/constants.js";

export function NetworkSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = NETWORKS.find((n) => n.id === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "var(--bg3)",
          cursor: "pointer",
          userSelect: "none",
          fontSize: "14px",
          color: "var(--text)",
        }}
      >
        <NetworkIcon id={value} size={20} />
        <span style={{ flex: 1 }}>{current?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            opacity: 0.5,
          }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg3)",
            border: "1px solid var(--border-accent)",
            borderRadius: "12px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {NETWORKS.map((n) => (
            <div
              key={n.id}
              onClick={() => { onChange(n.id); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "11px 14px",
                cursor: "pointer",
                fontSize: "14px",
                color: n.id === value ? "var(--accent)" : "var(--text)",
                background: n.id === value ? "rgba(124,92,252,0.08)" : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (n.id !== value) e.currentTarget.style.background = "var(--bg)"; }}
              onMouseLeave={(e) => { if (n.id !== value) e.currentTarget.style.background = "transparent"; }}
            >
              <NetworkIcon id={n.id} size={20} />
              <span>{n.label}</span>
              {n.id === value && (
                <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
