import { query } from '@/database/connection';
import logger from '@/utils/logger';
import {
  Projet,
  PorteurProjet,
  BienImmobilier,
  ElementBien,
  PlanFinancement,
  TravauxDetail,
  Photo,
  StatusProjet,
  CreateProjetRequest
} from '@/types';

/**
 * Service de gestion des projets immobiliers multi-porteurs
 */
class ProjetService {
  /**
   * Créer un nouveau projet
   */
  async createProjet(userId: string, data: CreateProjetRequest): Promise<Projet> {
    try {
      logger.info(`Création d'un projet "${data.nom}" pour l'utilisateur ${userId}`);

      // 1. Créer le projet de base
      const projetResult = await query(
        `INSERT INTO projets (user_id, nom, description, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, data.nom, data.description, 'Analyse']
      );

      const projet = this.mapRowToProjet(projetResult.rows[0]);

      // 2. Ajouter les porteurs
      if (data.porteurs && data.porteurs.length > 0) {
        // Vérifier que le total fait 100%
        const totalPourcentage = data.porteurs.reduce((sum, p) => sum + p.pourcentageProjet, 0);
        if (Math.abs(totalPourcentage - 100) > 0.01) {
          throw new Error(`Le total des porteurs doit être 100% (actuel: ${totalPourcentage}%)`);
        }

        projet.porteurs = await Promise.all(
          data.porteurs.map(p => this.addPorteurToProjet(projet.id, p.structureId, p.pourcentageProjet))
        );
      }

      // 3. Créer le bien immobilier si fourni
      if (data.bien) {
        projet.bienImmobilier = await this.upsertBienImmobilier(projet.id, data.bien);
        const bienId = projet.bienImmobilier.id;

        // 3.1 Ajouter les éléments de bien (appartements, parkings, etc.)
        if (data.elementsBien && data.elementsBien.length > 0) {
          projet.bienImmobilier.elements = await Promise.all(
            data.elementsBien.map(elem => this.createElementBien(projet.id, elem))
          );
          logger.info(`${data.elementsBien.length} éléments de bien créés`);
        }

        // 3.2 Ajouter les travaux
        if (data.travaux && data.travaux.length > 0) {
          projet.bienImmobilier.travauxPrevus = await Promise.all(
            data.travaux.map(travail => this.createTravaux(bienId, {
              ...travail,
              categorie: (travail as any).type || travail.categorie  // Map 'type' to 'categorie'
            }))
          );
          logger.info(`${data.travaux.length} travaux créés`);
        }

        // 3.3 Ajouter les photos (base64)
        if (data.photos && data.photos.length > 0) {
          projet.bienImmobilier.photos = await Promise.all(
            data.photos.map((photoBase64, index) =>
              this.createPhotoFromBase64(bienId, photoBase64, index)
            )
          );
          logger.info(`${data.photos.length} photos créées`);
        }
      }

      // 4. Créer le plan de financement si fourni
      if (data.financement) {
        projet.financement = await this.upsertPlanFinancement(projet.id, data.financement);
      }

      logger.info(`Projet ${projet.id} créé avec succès`);
      return projet;
    } catch (error) {
      logger.error('Erreur lors de la création du projet:', error);
      throw error;
    }
  }

  /**
   * Ajouter un porteur à un projet
   */
  async addPorteurToProjet(projetId: string, structureId: string, pourcentageProjet: number): Promise<PorteurProjet> {
    try {
      // Vérifier que la structure existe
      const structureCheck = await query(
        'SELECT id FROM structures WHERE id = $1',
        [structureId]
      );

      if (structureCheck.rows.length === 0) {
        throw new Error(`Structure ${structureId} non trouvée`);
      }

      // Vérifier que le total ne dépasse pas 100%
      const totalResult = await query(
        'SELECT COALESCE(SUM(pourcentage_projet), 0) as total FROM porteurs_projet WHERE projet_id = $1',
        [projetId]
      );

      const currentTotal = parseFloat(totalResult.rows[0].total);
      if (currentTotal + pourcentageProjet > 100) {
        throw new Error(`Le total des porteurs dépasserait 100% (actuel: ${currentTotal}%)`);
      }

      const result = await query(
        `INSERT INTO porteurs_projet (projet_id, structure_id, pourcentage_projet)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [projetId, structureId, pourcentageProjet]
      );

      logger.info(`Porteur ajouté: structure ${structureId} détient ${pourcentageProjet}% du projet ${projetId}`);
      return this.mapRowToPorteurProjet(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du porteur:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les projets d'un utilisateur
   */
  async getProjetsByUserId(userId: string): Promise<Projet[]> {
    try {
      const result = await query(
        'SELECT * FROM projets WHERE user_id = $1 ORDER BY date_creation DESC',
        [userId]
      );

      const projets = await Promise.all(
        result.rows.map(row => this.getProjetById(row.id))
      );

      return projets.filter(p => p !== null) as Projet[];
    } catch (error) {
      logger.error('Erreur lors de la récupération des projets:', error);
      throw error;
    }
  }

  /**
   * Récupérer un projet par ID avec toutes ses relations
   */
  async getProjetById(projetId: string): Promise<Projet | null> {
    try {
      const result = await query(
        'SELECT * FROM projets WHERE id = $1',
        [projetId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const projet = this.mapRowToProjet(result.rows[0]);

      // Charger les porteurs
      projet.porteurs = await this.getPorteursByProjetId(projetId);

      // Charger le bien immobilier
      projet.bienImmobilier = await this.getBienImmobilierByProjetId(projetId);

      // Charger le plan de financement
      projet.financement = await this.getPlanFinancementByProjetId(projetId);

      return projet;
    } catch (error) {
      logger.error('Erreur lors de la récupération du projet:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un projet
   */
  async updateProjetStatus(projetId: string, userId: string, status: StatusProjet): Promise<Projet> {
    try {
      // Vérifier que le projet appartient bien à l'utilisateur
      const result = await query(
        `UPDATE projets
         SET status = $1, date_modification = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [status, projetId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Projet non trouvé ou accès non autorisé');
      }

      const projet = await this.getProjetById(projetId);
      if (!projet) {
        throw new Error('Projet non trouvé après mise à jour');
      }

      logger.info(`Statut du projet ${projetId} mis à jour: ${status}`);
      return projet;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut du projet:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un projet complet
   */
  async updateProjet(projetId: string, userId: string, data: CreateProjetRequest): Promise<Projet> {
    try {
      logger.info(`Mise à jour du projet ${projetId} pour l'utilisateur ${userId}`);

      // Vérifier que le projet appartient à l'utilisateur
      const projetCheck = await query(
        'SELECT id FROM projets WHERE id = $1 AND user_id = $2',
        [projetId, userId]
      );

      if (projetCheck.rows.length === 0) {
        throw new Error('Projet non trouvé ou accès non autorisé');
      }

      // 1. Mettre à jour les informations de base du projet
      await query(
        `UPDATE projets
         SET nom = $1, description = $2, date_modification = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [data.nom, data.description, projetId]
      );

      // 2. Mettre à jour les porteurs
      if (data.porteurs && data.porteurs.length > 0) {
        // Supprimer les anciens porteurs
        await query('DELETE FROM porteurs_projet WHERE projet_id = $1', [projetId]);

        // Vérifier que le total fait 100%
        const totalPourcentage = data.porteurs.reduce((sum, p) => sum + p.pourcentageProjet, 0);
        if (Math.abs(totalPourcentage - 100) > 0.01) {
          throw new Error(`Le total des porteurs doit être 100% (actuel: ${totalPourcentage}%)`);
        }

        // Ajouter les nouveaux porteurs
        await Promise.all(
          data.porteurs.map(p => this.addPorteurToProjet(projetId, p.structureId, p.pourcentageProjet))
        );
      }

      // 3. Mettre à jour le bien immobilier
      if (data.bien) {
        const bienImmobilier = await this.upsertBienImmobilier(projetId, data.bien);
        const bienId = bienImmobilier.id;

        // 3.1 Mettre à jour les éléments de bien
        if (data.elementsBien) {
          // Supprimer les anciens éléments
          await query('DELETE FROM elements_bien_v2 WHERE projet_id = $1', [projetId]);
          // Ajouter les nouveaux éléments
          if (data.elementsBien.length > 0) {
            await Promise.all(
              data.elementsBien.map(elem => this.createElementBien(projetId, elem))
            );
            logger.info(`${data.elementsBien.length} éléments de bien mis à jour`);
          }
        }

        // 3.2 Mettre à jour les travaux
        if (data.travaux) {
          // Supprimer les anciens travaux
          await query('DELETE FROM travaux_details_v2 WHERE bien_immobilier_id = $1', [bienId]);
          // Ajouter les nouveaux travaux
          if (data.travaux.length > 0) {
            await Promise.all(
              data.travaux.map(travail => this.createTravaux(bienId, {
                ...travail,
                categorie: (travail as any).type || travail.categorie  // Map 'type' to 'categorie'
              }))
            );
            logger.info(`${data.travaux.length} travaux mis à jour`);
          }
        }
      }

      // 4. Mettre à jour le plan de financement
      if (data.financement) {
        await this.upsertPlanFinancement(projetId, data.financement);
      }

      // 5. Mettre à jour les photos si fournies
      if (data.photos && data.photos.length > 0) {
        const bienResult = await query(
          'SELECT id FROM biens_immobiliers_v2 WHERE projet_id = $1',
          [projetId]
        );

        if (bienResult.rows.length > 0) {
          const bienId = bienResult.rows[0].id;
          // Supprimer les anciennes photos
          await query('DELETE FROM photos WHERE bien_immobilier_id = $1', [bienId]);
          // Ajouter les nouvelles photos
          await Promise.all(
            data.photos.map((photoBase64, index) =>
              this.createPhotoFromBase64(bienId, photoBase64, index)
            )
          );
        }
      }

      logger.info(`Projet ${projetId} mis à jour avec succès`);

      // Récupérer et retourner le projet mis à jour
      const projet = await this.getProjetById(projetId);
      if (!projet) {
        throw new Error('Projet non trouvé après mise à jour');
      }

      return projet;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du projet:', error);
      throw error;
    }
  }

  /**
   * Supprimer un projet
   */
  async deleteProjet(projetId: string, userId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM projets WHERE id = $1 AND user_id = $2 RETURNING id',
        [projetId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Projet non trouvé ou accès non autorisé');
      }

      logger.info(`Projet ${projetId} supprimé avec succès`);
    } catch (error) {
      logger.error('Erreur lors de la suppression du projet:', error);
      throw error;
    }
  }

  /**
   * Dupliquer un projet
   */
  async duplicateProjet(projetId: string, userId: string): Promise<Projet> {
    try {
      // 1. Récupérer le projet source avec toutes ses données
      const sourceProjet = await this.getProjetById(projetId);

      if (!sourceProjet) {
        throw new Error('Projet source non trouvé');
      }

      // Vérifier que le projet appartient à l'utilisateur
      if (sourceProjet.userId !== userId) {
        throw new Error('Accès non autorisé');
      }

      logger.info(`Duplication du projet ${projetId} pour l'utilisateur ${userId}`);

      // 2. Créer le nouveau projet avec le même nom + " (copie)"
      const nouveauProjet = await this.createProjet(userId, {
        nom: `${sourceProjet.nom} (copie)`,
        description: sourceProjet.description,
        status: 'Analyse',

        // Copier les porteurs avec les mêmes pourcentages
        porteurs: sourceProjet.porteurs?.map(p => ({
          structureId: p.structureId,
          pourcentageProjet: p.pourcentageProjet
        })),

        // Copier le bien immobilier
        bien: sourceProjet.bienImmobilier ? {
          adresse: sourceProjet.bienImmobilier.adresse,
          codePostal: sourceProjet.bienImmobilier.codePostal,
          ville: sourceProjet.bienImmobilier.ville,
          type: sourceProjet.bienImmobilier.type,
          superficie: sourceProjet.bienImmobilier.superficie,
          nombrePieces: sourceProjet.bienImmobilier.nombrePieces,
          nombreChambres: sourceProjet.bienImmobilier.nombreChambres,
          nombreSdb: sourceProjet.bienImmobilier.nombreSdb,
          anneeConstruction: sourceProjet.bienImmobilier.anneeConstruction,
          etatActuel: sourceProjet.bienImmobilier.etatActuel,
          dpe: sourceProjet.bienImmobilier.dpe,
          ges: sourceProjet.bienImmobilier.ges,
          destinationBien: sourceProjet.bienImmobilier.destinationBien,
          loyerMensuelEstime: sourceProjet.bienImmobilier.loyerMensuelEstime,
          chargesMensuelles: sourceProjet.bienImmobilier.chargesMensuelles,
          taxeFonciere: sourceProjet.bienImmobilier.taxeFonciere,
          copropriete: sourceProjet.bienImmobilier.copropriete,
          chargesCopro: sourceProjet.bienImmobilier.chargesCopro
        } : undefined,

        // Copier les éléments de bien (unités)
        elementsBien: sourceProjet.bienImmobilier?.elements?.map(elem => ({
          typeElement: elem.typeElement,
          superficie: elem.superficie,
          nombrePieces: elem.nombrePieces,
          loyerMensuel: elem.loyerMensuel,
          chargesMensuelles: elem.chargesMensuelles,
          description: elem.description
        })),

        // Copier les travaux
        travaux: sourceProjet.bienImmobilier?.travauxPrevus?.map(t => ({
          type: t.type,
          description: t.description,
          montant: t.montant
        })),

        // Ne pas copier les photos (pour éviter de dupliquer les images)
        photos: [],

        // Copier le financement
        financement: sourceProjet.financement ? {
          prixAcquisition: sourceProjet.financement.prixAcquisition,
          fraisNotaire: sourceProjet.financement.fraisNotaire,
          fraisAgence: sourceProjet.financement.fraisAgence,
          montantTravaux: sourceProjet.financement.montantTravaux,
          autresFrais: sourceProjet.financement.autresFrais,
          apportPersonnel: sourceProjet.financement.apportPersonnel,
          montantEmprunt: sourceProjet.financement.montantEmprunt,
          dureeEmprunt: sourceProjet.financement.dureeEmprunt,
          tauxInteret: sourceProjet.financement.tauxInteret,
          tauxAssurance: sourceProjet.financement.tauxAssurance
        } : undefined
      });

      logger.info(`Projet ${nouveauProjet.id} créé par duplication de ${projetId}`);
      return nouveauProjet;
    } catch (error) {
      logger.error('Erreur lors de la duplication du projet:', error);
      throw error;
    }
  }

  /**
   * Créer ou mettre à jour le bien immobilier d'un projet
   */
  async upsertBienImmobilier(projetId: string, data: Partial<BienImmobilier>): Promise<BienImmobilier> {
    try {
      // Vérifier si un bien existe déjà
      const existingResult = await query(
        'SELECT id FROM biens_immobiliers_v2 WHERE projet_id = $1',
        [projetId]
      );

      if (existingResult.rows.length > 0) {
        // UPDATE
        const result = await query(
          `UPDATE biens_immobiliers_v2
           SET adresse = COALESCE($1, adresse),
               code_postal = COALESCE($2, code_postal),
               ville = COALESCE($3, ville),
               type = COALESCE($4, type),
               superficie = COALESCE($5, superficie),
               nombre_pieces = COALESCE($6, nombre_pieces),
               nombre_chambres = COALESCE($7, nombre_chambres),
               nombre_sdb = COALESCE($8, nombre_sdb),
               annee_construction = COALESCE($9, annee_construction),
               etat_actuel = COALESCE($10, etat_actuel),
               dpe = COALESCE($11, dpe),
               ges = COALESCE($12, ges),
               destination_bien = COALESCE($13, destination_bien),
               loyer_mensuel_estime = COALESCE($14, loyer_mensuel_estime),
               charges_mensuelles = COALESCE($15, charges_mensuelles),
               taxe_fonciere = COALESCE($16, taxe_fonciere)
           WHERE projet_id = $17
           RETURNING *`,
          [
            data.adresse, data.codePostal, data.ville, data.type, data.superficie,
            data.nombrePieces, data.nombreChambres, data.nombreSDB, data.anneeConstruction,
            data.etatActuel, data.dpe, data.ges, data.destinationBien,
            data.loyerMensuelEstime, data.chargesMensuelles, data.taxeFonciere,
            projetId
          ]
        );

        return this.mapRowToBienImmobilier(result.rows[0]);
      } else {
        // INSERT
        const result = await query(
          `INSERT INTO biens_immobiliers_v2
           (projet_id, adresse, code_postal, ville, type, superficie, nombre_pieces,
            nombre_chambres, nombre_sdb, annee_construction, etat_actuel, dpe, ges,
            destination_bien, loyer_mensuel_estime, charges_mensuelles, taxe_fonciere)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           RETURNING *`,
          [
            projetId, data.adresse, data.codePostal, data.ville, data.type, data.superficie,
            data.nombrePieces, data.nombreChambres, data.nombreSDB, data.anneeConstruction,
            data.etatActuel, data.dpe, data.ges, data.destinationBien,
            data.loyerMensuelEstime, data.chargesMensuelles, data.taxeFonciere
          ]
        );

        logger.info(`Bien immobilier créé pour le projet ${projetId}`);
        return this.mapRowToBienImmobilier(result.rows[0]);
      }
    } catch (error) {
      logger.error('Erreur lors de la création/mise à jour du bien immobilier:', error);
      throw error;
    }
  }

  /**
   * Créer ou mettre à jour le plan de financement d'un projet
   */
  async upsertPlanFinancement(projetId: string, data: Partial<PlanFinancement>): Promise<PlanFinancement> {
    try {
      // Calculer les totaux automatiquement
      const prixAchat = data.prixAchat || 0;
      const fraisNotaire = data.fraisNotaire || (prixAchat * 0.08); // 8% par défaut
      const fraisAgence = data.fraisAgence || 0;
      const montantTravaux = data.montantTravaux || 0;
      const fraisDossierBancaire = data.fraisDossierBancaire || 0;
      const fraisGarantie = data.fraisGarantie || 0;
      const autresFrais = data.autresFrais || 0;

      const coutTotalProjet = prixAchat + fraisNotaire + fraisAgence + montantTravaux +
                               fraisDossierBancaire + fraisGarantie + autresFrais;

      const apportPersonnel = data.apportPersonnel || 0;
      const montantEmprunt = coutTotalProjet - apportPersonnel;

      const dureeCredit = data.dureeCredit || 20;
      const tauxInteret = data.tauxInteretEstime || 3.5;
      const tauxAssurance = data.tauxAssuranceEstime || 0.36;

      // Calcul mensualités (formule d'amortissement)
      const tauxMensuel = tauxInteret / 100 / 12;
      const nombreMensualites = dureeCredit * 12;
      const mensualiteCapitalInterets = montantEmprunt > 0
        ? (montantEmprunt * tauxMensuel * Math.pow(1 + tauxMensuel, nombreMensualites)) /
          (Math.pow(1 + tauxMensuel, nombreMensualites) - 1)
        : 0;

      const mensualiteAssurance = (montantEmprunt * tauxAssurance / 100) / 12;
      const mensualiteTotale = mensualiteCapitalInterets + mensualiteAssurance;

      // Vérifier si un plan existe déjà
      const existingResult = await query(
        'SELECT id FROM plans_financement_v2 WHERE projet_id = $1',
        [projetId]
      );

      if (existingResult.rows.length > 0) {
        // UPDATE
        const result = await query(
          `UPDATE plans_financement_v2
           SET prix_achat = $1, frais_notaire = $2, frais_agence = $3, montant_travaux = $4,
               frais_dossier_bancaire = $5, frais_garantie = $6, autres_frais = $7,
               cout_total_projet = $8, apport_personnel = $9, montant_emprunt = $10,
               duree_credit = $11, taux_interet_estime = $12, taux_assurance_estime = $13,
               mensualite_capital_interets = $14, mensualite_assurance = $15, mensualite_totale = $16,
               type_pret = $17
           WHERE projet_id = $18
           RETURNING *`,
          [
            prixAchat, fraisNotaire, fraisAgence, montantTravaux, fraisDossierBancaire,
            fraisGarantie, autresFrais, coutTotalProjet, apportPersonnel, montantEmprunt,
            dureeCredit, tauxInteret, tauxAssurance, mensualiteCapitalInterets,
            mensualiteAssurance, mensualiteTotale, data.typePret || 'Amortissable',
            projetId
          ]
        );

        return this.mapRowToPlanFinancement(result.rows[0]);
      } else {
        // INSERT
        const result = await query(
          `INSERT INTO plans_financement_v2
           (projet_id, prix_achat, frais_notaire, frais_agence, montant_travaux,
            frais_dossier_bancaire, frais_garantie, autres_frais, cout_total_projet,
            apport_personnel, montant_emprunt, duree_credit, taux_interet_estime,
            taux_assurance_estime, mensualite_capital_interets, mensualite_assurance,
            mensualite_totale, type_pret)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           RETURNING *`,
          [
            projetId, prixAchat, fraisNotaire, fraisAgence, montantTravaux,
            fraisDossierBancaire, fraisGarantie, autresFrais, coutTotalProjet,
            apportPersonnel, montantEmprunt, dureeCredit, tauxInteret, tauxAssurance,
            mensualiteCapitalInterets, mensualiteAssurance, mensualiteTotale,
            data.typePret || 'Amortissable'
          ]
        );

        logger.info(`Plan de financement créé pour le projet ${projetId}`);
        return this.mapRowToPlanFinancement(result.rows[0]);
      }
    } catch (error) {
      logger.error('Erreur lors de la création/mise à jour du plan de financement:', error);
      throw error;
    }
  }

  /**
   * Créer un élément de bien (appartement, parking, etc.)
   */
  async createElementBien(projetId: string, data: Partial<ElementBien>): Promise<ElementBien> {
    try {
      const result = await query(
        `INSERT INTO elements_bien_v2
         (projet_id, type, superficie, nombre_pieces, etage, etat, en_location,
          loyer_mensuel, charges_mensuelles, equipements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          projetId,
          data.type,
          data.superficie || 0,
          data.nombrePieces,
          data.etage,
          data.etat || 'Bon',
          data.enLocation || false,
          data.loyerMensuel || 0,
          data.chargesMensuelles || 0,
          data.equipements || []
        ]
      );

      logger.info(`Élément de bien créé: ${data.type} - ${data.superficie}m²`);
      return this.mapRowToElementBien(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de la création de l\'élément de bien:', error);
      throw error;
    }
  }

  /**
   * Créer un travail
   */
  async createTravaux(bienId: string, data: Partial<TravauxDetail>): Promise<TravauxDetail> {
    try {
      const result = await query(
        `INSERT INTO travaux_details_v2
         (bien_immobilier_id, categorie, description, montant, priorite, duree_estimee,
          artisan, devis_obtenu, date_debut_prevue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          bienId,
          data.categorie || 'Autre',
          data.description || '',
          data.montant || 0,
          data.priorite || 'Moyenne',
          data.dureeEstimee || 1,
          data.artisan,
          data.devisObtenu || false,
          data.dateDebutPrevue
        ]
      );

      logger.info(`Travaux créés: ${data.categorie} - ${data.montant}€`);
      return this.mapRowToTravaux(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de la création des travaux:', error);
      throw error;
    }
  }

  /**
   * Créer une photo à partir d'une chaîne base64
   */
  async createPhotoFromBase64(bienId: string, photoBase64: string, index: number): Promise<Photo> {
    try {
      // Si ce n'est pas une string, ou si elle ne commence pas par "data:", ignorer
      if (typeof photoBase64 !== 'string') {
        logger.warn(`Photo ${index} ignorée: type invalide (${typeof photoBase64})`);
        throw new Error('Format de photo invalide: doit être une chaîne de caractères');
      }

      // Si c'est une URL Leboncoin ou autre URL HTTP, la stocker directement
      if (photoBase64.startsWith('http://') || photoBase64.startsWith('https://')) {
        const filename = `photo_externe_${Date.now()}_${index}.jpg`;
        const result = await query(
          `INSERT INTO photos_v2
           (bien_immobilier_id, url, filename, type, size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [bienId, photoBase64, filename, 'Autre', 0, 'image/jpeg']
        );
        logger.info(`Photo externe créée: ${filename} (URL: ${photoBase64.substring(0, 50)}...)`);
        return this.mapRowToPhoto(result.rows[0]);
      }

      // Vérifier que c'est bien du base64
      if (!photoBase64.startsWith('data:')) {
        logger.warn(`Photo ${index} ignorée: ne commence pas par "data:" (${photoBase64.substring(0, 50)}...)`);
        throw new Error('Format base64 invalide: doit commencer par "data:"');
      }

      // Extraire le type MIME et les données
      const matches = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        logger.error(`Format base64 invalide pour la photo ${index}: ${photoBase64.substring(0, 100)}...`);
        throw new Error('Format base64 invalide: regex ne correspond pas');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const size = buffer.length;

      // Pour l'instant, stocker en base64 (plus tard: uploader sur S3/autre)
      const filename = `photo_${Date.now()}_${index}.jpg`;
      const url = photoBase64; // Stocker directement le base64 pour l'instant

      const result = await query(
        `INSERT INTO photos_v2
         (bien_immobilier_id, url, filename, type, size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [bienId, url, filename, 'Autre', size, mimeType]
      );

      logger.info(`Photo créée: ${filename} (${size} bytes)`);
      return this.mapRowToPhoto(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de la création de la photo:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  private async getPorteursByProjetId(projetId: string): Promise<PorteurProjet[]> {
    const result = await query(
      'SELECT * FROM porteurs_projet WHERE projet_id = $1',
      [projetId]
    );

    return result.rows.map(row => this.mapRowToPorteurProjet(row));
  }

  private async getBienImmobilierByProjetId(projetId: string): Promise<BienImmobilier | undefined> {
    const result = await query(
      'SELECT * FROM biens_immobiliers_v2 WHERE projet_id = $1',
      [projetId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const bien = this.mapRowToBienImmobilier(result.rows[0]);

    // Charger les éléments de bien (appartements, parkings, etc.)
    bien.elements = await this.getElementsBienByProjetId(projetId);

    // Charger les travaux
    bien.travauxPrevus = await this.getTravauxByBienId(bien.id);

    // Charger les photos
    bien.photos = await this.getPhotosByBienId(bien.id);

    return bien;
  }

  private async getPlanFinancementByProjetId(projetId: string): Promise<PlanFinancement | undefined> {
    const result = await query(
      'SELECT * FROM plans_financement_v2 WHERE projet_id = $1',
      [projetId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRowToPlanFinancement(result.rows[0]);
  }

  private async getTravauxByBienId(bienId: string): Promise<TravauxDetail[]> {
    const result = await query(
      'SELECT * FROM travaux_details_v2 WHERE bien_immobilier_id = $1 ORDER BY priorite DESC',
      [bienId]
    );

    return result.rows.map(row => this.mapRowToTravaux(row));
  }

  private async getPhotosByBienId(bienId: string): Promise<Photo[]> {
    const result = await query(
      'SELECT * FROM photos_v2 WHERE bien_immobilier_id = $1 ORDER BY created_at DESC',
      [bienId]
    );

    return result.rows.map(row => this.mapRowToPhoto(row));
  }

  private async getElementsBienByProjetId(projetId: string): Promise<ElementBien[]> {
    const result = await query(
      'SELECT * FROM elements_bien_v2 WHERE projet_id = $1 ORDER BY created_at ASC',
      [projetId]
    );

    return result.rows.map(row => this.mapRowToElementBien(row));
  }

  // ==========================================
  // MAPPERS (DB rows -> TypeScript types)
  // ==========================================

  private mapRowToProjet(row: any): Projet {
    return {
      id: row.id,
      userId: row.user_id,
      nom: row.nom,
      description: row.description,
      status: row.status as StatusProjet,
      dateCreation: new Date(row.date_creation),
      dateModification: new Date(row.date_modification)
    };
  }

  private mapRowToPorteurProjet(row: any): PorteurProjet {
    return {
      id: row.id,
      projetId: row.projet_id,
      structureId: row.structure_id,
      pourcentageProjet: parseFloat(row.pourcentage_projet),
      proprieteEffective: row.propriete_effective ? parseFloat(row.propriete_effective) : undefined,
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToBienImmobilier(row: any): BienImmobilier {
    return {
      id: row.id,
      projetId: row.projet_id,
      adresse: row.adresse,
      codePostal: row.code_postal,
      ville: row.ville,
      type: row.type,
      superficie: parseFloat(row.superficie),
      nombrePieces: row.nombre_pieces,
      nombreChambres: row.nombre_chambres,
      nombreSDB: row.nombre_sdb,
      anneeConstruction: row.annee_construction,
      etatActuel: row.etat_actuel,
      dpe: row.dpe,
      ges: row.ges,
      destinationBien: row.destination_bien,
      loyerMensuelEstime: row.loyer_mensuel_estime ? parseFloat(row.loyer_mensuel_estime) : undefined,
      chargesMensuelles: row.charges_mensuelles ? parseFloat(row.charges_mensuelles) : undefined,
      taxeFonciere: row.taxe_fonciere ? parseFloat(row.taxe_fonciere) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToPlanFinancement(row: any): PlanFinancement {
    return {
      id: row.id,
      projetId: row.projet_id,
      prixAchat: parseFloat(row.prix_achat),
      fraisNotaire: parseFloat(row.frais_notaire),
      fraisAgence: parseFloat(row.frais_agence),
      montantTravaux: parseFloat(row.montant_travaux),
      fraisDossierBancaire: parseFloat(row.frais_dossier_bancaire),
      fraisGarantie: parseFloat(row.frais_garantie),
      autresFrais: parseFloat(row.autres_frais),
      coutTotalProjet: parseFloat(row.cout_total_projet),
      apportPersonnel: parseFloat(row.apport_personnel),
      montantEmprunt: parseFloat(row.montant_emprunt),
      dureeCredit: row.duree_credit,
      tauxInteretEstime: parseFloat(row.taux_interet_estime),
      tauxAssuranceEstime: parseFloat(row.taux_assurance_estime),
      mensualiteCapitalInterets: parseFloat(row.mensualite_capital_interets),
      mensualiteAssurance: parseFloat(row.mensualite_assurance),
      mensualiteTotale: parseFloat(row.mensualite_totale),
      typePret: row.type_pret,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToTravaux(row: any): TravauxDetail {
    return {
      id: row.id,
      bienImmobilierId: row.bien_immobilier_id,
      categorie: row.categorie,
      description: row.description,
      montant: parseFloat(row.montant),
      priorite: row.priorite,
      dureeEstimee: row.duree_estimee,
      artisan: row.artisan,
      devisObtenu: row.devis_obtenu,
      dateDebutPrevue: row.date_debut_prevue ? new Date(row.date_debut_prevue) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToPhoto(row: any): Photo {
    return {
      id: row.id,
      bienImmobilierId: row.bien_immobilier_id,
      url: row.url,
      filename: row.filename,
      description: row.description,
      type: row.type,
      size: row.size,
      mimeType: row.mime_type,
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToElementBien(row: any): ElementBien {
    return {
      id: row.id,
      projetId: row.projet_id,
      type: row.type,
      superficie: parseFloat(row.superficie),
      nombrePieces: row.nombre_pieces,
      etage: row.etage,
      etat: row.etat,
      enLocation: row.en_location,
      loyerMensuel: parseFloat(row.loyer_mensuel || 0),
      chargesMensuelles: parseFloat(row.charges_mensuelles || 0),
      equipements: row.equipements || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export default new ProjetService();
