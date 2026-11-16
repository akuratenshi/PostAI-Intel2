import {HttpError,text,channelName} from './core.js';
export function nextRun(time,days,after=new Date()) {
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')) throw new HttpError(400,'Invalid UTC time');
 const names=['sun','mon','tue','wed','thu','fri','sat'];
 const allowed=days==='daily'?names:days==='weekdays'?names.slice(1,6):String(days||'').split(',');
 if(!allowed.length||allowed.some(d=>!names.includes(d))) throw new HttpError(400,'Invalid recurrence days');
 const [h,m]=time.split(':').map(Number);
 for(let i=0;i<8;i++) { const d=new Date(after); d.setUTCDate(d.getUTCDate()+i); d.setUTCHours(h,m,0,0); if(d>after&&allowed.includes(names[d.getUTCDay()])) return d.toISOString(); }
 throw new HttpError(400,'Invalid recurrence');
}
export function scheduleRow(body,user,now=new Date()) {
 if(body.platform && body.platform!=='telegram') throw new HttpError(400,'Only Telegram publishing is supported');
 const recurring=body.mode==='recurring';
 if(body.mode!==undefined&&!['once','recurring'].includes(body.mode)) throw new HttpError(400,'Invalid mode');
 const language=body.language||'ru'; if(!['en','uk','pl','ru'].includes(language)) throw new HttpError(400,'Invalid language');
 const row={user_id:user.id,user_email:user.email,channel_username:channelName(body.channel_username),platform:'telegram',language,status:'pending',is_recurring:recurring,niche:body.niche?text(body.niche,200):null,topic:body.topic?text(body.topic,1000):null,format:body.format?text(body.format,30):'news',competitor:body.competitor?text(body.competitor,500):null};
 if(recurring) { if(!row.niche) throw new HttpError(400,'Niche required'); row.recurrence_time=body.recurrence_time; row.recurrence_days=body.recurrence_days||'daily'; row.scheduled_at=nextRun(row.recurrence_time,row.recurrence_days,now); row.post_text=null; }
 else { const date=new Date(body.scheduled_at); if(!Number.isFinite(date.getTime())||date<=now) throw new HttpError(400,'Choose a future date'); row.scheduled_at=date.toISOString(); row.post_text=body.post_text?text(body.post_text,4096):null; if(!row.post_text&&!row.niche) throw new HttpError(400,'Text or niche required'); }
 return row;
}
