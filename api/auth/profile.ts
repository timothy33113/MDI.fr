import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

async function getBody(req: VercelRequest): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
    const { action } = req.query;

    // GET - Récupérer le profil
    if (req.method === 'GET') {
      const users = await sql`
        SELECT id, email, nom, prenom, telephone, has_paid, created_at, email_verified
        FROM users WHERE id = ${user.userId}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const dbUser = users[0];

      return res.status(200).json({
        id: dbUser.id,
        email: dbUser.email,
        nom: dbUser.nom || '',
        prenom: dbUser.prenom || '',
        telephone: dbUser.telephone || '',
        hasPaid: dbUser.has_paid,
        createdAt: dbUser.created_at,
        emailVerified: dbUser.email_verified || false
      });
    }

    // PUT - Mettre à jour le profil
    if (req.method === 'PUT' && action === 'update') {
      const body = await getBody(req);
      const { nom, prenom, telephone } = body;

      const result = await sql`
        UPDATE users
        SET nom = ${nom || null}, prenom = ${prenom || null}, telephone = ${telephone || null}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user.userId}
        RETURNING id, email, nom, prenom, telephone, has_paid, created_at, email_verified
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const dbUser = result[0];

      return res.status(200).json({
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          nom: dbUser.nom || '',
          prenom: dbUser.prenom || '',
          telephone: dbUser.telephone || '',
          hasPaid: dbUser.has_paid,
          createdAt: dbUser.created_at,
          emailVerified: dbUser.email_verified || false
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
