import {randomUUID} from 'node:crypto';
import {nextRun} from './schedule.js';
export async function processOne(deps) {
 const {db,ownedChannel,generateContent,reserve,sendText}=deps;
 const now=new Date().toISOString();
 const posts=await db('scheduled_posts',{query:{status:'eq.pending',user_id:'not.is.null',scheduled_at:`lte.${now}`,order:'scheduled_at.asc',limit:1}});
 if(!posts.length) return {processed:0};
 const post=posts[0],claim=randomUUID();
 const update=body=>db('scheduled_posts',{method:'PATCH',query:{id:`eq.${post.id}`,claim_token:`eq.${claim}`},body});
 const claimed=await db('scheduled_posts',{method:'PATCH',query:{id:`eq.${post.id}`,status:'eq.pending'},body:{status:'processing',claim_token:claim,processing_started_at:now,error_message:null}});
 if(!claimed.length) return {processed:0};
 let sending=false;
 try {
  await ownedChannel(post.user_id,post.channel_username);
  let content=post.post_text;
  // Historical JSON is decoded only if it actually contains a post field.
  if(content?.trim().startsWith('{')) { try { const value=JSON.parse(content); if(typeof value.post==='string') content=value.post; } catch {} }
  if(!content) {
   const quota=await reserve({id:post.user_id,email:post.user_email});
   try { content=(await generateContent(post)).post; } catch(e) { await quota.refund(); throw e; }
   // Persist generated content before sending. Do not regenerate on recovery.
   await update({post_text:content});
  }
  if(typeof content!=='string'||!content.trim()||content.length>4096) throw new Error('Invalid Telegram text length');
  await update({status:'publishing'});
  sending=true;
  const messageId=await sendText(post.channel_username,content);
  const body={status:'published',published_at:new Date().toISOString(),telegram_message_id:messageId,error_message:null,claim_token:null,processing_started_at:null};
  if(post.is_recurring) Object.assign(body,{status:'pending',scheduled_at:nextRun(post.recurrence_time,post.recurrence_days,new Date()),post_text:null});
  await update(body);
  return {processed:1,status:post.is_recurring?'rescheduled':'published',id:post.id};
 } catch(e) {
  // Telegram may have accepted a message before a timeout. Never auto-retry an ambiguous send.
  try { await update({status:sending?'unknown':'failed',error_message:String(e.message).slice(0,300),claim_token:null,processing_started_at:null}); } catch { /* leave claimed; requires operator reconciliation */ }
  return {processed:1,status:sending?'unknown':'failed',id:post.id};
 }
}
