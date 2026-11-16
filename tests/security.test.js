import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleRow,nextRun} from '../server/schedule.js';
import {channelName} from '../server/core.js';
import {processOne} from '../server/worker.js';
import {ownedChannel,db} from '../server/db.js';
import {checkCron} from '../api/publish-scheduled.js';

const user={id:'user_verified',email:'verified@example.invalid'};
const now=new Date('2030-01-07T08:00:00Z');
const input={channel_username:'@Example',mode:'once',scheduled_at:'2030-01-08T10:00:00Z',post_text:'Approved text',platform:'telegram'};
test('uses authenticated identity, preserves approved text and language',()=>{
 const row=scheduleRow({...input,user_id:'attacker',user_email:'other',language:'pl'},user,now);
 assert.equal(row.user_id,user.id);assert.equal(row.user_email,user.email);assert.equal(row.post_text,'Approved text');assert.equal(row.language,'pl');
});
test('rejects invalid, past and non-Telegram schedules',()=>{
 for(const value of ['invalid','2029-01-01']) assert.throws(()=>scheduleRow({...input,scheduled_at:value},user,now));
 assert.throws(()=>scheduleRow({...input,platform:'instagram'},user,now));
 assert.throws(()=>scheduleRow({...input,mode:'other'},user,now));
 assert.throws(()=>scheduleRow({...input,post_text:'x'.repeat(4097)},user,now));
});
test('recurrence validates time/days and skips elapsed slots',()=>{
 assert.equal(nextRun('09:00','weekdays',now),'2030-01-07T09:00:00.000Z');
 assert.equal(nextRun('09:00','mon',new Date('2030-01-07T09:00:00Z')),'2030-01-14T09:00:00.000Z');
 assert.throws(()=>nextRun('25:00','daily',now));assert.throws(()=>nextRun('09:00','bad',now));
});
test('normalizes channel and rejects filter injection',()=>{
 assert.equal(channelName('Example'),'@example');assert.throws(()=>channelName('@test&user_id=other'));
});
test('cron rejects untrusted GET and spoofed header',()=>{
 process.env.CRON_SECRET='test-only-secret';
 for(const headers of [{},{'x-vercel-cron':'1'},{authorization:'Bearer undefined'}]) assert.throws(()=>checkCron({headers}),/Unauthorized/);
 checkCron({headers:{authorization:'Bearer test-only-secret'}});
});

test('all protected APIs reject missing session before calling services',async()=>{
 const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Network forbidden');};
 try {
  for(const [file,method] of [['generate.mjs','POST'],['keywords.js','POST'],['publish-now.js','POST'],['schedule-post.js','POST'],['add-post.js','POST'],['user-channels.js','GET'],['user-channels.js','POST'],['user-channels.js','DELETE'],['usage.js','GET']]) {
   const {default:handler}=await import('../api/'+file);
   const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
   await handler({method,headers:{},body:{email:'admin@example.invalid'},query:{}},res);
   assert.equal(res.code,401,file);
  }
  assert.equal(calls,0);
 } finally {globalThis.fetch=oldFetch;}
});

test('database ownership lookup requires verified channel for exact Clerk user',async()=>{
 const oldFetch=globalThis.fetch;process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 let request;
 globalThis.fetch=async(url,options)=>{request={url:new URL(url),options};return {ok:true,status:200,json:async()=>[]};};
 try {
  await assert.rejects(()=>ownedChannel(user.id,'@example'),/Verify ownership/);
  assert.equal(request.url.searchParams.get('user_id'),'eq.user_verified');
  assert.equal(request.url.searchParams.get('verified_at'),'not.is.null');
  assert.equal(request.options.headers.Authorization,'Bearer test-only');
 } finally {globalThis.fetch=oldFetch;}
});

