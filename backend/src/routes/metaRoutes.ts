import { Router } from 'express';
import { getCountries } from '../controllers/metaController.js';

const r = Router();
/** Public — used on signup before JWT exists */
r.get('/countries', getCountries);

export default r;
