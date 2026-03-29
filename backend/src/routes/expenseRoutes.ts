import { Router } from 'express';
import {
  postExpense,
  getExpenses,
  getExpenseById,
} from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const r = Router();
r.use(authenticate);
r.post('/', upload.single('receipt'), postExpense);
r.get('/', getExpenses);
r.get('/:id', getExpenseById);

export default r;
