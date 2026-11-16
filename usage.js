import { endpoint } from '../server/core.js';
import { authenticate } from '../server/auth.js';
import { usage } from '../server/quota.js';
export default endpoint(['GET'],async req=>usage(await authenticate(req)));
