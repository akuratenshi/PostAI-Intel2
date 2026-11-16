import {timingSafeEqual} from 'node:crypto';
import {endpoint,HttpError,required} from '../server/core.js';
import {db,ownedChannel} from '../server/db.js';
import {reserve} from '../server/quota.js';
import {generateContent} from '../server/content.js';
import {sendText} from '../server/telegram.js';
import {processOne} from '../server/worker.js';
export function checkCron(req) {
 const expected=Buffer.from(`Bearer ${required('CRON_SECRET')}`),actual=Buffer.from(req.headers?.authorization||'');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected)) throw new HttpError(401,'Unauthorized');
}
export default endpoint(['GET'],async req=>{
 checkCron(req);
 return processOne({db,ownedChannel,reserve,generateContent,sendText});
});
