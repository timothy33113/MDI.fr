import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../_lib/auth';
import { getSQL } from '../_lib/db';

/**
 * POST /api/projets/analyser?id=xxx
 * Calcule et enregistre l'analyse de rentabilite d'un projet
 */
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
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const { id } = req.query;
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

    // Si des elements existent, les ajouter
    for (const elem of elements) {
      if (elem.en_location) {
        loyerMensuel += parseFloat(elem.loyer_mensuel) || 0;
        chargesMensuellesBien += parseFloat(elem.charges_mensuelles) || 0;
      }
    }

    const loyersAnnuels = loyerMensuel * 12;
    const taxeFonciere = parseFloat(bien.taxe_fonciere) || 0;
    const chargesAnnuelles = (chargesMensuellesBien * 12) + taxeFonciere;

    // Calculs de rentabilite
    const coutTotalProjet = parseFloat(fin.cout_total_projet) || 0;
    const mensualiteTotale = parseFloat(fin.mensualite_totale) || 0;
    const apportPersonnel = parseFloat(fin.apport_personnel) || 0;

    const rentabiliteBrute = coutTotalProjet > 0 ? (loyersAnnuels / coutTotalProjet) * 100 : 0;
    const rentabiliteNette = coutTotalProjet > 0 ? ((loyersAnnuels - chargesAnnuelles) / coutTotalProjet) * 100 : 0;
    const cashFlowMensuel = loyerMensuel - mensualiteTotale - chargesMensuellesBien;
    const cashFlowAnnuel = cashFlowMensuel * 12;
    const roi = apportPersonnel > 0 ? (cashFlowAnnuel / apportPersonnel) * 100 : 0;

    // Calculer les revenus des porteurs (depuis les structures)
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

    return res.status(200).json({
      success: true,
      data: analyses
    });
  } catch (error: any) {
    console.error('Analyse error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
