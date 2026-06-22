// api/check-password.js
// Проверяет пароль для доступа к форме планировщика
// Пароль хранится в SCHEDULER_PASSWORD (Vercel Environment Variables)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.SCHEDULER_PASSWORD;

  if (!correctPassword) {
    return res.status(500).json({ error: 'SCHEDULER_PASSWORD не настроен' });
  }

  if (!password) {
    return res.status(400).json({ ok: false });
  }

  // Простое сравнение — пароль в env переменной
  const isCorrect = password === correctPassword;

  // Небольшая задержка чтобы усложнить брутфорс
  await new Promise(r => setTimeout(r, 500));

  return res.status(200).json({ ok: isCorrect });
}
