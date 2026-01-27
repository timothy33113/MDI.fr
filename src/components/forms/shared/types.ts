// Types partagés pour les formulaires

export interface Revenu {
  id: string
  type: 'salaire' | 'prime' | 'locatif' | 'investissement' | 'societe' | 'autre'
  libelle: string
  montantMensuel: number
  nombreMois?: number
}

export interface Charge {
  id: string
  type?: string
  libelle: string
  montantMensuel: number
}

export interface BienImmobilier {
  id: string
  type: 'Residence_Principale' | 'Residence_Secondaire' | 'Investissement_Locatif'
  adresse: string
  valeurEstimee: number
  loyerMensuel?: number
}

export interface Credit {
  id: string
  type: 'Immobilier' | 'Consommation' | 'Professionnel' | 'Autre'
  organisme: string
  montantInitial: number
  dateDebut: string
  nombreMois: number
  tauxInteret: number
  bienAssocie?: string
  capitalRestantDu?: number
  mensualite?: number
}

export interface CompteBancaire {
  id: string
  nom: string
  typeCompte: 'Compte_Courant' | 'Livret_A' | 'LDDS' | 'PEL' | 'CEL' | 'Assurance_Vie' | 'PEA' | 'Compte_Titre' | 'Autre'
  typeCompteAutre?: string
  banque: string
  solde: number
}

export interface SituationProfessionnelle {
  id: string
  statutProfessionnel: 'Salarie' | 'Independant' | 'Dirigeant' | 'Retraite' | 'Sans_activite'
  emploi?: string
  employeur?: string
  societeId?: string
  typeContrat?: 'CDI' | 'CDD' | 'Interim' | 'Freelance' | 'Fonctionnaire'
  anciennete?: string
  dateDebut: string
  dateFin?: string
  enCours: boolean
}

export interface Identite {
  nom: string
  prenom: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  situationFamiliale: 'Celibataire' | 'Marie' | 'Pacse' | 'Divorce' | 'Veuf'
  adresse: string
  telephone: string
  email: string
  photo: string
}

// Types pour les callbacks d'édition
export interface EditableListCallbacks<T> {
  items: T[]
  editingId: string | null
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: string, value: any) => void
  onValidate: (id: string) => void
  onCancel: (id: string) => void
  onStartEdit: (id: string) => void
}
