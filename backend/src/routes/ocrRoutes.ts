import { Router } from 'express';
import { postOcrScan } from '../controllers/ocrController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const r = Router();
r.use(authenticate);
r.post('/scan', upload.single('image'), postOcrScan);

export default r;
