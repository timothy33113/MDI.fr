import { query } from '@/database/connection';
import logger from '@/utils/logger';
import {
  Structure,
  PersonnePhysique,
  PersonneMorale,
  RevenusPersonnePhysique,
  ChargesPersonnePhysique,
  RepresentantLegal,
  BilanComptable,
  Detenteur,
  TypeStructure,
  CreateStructureRequest
} from '@/types';

/**
 * Normaliser une date partielle pour PostgreSQL
 * Convertit YYYY ou YYYY-MM en YYYY-MM-DD
 */
function normalizeDateForPostgres(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const trimmed = String(dateStr).trim();

  // Déjà au format complet
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Format YYYY-MM -> ajouter -01
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    logger.info(`📅 Normalisation date partielle: ${trimmed} -> ${trimmed}-01`);
    return `${trimmed}-01`;
  }

  // Format YYYY -> ajouter -01-01
  if (/^\d{4}$/.test(trimmed)) {
    logger.info(`📅 Normalisation date partielle: ${trimmed} -> ${trimmed}-01-01`);
    return `${trimmed}-01-01`;
  }

  logger.warn(`⚠️ Format de date invalide: ${trimmed} - retourne null`);
  return null;
}

/**
 * Service de gestion des structures (Personnes Physiques et Morales)
 */
class StructureService {
  /**
   * Créer une nouvelle structure
   */
  async createStructure(userId: string, data: CreateStructureRequest): Promise<Structure> {
    try {
      logger.info(`Création d'une structure de type ${data.type} pour l'utilisateur ${userId}`);

      // 1. Créer la structure de base
      const structureResult = await query(
        `INSERT INTO structures (user_id, type, nom, adresse, telephone, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, data.type, data.nom, data.adresse, data.telephone, data.email]
      );

      const structure = this.mapRowToStructure(structureResult.rows[0]);

      // 2. Si Personne Physique, créer les détails
      if (data.type === 'PERSONNE_PHYSIQUE' && data.personnePhysique) {
        const pp = data.personnePhysique;

        // Normaliser la date de naissance (gérer YYYY ou YYYY-MM)
        const dateNaissanceNormalisee = normalizeDateForPostgres(pp.dateNaissance);

        const ppResult = await query(
          `INSERT INTO personnes_physiques_v2
           (structure_id, prenom, date_naissance, lieu_naissance, nationalite,
            situation_familiale, statut_professionnel, emploi, employeur, type_contrat, anciennete)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            structure.id,
            pp.prenom,
            dateNaissanceNormalisee,
            pp.lieuNaissance || null,
            pp.nationalite || 'Française',
            pp.situationFamiliale || null,
            pp.statutProfessionnel || 'Sans_activite',  // Valeur par défaut
            pp.emploi || null,
            pp.employeur || null,
            pp.typeContrat || null,
            pp.anciennete || null
          ]
        );

        structure.personnePhysique = this.mapRowToPersonnePhysique(ppResult.rows[0]);

        // Créer revenus (optionnel)
        if (pp.revenus) {
          const revenus = await this.createRevenus(structure.personnePhysique.id, pp.revenus);
          structure.personnePhysique.revenus = revenus;
        }

        // Créer charges (optionnel)
        if (pp.charges) {
          const charges = await this.createCharges(structure.personnePhysique.id, pp.charges);
          structure.personnePhysique.charges = charges;
        }
      }

