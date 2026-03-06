/**
 * Service pour interroger l'API Recherche d'entreprises du gouvernement français
 * Documentation: https://recherche-entreprises.api.gouv.fr
 */

import type { TypeStructure } from '@/types'

const API_BASE_URL = 'https://recherche-entreprises.api.gouv.fr'

export interface EntrepriseApiResult {
  siren: string
  siret?: string
  nom_complet: string
  nom_raison_sociale: string
  sigle: string | null
  nature_juridique: string
  activite_principale: string
  date_creation: string
  etat_administratif: string
  tranche_effectif_salarie?: string
  categorie_entreprise?: string
  siege: {
    siret: string
    adresse: string
    code_postal: string | null
    commune: string | null
    libelle_commune: string
    latitude: string
    longitude: string
    date_creation: string | null
    activite_principale: string
  }
  dirigeants?: Array<{
    nom?: string
    prenoms?: string
    annee_de_naissance?: string
    date_de_naissance?: string
    qualite?: string
    nationalite?: string
    type_dirigeant: string
    siren?: string // Pour les dirigeants PM
    denomination?: string // Pour les dirigeants PM
  }>
  finances?: {
    [year: string]: {
      ca: number
      resultat_net: number
    }
  }
}

export interface EntrepriseSearchResponse {
  results: EntrepriseApiResult[]
  total_results: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Recherche une entreprise par SIREN ou SIRET
 */
export async function searchEntrepriseBySirenOrSiret(
  sirenOrSiret: string
): Promise<EntrepriseApiResult | null> {
  try {
    // Nettoyer le SIREN/SIRET (supprimer espaces, tirets, etc.)
    const cleaned = sirenOrSiret.replace(/\s|-/g, '')

    if (cleaned.length !== 9 && cleaned.length !== 14) {
      throw new Error('Le SIREN doit contenir 9 chiffres ou le SIRET 14 chiffres')
    }

    // Rechercher par le numéro exact
    const response = await fetch(
      `${API_BASE_URL}/search?q=${cleaned}&per_page=1`
    )

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`)
    }

    const data: EntrepriseSearchResponse = await response.json()

    if (data.results && data.results.length > 0) {
      return data.results[0]
    }

    return null
  } catch (error) {
    console.error('Erreur lors de la recherche d\'entreprise:', error)
    throw error
  }
}

/**
 * Recherche des entreprises par nom
 */
export async function searchEntrepriseByName(
  name: string,
  page: number = 1,
  perPage: number = 10
): Promise<EntrepriseSearchResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(name)}&page=${page}&per_page=${perPage}`
    )

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`)
    }

    const data: EntrepriseSearchResponse = await response.json()
    return data
  } catch (error) {
    console.error('Erreur lors de la recherche d\'entreprise par nom:', error)
    throw error
  }
}

/**
 * Recherche des entreprises par nom et prénom d'un dirigeant
 */
export async function searchEntrepriseByDirigeant(
  nom: string,
  prenoms?: string,
  page: number = 1,
  perPage: number = 10
): Promise<EntrepriseSearchResponse> {
  try {
    // Construire les paramètres de recherche
    const params = new URLSearchParams({
      nom_personne: nom,
      type_personne: 'dirigeant',
      page: page.toString(),
      per_page: perPage.toString()
    })

    // Ajouter le prénom si fourni
    if (prenoms && prenoms.trim() !== '') {
      params.append('prenoms_personne', prenoms)
    }

    const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`)
    }

    const data: EntrepriseSearchResponse = await response.json()
    return data
  } catch (error) {
    console.error('Erreur lors de la recherche d\'entreprise par dirigeant:', error)
    throw error
  }
}

/**
 * Vérifie si une entreprise est un holding (code activité 64.20Z ou nature juridique holding)
 */
export function isHolding(entreprise: EntrepriseApiResult): boolean {
  return (
    entreprise.activite_principale?.startsWith('64.20') ||
    entreprise.nature_juridique === '5308'
  )
}

/**
 * Recherche les filiales d'une société mère (PM) en utilisant q=<nom>
 * puis en filtrant par SIREN exact dans les dirigeants PM.
 * Pagine jusqu'à maxPages pour trouver toutes les filiales.
 */
