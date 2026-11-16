import {endpoint} from '../server/core.js';
import {authenticate} from '../server/auth.js';
import {db,ownedChannel} from '../server/db.js';
import {rateLimit} from '../server/quota.js';
import {scheduleRow} from '../server/schedule.js';
export default endpoint(['POST'],async req=>{
 const user=await authenticate(req),row=scheduleRow(req.body||{},user);
 await ownedChannel(user.id,row.channel_username); await rateLimit(user.id,'schedule',20);
 const posts=await db('scheduled_posts',{method:'POST',body:row}); return {success:true,post:posts[0]};
});
