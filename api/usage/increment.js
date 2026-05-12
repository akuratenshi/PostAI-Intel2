// api/usage/increment.js — POST /api/usage/increment
// Увеличивает счётчик использований для пользователя

const usageStore = {};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  usageStore[userId] = (usageStore[userId] ?? 0) + 1;
  return res.status(200).json({ used: usageStore[userId] });
}
