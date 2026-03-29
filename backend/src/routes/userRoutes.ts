import { Router } from 'express';
import { postUser, getUsers } from '../controllers/userController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const r = Router();
r.use(authenticate);
r.post('/', requireRoles('ADMIN'), postUser);
r.get('/', requireRoles('ADMIN'), getUsers);

export default r;
