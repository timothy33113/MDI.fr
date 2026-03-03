import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../_lib/auth';
import { getSQL } from '../_lib/db';

/**
 * GET /api/projets/data?id=xxx
 * Retourne toutes les donnees d'un projet pour la generation PDF
 * Inclut: projet, bien immobilier, elements, travaux, photos, financement, porteurs, rentabilite, checklist
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifie' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID du projet requis' });
  }

  const sql = getSQL();

  try {
    // 1. Recuperer le projet
    const projets = await sql`
      SELECT * FROM projets
      WHERE id = ${id} AND user_id = ${user.userId}
    `;

    if (projets.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouve' });
    }

    const projet = projets[0];

    // 2. Recuperer le bien immobilier
    const biens = await sql`
      SELECT * FROM biens_immobiliers_v2
      WHERE projet_id = ${id}
    `;
    const bienImmobilier = biens.length > 0 ? biens[0] : null;

    // 3. Recuperer les elements du bien (appartements, parkings, etc.)
    const elementsBien = await sql`
      SELECT * FROM elements_bien_v2
      WHERE projet_id = ${id}
      ORDER BY created_at
    `;

    // 4. Recuperer les travaux
    let travaux: any[] = [];
    if (bienImmobilier) {
      travaux = await sql`
        SELECT * FROM travaux_details_v2
        WHERE bien_immobilier_id = ${bienImmobilier.id}
        ORDER BY created_at
      `;
    }

    // 5. Recuperer les photos
    let photos: any[] = [];
    if (bienImmobilier) {
      photos = await sql`
        SELECT * FROM photos_v2
        WHERE bien_immobilier_id = ${bienImmobilier.id}
        ORDER BY created_at
      `;
    }

    // 6. Recuperer le plan de financement
    const financements = await sql`
      SELECT * FROM plans_financement_v2
      WHERE projet_id = ${id}
    `;
    const financement = financements.length > 0 ? financements[0] : null;

    // 7. Recuperer les porteurs du projet avec leurs structures
    const porteurs = await sql`
      SELECT
        pp.*,
        s.id as structure_id,
        s.type as structure_type,
        s.nom as structure_nom,
        s.adresse as structure_adresse,
        s.telephone as structure_telephone,
        s.email as structure_email,
        s.photo as structure_photo,
        s.personne_physique,
        s.personne_morale,
        s.detenteurs
      FROM porteurs_projet pp
      JOIN structures s ON s.id = pp.structure_id
      WHERE pp.projet_id = ${id}
      ORDER BY pp.pourcentage_projet DESC
    `;

    // 8. Recuperer l'analyse de rentabilite
    const analyses = await sql`
      SELECT * FROM analyses_rentabilite
      WHERE projet_id = ${id}
    `;
    const analyse = analyses.length > 0 ? analyses[0] : null;

    // 9. Recuperer la checklist documents
    const checklist = await sql`
      SELECT * FROM checklist_documents
      WHERE projet_id = ${id}
      ORDER BY categorie, nom
    `;

    // 10. Formater les donnees pour le frontend/PDF
    const formattedData = {
      projet: {
        id: projet.id,
        userId: projet.user_id,
        nom: projet.nom,
        description: projet.description,
        status: projet.status,
        dateCreation: projet.date_creation,
        dateModification: projet.date_modification
      },
      bienImmobilier: bienImmobilier ? {
        id: bienImmobilier.id,
        adresse: bienImmobilier.adresse,
        codePostal: bienImmobilier.code_postal,
        ville: bienImmobilier.ville,
        type: bienImmobilier.type,
        superficie: bienImmobilier.superficie,
        nombrePieces: bienImmobilier.nombre_pieces,
        nombreChambres: bienImmobilier.nombre_chambres,
        nombreSDB: bienImmobilier.nombre_sdb,
        anneeConstruction: bienImmobilier.annee_construction,
        etatActuel: bienImmobilier.etat_actuel,
        dpe: bienImmobilier.dpe,
        ges: bienImmobilier.ges,
        destinationBien: bienImmobilier.destination_bien,
        loyerMensuelEstime: bienImmobilier.loyer_mensuel_estime,
        chargesMensuelles: bienImmobilier.charges_mensuelles,
        taxeFonciere: bienImmobilier.taxe_fonciere,
        elements: elementsBien.map(e => ({
          id: e.id,
          type: e.type,
          superficie: e.superficie,
          nombrePieces: e.nombre_pieces,
          etage: e.etage,
          etat: e.etat,
          enLocation: e.en_location,
          loyerMensuel: e.loyer_mensuel,
          chargesMensuelles: e.charges_mensuelles,
          equipements: e.equipements
        })),
        travauxPrevus: travaux.map(t => ({
          id: t.id,
          categorie: t.categorie,
          description: t.description,
          montant: t.montant,
          priorite: t.priorite || 'Moyenne',
          dureeEstimee: t.duree_estimee || 0,
          artisan: t.artisan,
          devisObtenu: t.devis_obtenu || false,
          dateDebutPrevue: t.date_debut_prevue
        })),
        photos: photos.map(p => ({
          id: p.id,
          url: p.url,
          filename: p.filename,
          description: p.description,
          type: p.type,
          size: p.size,
          mimeType: p.mime_type
        }))
      } : null,
      financement: financement ? {
        id: financement.id,
        prixAchat: financement.prix_achat,
        fraisNotaire: financement.frais_notaire,
        fraisAgence: financement.frais_agence,
        montantTravaux: financement.montant_travaux,
        fraisDossierBancaire: financement.frais_dossier_bancaire,
        fraisGarantie: financement.frais_garantie,
        autresFrais: financement.autres_frais,
        coutTotalProjet: financement.cout_total_projet,
        apportPersonnel: financement.apport_personnel,
        montantEmprunt: financement.montant_emprunt,
        dureeCredit: financement.duree_credit,
        tauxInteretEstime: financement.taux_interet_estime,
        tauxAssuranceEstime: financement.taux_assurance_estime,
        mensualiteCapitalInterets: financement.mensualite_capital_interets,
        mensualiteAssurance: financement.mensualite_assurance,
        mensualiteTotale: financement.mensualite_totale,
        typePret: financement.type_pret
      } : null,
      porteurs: porteurs.map(p => ({
        id: p.id,
        pourcentageProjet: p.pourcentage_projet,
        structure: {
          id: p.structure_id,
          type: p.structure_type,
          nom: p.structure_nom,
          adresse: p.structure_adresse,
          telephone: p.structure_telephone,
          email: p.structure_email,
          photo: p.structure_photo,
          personnePhysique: p.personne_physique,
          personneMorale: p.personne_morale,
          detenteurs: p.detenteurs
        }
      })),
      analysesRentabilite: analyse ? {
        id: analyse.id,
        rentabiliteBrute: analyse.rentabilite_brute,
        rentabiliteNette: analyse.rentabilite_nette,
        chargesAnnuelles: analyse.charges_annuelles,
        cashFlowMensuel: analyse.cash_flow_mensuel,
        cashFlowAnnuel: analyse.cash_flow_annuel,
        roi: analyse.roi,
        revenusPorteurs: analyse.revenus_porteurs,
        tauxEndettementProjet: analyse.taux_endettement_projet,
        anneesRecuperationApport: analyse.annees_recuperation_apport
      } : null,
      checklistDocuments: checklist.map(d => ({
        id: d.id,
        nom: d.nom,
        categorie: d.categorie,
        description: d.description,
        obligatoire: d.obligatoire,
        statut: d.statut,
        porteurId: d.porteur_id,
        porteurNom: d.porteur_nom,
        dureeValidite: d.duree_validite,
        quantite: d.quantite
      })),
      // Format legacy pour compatibilite avec pdfGenerator.ts (DossierSCI)
      legacy: {
        id: projet.id,
        userId: projet.user_id,
        nomSCI: porteurs.length > 0 ? porteurs[0].structure_nom : projet.nom,
        localisation: bienImmobilier ? `${bienImmobilier.adresse}, ${bienImmobilier.code_postal} ${bienImmobilier.ville}` : '',
        prixAcquisition: financement?.prix_achat || 0,
        montantTravaux: financement?.montant_travaux || 0,
        status: projet.status,
        dateCreation: projet.date_creation,
        dateModification: projet.date_modification,
        associes: porteurs.map(p => ({
          id: p.id,
          type: p.structure_type === 'PERSONNE_PHYSIQUE' ? 'PERSONNE_PHYSIQUE' : 'PERSONNE_MORALE',
          pourcentageParts: p.pourcentage_projet,
          nom: p.structure_nom,
          adresse: p.structure_adresse || '',
          telephone: p.structure_telephone || '',
          email: p.structure_email || '',
          personnePhysique: p.personne_physique,
          personneMorale: p.personne_morale
        })),
        totalParts: porteurs.reduce((sum: number, p: any) => sum + (p.pourcentage_projet || 0), 0),
        financement: financement ? {
          prixAchat: financement.prix_achat,
          fraisNotaire: financement.frais_notaire,
          montantTravaux: financement.montant_travaux,
          apportPersonnel: financement.apport_personnel,
          montantEmprunt: financement.montant_emprunt,
          dureeCredit: financement.duree_credit,
          tauxEstime: financement.taux_interet_estime,
          mensualiteEstimee: financement.mensualite_totale,
          rentabilitePrevisionnelle: analyse?.rentabilite_brute || 0
        } : undefined,
        bienImmobilier: bienImmobilier ? {
          id: bienImmobilier.id,
          adresse: bienImmobilier.adresse,
          codePostal: bienImmobilier.code_postal,
          ville: bienImmobilier.ville,
          superficie: bienImmobilier.superficie,
          nombrePieces: bienImmobilier.nombre_pieces,
          etatActuel: bienImmobilier.etat_actuel,
          dpe: bienImmobilier.dpe,
          estimationValeur: financement?.prix_achat || 0,
          photos: photos.map(p => p.url),
          travauxPrevus: travaux.map(t => ({
            id: t.id,
            bienImmobilierId: bienImmobilier.id,
            categorie: t.categorie || 'Autre',
            description: t.description,
            montant: t.montant,
            priorite: t.priorite || 'Moyenne',
            dureeEstimee: t.duree_estimee || 0,
            artisan: t.artisan || '',
            devisObtenu: t.devis_obtenu || false,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }))
        } : undefined
      }
    };

    return res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error: any) {
    console.error('Error fetching project data:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
}
