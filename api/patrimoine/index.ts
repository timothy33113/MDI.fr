import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

function getUserFromRequest(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string; email: string };
  } catch { return null; }
}

function getSQL() {
  return neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
}

/**
 * GET /api/patrimoine?structureId=xxx  - Patrimoine d'une structure
 * GET /api/patrimoine?userId=xxx       - Patrimoine global d'un utilisateur
 *
 * Retourne: biens patrimoniaux, credits, comptes bancaires
 */
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

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const sql = getSQL();
  const { structureId } = req.query;

  try {
    // Si structureId fourni, patrimoine d'une seule structure
    if (structureId && typeof structureId === 'string') {
      // Verifier que la structure appartient a l'utilisateur
      const structures = await sql`
        SELECT id, nom, type, personne_physique, personne_morale
        FROM structures WHERE id = ${structureId} AND user_id = ${user.userId}
      `;

      if (structures.length === 0) {
        return res.status(404).json({ error: 'Structure non trouvee' });
      }

      const structure = structures[0];

      // Recuperer les donnees patrimoniales depuis le JSONB de la structure
      const patrimoine = extractPatrimoineFromStructure(structure);

      // Recuperer aussi les biens patrimoniaux de la table dediee
      const biensPatrimoniaux = await sql`
        SELECT * FROM biens_patrimoniaux WHERE structure_id = ${structureId}
      `;

      const credits = await sql`
        SELECT * FROM credits_patrimoniaux WHERE structure_id = ${structureId}
      `;

      const comptes = await sql`
        SELECT * FROM comptes_bancaires WHERE structure_id = ${structureId}
      `;

      return res.status(200).json({
        success: true,
        data: {
          structure: {
            id: structure.id,
            nom: structure.nom,
            type: structure.type
          },
          // Donnees JSONB (stockees dans la structure elle-meme)
          patrimoine,
          // Donnees relationnelles (tables dediees)
          biensPatrimoniaux: biensPatrimoniaux.map(b => ({
            id: b.id,
            type: b.type,
            adresse: b.adresse,
            valeurEstimee: b.valeur_estimee,
            loyerMensuel: b.loyer_mensuel,
            dateAcquisition: b.date_acquisition
          })),
          credits: credits.map(c => ({
            id: c.id,
            type: c.type,
            organisme: c.organisme,
            montantInitial: c.montant_initial,
            capitalRestant: c.capital_restant,
            mensualite: c.mensualite,
            tauxInteret: c.taux_interet,
            dateDebut: c.date_debut,
            duree: c.duree
          })),
          comptes: comptes.map(c => ({
            id: c.id,
            nom: c.nom,
            banque: c.banque,
            typeCompte: c.type_compte,
            solde: c.solde
          }))
        }
      });
    }

    // Sinon, patrimoine global de toutes les structures de l'utilisateur
    const structures = await sql`
      SELECT id, nom, type, personne_physique, personne_morale
      FROM structures WHERE user_id = ${user.userId}
    `;

    const result = [];
    for (const structure of structures) {
      const patrimoine = extractPatrimoineFromStructure(structure);

      const comptes = await sql`
        SELECT * FROM comptes_bancaires WHERE structure_id = ${structure.id}
      `;

      result.push({
        structure: {
          id: structure.id,
          nom: structure.nom,
          type: structure.type
        },
        patrimoine,
        comptes: comptes.map(c => ({
          id: c.id,
          nom: c.nom,
          banque: c.banque,
          typeCompte: c.type_compte,
          solde: c.solde
        }))
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Patrimoine error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Extraire les donnees patrimoniales du JSONB de la structure
 * (biens, comptes, credits sont stockes dans personne_physique ou personne_morale)
 */
function extractPatrimoineFromStructure(structure: any) {
  const data = structure.personne_physique || structure.personne_morale;
  if (!data) return { biens: [], comptes: [], credits: [], revenus: [] };

  return {
    biens: data.biens || [],
    comptes: data.comptes || [],
    credits: data.credits || [],
    revenus: data.revenus || []
  };
}