      // 3. Si Personne Morale, créer les détails
      if (data.type !== 'PERSONNE_PHYSIQUE' && data.personneMorale) {
        const pm = data.personneMorale;

        const pmResult = await query(
          `INSERT INTO personnes_morales_v2
           (structure_id, denomination_sociale, siret, siren, forme_juridique,
            date_creation, capital_social, chiffre_affaires_annuel, resultat_net, banque_principale)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            structure.id,
            pm.denominationSociale,
            pm.siret,
            pm.siren,
            pm.formeJuridique || data.type,
            pm.dateCreation,
            pm.capitalSocial,
            pm.chiffreAffairesAnnuel,
            pm.resultatNet,
            pm.banquePrincipale
          ]
        );

        structure.personneMorale = this.mapRowToPersonneMorale(pmResult.rows[0]);

        // Créer représentant légal (optionnel)
        if (pm.representantLegal) {
          const representant = await this.createRepresentantLegal(
            structure.personneMorale.id,
            pm.representantLegal
          );
          structure.personneMorale.representantLegal = representant;
        }
      }

      logger.info(`Structure ${structure.id} créée avec succès`);
      return structure;
    } catch (error) {
      logger.error('Erreur lors de la création de la structure:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les structures d'un utilisateur
   */
  async getStructuresByUserId(userId: string): Promise<Structure[]> {
    try {
      const result = await query(
        'SELECT * FROM structures WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      const structures = await Promise.all(
        result.rows.map(row => this.getStructureById(row.id))
      );

      return structures.filter(s => s !== null) as Structure[];
    } catch (error) {
      logger.error('Erreur lors de la récupération des structures:', error);
      throw error;
    }
  }

  /**
   * Récupérer une structure par ID avec toutes ses relations
   */
  async getStructureById(structureId: string): Promise<Structure | null> {
    try {
      const result = await query(
        'SELECT * FROM structures WHERE id = $1',
        [structureId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const structure = this.mapRowToStructure(result.rows[0]);

      // Charger les détenteurs
      structure.detenteurs = await this.getDetenteurs(structureId);

      // Charger les détails selon le type
      if (structure.type === 'PERSONNE_PHYSIQUE') {
        structure.personnePhysique = await this.getPersonnePhysiqueByStructureId(structureId);
      } else {
        structure.personneMorale = await this.getPersonneMoraleByStructureId(structureId);
      }

      return structure;
    } catch (error) {
      logger.error('Erreur lors de la récupération de la structure:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une structure
   */
  async updateStructure(structureId: string, userId: string, data: Partial<CreateStructureRequest>): Promise<Structure> {
    try {
      // Vérifier que la structure appartient bien à l'utilisateur
      const checkResult = await query(
        'SELECT id FROM structures WHERE id = $1 AND user_id = $2',
        [structureId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Structure non trouvée ou accès non autorisé');
      }

      // Mise à jour des champs de base
      if (data.nom || data.adresse || data.telephone || data.email) {
        await query(
          `UPDATE structures
           SET nom = COALESCE($1, nom),
               adresse = COALESCE($2, adresse),
               telephone = COALESCE($3, telephone),
               email = COALESCE($4, email)
           WHERE id = $5`,
          [data.nom, data.adresse, data.telephone, data.email, structureId]
        );
      }

      // Récupérer la structure mise à jour
      const structure = await this.getStructureById(structureId);
      if (!structure) {
        throw new Error('Structure non trouvée après mise à jour');
      }

      logger.info(`Structure ${structureId} mise à jour avec succès`);
      return structure;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la structure:', error);
      throw error;
    }
  }

  /**
   * Supprimer une structure
   */
  async deleteStructure(structureId: string, userId: string): Promise<void> {
    try {
      // Vérifier que la structure appartient bien à l'utilisateur
      const result = await query(
        'DELETE FROM structures WHERE id = $1 AND user_id = $2 RETURNING id',
        [structureId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Structure non trouvée ou accès non autorisé');
      }

      logger.info(`Structure ${structureId} supprimée avec succès`);
    } catch (error) {
      logger.error('Erreur lors de la suppression de la structure:', error);
      throw error;
    }
  }

  /**
   * Ajouter un détenteur à une structure (hiérarchie)
   */
  async addDetenteur(structureId: string, porteurId: string, pourcentage: number): Promise<Detenteur> {
    try {
      // Vérifier que structure_id != porteur_id (pas d'auto-détention)
      if (structureId === porteurId) {
        throw new Error('Une structure ne peut pas se détenir elle-même');
      }

      // Vérifier que le total ne dépasse pas 100%
      const totalResult = await query(
        'SELECT COALESCE(SUM(pourcentage), 0) as total FROM detenteurs WHERE structure_id = $1',
        [structureId]
      );

      const currentTotal = parseFloat(totalResult.rows[0].total);
      if (currentTotal + pourcentage > 100) {
        throw new Error(`Le total des détenteurs dépasserait 100% (actuel: ${currentTotal}%)`);
      }

      const result = await query(
        `INSERT INTO detenteurs (structure_id, porteur_id, pourcentage)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [structureId, porteurId, pourcentage]
      );

      logger.info(`Détenteur ajouté: ${porteurId} détient ${pourcentage}% de ${structureId}`);
      return this.mapRowToDetenteur(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du détenteur:', error);
      throw error;
    }
  }

