import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../_lib/auth';
import { getSQL } from '../_lib/db';

interface ChecklistDoc {
  categorie: string;
  nomDocument: string;
  description: string;
  concerneStructureId?: string;
  obligatoire: boolean;
  quantiteRequise?: string;
  validiteJours?: number;
  statut: string;
}

function getDocumentsPersonnePhysique(projetId: string, structureId: string, nom: string): ChecklistDoc[] {
  return [
    { categorie: 'Identite', nomDocument: "Piece d'identite", description: `Carte d'identite ou passeport en cours de validite de ${nom}`, concerneStructureId: structureId, obligatoire: true, validiteJours: 365, statut: 'Non_Fourni' },
    { categorie: 'Identite', nomDocument: 'Justificatif de domicile', description: `Facture ou quittance de loyer de moins de 3 mois de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'Moins de 3 mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Revenus', nomDocument: 'Bulletins de salaire', description: `3 derniers bulletins de salaire de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '3 derniers mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Revenus', nomDocument: "Avis d'imposition", description: `Avis d'imposition N-1 et N-2 de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'N-1 et N-2', statut: 'Non_Fourni' },
    { categorie: 'Patrimoine', nomDocument: 'Releves bancaires', description: `3 derniers releves de compte bancaire de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '3 derniers mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Patrimoine', nomDocument: "Tableaux d'amortissement", description: `Tableaux d'amortissement des credits en cours de ${nom}`, concerneStructureId: structureId, obligatoire: false, statut: 'Non_Fourni' },
  ];
}

function getDocumentsPersonneMorale(projetId: string, structureId: string, nom: string, type: string): ChecklistDoc[] {
  const docs: ChecklistDoc[] = [
    { categorie: 'Societe', nomDocument: 'Kbis', description: `Extrait Kbis de moins de 3 mois de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'Moins de 3 mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Societe', nomDocument: 'Statuts de la societe', description: `Statuts a jour de ${nom}`, concerneStructureId: structureId, obligatoire: true, statut: 'Non_Fourni' },
    { categorie: 'Societe', nomDocument: 'PV de decision', description: `PV d'assemblee autorisant l'investissement pour ${nom}`, concerneStructureId: structureId, obligatoire: true, statut: 'Non_Fourni' },
  ];

  if (type === 'SCI') {
    docs.push({ categorie: 'Societe', nomDocument: 'Liste des associes', description: `Liste complete des associes avec repartition des parts de ${nom}`, concerneStructureId: structureId, obligatoire: true, statut: 'Non_Fourni' });
  }

  if (['SARL', 'SASU', 'SAS', 'SA'].includes(type)) {
    docs.push(
      { categorie: 'Fiscalite', nomDocument: 'Liasse fiscale', description: `Liasse fiscale des 2 derniers exercices de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '2 derniers exercices', statut: 'Non_Fourni' },
      { categorie: 'Patrimoine', nomDocument: 'Bilans comptables', description: `Bilans comptables N-1 et N-2 de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'N-1 et N-2', statut: 'Non_Fourni' },
      { categorie: 'Patrimoine', nomDocument: 'Releves bancaires societe', description: `3 derniers releves de compte professionnel de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '3 derniers mois', validiteJours: 90, statut: 'Non_Fourni' },
    );
  }

  return docs;
}

function getDocumentsProjet(): ChecklistDoc[] {
  return [
    { categorie: 'Bien_Immobilier', nomDocument: 'Compromis de vente', description: 'Compromis de vente ou promesse de vente signee', obligatoire: true, statut: 'Non_Fourni' },
    { categorie: 'Bien_Immobilier', nomDocument: 'DPE', description: 'Diagnostic de performance energetique du bien', obligatoire: true, validiteJours: 3650, statut: 'Non_Fourni' },
    { categorie: 'Bien_Immobilier', nomDocument: 'Diagnostic amiante', description: 'Diagnostic amiante (si bien construit avant 1997)', obligatoire: false, statut: 'Non_Fourni' },
    { categorie: 'Bien_Immobilier', nomDocument: 'Diagnostic plomb', description: 'Diagnostic plomb (si bien construit avant 1949)', obligatoire: false, statut: 'Non_Fourni' },
    { categorie: 'Bien_Immobilier', nomDocument: 'ERP', description: 'Etat des risques et pollutions', obligatoire: true, validiteJours: 180, statut: 'Non_Fourni' },
    { categorie: 'Bien_Immobilier', nomDocument: 'Photos du bien', description: 'Photos interieures et exterieures du bien', obligatoire: false, statut: 'Non_Fourni' },
    { categorie: 'Travaux', nomDocument: 'Devis travaux detailles', description: 'Devis chiffres et detailles pour tous les travaux prevus', obligatoire: false, statut: 'Non_Fourni' },
    { categorie: 'Travaux', nomDocument: 'Plans et permis', description: 'Plans des travaux et permis de construire si necessaire', obligatoire: false, statut: 'Non_Fourni' },
  ];
}

