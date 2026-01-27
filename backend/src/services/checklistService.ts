import { query } from '@/database/connection';
import logger from '@/utils/logger';
import { ChecklistDocument, CategorieDocument, PorteurProjet } from '@/types';

/**
 * Service de génération automatique de checklist de documents
 */
class ChecklistService {
  /**
   * Générer la checklist complète de documents pour un projet
   * Basée sur les porteurs du projet
   */
  async generateChecklistForProjet(projetId: string): Promise<ChecklistDocument[]> {
    try {
      logger.info(`Génération de la checklist pour le projet ${projetId}`);

      // Supprimer l'ancienne checklist si elle existe
      await query('DELETE FROM checklist_documents WHERE projet_id = $1', [projetId]);

      const checklist: ChecklistDocument[] = [];

      // 1. Récupérer les porteurs du projet
      const porteursResult = await query(
        'SELECT * FROM porteurs_projet WHERE projet_id = $1',
        [projetId]
      );

      // 2. Pour chaque porteur, générer les documents nécessaires
      for (const porteurRow of porteursResult.rows) {
        const structureId = porteurRow.structure_id;

        // Récupérer le type de structure
        const structureResult = await query(
          'SELECT type, nom FROM structures WHERE id = $1',
          [structureId]
        );

        if (structureResult.rows.length === 0) continue;

        const structure = structureResult.rows[0];
        const typeStructure = structure.type;
        const nomStructure = structure.nom;

        // Générer les documents selon le type
        if (typeStructure === 'PERSONNE_PHYSIQUE') {
          checklist.push(...this.getDocumentsPersonnePhysique(projetId, structureId, nomStructure));
        } else {
          checklist.push(...this.getDocumentsPersonneMorale(projetId, structureId, nomStructure, typeStructure));
        }
      }

      // 3. Ajouter les documents liés au projet lui-même
      checklist.push(...this.getDocumentsProjet(projetId));

      // 4. Enregistrer tous les documents dans la DB
      for (const doc of checklist) {
        await query(
          `INSERT INTO checklist_documents
           (projet_id, categorie, nom_document, description, concerne_structure_id,
            obligatoire, quantite_requise, validite_jours, statut)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            doc.projetId,
            doc.categorie,
            doc.nomDocument,
            doc.description,
            doc.concerneStructureId || null,
            doc.obligatoire,
            doc.quantiteRequise || null,
            doc.validiteJours || null,
            doc.statut
          ]
        );
      }

      logger.info(`Checklist générée: ${checklist.length} documents pour le projet ${projetId}`);
      return checklist;
    } catch (error) {
      logger.error('Erreur lors de la génération de la checklist:', error);
      throw error;
    }
  }

  /**
   * Récupérer la checklist d'un projet
   */
  async getChecklistByProjetId(projetId: string): Promise<ChecklistDocument[]> {
    try {
      const result = await query(
        'SELECT * FROM checklist_documents WHERE projet_id = $1 ORDER BY categorie, obligatoire DESC',
        [projetId]
      );

      return result.rows.map(row => this.mapRowToChecklistDocument(row));
    } catch (error) {
      logger.error('Erreur lors de la récupération de la checklist:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un document
   */
  async updateDocumentStatus(
    documentId: string,
    statut: 'Non_Fourni' | 'En_Attente' | 'Fourni' | 'Valide'
  ): Promise<void> {
    try {
      await query(
        'UPDATE checklist_documents SET statut = $1 WHERE id = $2',
        [statut, documentId]
      );

      logger.info(`Statut du document ${documentId} mis à jour: ${statut}`);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut du document:', error);
      throw error;
    }
  }

  // ==========================================
  // GÉNÉRATEURS DE DOCUMENTS PAR TYPE
  // ==========================================

  /**
   * Documents requis pour une personne physique
   */
  private getDocumentsPersonnePhysique(
    projetId: string,
    structureId: string,
    nomPersonne: string
  ): Partial<ChecklistDocument>[] {
    return [
      // Identité
      {
        projetId,
        categorie: 'Identite' as CategorieDocument,
        nomDocument: 'Pièce d\'identité',
        description: `Carte d'identité ou passeport en cours de validité de ${nomPersonne}`,
        concerneStructureId: structureId,
        obligatoire: true,
        validiteJours: 365,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Identite' as CategorieDocument,
        nomDocument: 'Justificatif de domicile',
        description: `Facture (électricité, eau, internet) ou quittance de loyer de moins de 3 mois de ${nomPersonne}`,
        concerneStructureId: structureId,
        obligatoire: true,
        quantiteRequise: 'Moins de 3 mois',
        validiteJours: 90,
        statut: 'Non_Fourni'
      },

      // Revenus
      {
        projetId,
        categorie: 'Revenus' as CategorieDocument,
        nomDocument: 'Bulletins de salaire',
        description: `3 derniers bulletins de salaire de ${nomPersonne}`,
        concerneStructureId: structureId,
        obligatoire: true,
        quantiteRequise: '3 derniers mois',
        validiteJours: 90,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Revenus' as CategorieDocument,
        nomDocument: 'Avis d\'imposition',
        description: `Avis d'imposition N-1 et N-2 de ${nomPersonne}`,
        concerneStructureId: structureId,
        obligatoire: true,
        quantiteRequise: 'Années N-1 et N-2',
        statut: 'Non_Fourni'
      },

      // Patrimoine
      {
        projetId,
        categorie: 'Patrimoine' as CategorieDocument,
        nomDocument: 'Relevés bancaires',
        description: `3 derniers relevés de compte bancaire de ${nomPersonne}`,
        concerneStructureId: structureId,
        obligatoire: true,
        quantiteRequise: '3 derniers mois',
        validiteJours: 90,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Patrimoine' as CategorieDocument,
        nomDocument: 'Tableaux d\'amortissement',
        description: `Tableaux d'amortissement des crédits en cours de ${nomPersonne} (si applicable)`,
        concerneStructureId: structureId,
        obligatoire: false,
        statut: 'Non_Fourni'
      }
    ];
  }

  /**
   * Documents requis pour une personne morale (SCI, SARL, etc.)
   */
  private getDocumentsPersonneMorale(
    projetId: string,
    structureId: string,
    nomSociete: string,
    typeStructure: string
  ): Partial<ChecklistDocument>[] {
    const docs: Partial<ChecklistDocument>[] = [
      // Identité juridique
      {
        projetId,
        categorie: 'Societe' as CategorieDocument,
        nomDocument: 'Kbis',
        description: `Extrait Kbis de moins de 3 mois de ${nomSociete}`,
        concerneStructureId: structureId,
        obligatoire: true,
        quantiteRequise: 'Moins de 3 mois',
        validiteJours: 90,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Societe' as CategorieDocument,
        nomDocument: 'Statuts de la société',
        description: `Statuts à jour de ${nomSociete}`,
        concerneStructureId: structureId,
        obligatoire: true,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Societe' as CategorieDocument,
        nomDocument: 'PV de décision',
        description: `Procès-verbal d'assemblée autorisant l'investissement pour ${nomSociete}`,
        concerneStructureId: structureId,
        obligatoire: true,
        statut: 'Non_Fourni'
      }
    ];

    // Pour les SCI, documents spécifiques
    if (typeStructure === 'SCI') {
      docs.push({
        projetId,
        categorie: 'Societe' as CategorieDocument,
        nomDocument: 'Liste des associés',
        description: `Liste complète des associés avec répartition des parts de ${nomSociete}`,
        concerneStructureId: structureId,
        obligatoire: true,
        statut: 'Non_Fourni'
      });
    }

    // Pour les sociétés commerciales (SARL, SAS, etc.)
    if (['SARL', 'SASU', 'SAS', 'SA'].includes(typeStructure)) {
      docs.push(
        {
          projetId,
          categorie: 'Fiscalite' as CategorieDocument,
          nomDocument: 'Liasse fiscale',
          description: `Liasse fiscale des 2 derniers exercices de ${nomSociete}`,
          concerneStructureId: structureId,
          obligatoire: true,
          quantiteRequise: '2 derniers exercices',
          statut: 'Non_Fourni'
        },
        {
          projetId,
          categorie: 'Patrimoine' as CategorieDocument,
          nomDocument: 'Bilans comptables',
          description: `Bilans comptables N-1 et N-2 de ${nomSociete}`,
          concerneStructureId: structureId,
          obligatoire: true,
          quantiteRequise: 'Années N-1 et N-2',
          statut: 'Non_Fourni'
        },
        {
          projetId,
          categorie: 'Patrimoine' as CategorieDocument,
          nomDocument: 'Relevés bancaires société',
          description: `3 derniers relevés de compte professionnel de ${nomSociete}`,
          concerneStructureId: structureId,
          obligatoire: true,
          quantiteRequise: '3 derniers mois',
          validiteJours: 90,
          statut: 'Non_Fourni'
        }
      );
    }

    return docs;
  }

  /**
   * Documents requis pour le projet lui-même
   */
  private getDocumentsProjet(projetId: string): Partial<ChecklistDocument>[] {
    return [
      // Bien immobilier
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'Compromis de vente',
        description: 'Compromis de vente ou promesse de vente signée',
        obligatoire: true,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'Diagnostic de performance énergétique (DPE)',
        description: 'DPE du bien immobilier',
        obligatoire: true,
        validiteJours: 3650, // 10 ans
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'Diagnostic amiante',
        description: 'Diagnostic amiante (si bien construit avant 1997)',
        obligatoire: false,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'Diagnostic plomb',
        description: 'Diagnostic plomb (si bien construit avant 1949)',
        obligatoire: false,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'État des risques et pollutions',
        description: 'ERP - État des risques et pollutions',
        obligatoire: true,
        validiteJours: 180, // 6 mois
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Bien_Immobilier' as CategorieDocument,
        nomDocument: 'Photos du bien',
        description: 'Photos intérieures et extérieures du bien',
        obligatoire: false,
        statut: 'Non_Fourni'
      },

      // Travaux
      {
        projetId,
        categorie: 'Travaux' as CategorieDocument,
        nomDocument: 'Devis travaux détaillés',
        description: 'Devis chiffrés et détaillés pour tous les travaux prévus',
        obligatoire: false,
        statut: 'Non_Fourni'
      },
      {
        projetId,
        categorie: 'Travaux' as CategorieDocument,
        nomDocument: 'Plans et permis',
        description: 'Plans des travaux et permis de construire si nécessaire',
        obligatoire: false,
        statut: 'Non_Fourni'
      }
    ];
  }

  // ==========================================
  // MAPPERS
  // ==========================================

  private mapRowToChecklistDocument(row: any): ChecklistDocument {
    return {
      id: row.id,
      projetId: row.projet_id,
      categorie: row.categorie as CategorieDocument,
      nomDocument: row.nom_document,
      description: row.description,
      concerneStructureId: row.concerne_structure_id,
      obligatoire: row.obligatoire,
      quantiteRequise: row.quantite_requise,
      validiteJours: row.validite_jours,
      statut: row.statut,
      documentUrl: row.document_url,
      dateFourniture: row.date_fourniture ? new Date(row.date_fourniture) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export default new ChecklistService();