export async function searchFilialesByPM(
  denomination: string,
  sirenPM: string,
  maxPages: number = 3
): Promise<EntrepriseApiResult[]> {
  const filiales: EntrepriseApiResult[] = []
  const seenSirens = new Set<string>()

  for (let page = 1; page <= maxPages; page++) {
    try {
      const params = new URLSearchParams({
        q: denomination,
        page: page.toString(),
        per_page: '25'
      })

      const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`)
      if (!response.ok) break

      const data: EntrepriseSearchResponse = await response.json()
      if (data.results.length === 0) break

      // Filtrer : garder uniquement les sociétés où cette PM est dirigeant
      for (const result of data.results) {
        if (result.siren === sirenPM) continue // Exclure la PM elle-même
        if (seenSirens.has(result.siren)) continue

        const hasPM = result.dirigeants?.some(d =>
          d.type_dirigeant === 'personne morale' && d.siren === sirenPM
        )
        if (hasPM) {
          filiales.push(result)
          seenSirens.add(result.siren)
        }
      }

      // Si on a déjà trouvé des filiales sur la 1ère page ou qu'il n'y a plus de pages
      if (page >= data.total_pages) break
    } catch (error) {
      console.error(`Erreur recherche filiales page ${page} pour ${denomination}:`, error)
      break
    }
  }

  return filiales
}

/**
 * Mapper les données de l'API vers le format du formulaire SocieteFormV2
 */
export function mapEntrepriseToFormData(entreprise: EntrepriseApiResult) {
  // Mapper la nature juridique vers les types de société
  const mapNatureJuridiqueToType = (natureJuridique: string): string => {
    const code = natureJuridique

    // Codes INSEE pour les formes juridiques
    // Source: https://www.insee.fr/fr/information/2028129
    if (code === '5498') return 'SARL' // SARL unipersonnelle
    if (code === '5499') return 'SARL' // Société à responsabilité limitée (sans autre indication)
    if (code === '5710') return 'SAS' // SAS, société par actions simplifiée
    if (code === '5720') return 'SAS' // Société par actions simplifiée à associé unique ou société par actions simplifiée unipersonnelle
    if (code === '5505') return 'SA' // SA à conseil d'administration (s.a.i.)
    if (code === '5510') return 'SA' // SA à conseil d'administration
    if (code === '5542') return 'EURL' // EURL
    if (code === '6540') return 'SCI' // SCI
    if (code === '5308') return 'HOLDING' // Société européenne

    // Par défaut
    return 'AUTRE'
  }

  return {
    type: mapNatureJuridiqueToType(entreprise.nature_juridique),
    denominationSociale: entreprise.nom_raison_sociale || entreprise.nom_complet,
    siret: entreprise.siege.siret,
    siren: entreprise.siren,
    adresse: entreprise.siege.adresse,
    telephone: '',
    email: '',
    dateCreation: entreprise.date_creation,
    capitalSocial: 0,
    banquePrincipale: '',
    activitePrincipale: entreprise.activite_principale,
    codePostal: entreprise.siege.code_postal || '',
    commune: entreprise.siege.libelle_commune,
    latitude: entreprise.siege.latitude,
    longitude: entreprise.siege.longitude,
    etatAdministratif: entreprise.etat_administratif,
    trancheEffectif: entreprise.tranche_effectif_salarie,
    categorieEntreprise: entreprise.categorie_entreprise,
    dirigeants: entreprise.dirigeants || []
  }
}

/**
 * Convertir la forme juridique de l'API vers notre TypeStructure
 */
export function mapFormeJuridiqueToType(formeJuridique: string): TypeStructure {
  // D'abord, vérifier si c'est un code numérique INSEE
  // Documentation: https://www.insee.fr/fr/information/2028129
  const codeMapping: Record<string, TypeStructure> = {
    // SCI et sociétés civiles
    '6540': 'SCI', // Société civile immobilière
    '6541': 'SCI', // Société civile immobilière de construction-vente
    '6542': 'SCI', // Société civile d'attribution
    '6543': 'SCI', // Société civile coopérative de construction
    '6544': 'SCI', // Société civile immobilière d'accession progressive à la propriété
    '6551': 'SCI', // Société civile coopérative de consommation
    '6554': 'SCI', // Société civile de placement immobilier (SCPI)
    '6558': 'SCI', // Société civile immobilière avec conseils d'administration
    '6560': 'SCI', // Société civile de moyens
    '6595': 'SCI', // Caisse locale de crédit mutuel
    '6596': 'SCI', // Caisse de crédit agricole mutuel
    '6597': 'SCI', // Société civile d'exploitation agricole
    '6598': 'SCI', // Exploitation agricole à responsabilité limitée
    '6599': 'SCI', // Autre société civile
    // SARL
    '5498': 'SARL', // SARL nationale
    '5499': 'SARL', // SARL coopérative
    '5505': 'SARL', // SARL d'économie mixte
    // SAS
    '5710': 'SAS', // SAS, société par actions simplifiée
    '5785': 'SAS', // Société d'exercice libéral par actions simplifiée
    // SASU
    '5720': 'SASU', // SASU, société par actions simplifiée unipersonnelle
    // SA
    '5599': 'SA', // SA à conseil d'administration
    '5505': 'SA', // SA d'économie mixte à conseil d'administration
    '5510': 'SA', // SA à directoire
    // SNC
    '5202': 'SNC', // Société en nom collectif
    '5203': 'SNC', // Société en nom collectif coopérative
    // Auto-entrepreneur / Micro-entreprise
    '1000': 'MICRO_ENTREPRISE',
    // Entreprise individuelle
    '1000': 'ENTREPRISE_INDIVIDUELLE',
  }

  // Si c'est un code numérique, le mapper directement
  if (codeMapping[formeJuridique]) {
    return codeMapping[formeJuridique]
  }

  // Sinon, utiliser le mapping textuel (pour les anciennes données)
  const normalized = normalizeString(formeJuridique)

  // SCI
  if (normalized.includes('sci') || normalized.includes('societeciviledimmeubles')) {
    return 'SCI'
  }

  // SARL
  if (normalized.includes('sarl') || normalized.includes('societearesponsa')) {
    return 'SARL'
  }

  // SAS
  if (normalized.includes('sas') && !normalized.includes('sasu')) {
    return 'SAS'
  }

  // SASU
  if (normalized.includes('sasu')) {
    return 'SASU'
  }

  // EURL
  if (normalized.includes('eurl')) {
    return 'EURL'
  }

  // SA
  if (normalized.includes('societeanonyme') || (normalized.includes('sa') && !normalized.includes('sas') && !normalized.includes('sarl'))) {
    return 'SA'
  }

  // SNC
  if (normalized.includes('snc') || normalized.includes('societeennom')) {
    return 'SNC'
  }

  // Micro-entreprise / Auto-entrepreneur
  if (normalized.includes('micro') || normalized.includes('auto')) {
    return 'MICRO_ENTREPRISE'
  }

  // Entreprise individuelle
  if (normalized.includes('ei') || normalized.includes('entrepriseindividuelle')) {
    return 'ENTREPRISE_INDIVIDUELLE'
  }

  // Par défaut, SAS
  console.warn(`⚠️ Forme juridique inconnue: "${formeJuridique}" - type par défaut: SAS`)
  return 'SAS'
}

/**
 * Normaliser une chaîne pour la comparaison (minuscules, sans accents, sans espaces)
 * Gère tous les caractères accentués et spéciaux (ï → i, é → e, etc.)
 */
function normalizeString(str: string): string {
  if (!str) return ''

  return str
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[œ]/g, 'oe') // Gère les ligatures
    .replace(/[æ]/g, 'ae')
    .replace(/\s+/g, '') // Supprime les espaces
    .replace(/[-_]/g, '') // Supprime les tirets et underscores
    .trim()
}

/**
 * Normaliser une date pour la comparaison
 * Accepte plusieurs formats: YYYY-MM-DD, DD/MM/YYYY, YYYY-MM (partiel), ISO datetime, etc.
 */
function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null

  // Nettoyer la chaîne
  const cleaned = dateStr.trim().replace(/\s+/g, '')

  // Essayer différents formats
  let date: Date | null = null

  // Format ISO datetime (YYYY-MM-DDTHH:mm:ss.sssZ) - retourné par la base de données
  if (/^\d{4}-\d{2}-\d{2}T/.test(cleaned)) {
    // IMPORTANT: Parser en tant que Date pour gérer le timezone correctement
    // Ex: "1997-11-30T23:00:00.000Z" (UTC) = "1997-12-01" en heure locale (Europe/Paris)
    const date = new Date(cleaned)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  // Format ISO complet (YYYY-MM-DD)
  else if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    date = new Date(cleaned)
  }
  // Format ISO partiel (YYYY-MM) - utilisé par l'API pour certaines dates
  else if (/^\d{4}-\d{2}$/.test(cleaned)) {
    // Normaliser en YYYY-MM-01 pour permettre la comparaison
    return `${cleaned}-01`
  }
  // Format année seule (YYYY)
  else if (/^\d{4}$/.test(cleaned)) {
    // Normaliser en YYYY-01-01 pour permettre la comparaison
    return `${cleaned}-01-01`
  }
  // Format français (DD/MM/YYYY)
  else if (/^\d{2}\/\d{2}\/\d{4}/.test(cleaned)) {
    const [day, month, year] = cleaned.split('/')
    date = new Date(`${year}-${month}-${day}`)
  }
  // Format court (DDMMYYYY)
  else if (/^\d{8}$/.test(cleaned)) {
    const day = cleaned.substring(0, 2)
    const month = cleaned.substring(2, 4)
    const year = cleaned.substring(4, 8)
    date = new Date(`${year}-${month}-${day}`)
  }

  if (date && !isNaN(date.getTime())) {
    // Retourner au format ISO (YYYY-MM-DD)
    return date.toISOString().split('T')[0]
  }

  return null
}

/**
 * Vérifier si une Personne Physique existe déjà dans les structures
 * Utilise le nom, prénom et optionnellement la date de naissance pour détecter les doublons
 */
export function findExistingPersonnePhysique(
  structures: any[],
  nom: string,
  prenom: string,
  dateNaissance?: string
): any | null {
  const normalizedNom = normalizeString(nom)
  const normalizedPrenom = normalizeString(prenom)
  const normalizedDateNaissance = normalizeDate(dateNaissance)

  console.log(`🔎 Recherche PP: "${prenom}" "${nom}" (normalisé: "${normalizedPrenom}" "${normalizedNom}")`)
  console.log(`   Date: ${dateNaissance} → ${normalizedDateNaissance}`)

  const found = structures.find(structure => {
    if (structure.type !== 'PERSONNE_PHYSIQUE') return false

    const structureNom = normalizeString(structure.nom || '')
    const structurePrenom = normalizeString(structure.personnePhysique?.prenom || '')

    // Comparaison nom + prénom
    const namesMatch = structureNom === normalizedNom && structurePrenom === normalizedPrenom

    if (namesMatch) {
      console.log(`   📌 Candidat trouvé: "${structure.personnePhysique?.prenom}" "${structure.nom}" (normalisé: "${structurePrenom}" "${structureNom}")`)
      console.log(`      Date candidat: ${structure.personnePhysique?.dateNaissance}`)
    }

    // Si on n'a pas de date de naissance à comparer, on s'arrête là
    if (!normalizedDateNaissance || !structure.personnePhysique?.dateNaissance) {
      if (namesMatch) {
        console.log(`      → Match sans date de naissance`)
      }
      return namesMatch
    }

    // Si on a les deux dates, on les compare aussi
    const structureDateNaissance = normalizeDate(structure.personnePhysique.dateNaissance)

    // Pour les dates partielles (YYYY-MM de l'API), comparer seulement année-mois
    // car le timezone peut décaler le jour (1997-12-01 → 1997-11-30T23:00:00.000Z)
    let datesMatch = false
    if (structureDateNaissance && normalizedDateNaissance) {
      // Extraire année-mois des deux dates
      const yearMonthStructure = structureDateNaissance.substring(0, 7) // "1997-11"
      const yearMonthNormalized = normalizedDateNaissance.substring(0, 7) // "1997-12"
      datesMatch = yearMonthStructure === yearMonthNormalized

      if (namesMatch) {
        console.log(`      → Dates: ${structureDateNaissance} vs ${normalizedDateNaissance}`)
        console.log(`      → Comparaison année-mois: ${yearMonthStructure} === ${yearMonthNormalized} ? ${datesMatch}`)
      }
    }

    // C'est un doublon si nom+prénom ET date de naissance correspondent
    return namesMatch && datesMatch
  })

  if (found) {
    console.log(`   ✅ PP existant trouvé: ${found.id}`)
  } else {
    console.log(`   ❌ Aucun PP existant trouvé`)
  }

  return found || null
}

/**
 * Vérifier si une Personne Morale existe déjà dans les structures
 */
export function findExistingPersonneMorale(
  structures: any[],
  siren?: string,
  denomination?: string
): any | null {
  // Priorité au SIREN (identifiant unique)
  if (siren) {
    const bySiren = structures.find(structure => {
      if (structure.type === 'PERSONNE_PHYSIQUE') return false
      return structure.personneMorale?.siren === siren
    })
    if (bySiren) return bySiren
  }

  // Sinon, recherche par dénomination normalisée
  if (denomination) {
    const normalizedDenom = normalizeString(denomination)
    return structures.find(structure => {
      if (structure.type === 'PERSONNE_PHYSIQUE') return false
      const structureDenom = normalizeString(structure.nom || '')
      return structureDenom === normalizedDenom
    }) || null
  }

  return null
}

/**
 * Normaliser une date de naissance pour PostgreSQL
 * Convertit les formats partiels (YYYY ou YYYY-MM) en format complet YYYY-MM-DD
 */
function normalizeDateNaissance(dateStr: string | null | undefined): string {
  console.log(`🗓️ normalizeDateNaissance appelée avec: "${dateStr}" (type: ${typeof dateStr})`)

  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
    console.log(`  ⚠️ Date vide ou null, retourne chaîne vide`)
    return ''
  }

  // Convertir en string au cas où ce serait un nombre
  const dateString = String(dateStr).trim()

  console.log(`  📝 Date après conversion en string: "${dateString}"`)

  // Si la date est déjà au format complet YYYY-MM-DD, la retourner telle quelle
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.log(`  ✅ Format complet YYYY-MM-DD détecté: ${dateString}`)
    return dateString
  }

  // Si la date est au format YYYY-MM, ajouter "-01" pour le jour
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    const normalized = `${dateString}-01`
    console.log(`  ✅ Format YYYY-MM détecté, normalisé en: ${normalized}`)
    return normalized
  }

  // Si la date est au format YYYY seulement, ajouter "-01-01"
  if (/^\d{4}$/.test(dateString)) {
    const normalized = `${dateString}-01-01`
    console.log(`  ✅ Format YYYY détecté, normalisé en: ${normalized}`)
    return normalized
  }

  // Si le format n'est pas reconnu, retourner une chaîne vide
  console.warn(`  ⚠️ Format de date non reconnu: "${dateString}" - retourne chaîne vide`)
  return ''
}

/**
 * Créer une structure Personne Physique à partir d'un dirigeant
 */
export function createStructureFromDirigeantPP(dirigeant: any) {
  console.log('🔧 createStructureFromDirigeantPP appelée pour:', dirigeant.prenoms, dirigeant.nom)
  console.log('  📅 Date brute reçue:', dirigeant.date_de_naissance)

  const dateNormalisee = normalizeDateNaissance(dirigeant.date_de_naissance || '')
  console.log('  ✅ Date normalisée:', dateNormalisee)

  return {
    type: 'PERSONNE_PHYSIQUE',
    nom: dirigeant.nom || '',
    adresse: 'Non renseignée',
    telephone: '',
    email: '',
    personnePhysique: {
      prenom: dirigeant.prenoms || '',
      dateNaissance: dateNormalisee,
      lieuNaissance: 'Non renseigné',  // Obligatoire en base de données
      nationalite: dirigeant.nationalite || 'Française',
      statutProfessionnel: 'Dirigeant', // Obligatoire en base de données
      situationFamiliale: 'Celibataire',  // SANS accent - cf contrainte DB
      regimeMatrimonial: '',
      nombreEnfants: 0,
      situationsProfessionnelles: [],
      revenus: [],
      charges: [],
      patrimoine: {
        biensImmobiliers: [],
        vehicules: [],
        comptesEpargne: [],
        assurancesVie: [],
        valeursMonetaires: []
      },
      credits: []
    }
  }
}

/**
 * Créer une structure Personne Morale à partir d'un dirigeant PM
 * Peut accepter les données complètes de l'entreprise pour enrichir les informations
 */
export function createStructureFromDirigeantPM(dirigeant: any, entrepriseCompleteData?: EntrepriseApiResult) {
  // Si on a les données complètes de l'entreprise, on les utilise
  if (entrepriseCompleteData) {
    return {
      type: 'SAS', // Type par défaut
      nom: entrepriseCompleteData.nom_raison_sociale || entrepriseCompleteData.nom_complet,
      adresse: entrepriseCompleteData.siege?.adresse || '',
      telephone: '',
      email: '',
      personneMorale: {
        denominationSociale: entrepriseCompleteData.nom_raison_sociale || entrepriseCompleteData.nom_complet,
        siret: entrepriseCompleteData.siege?.siret || '',
        siren: entrepriseCompleteData.siren || '',
        formeJuridique: entrepriseCompleteData.nature_juridique || '',
        dateCreation: entrepriseCompleteData.date_creation || '',
        capitalSocial: 0,
        nombreParts: 0,
        activitePrincipale: entrepriseCompleteData.activite_principale || '',
        objetSocial: entrepriseCompleteData.activite_principale || '',
        adresseSiegeSocial: entrepriseCompleteData.siege?.adresse || '',
        banquePrincipale: '',
        associes: [],
        patrimoine: {
          biensImmobiliers: [],
          comptesEpargne: [],
          valeursMonetaires: []
        },
        credits: []
      }
    }
  }

  // Sinon, structure basique avec les données du dirigeant uniquement
  return {
    type: 'SAS',
    nom: dirigeant.denomination || '',
    adresse: 'Non renseignée',
    telephone: '',
    email: '',
    personneMorale: {
      denominationSociale: dirigeant.denomination || '',
      siret: dirigeant.siren ? `${dirigeant.siren}00000` : '',
      siren: dirigeant.siren || '',
      formeJuridique: '',
      dateCreation: '',
      capitalSocial: 0,
      nombreParts: 0,
      activitePrincipale: '',
      objetSocial: '',
      adresseSiegeSocial: '',
      banquePrincipale: '',
      associes: [],
      patrimoine: {
        biensImmobiliers: [],
        comptesEpargne: [],
        valeursMonetaires: []
      },
      credits: []
    }
  }
}

/**
 * Convertir les dirigeants de l'API en associés pour le formulaire
 * Cette fonction est maintenant utilisée pour lier les structures déjà créées
 */
export function mapDirigeantsToAssocies(dirigeants: EntrepriseApiResult['dirigeants'], createdStructures: Map<string, string>) {
  if (!dirigeants || dirigeants.length === 0) {
    return []
  }

  return dirigeants.map((dirigeant, index) => {
    const dirigeantKey = dirigeant.type_dirigeant === 'personne physique'
      ? `${dirigeant.nom}-${dirigeant.prenoms}`
      : dirigeant.siren || `pm-${index}`

    const structureId = createdStructures.get(dirigeantKey)

    // Personne Physique
    if (dirigeant.type_dirigeant === 'personne physique') {
      return {
        id: `associe-${Date.now()}-${index}`,
        type: 'PP' as const,
        structureId: structureId, // ID de la structure créée
        nom: dirigeant.nom || '',
        prenom: dirigeant.prenoms || '',
        fonction: dirigeant.qualite || 'Dirigeant',
        pourcentageParts: 0
      }
    }

    // Personne Morale
    return {
      id: `associe-${Date.now()}-${index}`,
      type: 'PM' as const,
      structureId: structureId, // ID de la structure créée
      nom: dirigeant.denomination || '',
      fonction: dirigeant.qualite || 'Société associée',
      pourcentageParts: 0
    }
  })
}
