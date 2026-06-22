export function NetworkIcon({ id, size = 16 }) {
  const s = { width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 };

  if (id === "telegram") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#29A9EB"/>
      <path d="M5.5 11.5L17 7L14 18L10.5 14.5L8 16.5L8.5 13L15 8.5L7 12.5L5.5 11.5Z" fill="white"/>
      <path d="M8.5 13L10.5 14.5L8 16.5L8.5 13Z" fill="#C8DAEA"/>
    </svg>
  );

  if (id === "instagram") return (
    <svg style={s} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F9A825"/>
          <stop offset="35%" stopColor="#E91E63"/>
          <stop offset="100%" stopColor="#9C27B0"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.8"/>
      <circle cx="17" cy="7" r="1.2" fill="white"/>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
    </svg>
  );

  if (id === "facebook") return (
    <svg style={s} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M15.5 8H13.5C13.2 8 13 8.2 13 8.5V10H15.5L15.1 12.5H13V19H10.5V12.5H9V10H10.5V8.5C10.5 6.6 11.8 5.5 13.5 5.5C14.3 5.5 15 5.6 15.5 5.7V8Z" fill="white"/>
    </svg>
  );

  return null;
}
