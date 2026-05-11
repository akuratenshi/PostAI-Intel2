# PostAI Intel

AI-powered social media post generator for Telegram, Instagram and Facebook.

---

## Структура проєкту

```
postai/
├── api/
│   ├── generate.js         ← Serverless: генерація постів (проксі до Anthropic)
│   └── keywords.js         ← Serverless: ключові слова для Unsplash фото
├── src/
│   ├── App.jsx             ← Роутер + глобальний стан
│   ├── main.jsx
│   ├── styles/global.css
│   ├── data/
│   │   ├── constants.js
│   │   └── translations.js
│   ├── hooks/
│   │   └── usePostGenerator.js  ← Виклики /api/* (ключ на сервері)
│   ├── components/
│   │   ├── Logo.jsx, TgSvg.jsx, Steps.jsx, PostImage.jsx, Paywall.jsx
│   └── pages/
│       ├── LandingPage.jsx
│       └── AppPage.jsx
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## Деплой на Vercel

### 1. Залий на GitHub
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR/postai.git
git push -u origin main
```

### 2. Підключи Vercel
- vercel.com → Add New Project → вибери репо
- Framework: Vite (автоматично)
- Build: `npm run build` / Output: `dist`
- Deploy

### 3. Додай API ключ
- console.anthropic.com → API Keys → Create Key
- Vercel → Settings → Environment Variables
- Name: `ANTHROPIC_API_KEY` / Value: `sk-ant-...`
- Redeploy

### 4. Готово — сайт на `https://your-project.vercel.app` 🎉

---

## Локальний запуск
```bash
npm install
# Створи .env.local:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

---

## Безпека
Ключ `ANTHROPIC_API_KEY` зберігається тільки на сервері Vercel.
Браузер ніколи не бачить ключ — він викликає лише `/api/generate` і `/api/keywords`.
