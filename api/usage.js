// api/usage.js — GET /api/usage?email=user@example.com
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email is required" });

  const normalizedEmail = email.toLowerCase().trim();
  const usageKey = `usage:${normalizedEmail}`;

  const used = Number((await redis.get(usageKey)) ?? 0);

  return res.status(200).json({
    email: normalizedEmail,
    used,
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - used),
    isLimitReached: used >= FREE_LIMIT,
  });
}
