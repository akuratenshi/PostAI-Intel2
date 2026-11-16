import { createClerkClient, verifyToken } from '@clerk/backend';
import { HttpError, required } from './core.js';
export async function authenticate(req) {
 const token=/^Bearer (\S+)$/.exec(req.headers?.authorization || '')?.[1];
 if(!token) throw new HttpError(401,'Sign in required');
 const secretKey=required('CLERK_SECRET_KEY');
 const authorizedParties=required('CLERK_AUTHORIZED_PARTIES').split(',').map(s=>s.trim()).filter(Boolean);
 let claims;
 try {
  claims = await verifyToken(token, { secretKey, authorizedParties });
} catch (error) {
  console.error('Clerk token verification failed', {
    code: error?.code,
    reason: error?.reason,
    message: error?.message,
  });
  throw new HttpError(401, 'Invalid or expired session');
}
 if(!claims.sub || !claims.sid || !authorizedParties.includes(claims.azp)) throw new HttpError(401,'Invalid session');
 const user=await createClerkClient({secretKey}).users.getUser(claims.sub);
 const primary=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId && e.verification?.status==='verified');
 if(!primary) throw new HttpError(403,'Verified email required');
 return {id:claims.sub,email:primary.emailAddress.toLowerCase().trim()};
}