  /**
   * Récupérer les détenteurs d'une structure
   */
  private async getDetenteurs(structureId: string): Promise<Detenteur[]> {
    const result = await query(
      'SELECT * FROM detenteurs WHERE structure_id = $1',
      [structureId]
    );

    return result.rows.map(row => this.mapRowToDetenteur(row));
  }

  /**
   * Créer les revenus d'une personne physique
   */
  private async createRevenus(
    personnePhysiqueId: string,
    data: Partial<RevenusPersonnePhysique>
  ): Promise<RevenusPersonnePhysique> {
    const salaire = data.salaireMensuelNet || 0;
    const primes = data.primesAnnuelles || 0;
    const locatifs = data.revenusLocatifs || 0;
    const autres = data.autresRevenus || 0;

    const totalMensuel = salaire + locatifs + autres;
    const totalAnnuel = (salaire * 12) + primes + (locatifs * 12) + (autres * 12);

    const result = await query(
      `INSERT INTO revenus_personnes_physiques_v2
       (personne_physique_id, salaire_mensuel_net, primes_annuelles, revenus_locatifs,
        autres_revenus, total_mensuel, total_annuel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [personnePhysiqueId, salaire, primes, locatifs, autres, totalMensuel, totalAnnuel]
    );

    return this.mapRowToRevenus(result.rows[0]);
  }

  /**
   * Créer les charges d'une personne physique
   */
  private async createCharges(
    personnePhysiqueId: string,
    data: Partial<ChargesPersonnePhysique>
  ): Promise<ChargesPersonnePhysique> {
    const loyer = data.loyerMensuel || 0;
    const credits = data.mensualitesCredits || 0;
    const pension = data.pensionAlimentaire || 0;
    const autres = data.autresCharges || 0;

    const totalMensuel = loyer + credits + pension + autres;

    const result = await query(
      `INSERT INTO charges_personnes_physiques_v2
       (personne_physique_id, loyer_mensuel, mensualites_credits, pension_alimentaire,
        autres_charges, total_mensuel)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [personnePhysiqueId, loyer, credits, pension, autres, totalMensuel]
    );

    return this.mapRowToCharges(result.rows[0]);
  }

