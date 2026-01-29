import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

    const users = await sql`
      SELECT id, email, has_paid, created_at
      FROM users WHERE id = ${user.userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const dbUser = users[0];

    return res.status(200).json({
      id: dbUser.id,
      email: dbUser.email,
      hasPaid: dbUser.has_paid,
      createdAt: dbUser.created_at
    });
  } catch (error: any) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
