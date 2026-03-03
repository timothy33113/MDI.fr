import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: false,
  },
};

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

async function getBody(req: VercelRequest): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function getUserFromRequest(req: VercelRequest): { userId: string; email: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const body = await getBody(req);
  const { migration } = body;

  if (!migration) {
    return res.status(400).json({ error: 'Migration name required', available: ['reset-tokens', 'email-verification', 'audit-logs'] });
  }

  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

  try {
    const results: string[] = [];

    if (migration === 'reset-tokens') {
      // Migration for password reset tokens
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`;
      results.push('Added reset_token column');

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE`;
      results.push('Added reset_token_expires column');

      await sql`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`;
      results.push('Created index on reset_token');
    }
    else if (migration === 'email-verification') {
      // Migration for email verification
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`;
      results.push('Added email_verified column');

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)`;
      results.push('Added email_verification_token column');

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE`;
      results.push('Added email_verification_expires column');

      await sql`CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)`;
      results.push('Created index on email_verification_token');
    }
    else if (migration === 'audit-logs') {
      // Migration for audit logs table
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID NOT NULL,
          old_data JSONB,
          new_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('Created audit_logs table');

      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`;
      results.push('Created indexes on audit_logs');
    }
    else if (migration === 'user-profile') {
      // Migration for user profile columns
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(255)`;
      results.push('Added nom column');

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS prenom VARCHAR(255)`;
      results.push('Added prenom column');

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`;
      results.push('Added telephone column');
    }
    else if (migration === 'all') {
      // Run all migrations
      // Reset tokens
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`;
      results.push('Completed reset-tokens migration');

      // Email verification
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)`;
      results.push('Completed email-verification migration');

      // Audit logs
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID NOT NULL,
          old_data JSONB,
          new_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`;
      results.push('Completed audit-logs migration');

      // User profile
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS prenom VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`;
      results.push('Completed user-profile migration');
    }
    else {
      return res.status(400).json({ error: 'Unknown migration', available: ['reset-tokens', 'email-verification', 'audit-logs', 'user-profile', 'all'] });
    }

    return res.status(200).json({
      success: true,
      migration,
      results
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Erreur migration' });
  }
}