  /**
   * Créer un représentant légal
   */
  private async createRepresentantLegal(
    personneMoraleId: string,
    data: Partial<RepresentantLegal>
  ): Promise<RepresentantLegal> {
    const result = await query(
      `INSERT INTO representants_legaux
       (personne_morale_id, nom, prenom, fonction, date_naissance)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [personneMoraleId, data.nom, data.prenom, data.fonction, data.dateNaissance]
    );

    return this.mapRowToRepresentantLegal(result.rows[0]);
  }

  /**
   * Récupérer une personne physique par structure_id
   */
  private async getPersonnePhysiqueByStructureId(structureId: string): Promise<PersonnePhysique | undefined> {
    const result = await query(
      'SELECT * FROM personnes_physiques_v2 WHERE structure_id = $1',
      [structureId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const pp = this.mapRowToPersonnePhysique(result.rows[0]);

    // Charger revenus
    const revenusResult = await query(
      'SELECT * FROM revenus_personnes_physiques_v2 WHERE personne_physique_id = $1',
      [pp.id]
    );
    if (revenusResult.rows.length > 0) {
      pp.revenus = this.mapRowToRevenus(revenusResult.rows[0]);
    }

    // Charger charges
    const chargesResult = await query(
      'SELECT * FROM charges_personnes_physiques_v2 WHERE personne_physique_id = $1',
      [pp.id]
    );
    if (chargesResult.rows.length > 0) {
      pp.charges = this.mapRowToCharges(chargesResult.rows[0]);
    }

    return pp;
  }

  /**
   * Récupérer une personne morale par structure_id
   */
  private async getPersonneMoraleByStructureId(structureId: string): Promise<PersonneMorale | undefined> {
    const result = await query(
      'SELECT * FROM personnes_morales_v2 WHERE structure_id = $1',
      [structureId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const pm = this.mapRowToPersonneMorale(result.rows[0]);

    // Charger représentant légal
    const representantResult = await query(
      'SELECT * FROM representants_legaux WHERE personne_morale_id = $1',
      [pm.id]
    );
    if (representantResult.rows.length > 0) {
      pm.representantLegal = this.mapRowToRepresentantLegal(representantResult.rows[0]);
    }

    return pm;
  }

  // ==========================================
  // MAPPERS (DB rows -> TypeScript types)
  // ==========================================

  private mapRowToStructure(row: any): Structure {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as TypeStructure,
      nom: row.nom,
      adresse: row.adresse,
      telephone: row.telephone,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToDetenteur(row: any): Detenteur {
    return {
      id: row.id,
      structureId: row.structure_id,
      porteurId: row.porteur_id,
      pourcentage: parseFloat(row.pourcentage),
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToPersonnePhysique(row: any): PersonnePhysique {
    return {
      id: row.id,
      structureId: row.structure_id,
      prenom: row.prenom,
      dateNaissance: row.date_naissance ? new Date(row.date_naissance) : undefined,
      lieuNaissance: row.lieu_naissance,
      nationalite: row.nationalite,
      situationFamiliale: row.situation_familiale,
      statutProfessionnel: row.statut_professionnel,
      emploi: row.emploi,
      employeur: row.employeur,
      typeContrat: row.type_contrat,
      anciennete: row.anciennete,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToRevenus(row: any): RevenusPersonnePhysique {
    return {
      id: row.id,
      personnePhysiqueId: row.personne_physique_id,
      salaireMensuelNet: parseFloat(row.salaire_mensuel_net),
      primesAnnuelles: parseFloat(row.primes_annuelles),
      revenusLocatifs: parseFloat(row.revenus_locatifs),
      autresRevenus: parseFloat(row.autres_revenus),
      totalMensuel: parseFloat(row.total_mensuel),
      totalAnnuel: parseFloat(row.total_annuel),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToCharges(row: any): ChargesPersonnePhysique {
    return {
      id: row.id,
      personnePhysiqueId: row.personne_physique_id,
      loyerMensuel: parseFloat(row.loyer_mensuel),
      mensualitesCredits: parseFloat(row.mensualites_credits),
      pensionAlimentaire: parseFloat(row.pension_alimentaire),
      autresCharges: parseFloat(row.autres_charges),
      totalMensuel: parseFloat(row.total_mensuel),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToPersonneMorale(row: any): PersonneMorale {
    return {
      id: row.id,
      structureId: row.structure_id,
      denominationSociale: row.denomination_sociale,
      siret: row.siret,
      siren: row.siren,
      formeJuridique: row.forme_juridique,
      dateCreation: row.date_creation ? new Date(row.date_creation) : undefined,
      capitalSocial: parseFloat(row.capital_social),
      chiffreAffairesAnnuel: row.chiffre_affaires_annuel ? parseFloat(row.chiffre_affaires_annuel) : undefined,
      resultatNet: row.resultat_net ? parseFloat(row.resultat_net) : undefined,
      banquePrincipale: row.banque_principale,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToRepresentantLegal(row: any): RepresentantLegal {
    return {
      id: row.id,
      personneMoraleId: row.personne_morale_id,
      nom: row.nom,
      prenom: row.prenom,
      fonction: row.fonction,
      dateNaissance: row.date_naissance ? new Date(row.date_naissance) : undefined,
      createdAt: new Date(row.created_at)
    };
  }
}

export default new StructureService();
