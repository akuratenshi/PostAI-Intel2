import { endpoint } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { usage } from '../server/quota.js';

export default endpoint(['GET'], async req => {
  let user;

  try {
    user = await authenticate(req);
  } catch (error) {
    console.error('Usage: authentication failed', {
      status: error?.status,
      code: error?.code,
      causeCode: error?.cause?.code,
    });
    throw error;
  }

  try {
    return await usage(user);
  } catch (error) {
    console.error('Usage: Redis request failed', {
      code: error?.code,
      causeCode: error?.cause?.code,
    });
    throw error;
  }
});
