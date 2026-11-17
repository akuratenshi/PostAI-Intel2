import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';
import { HttpError, required } from './core.js';
import { FREE_LIMIT } from '../shared/config.js';

export { FREE_LIMIT };

function isAdmin(user) {
  if (!user?.id) return false;

  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return adminIds.includes(user.id);
}

export const redis = () => new Redis({
  url: required('POSTAI_REDIS_KV_REST_API_URL'),
  token: required('POSTAI_REDIS_KV_REST_API_TOKEN'),
});

export function fingerprint(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  return createHash('sha256')
    .update(
      `${ip}|${req.headers['user-agent'] || 'unknown'}|${req.headers['accept-language'] || 'unknown'}`
    )
    .digest('hex')
    .slice(0, 32);
}

export async function rateLimit(userId, kind, max = 20) {
  const r = redis();
  const key = `rate:${kind}:${userId}:${Math.floor(Date.now() / 3600000)}`;

  const count = await r.eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],7200) end; return n",
    [key],
    []
  );

  if (Number(count) > max) {
    throw new HttpError(429, 'Too many requests. Try later.');
  }
}

export async function usage(user) {
  if (isAdmin(user)) {
    return {
      used: 0,
      limit: null,
      remaining: null,
      unlimited: true,
    };
  }

  const r = redis();

  const [current, legacy] = await Promise.all([
    r.get(`usage:v2:${user.id}`),
    r.get(`usage:${user.email}`),
  ]);

  const used = Math.max(
    Number(current) || 0,
    Number(legacy) || 0
  );

  return {
    used,
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - used),
    unlimited: false,
  };
}

export const RESERVE_SCRIPT = `
local used=math.max(tonumber(redis.call('GET',KEYS[1]) or '0'),tonumber(redis.call('GET',KEYS[2]) or '0'))
local device=tonumber(redis.call('GET',KEYS[3]) or '0')
if used>=tonumber(ARGV[1]) or device>=tonumber(ARGV[1]) then return -1 end
redis.call('SET',KEYS[1],used+1)
redis.call('INCR',KEYS[3])
return used+1`;

export async function reserve(user, device = 'scheduled:' + user.id) {
  if (isAdmin(user)) {
    return {
      used: 0,
      unlimited: true,
      refund: async () => 1,
    };
  }

  const r = redis();
  const keys = [
    `usage:v2:${user.id}`,
    `usage:${user.email}`,
    `usage:fp:${device}`,
  ];

  const used = Number(
    await r.eval(RESERVE_SCRIPT, keys, [FREE_LIMIT])
  );

  if (used < 0) {
    throw new HttpError(429, 'free_limit_reached');
  }

  return {
    used,
    unlimited: false,
    refund: () => r.eval(
      "for _,k in ipairs(KEYS) do local n=tonumber(redis.call('GET',k) or '0'); if n>0 then redis.call('DECR',k) end end; return 1",
      [keys[0], keys[2]],
      []
    ),
  };
}
