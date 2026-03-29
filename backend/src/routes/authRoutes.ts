import { Router } from 'express';
import { postSignup, postLogin, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const r = Router();
r.post('/signup', postSignup);
r.post('/login', postLogin);
r.get('/me', authenticate, getMe);

export default r;