function fixture(overrides={}) {
 let row={id:'post1',user_id:user.id,user_email:user.email,channel_username:'@example',status:'pending',scheduled_at:'2020-01-01',post_text:'Approved text',...overrides};
 let sends=0,generations=0,refunds=0;
 const deps={
  db:async(table,{method='GET',query={},body}={})=>{
   if(method==='GET') return row.status==='pending'?[{...row}]:[];
   if(query.status && row.status!==query.status.slice(3)) return [];
   if(query.claim_token && row.claim_token!==query.claim_token.slice(3)) return [];
   row={...row,...body};return [{...row}];
  },
  ownedChannel:async()=>({}),
  generateContent:async()=>{generations++;return {post:'Generated text'};},
  reserve:async()=>({refund:async()=>{refunds++;}}),
  sendText:async(name,text)=>{sends++;return 123;}
 };
 return {deps,row:()=>row,stats:()=>({sends,generations,refunds})};
}
test('worker publishes approved text without generation and clears stale error',async()=>{
 const f=fixture({error_message:'Old error'});let sent;
 f.deps.sendText=async(name,text)=>{sent=text;return 123;};
 await processOne(f.deps);assert.equal(sent,'Approved text');assert.equal(f.stats().generations,0);assert.equal(f.row().error_message,null);assert.equal(f.row().status,'published');
});
test('concurrent workers send once through conditional claim',async()=>{
 const f=fixture();await Promise.all([processOne(f.deps),processOne(f.deps)]);assert.equal(f.stats().sends,1);
});
test('recurring task advances next run and resets generated text',async()=>{
 const f=fixture({is_recurring:true,recurrence_time:'09:00',recurrence_days:'daily',post_text:null,language:'pl'});
 await processOne(f.deps);assert.equal(f.row().status,'pending');assert.equal(f.row().post_text,null);assert.ok(new Date(f.row().scheduled_at)>new Date());assert.equal(f.stats().generations,1);
});
test('ambiguous Telegram failure becomes unknown and is never automatically retried',async()=>{
 const f=fixture();let calls=0;f.deps.sendText=async()=>{calls++;throw new Error('Timeout');};
 await processOne(f.deps);await processOne(f.deps);assert.equal(f.row().status,'unknown');assert.equal(calls,1);
});
test('generation failure refunds reservation without publishing',async()=>{
 const f=fixture({post_text:null});f.deps.generateContent=async()=>{throw new Error('Generation failed');};
 await processOne(f.deps);assert.equal(f.row().status,'failed');assert.equal(f.stats().refunds,1);assert.equal(f.stats().sends,0);
});
test('missing channel ownership fails before generation or Telegram',async()=>{
 const f=fixture({post_text:null});f.deps.ownedChannel=async()=>{throw new Error('Forbidden');};
 await processOne(f.deps);assert.equal(f.stats().sends,0);assert.equal(f.stats().generations,0);assert.equal(f.row().status,'failed');
});
test('historical JSON is normalized into post text before send',async()=>{
 const f=fixture({post_text:'{"post":"Clean text"}'});let sent;f.deps.sendText=async(name,text)=>{sent=text;return 123;};
 await processOne(f.deps);assert.equal(sent,'Clean text');
});
test('publishing status prevents retry even if acknowledgement cannot be persisted',async()=>{
 const f=fixture();const original=f.deps.db;f.deps.db=async(t,o)=>{if(o.body?.status==='published'||o.body?.status==='unknown') throw new Error('Database unavailable');return original(t,o);};
 await processOne(f.deps);await processOne(f.deps);assert.equal(f.row().status,'publishing');assert.equal(f.stats().sends,1);
});

test('successful generation returns bounded output and strips citation tags',async()=>{
 const {generateContent}=await import('../server/content.js');const oldFetch=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({post:'Hello <cite id="1">world</cite>'})}]})};};
 try {const result=await generateContent({prompt:'test',maxTokens:999999});assert.equal(sent.max_tokens,2000);assert.equal(result.post,'Hello world');} finally {globalThis.fetch=oldFetch;}
});
test('truncated or malformed generation cannot count as a successful post',async()=>{
 const {generateContent}=await import('../server/content.js');const oldFetch=globalThis.fetch;
 try {
  globalThis.fetch=async()=>({ok:true,json:async()=>({stop_reason:'max_tokens',content:[]})});
  await assert.rejects(()=>generateContent({prompt:'test'}),/incomplete/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:'not JSON'}]})});
  await assert.rejects(()=>generateContent({prompt:'test'}),/Invalid generation response/);
 } finally {globalThis.fetch=oldFetch;}
});
test('legacy usage mutator and password gate are disabled',async()=>{
 for(const file of ['usage/increment.js','check-password.js']) {
  const {default:handler}=await import('../api/'+file);const res={status(n){this.code=n;return this;},json(){return this;}};
  await handler({method:'POST',body:{}},res);assert.equal(res.code,410);
 }
});

test('trial allowance has one shared source for browser and server',async()=>{
 const {FREE_LIMIT:a}=await import('../shared/config.js');const {FREE_LIMIT:b}=await import('../server/quota.js');const {FREE_LIMIT:c}=await import('../src/data/constants.js');assert.equal(a,1);assert.equal(a,b);assert.equal(a,c);
});
test('quota uses verified identity and a single atomic reservation request',async()=>{
 const {reserve}=await import('../server/quota.js');const oldFetch=globalThis.fetch;
 process.env.KV_REST_API_URL='https://quota.example.invalid';process.env.KV_REST_API_TOKEN='test-only';
 let calls=[];
 globalThis.fetch=async(url,options)=>{
  const payload=JSON.parse(options.body);calls.push(payload);
  const isPipeline=Array.isArray(payload[0]);
  return new Response(JSON.stringify(isPipeline?payload.map(()=>({result:1})):{result:1}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try {const q=await reserve(user,'device');assert.equal(q.used,1);assert.equal(calls.length,1);assert.match(JSON.stringify(calls[0]),/usage:v2:user_verified/);assert.match(JSON.stringify(calls[0]),/verified@example.invalid/);await q.refund();assert.equal(calls.length,2);}
 finally {globalThis.fetch=oldFetch;}
});
test('exhausted quota is rejected before generation',async()=>{
 const {reserve}=await import('../server/quota.js');const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{const payload=JSON.parse(options.body);return new Response(JSON.stringify(Array.isArray(payload[0])?payload.map(()=>({result:-1})):{result:-1}),{status:200});};
 try {await assert.rejects(()=>reserve(user,'device'),/free_limit_reached/);}finally {globalThis.fetch=oldFetch;}
});
