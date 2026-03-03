import { neon } from '@neondatabase/serverless';

export function getSQL() {
  return neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
}
