import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../_lib/auth';
import { getSQL } from '../_lib/db';

/**
 * POST /api/projets/actions?id=xxx&action=analyser     - Calcul rentabilite
 * GET  /api/projets/actions?id=xxx&action=checklist    - Lire la checklist
 * POST /api/projets/actions?id=xxx&action=checklist    - Generer la checklist
 * PATCH /api/projets/actions?id=xxx&action=checklist&documentId=yyy - Update statut doc
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

  const { id, action } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID du projet requis (query param id)' });
  }
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action requise (analyser ou checklist)' });
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

    if (action === 'analyser') {
      return handleAnalyser(req, res, sql, id);
    } else if (action === 'checklist') {
      return handleChecklist(req, res, sql, id);
    } else {
      return res.status(400).json({ error: 'Action invalide. Actions: analyser, checklist' });
    }
  } catch (error: any) {
    console.error('Actions error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}

// ======== ANALYSER ========

async function handleAnalyser(req: VercelRequest, res: VercelResponse, sql: any, id: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed (POST requis pour analyser)' });
  }

  // Recuperer le bien immobilier
  const biens = await sql`
    SELECT * FROM biens_immobiliers_v2 WHERE projet_id = ${id}
  `;
  if (biens.length === 0) {
    return res.status(400).json({ error: 'Bien immobilier manquant pour le calcul' });
  }
  const bien = biens[0];

  // Recuperer le financement
  const financements = await sql`
    SELECT * FROM plans_financement_v2 WHERE projet_id = ${id}
  `;
  if (financements.length === 0) {
    return res.status(400).json({ error: 'Plan de financement manquant pour le calcul' });
  }
  const fin = financements[0];

  // Recuperer les elements du bien pour les loyers
  const elements = await sql`
    SELECT * FROM elements_bien_v2 WHERE projet_id = ${id}
  `;

  // Calculer le loyer total (bien principal + elements)
  let loyerMensuel = parseFloat(bien.loyer_mensuel_estime) || 0;
  let chargesMensuellesBien = parseFloat(bien.charges_mensuelles) || 0;

  for (const elem of elements) {
    if (elem.en_location) {
      loyerMensuel += parseFloat(elem.loyer_mensuel) || 0;
      chargesMensuellesBien += parseFloat(elem.charges_mensuelles) || 0;
    }
  }

  const loyersAnnuels = loyerMensuel * 12;
  const taxeFonciere = parseFloat(bien.taxe_fonciere) || 0;
  const chargesAnnuelles = (chargesMensuellesBien * 12) + taxeFonciere;

  const coutTotalProjet = parseFloat(fin.cout_total_projet) || 0;
  const mensualiteTotale = parseFloat(fin.mensualite_totale) || 0;
  const apportPersonnel = parseFloat(fin.apport_personnel) || 0;

  const rentabiliteBrute = coutTotalProjet > 0 ? (loyersAnnuels / coutTotalProjet) * 100 : 0;
  const rentabiliteNette = coutTotalProjet > 0 ? ((loyersAnnuels - chargesAnnuelles) / coutTotalProjet) * 100 : 0;
  const cashFlowMensuel = loyerMensuel - mensualiteTotale - chargesMensuellesBien;
  const cashFlowAnnuel = cashFlowMensuel * 12;
  const roi = apportPersonnel > 0 ? (cashFlowAnnuel / apportPersonnel) * 100 : 0;

  // Calculer les revenus des porteurs
  const porteurs = await sql`
    SELECT pp.*, s.personne_physique, s.personne_morale, s.type as structure_type
    FROM porteurs_projet pp
    JOIN structures s ON s.id = pp.structure_id
    WHERE pp.projet_id = ${id}
  `;

  let revenusPorteurs = 0;
  for (const porteur of porteurs) {
    if (porteur.structure_type === 'PERSONNE_PHYSIQUE' && porteur.personne_physique) {
      const pp = porteur.personne_physique;
      if (pp.revenus && Array.isArray(pp.revenus)) {
        for (const rev of pp.revenus) {
          revenusPorteurs += (parseFloat(rev.montantMensuel) || 0) * (parseFloat(porteur.pourcentage_projet) / 100);
        }
      }
    }
  }

  const tauxEndettement = revenusPorteurs > 0 ? (mensualiteTotale / revenusPorteurs) * 100 : 0;
  const anneesRecuperation = cashFlowAnnuel > 0 ? apportPersonnel / cashFlowAnnuel : 0;

  const analyses = {
    rentabiliteBrute: Math.round(rentabiliteBrute * 100) / 100,
    chargesAnnuelles: Math.round(chargesAnnuelles * 100) / 100,
    rentabiliteNette: Math.round(rentabiliteNette * 100) / 100,
    cashFlowMensuel: Math.round(cashFlowMensuel * 100) / 100,
    cashFlowAnnuel: Math.round(cashFlowAnnuel * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    revenusPorteurs: Math.round(revenusPorteurs * 100) / 100,
    tauxEndettementProjet: Math.round(tauxEndettement * 100) / 100,
    anneesRecuperationApport: Math.round(anneesRecuperation * 100) / 100
  };

  // Upsert dans analyses_rentabilite
  const existing = await sql`
    SELECT id FROM analyses_rentabilite WHERE projet_id = ${id}
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE analyses_rentabilite SET
        rentabilite_brute = ${analyses.rentabiliteBrute},
        charges_annuelles = ${analyses.chargesAnnuelles},
        rentabilite_nette = ${analyses.rentabiliteNette},
        cash_flow_mensuel = ${analyses.cashFlowMensuel},
        cash_flow_annuel = ${analyses.cashFlowAnnuel},
        roi = ${analyses.roi},
        revenus_porteurs = ${analyses.revenusPorteurs},
        taux_endettement_projet = ${analyses.tauxEndettementProjet},
        annees_recuperation_apport = ${analyses.anneesRecuperationApport},
        date_calcul = NOW()
      WHERE projet_id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO analyses_rentabilite (
        projet_id, rentabilite_brute, charges_annuelles, rentabilite_nette,
        cash_flow_mensuel, cash_flow_annuel, roi, revenus_porteurs,
        taux_endettement_projet, annees_recuperation_apport
      ) VALUES (
        ${id}, ${analyses.rentabiliteBrute}, ${analyses.chargesAnnuelles},
        ${analyses.rentabiliteNette}, ${analyses.cashFlowMensuel}, ${analyses.cashFlowAnnuel},
        ${analyses.roi}, ${analyses.revenusPorteurs}, ${analyses.tauxEndettementProjet},
        ${analyses.anneesRecuperationApport}
      )
    `;
  }

  return res.status(200).json({ success: true, data: analyses });
}

// ======== CHECKLIST ========

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

function getDocumentsPersonnePhysique(structureId: string, nom: string): ChecklistDoc[] {
  return [
    { categorie: 'Identite', nomDocument: "Piece d'identite", description: `Carte d'identite ou passeport en cours de validite de ${nom}`, concerneStructureId: structureId, obligatoire: true, validiteJours: 365, statut: 'Non_Fourni' },
    { categorie: 'Identite', nomDocument: 'Justificatif de domicile', description: `Facture ou quittance de loyer de moins de 3 mois de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'Moins de 3 mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Revenus', nomDocument: 'Bulletins de salaire', description: `3 derniers bulletins de salaire de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '3 derniers mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Revenus', nomDocument: "Avis d'imposition", description: `Avis d'imposition N-1 et N-2 de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: 'N-1 et N-2', statut: 'Non_Fourni' },
    { categorie: 'Patrimoine', nomDocument: 'Releves bancaires', description: `3 derniers releves de compte bancaire de ${nom}`, concerneStructureId: structureId, obligatoire: true, quantiteRequise: '3 derniers mois', validiteJours: 90, statut: 'Non_Fourni' },
    { categorie: 'Patrimoine', nomDocument: "Tableaux d'amortissement", description: `Tableaux d'amortissement des credits en cours de ${nom}`, concerneStructureId: structureId, obligatoire: false, statut: 'Non_Fourni' },
  ];
}

function getDocumentsPersonneMorale(structureId: string, nom: string, type: string): ChecklistDoc[] {
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

async function handleChecklist(req: VercelRequest, res: VercelResponse, sql: any, id: string) {
  const { documentId } = req.query;

  // GET - Lire la checklist existante
  if (req.method === 'GET') {
    const docs = await sql`
      SELECT * FROM checklist_documents
      WHERE projet_id = ${id}
      ORDER BY categorie, obligatoire DESC, nom_document
    `;

    return res.status(200).json({
      success: true,
      data: docs.map((d: any) => ({
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
    await sql`DELETE FROM checklist_documents WHERE projet_id = ${id}`;

    const allDocs: ChecklistDoc[] = [];

    const porteurs = await sql`
      SELECT pp.*, s.type as structure_type, s.nom as structure_nom
      FROM porteurs_projet pp
      JOIN structures s ON s.id = pp.structure_id
      WHERE pp.projet_id = ${id}
    `;

    for (const porteur of porteurs) {
      if (porteur.structure_type === 'PERSONNE_PHYSIQUE') {
        allDocs.push(...getDocumentsPersonnePhysique(porteur.structure_id, porteur.structure_nom));
      } else {
        allDocs.push(...getDocumentsPersonneMorale(porteur.structure_id, porteur.structure_nom, porteur.structure_type));
      }
    }

    allDocs.push(...getDocumentsProjet());

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

    const insertedDocs = await sql`
      SELECT * FROM checklist_documents
      WHERE projet_id = ${id}
      ORDER BY categorie, obligatoire DESC, nom_document
    `;

    return res.status(201).json({
      success: true,
      data: insertedDocs.map((d: any) => ({
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
}
