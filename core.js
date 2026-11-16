export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function endpoint(methods, run) {
 return async (req,res) => {
  res.setHeader?.('Cache-Control','no-store');
  if (!methods.includes(req.method)) { res.setHeader?.('Allow',methods.join(', ')); return res.status(405).json({error:'Method not allowed'}); }
  try { return res.status(200).json(await run(req)); }
  catch(e) { const status=e.status || 503; if(!e.status) console.error('Request failed:',e.message); return res.status(status).json({error:e.status ? e.message : 'Service temporarily unavailable'}); }
 };
}
export function required(name) { const value=process.env[name]; if(!value) throw new HttpError(503,`Missing server configuration: ${name}`); return value; }
export function text(value,max=5000) { if(typeof value!=='string'||!value.trim()||value.length>max) throw new HttpError(400,'Invalid text'); return value.trim(); }
export function channelName(value) { const v=text(value,100).replace(/^@/,''); if(!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(v)) throw new HttpError(400,'Use a public Telegram channel @username'); return '@'+v.toLowerCase(); }
export function uuid(value) { if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400,'Invalid id'); return value; }
