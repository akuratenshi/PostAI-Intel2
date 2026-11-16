import { required,HttpError } from './core.js';
export async function telegram(method,body) {
 const response=await fetch(`https://api.telegram.org/bot${required('TELEGRAM_BOT_TOKEN')}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const data=await response.json();
 if(!response.ok||!data.ok) throw new HttpError(502,'Telegram request failed; check bot permissions');
 return data.result;
}
export async function sendText(channel,text) {
 if(typeof text!=='string'||!text.trim()||text.length>4096) throw new HttpError(400,'Telegram text must contain 1–4096 characters');
 // Plain text: a Telegram parsing error cannot trigger a duplicate fallback send.
 const message=await telegram('sendMessage',{chat_id:channel,text});
 return message.message_id;
}
