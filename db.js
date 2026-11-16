import { required, HttpError } from './core.js';
export async function db(table,{method='GET',query={},body}={}) {
 if(!['scheduled_posts','user_channels'].includes(table)) throw new Error('Invalid table');
 const url=new URL(`/rest/v1/${table}`,required('SUPABASE_URL'));
 for(const [key,value] of Object.entries(query)) url.searchParams.set(key,String(value));
 const key=required('SUPABASE_SERVICE_ROLE_KEY');
 const response=await fetch(url,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(3000)});
 if(!response.ok) throw new Error(`Database request failed (${response.status})`);
 return response.status===204?[]:response.json();
}
export async function ownedChannel(userId,name) {
 const rows=await db('user_channels',{query:{user_id:`eq.${userId}`,channel_username:`eq.${name}`,verified_at:'not.is.null',select:'id,channel_username',limit:1}});
 if(!rows.length) throw new HttpError(403,'Verify ownership of this channel first');
 return rows[0];
}
