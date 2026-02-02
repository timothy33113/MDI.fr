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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID du projet requis' });
  }

  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

  try {
    // GET - Recuperer un projet par ID
    if (req.method === 'GET') {
      const projets = await sql`
        SELECT p.*,
          bi.id as bien_id, bi.adresse as bien_adresse, bi.code_postal as bien_code_postal,
          bi.ville as bien_ville, bi.type as bien_type, bi.superficie as bien_superficie,
          bi.nombre_pieces as bien_nombre_pieces, bi.nombre_chambres as bien_nombre_chambres,
          bi.nombre_sdb as bien_nombre_sdb, bi.annee_construction as bien_annee_construction,
          bi.etat_actuel as bien_etat_actuel, bi.dpe as bien_dpe, bi.ges as bien_ges,
          bi.destination_bien as bien_destination, bi.loyer_mensuel_estime as bien_loyer_mensuel,
          bi.charges_mensuelles as bien_charges_mensuelles, bi.taxe_fonciere as bien_taxe_fonciere,
          pf.id as financement_id, pf.prix_achat, pf.frais_notaire, pf.frais_agence,
          pf.montant_travaux, pf.frais_dossier_bancaire, pf.frais_garantie, pf.autres_frais,
          pf.cout_total_projet, pf.apport_personnel, pf.montant_emprunt, pf.duree_credit,
          pf.taux_interet_estime, pf.taux_assurance_estime, pf.mensualite_capital_interets,
          pf.mensualite_assurance, pf.mensualite_totale, pf.type_pret
        FROM projets p
        LEFT JOIN biens_immobiliers_v2 bi ON bi.projet_id = p.id
        LEFT JOIN plans_financement_v2 pf ON pf.projet_id = p.id
        WHERE p.id = ${id} AND p.user_id = ${user.userId}
      `;

      if (projets.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      const p = projets[0];

      // Recuperer les porteurs du projet
      const porteurs = await sql`
        SELECT pp.*, s.id as structure_id, s.type as structure_type, s.nom as structure_nom,
          s.adresse as structure_adresse, s.telephone as structure_telephone, s.email as structure_email,
          s.photo as structure_photo, s.personne_physique, s.personne_morale
        FROM porteurs_projet pp
        JOIN structures s ON s.id = pp.structure_id
        WHERE pp.projet_id = ${id}
        ORDER BY pp.pourcentage_projet DESC
      `;

      // Formater la reponse
      const projet = {
        id: p.id,
        userId: p.user_id,
        nom: p.nom,
        description: p.description,
        status: p.status,
        dateCreation: p.date_creation,
        dateModification: p.date_modification,
        bienImmobilier: p.bien_id ? {
          id: p.bien_id,
          adresse: p.bien_adresse,
          codePostal: p.bien_code_postal,
          ville: p.bien_ville,
          type: p.bien_type,
          superficie: p.bien_superficie,
          nombrePieces: p.bien_nombre_pieces,
          nombreChambres: p.bien_nombre_chambres,
          nombreSDB: p.bien_nombre_sdb,
          anneeConstruction: p.bien_annee_construction,
          etatActuel: p.bien_etat_actuel,
          dpe: p.bien_dpe,
          ges: p.bien_ges,
          destinationBien: p.bien_destination,
          loyerMensuelEstime: p.bien_loyer_mensuel,
          chargesMensuelles: p.bien_charges_mensuelles,
          taxeFonciere: p.bien_taxe_fonciere
        } : null,
        financement: p.financement_id ? {
          id: p.financement_id,
          prixAchat: p.prix_achat,
          fraisNotaire: p.frais_notaire,
          fraisAgence: p.frais_agence,
          montantTravaux: p.montant_travaux,
          fraisDossierBancaire: p.frais_dossier_bancaire,
          fraisGarantie: p.frais_garantie,
          autresFrais: p.autres_frais,
          coutTotalProjet: p.cout_total_projet,
          apportPersonnel: p.apport_personnel,
          montantEmprunt: p.montant_emprunt,
          dureeCredit: p.duree_credit,
          tauxInteretEstime: p.taux_interet_estime,
          tauxAssuranceEstime: p.taux_assurance_estime,
          mensualiteCapitalInterets: p.mensualite_capital_interets,
          mensualiteAssurance: p.mensualite_assurance,
          mensualiteTotale: p.mensualite_totale,
          typePret: p.type_pret
        } : null,
        porteurs: porteurs.map((pt: any) => ({
          id: pt.id,
          pourcentageProjet: pt.pourcentage_projet,
          structure: {
            id: pt.structure_id,
            type: pt.structure_type,
            nom: pt.structure_nom,
            adresse: pt.structure_adresse,
            telephone: pt.structure_telephone,
            email: pt.structure_email,
            photo: pt.structure_photo,
            personnePhysique: pt.personne_physique,
            personneMorale: pt.personne_morale
          }
        }))
      };

      return res.status(200).json({ data: { projet } });
    }

    // PUT - Mettre a jour un projet
    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const { nom, description, status } = body || {};

      // Verifier que le projet existe et appartient a l'utilisateur
      const existing = await sql`
        SELECT id FROM projets WHERE id = ${id} AND user_id = ${user.userId}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      const result = await sql`
        UPDATE projets
        SET nom = COALESCE(${nom}, nom),
            description = COALESCE(${description}, description),
            status = COALESCE(${status}, status),
            date_modification = NOW()
        WHERE id = ${id} AND user_id = ${user.userId}
        RETURNING *
      `;

      return res.status(200).json({ data: { projet: result[0] } });
    }

    // DELETE - Supprimer un projet
    if (req.method === 'DELETE') {
      // Verifier que le projet existe et appartient a l'utilisateur
      const existing = await sql`
        SELECT id FROM projets WHERE id = ${id} AND user_id = ${user.userId}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      // Supprimer les donnees liees
      await sql`DELETE FROM porteurs_projet WHERE projet_id = ${id}`;
      await sql`DELETE FROM plans_financement_v2 WHERE projet_id = ${id}`;
      await sql`DELETE FROM biens_immobiliers_v2 WHERE projet_id = ${id}`;
      await sql`DELETE FROM projets WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Projet supprime' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projet error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
