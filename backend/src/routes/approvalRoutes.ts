import { Router } from 'express';
import {
  postApprove,
  postReject,
  getPending,
  postEscalate,
  postOverride,
} from '../controllers/approvalController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const r = Router();
r.use(authenticate);
r.post('/approve', postApprove);
r.post('/reject', postReject);
r.post('/escalate', postEscalate);
r.post('/override', requireRoles('ADMIN'), postOverride);
r.get('/pending', getPending);

export default r;
