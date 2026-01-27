/**
 * Utilitaire pour obtenir le libellé d'un code APE/NAF
 */

// Mapping des codes APE les plus courants
const APE_CODE_LABELS: Record<string, string> = {
  '70.22Z': 'Conseil pour les affaires et autres conseils de gestion',
  '68.20A': 'Location de logements',
  '68.20B': 'Location de terrains et d\'autres biens immobiliers',
  '68.10Z': 'Activités des marchands de biens immobiliers',
  '68.31Z': 'Agences immobilières',
  '68.32A': 'Administration d\'immeubles et autres biens immobiliers',
  '41.10A': 'Promotion immobilière de logements',
  '41.10B': 'Promotion immobilière de bureaux',
  '41.10C': 'Promotion immobilière d\'autres bâtiments',
  '41.10D': 'Supports juridiques de programmes',
  '64.20Z': 'Activités des sociétés holding',
  '64.99Z': 'Autres activités des services financiers',
  '69.20Z': 'Activités comptables',
  '70.10Z': 'Activités des sièges sociaux',
  '70.21Z': 'Conseil en relations publiques et communication',
  '62.01Z': 'Programmation informatique',
  '62.02A': 'Conseil en systèmes et logiciels informatiques',
  '73.11Z': 'Activités des agences de publicité',
  '82.99Z': 'Autres activités de soutien aux entreprises',
  '66.19B': 'Autres activités auxiliaires de services financiers',
  '66.30Z': 'Gestion de fonds',
}

/**
 * Obtenir le libellé complet d'un code APE
 * @param codeApe - Le code APE (ex: "70.22Z")
 * @returns Le libellé du code APE ou le code lui-même si non trouvé
 */
export function getApeLabel(codeApe: string | undefined | null): string {
  if (!codeApe) return ''

  // Normaliser le code APE (supprimer les espaces, mettre en majuscules)
  const normalizedCode = codeApe.trim().toUpperCase()

  // Retourner le libellé s'il existe, sinon retourner le code
  return APE_CODE_LABELS[normalizedCode] || `Code APE: ${normalizedCode}`
}

/**
 * Obtenir le libellé court (première partie avant le tiret ou parenthèse)
 * @param codeApe - Le code APE
 * @returns Le libellé court
 */
export function getApeShortLabel(codeApe: string | undefined | null): string {
  const fullLabel = getApeLabel(codeApe)

  // Extraire la partie avant le tiret ou la parenthèse
  const match = fullLabel.match(/^([^-(]+)/)
  return match ? match[1].trim() : fullLabel
}
