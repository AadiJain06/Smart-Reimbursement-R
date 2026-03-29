import { Router } from 'express';
import { postRule, getRules } from '../controllers/ruleController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const r = Router();
r.use(authenticate);
r.post('/', requireRoles('ADMIN'), postRule);
r.get('/', requireRoles('ADMIN'), getRules);

export default r;
