import { endpoint,HttpError,text,required } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { reserve,fingerprint,rateLimit,FREE_LIMIT } from '../server/quota.js';
import { generateContent } from '../server/content.js';
export default endpoint(['POST'],async req=>{
 const user=await authenticate(req); required('ANTHROPIC_API_KEY');
 const body=req.body||{};
 if(body.prompt!==undefined) text(body.prompt,12000); else { text(body.niche,200); if(body.topic) text(body.topic,1000); if(body.competitors) text(body.competitors,500); }
 await rateLimit(user.id,'generate',20);
 const quota=await reserve(user,fingerprint(req));
 try { const result=await generateContent(body); return {...result,usage:{used:quota.used,limit:FREE_LIMIT,remaining:Math.max(0,FREE_LIMIT-quota.used)}}; }
 catch(e) { await quota.refund(); throw e; }
});
