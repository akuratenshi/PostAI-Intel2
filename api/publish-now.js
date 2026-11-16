import {endpoint,channelName,text} from '../server/core.js';
import {authenticate} from '../server/auth.js';
import {ownedChannel} from '../server/db.js';
import {rateLimit} from '../server/quota.js';
import {sendText} from '../server/telegram.js';
export default endpoint(['POST'],async req=>{
 const user=await authenticate(req),name=channelName(req.body?.channel_username);
 await ownedChannel(user.id,name); await rateLimit(user.id,'publish',20);
 return {success:true,message_id:await sendText(name,text(req.body?.post_text,4096))};
});
