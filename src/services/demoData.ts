/**
 * Données de démonstration pour MDI.fr
 * Permet de créer rapidement des associés et projets d'exemple
 */

import { Structure, Projet, CreateStructureForm, CreateProjetForm } from '@/types'

// Génère un UUID simple
const generateId = () => crypto.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * Données d'exemple pour les associés (personnes physiques)
 */
export const demoAssocies: CreateStructureForm[] = [
  {
    type: 'PERSONNE_PHYSIQUE',
    nom: 'MARTIN Jean',
    adresse: '15 Rue de la République, 75001 Paris',
    telephone: '06 12 34 56 78',
    email: 'jean.martin@email.com',
    personnePhysique: {
      prenom: 'Jean',
      dateNaissance: new Date('1985-03-15'),
      lieuNaissance: 'Paris',
      nationalite: 'Française',
      situationFamiliale: 'Marie',
      statutProfessionnel: 'Salarie',
      emploi: 'Directeur Commercial',
      employeur: 'Société ABC',
      typeContrat: 'CDI',
      anciennete: '8 ans',
      revenus: {
        id: generateId(),
        personnePhysiqueId: '',
        salaireMensuelNet: 5500,
        primesAnnuelles: 12000,
        revenusLocatifs: 800,
        autresRevenus: 0,
        totalMensuel: 6800,
        totalAnnuel: 81600,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      charges: {
        id: generateId(),
        personnePhysiqueId: '',
        loyerMensuel: 0,
        mensualitesCredits: 1200,
        pensionAlimentaire: 0,
        autresCharges: 300,
        totalMensuel: 1500,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as any
  },
  {
    type: 'PERSONNE_PHYSIQUE',
    nom: 'MARTIN Sophie',
    adresse: '15 Rue de la République, 75001 Paris',
    telephone: '06 98 76 54 32',
    email: 'sophie.martin@email.com',
    personnePhysique: {
      prenom: 'Sophie',
      dateNaissance: new Date('1987-07-22'),
      lieuNaissance: 'Lyon',
      nationalite: 'Française',
      situationFamiliale: 'Marie',
      statutProfessionnel: 'Salarie',
      emploi: 'Responsable Marketing',
      employeur: 'Entreprise XYZ',
      typeContrat: 'CDI',
      anciennete: '5 ans',
      revenus: {
        id: generateId(),
        personnePhysiqueId: '',
        salaireMensuelNet: 4200,
        primesAnnuelles: 6000,
        revenusLocatifs: 0,
        autresRevenus: 200,
        totalMensuel: 4700,
        totalAnnuel: 56400,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      charges: {
        id: generateId(),
        personnePhysiqueId: '',
        loyerMensuel: 0,
        mensualitesCredits: 450,
        pensionAlimentaire: 0,
        autresCharges: 150,
        totalMensuel: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as any
  },
  {
    type: 'PERSONNE_PHYSIQUE',
    nom: 'DUBOIS Pierre',
    adresse: '28 Avenue des Champs-Élysées, 75008 Paris',
    telephone: '06 11 22 33 44',
    email: 'pierre.dubois@email.com',
    personnePhysique: {
      prenom: 'Pierre',
      dateNaissance: new Date('1978-11-30'),
      lieuNaissance: 'Marseille',
      nationalite: 'Française',
      situationFamiliale: 'Celibataire',
      statutProfessionnel: 'Independant',
      emploi: 'Consultant Indépendant',
      typeContrat: 'Freelance',
      anciennete: '12 ans',
      revenus: {
        id: generateId(),
        personnePhysiqueId: '',
        salaireMensuelNet: 8000,
        primesAnnuelles: 0,
        revenusLocatifs: 1500,
        autresRevenus: 500,
        totalMensuel: 10000,
        totalAnnuel: 120000,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      charges: {
        id: generateId(),
        personnePhysiqueId: '',
        loyerMensuel: 1800,
        mensualitesCredits: 2000,
        pensionAlimentaire: 0,
        autresCharges: 400,
        totalMensuel: 4200,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as any
  }
]

/**
 * Données d'exemple pour les sociétés
 */
export const demoSocietes: CreateStructureForm[] = [
  {
    type: 'SCI',
    nom: 'SCI MARTIN INVESTISSEMENT',
    adresse: '15 Rue de la République, 75001 Paris',
    telephone: '01 23 45 67 89',
    email: 'contact@sci-martin.fr',
    personneMorale: {
      denominationSociale: 'SCI MARTIN INVESTISSEMENT',
      siret: '12345678901234',
      siren: '123456789',
      formeJuridique: 'SCI',
      dateCreation: new Date('2020-01-15'),
      capitalSocial: 10000,
      representantLegal: {
        id: generateId(),
        personneMoraleId: '',
        nom: 'MARTIN',
        prenom: 'Jean',
        fonction: 'Gerant',
        dateNaissance: new Date('1985-03-15'),
        createdAt: new Date()
      },
      banquePrincipale: 'Crédit Agricole'
    } as any
  },
  {
    type: 'SARL',
    nom: 'DUBOIS CONSULTING SARL',
    adresse: '28 Avenue des Champs-Élysées, 75008 Paris',
    telephone: '01 98 76 54 32',
    email: 'contact@dubois-consulting.fr',
    personneMorale: {
      denominationSociale: 'DUBOIS CONSULTING SARL',
      siret: '98765432109876',
      siren: '987654321',
      formeJuridique: 'SARL',
      dateCreation: new Date('2015-06-01'),
      capitalSocial: 50000,
      chiffreAffairesAnnuel: 350000,
      resultatNet: 75000,
      representantLegal: {
        id: generateId(),
        personneMoraleId: '',
        nom: 'DUBOIS',
        prenom: 'Pierre',
        fonction: 'Gerant',
        dateNaissance: new Date('1978-11-30'),
        createdAt: new Date()
      },
      bilanComptable: {
        id: generateId(),
        personneMoraleId: '',
        exercice: '2024',
        totalActif: 180000,
        totalPassif: 180000,
        capitauxPropres: 125000,
        dettesFinancieres: 30000,
        tresorerie: 45000,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      banquePrincipale: 'BNP Paribas'
    } as any
  }
]

/**
 * Données d'exemple pour les projets immobiliers
 */
export const demoProjets: CreateProjetForm[] = [
  {
    nom: 'Immeuble de rapport Lyon 3',
    description: 'Immeuble de 4 appartements en centre-ville de Lyon, idéal pour investissement locatif.',
    porteurs: [], // Sera rempli dynamiquement avec les IDs des structures créées
    bien: {
      adresse: '45 Rue de la Part-Dieu',
      codePostal: '69003',
      ville: 'Lyon',
      type: 'Immeuble',
      superficie: 280,
      nombrePieces: 12,
      anneeConstruction: 1965,
      etatActuel: 'A_Renover',
      dpe: 'D',
      destinationBien: 'Location',
      loyerMensuelEstime: 3200,
      chargesMensuelles: 350,
      taxeFonciere: 2400
    },
    elementsBien: [
      { type: 'Appartement', superficie: 65, nombrePieces: 3, etat: 'A_Renover', enLocation: true, loyerMensuel: 750, chargesMensuelles: 80 },
      { type: 'Appartement', superficie: 55, nombrePieces: 2, etat: 'Moyen', enLocation: true, loyerMensuel: 650, chargesMensuelles: 70 },
      { type: 'Appartement', superficie: 80, nombrePieces: 4, etat: 'A_Renover', enLocation: false, loyerMensuel: 900, chargesMensuelles: 100 },
      { type: 'Studio', superficie: 25, nombrePieces: 1, etat: 'Bon', enLocation: true, loyerMensuel: 450, chargesMensuelles: 50 }
    ],
    travaux: [
      { type: 'Toiture', description: 'Réfection complète de la toiture', montant: 25000 },
      { type: 'Façade', description: 'Ravalement de façade et isolation', montant: 18000 },
      { type: 'Électricité', description: 'Mise aux normes électriques parties communes', montant: 8000 },
      { type: 'Appartement T3', description: 'Rénovation complète appartement 3ème étage', montant: 22000 }
    ],
    financement: {
      prixAchat: 380000,
      fraisNotaire: 30400,
      fraisAgence: 15200,
      montantTravaux: 73000,
      fraisDossierBancaire: 1500,
      fraisGarantie: 4000,
      autresFrais: 2000,
      coutTotalProjet: 506100,
      apportPersonnel: 80000,
      montantEmprunt: 426100,
      dureeCredit: 20,
      tauxInteretEstime: 3.8,
      tauxAssuranceEstime: 0.35,
      typePret: 'Amortissable'
    }
  },
  {
    nom: 'Studio Étudiant Bordeaux',
    description: 'Studio meublé proche université, parfait pour location étudiante.',
    porteurs: [],
    bien: {
      adresse: '12 Rue Sainte-Catherine',
      codePostal: '33000',
      ville: 'Bordeaux',
      type: 'Appartement',
      superficie: 22,
      nombrePieces: 1,
      anneeConstruction: 1990,
      etatActuel: 'Bon',
      dpe: 'C',
      destinationBien: 'Location',
      loyerMensuelEstime: 550,
      chargesMensuelles: 60,
      taxeFonciere: 450
    },
    elementsBien: [
      { type: 'Studio', superficie: 22, nombrePieces: 1, etat: 'Bon', enLocation: true, loyerMensuel: 550, chargesMensuelles: 60 }
    ],
    travaux: [
      { type: 'Peinture', description: 'Rafraîchissement peinture', montant: 1500 },
      { type: 'Mobilier', description: 'Ameublement complet', montant: 3000 }
    ],
    financement: {
      prixAchat: 95000,
      fraisNotaire: 7600,
      fraisAgence: 4750,
      montantTravaux: 4500,
      fraisDossierBancaire: 500,
      fraisGarantie: 1200,
      autresFrais: 500,
      coutTotalProjet: 114050,
      apportPersonnel: 25000,
      montantEmprunt: 89050,
      dureeCredit: 15,
      tauxInteretEstime: 3.5,
      tauxAssuranceEstime: 0.30,
      typePret: 'Amortissable'
    }
  },
  {
    nom: 'Maison avec travaux Nantes',
    description: 'Maison à rénover avec fort potentiel de plus-value, quartier en développement.',
    porteurs: [],
    bien: {
      adresse: '8 Rue du Commerce',
      codePostal: '44000',
      ville: 'Nantes',
      type: 'Maison',
      superficie: 120,
      nombrePieces: 5,
      nombreChambres: 3,
      nombreSDB: 1,
      anneeConstruction: 1950,
      etatActuel: 'A_Renover_Entierement',
      dpe: 'F',
      destinationBien: 'Location',
      loyerMensuelEstime: 1400,
      chargesMensuelles: 150,
      taxeFonciere: 1800
    },
    elementsBien: [
      { type: 'Maison', superficie: 120, nombrePieces: 5, etat: 'A_Renover', enLocation: false, loyerMensuel: 1400, chargesMensuelles: 150 }
    ],
    travaux: [
      { type: 'Gros œuvre', description: 'Reprise des fondations et murs porteurs', montant: 35000 },
      { type: 'Toiture', description: 'Réfection toiture et charpente', montant: 28000 },
      { type: 'Isolation', description: 'Isolation thermique complète (ITE)', montant: 22000 },
      { type: 'Électricité', description: 'Installation électrique neuve', montant: 12000 },
      { type: 'Plomberie', description: 'Plomberie et sanitaires neufs', montant: 15000 },
      { type: 'Finitions', description: 'Plâtrerie, peinture, sols', montant: 18000 },
      { type: 'Cuisine', description: 'Cuisine équipée', montant: 8000 },
      { type: 'Menuiseries', description: 'Fenêtres double vitrage', montant: 12000 }
    ],
    financement: {
      prixAchat: 180000,
      fraisNotaire: 14400,
      fraisAgence: 9000,
      montantTravaux: 150000,
      fraisDossierBancaire: 1200,
      fraisGarantie: 3500,
      autresFrais: 3000,
      coutTotalProjet: 361100,
      apportPersonnel: 60000,
      montantEmprunt: 301100,
      dureeCredit: 25,
      tauxInteretEstime: 4.0,
      tauxAssuranceEstime: 0.40,
      typePret: 'Amortissable'
    }
  }
]

/**
 * Crée toutes les données de démonstration
 */
export async function createDemoData(
  addStructure: (data: any) => Promise<Structure>,
  createProjet: (data: any) => Promise<any>
): Promise<{ associes: Structure[], societes: Structure[], projets: any[] }> {
  const createdAssocies: Structure[] = []
  const createdSocietes: Structure[] = []
  const createdProjets: any[] = []

  // Créer les associés (personnes physiques)
  for (const associe of demoAssocies) {
    try {
      const created = await addStructure(associe)
      createdAssocies.push(created)
      console.log(`✅ Associé créé: ${associe.nom}`)
    } catch (error) {
      console.error(`❌ Erreur création associé ${associe.nom}:`, error)
    }
  }

  // Créer les sociétés
  for (const societe of demoSocietes) {
    try {
      // Associer les détenteurs (les personnes physiques créées)
      const societeWithDetenteurs = {
        ...societe,
        detenteurs: societe.type === 'SCI'
          ? [
              { porteurId: createdAssocies[0]?.id, pourcentage: 50 },
              { porteurId: createdAssocies[1]?.id, pourcentage: 50 }
            ]
          : [{ porteurId: createdAssocies[2]?.id, pourcentage: 100 }]
      }
      const created = await addStructure(societeWithDetenteurs)
      createdSocietes.push(created)
      console.log(`✅ Société créée: ${societe.nom}`)
    } catch (error) {
      console.error(`❌ Erreur création société ${societe.nom}:`, error)
    }
  }

  // Créer les projets
  for (let i = 0; i < demoProjets.length; i++) {
    const projet = demoProjets[i]
    try {
      // Assigner des porteurs selon le projet
      let porteurs: { structureId: string; pourcentageProjet: number }[] = []

      if (i === 0 && createdSocietes[0]) {
        // Premier projet: SCI MARTIN à 100%
        porteurs = [{ structureId: createdSocietes[0].id, pourcentageProjet: 100 }]
      } else if (i === 1 && createdAssocies[2]) {
        // Deuxième projet: Pierre DUBOIS en direct
        porteurs = [{ structureId: createdAssocies[2].id, pourcentageProjet: 100 }]
      } else if (i === 2 && createdAssocies[0] && createdAssocies[1]) {
        // Troisième projet: Jean et Sophie MARTIN en direct
        porteurs = [
          { structureId: createdAssocies[0].id, pourcentageProjet: 60 },
          { structureId: createdAssocies[1].id, pourcentageProjet: 40 }
        ]
      }

      const projetData = {
        ...projet,
        porteurs
      }

      const created = await createProjet(projetData)
      createdProjets.push(created)
      console.log(`✅ Projet créé: ${projet.nom}`)
    } catch (error) {
      console.error(`❌ Erreur création projet ${projet.nom}:`, error)
    }
  }

  return {
    associes: createdAssocies,
    societes: createdSocietes,
    projets: createdProjets
  }
}
