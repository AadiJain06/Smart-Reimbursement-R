import type { Request, Response } from 'express';
import { fetchCountries } from '../services/countryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCountries = asyncHandler(async (_req: Request, res: Response) => {
  const data = await fetchCountries();
  res.json(data);
});