/**
 * GET  /api/projets/checklist?id=xxx         - Lire la checklist
 * POST /api/projets/checklist?id=xxx         - Generer la checklist
 * PATCH /api/projets/checklist?id=xxx&documentId=yyy - Mettre a jour le statut d'un document
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const { id, documentId } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID du projet requis (query param id)' });
  }

  const sql = getSQL();

  try {
    // Verifier que le projet appartient a l'utilisateur
    const projets = await sql`
      SELECT id FROM projets WHERE id = ${id} AND user_id = ${user.userId}
    `;
    if (projets.length === 0) {
      return res.status(404).json({ error: 'Projet non trouve' });
    }

    // GET - Lire la checklist existante
    if (req.method === 'GET') {
      const docs = await sql`
        SELECT * FROM checklist_documents
        WHERE projet_id = ${id}
        ORDER BY categorie, obligatoire DESC, nom_document
      `;

      return res.status(200).json({
        success: true,
        data: docs.map(d => ({
          id: d.id,
          projetId: d.projet_id,
          categorie: d.categorie,
          nomDocument: d.nom_document,
          description: d.description,
          concerneStructureId: d.concerne_structure_id,
          obligatoire: d.obligatoire,
          quantiteRequise: d.quantite_requise,
          validiteJours: d.validite_jours,
          statut: d.statut,
          dateFourniture: d.date_fourniture
        }))
      });
    }

    // POST - Generer la checklist
    if (req.method === 'POST') {
      // Supprimer l'ancienne checklist
      await sql`DELETE FROM checklist_documents WHERE projet_id = ${id}`;

      const allDocs: ChecklistDoc[] = [];

      // Recuperer les porteurs et leurs structures
      const porteurs = await sql`
        SELECT pp.*, s.type as structure_type, s.nom as structure_nom
        FROM porteurs_projet pp
        JOIN structures s ON s.id = pp.structure_id
        WHERE pp.projet_id = ${id}
      `;

      // Generer les documents par porteur
      for (const porteur of porteurs) {
        if (porteur.structure_type === 'PERSONNE_PHYSIQUE') {
          allDocs.push(...getDocumentsPersonnePhysique(id, porteur.structure_id, porteur.structure_nom));
        } else {
          allDocs.push(...getDocumentsPersonneMorale(id, porteur.structure_id, porteur.structure_nom, porteur.structure_type));
        }
      }

      // Ajouter les documents du projet
      allDocs.push(...getDocumentsProjet());

      // Inserer en base
      for (const doc of allDocs) {
        await sql`
          INSERT INTO checklist_documents (
            projet_id, categorie, nom_document, description, concerne_structure_id,
            obligatoire, quantite_requise, validite_jours, statut
          ) VALUES (
            ${id}, ${doc.categorie}, ${doc.nomDocument}, ${doc.description},
            ${doc.concerneStructureId || null}, ${doc.obligatoire},
            ${doc.quantiteRequise || null}, ${doc.validiteJours || null}, ${doc.statut}
          )
        `;
      }

      // Retourner la checklist generee
      const insertedDocs = await sql`
        SELECT * FROM checklist_documents
        WHERE projet_id = ${id}
        ORDER BY categorie, obligatoire DESC, nom_document
      `;

      return res.status(201).json({
        success: true,
        data: insertedDocs.map(d => ({
          id: d.id,
          projetId: d.projet_id,
          categorie: d.categorie,
          nomDocument: d.nom_document,
          description: d.description,
          concerneStructureId: d.concerne_structure_id,
          obligatoire: d.obligatoire,
          quantiteRequise: d.quantite_requise,
          validiteJours: d.validite_jours,
          statut: d.statut
        })),
        count: insertedDocs.length
      });
    }

    // PATCH - Mettre a jour le statut d'un document
    if (req.method === 'PATCH') {
      if (!documentId || typeof documentId !== 'string') {
        return res.status(400).json({ error: 'documentId requis (query param)' });
      }

      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const { statut } = body || {};
      const validStatuts = ['Non_Fourni', 'En_Attente', 'Fourni', 'Valide'];
      if (!statut || !validStatuts.includes(statut)) {
        return res.status(400).json({ error: `Statut invalide. Valeurs acceptees: ${validStatuts.join(', ')}` });
      }

      await sql`
        UPDATE checklist_documents
        SET statut = ${statut}, date_fourniture = ${statut === 'Fourni' || statut === 'Valide' ? new Date().toISOString() : null}
        WHERE id = ${documentId} AND projet_id = ${id}
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Checklist error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
