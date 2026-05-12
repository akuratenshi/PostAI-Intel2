// api/usage.js — GET /api/usage?userId=xxx
// Читает счётчик использований из простого хранилища (файл на Vercel KV или просто объект)

// Простое in-memory хранилище (работает в рамках одного инстанса)
// Для продакшена замените на Vercel KV или базу данных
const usageStore = {};

export default function handler(req, res) {
  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const used = usageStore[userId] ?? 0;
    return res.status(200).json({ used });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
