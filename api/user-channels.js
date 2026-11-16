import {randomBytes} from 'node:crypto';
import {endpoint,channelName,uuid,HttpError} from '../server/core.js';
import {authenticate} from '../server/auth.js';
import {db} from '../server/db.js';
import {redis,rateLimit} from '../server/quota.js';
import {telegram} from '../server/telegram.js';
export default endpoint(['GET','POST','DELETE'],async req=>{
 const user=await authenticate(req);
 if(req.method==='GET') return {channels:await db('user_channels',{query:{user_id:`eq.${user.id}`,select:'id,channel_username,channel_label,is_default,verified_at',order:'created_at.desc'}})};
 if(req.method==='DELETE') { const rows=await db('user_channels',{method:'DELETE',query:{id:`eq.${uuid(req.body?.id)}`,user_id:`eq.${user.id}`}}); if(!rows.length) throw new HttpError(404,'Channel not found'); return {success:true}; }
 await rateLimit(user.id,'channels',20);
 const name=channelName(req.body?.channel_username),key=`channel-proof:${user.id}:${name}`,r=redis();
 if(req.body?.action==='challenge') {
  const proof='postai-verify-'+randomBytes(16).toString('hex'); await r.set(key,proof,{ex:900});
  return {challenge:proof,message:'Временно добавьте этот код в описание Telegram-канала, добавьте бота администратором с правом публикации, затем нажмите «Проверить канал». После проверки код можно убрать.'};
 }
 const proof=await r.get(key); if(!proof) throw new HttpError(400,'Request a new channel verification code');
 const chat=await telegram('getChat',{chat_id:name});
 if(chat.type!=='channel'||!chat.description?.includes(proof)) throw new HttpError(403,'Verification code not found in channel description');
 const me=await telegram('getMe',{}),member=await telegram('getChatMember',{chat_id:chat.id,user_id:me.id});
 if(member.status!=='administrator'||!member.can_post_messages) throw new HttpError(403,'Give the bot permission to publish');
 const existing=await db('user_channels',{query:{user_id:`eq.${user.id}`,channel_username:`eq.${name}`,limit:1}});
 const body={user_id:user.id,user_email:user.email,channel_username:name,channel_label:chat.title||name,verified_at:new Date().toISOString()};
 const rows=existing.length?await db('user_channels',{method:'PATCH',query:{id:`eq.${existing[0].id}`,user_id:`eq.${user.id}`},body}):await db('user_channels',{method:'POST',body});
 await r.del(key); return {success:true,channel:rows[0]};
});
