import { endpoint,text,required } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { rateLimit } from '../server/quota.js';
export default endpoint(['POST'],async req=>{
 const user=await authenticate(req); const query=text(req.body?.query,500);
 await rateLimit(user.id,'keywords',10);
 const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':required('ANTHROPIC_API_KEY'),'anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5',max_tokens:60,messages:[{role:'user',content:`Return only 3 English photo keywords for: ${query}`}]}),signal:AbortSignal.timeout(15000)});
 if(!response.ok) return {keywords:query};
 const data=await response.json(); return {keywords:(data.content?.find(b=>b.type==='text')?.text||query).slice(0,200)};
});
