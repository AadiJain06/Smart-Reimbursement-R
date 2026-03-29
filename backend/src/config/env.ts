import dotenv from 'dotenv';

dotenv.config();

/** Browsers send `Origin` without a trailing slash; CORS requires an exact match. */
function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, '');
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  frontendUrl: normalizeOrigin(process.env.FRONTEND_URL ?? 'http://localhost:5173'),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxFileMb: Number(process.env.MAX_FILE_MB ?? 10),
};
