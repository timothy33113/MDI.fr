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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

  try {
    if (req.method === 'GET') {
      const projets = await sql`
        SELECT p.*,
          bi.adresse as bien_adresse, bi.ville as bien_ville,
          bi.type as bien_type, bi.superficie as bien_superficie,
          pf.cout_total_projet, pf.montant_emprunt
        FROM projets p
        LEFT JOIN biens_immobiliers_v2 bi ON bi.projet_id = p.id
        LEFT JOIN plans_financement_v2 pf ON pf.projet_id = p.id
        WHERE p.user_id = ${user.userId}
        ORDER BY p.date_creation DESC
      `;

      return res.status(200).json(projets);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const { nom, description, status } = body || {};

      if (!nom) {
        return res.status(400).json({ error: 'Nom du projet requis' });
      }

      const result = await sql`
        INSERT INTO projets (user_id, nom, description, status)
        VALUES (${user.userId}, ${nom}, ${description || null}, ${status || 'Analyse'})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projets error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
