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

const formatStructure = (s: any) => ({
  id: s.id,
  type: s.type,
  nom: s.nom,
  adresse: s.adresse,
  telephone: s.telephone,
  email: s.email,
  photo: s.photo,
  personnePhysique: s.personne_physique,
  personneMorale: s.personne_morale,
  detenteurs: s.detenteurs,
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' });
  }

  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
  const { id } = req.query;

  try {
    // Single structure operations (GET/PUT/DELETE with id)
    if (id && typeof id === 'string') {
      const existing = await sql`
        SELECT * FROM structures WHERE id = ${id} AND user_id = ${user.userId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Structure non trouvée' });
      }

      const oldData = formatStructure(existing[0]);

      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          data: { structure: oldData }
        });
      }

      if (req.method === 'PUT') {
        const body = await getBody(req);
        const { type, nom, adresse, telephone, email, photo, personnePhysique, personneMorale, detenteurs } = body;

        const result = await sql`
          UPDATE structures SET
            type = COALESCE(${type}, type),
            nom = COALESCE(${nom}, nom),
            adresse = COALESCE(${adresse}, adresse),
            telephone = ${telephone || null},
            email = ${email || null},
            photo = ${photo || null},
            personne_physique = ${personnePhysique ? JSON.stringify(personnePhysique) : null},
            personne_morale = ${personneMorale ? JSON.stringify(personneMorale) : null},
            detenteurs = ${detenteurs ? JSON.stringify(detenteurs) : null},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND user_id = ${user.userId}
          RETURNING *
        `;

        if (result.length === 0) {
          return res.status(404).json({ success: false, error: 'Structure non trouvée' });
        }

        const newData = formatStructure(result[0]);

        return res.status(200).json({
          success: true,
          data: { structure: newData }
        });
      }

      if (req.method === 'DELETE') {
        await sql`
          DELETE FROM structures WHERE id = ${id} AND user_id = ${user.userId}
        `;

        return res.status(200).json({ success: true, message: 'Structure supprimée' });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Collection operations (GET all, POST new)
    if (req.method === 'GET') {
      const structures = await sql`
        SELECT * FROM structures
        WHERE user_id = ${user.userId}
        ORDER BY created_at DESC
      `;

      const formattedStructures = structures.map(formatStructure);

      return res.status(200).json({
        success: true,
        data: { structures: formattedStructures }
      });
    }

    if (req.method === 'POST') {
      const body = await getBody(req);
      const { type, nom, adresse, telephone, email, photo, personnePhysique, personneMorale, detenteurs } = body;

      if (!type || !nom) {
        return res.status(400).json({ success: false, error: 'Type et nom requis' });
      }

      const result = await sql`
        INSERT INTO structures (user_id, type, nom, adresse, telephone, email, photo, personne_physique, personne_morale, detenteurs)
        VALUES (
          ${user.userId},
          ${type},
          ${nom},
          ${adresse || null},
          ${telephone || null},
          ${email || null},
          ${photo || null},
          ${personnePhysique ? JSON.stringify(personnePhysique) : null},
          ${personneMorale ? JSON.stringify(personneMorale) : null},
          ${detenteurs ? JSON.stringify(detenteurs) : null}
        )
        RETURNING *
      `;

      const formattedStructure = formatStructure(result[0]);

      return res.status(201).json({
        success: true,
        data: { structure: formattedStructure }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Structures error:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}
