import type { Response } from 'express';
import { scanReceiptImage } from '../services/ocrService.js';
import { absoluteUploadPath } from '../utils/upload.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const postOcrScan = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const result = await scanReceiptImage(absoluteUploadPath(req.file.filename));
  res.json(result);
});
