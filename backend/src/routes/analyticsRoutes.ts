import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const r = Router();
r.use(authenticate);
r.get('/summary', requireRoles('ADMIN', 'MANAGER'), getAnalytics);

export default r;
