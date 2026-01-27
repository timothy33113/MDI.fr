import { Credit } from './types'

/**
 * Calcule la mensualité d'un crédit amortissable
 */
export function calculerMensualite(
  capital: number,
  tauxAnnuel: number,
  nombreMois: number
): number {
  if (capital <= 0 || nombreMois <= 0 || tauxAnnuel <= 0) {
    return 0
  }

  const tauxMensuel = tauxAnnuel / 100 / 12
  const mensualite = capital * (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMois)) /
                     (Math.pow(1 + tauxMensuel, nombreMois) - 1)

  return Math.round(mensualite * 100) / 100
}

/**
 * Calcule le capital restant dû à une date donnée
 */
export function calculerCapitalRestantDu(
  capital: number,
  tauxAnnuel: number,
  nombreMois: number,
  dateDebut: string
): number {
  if (capital <= 0 || nombreMois <= 0 || tauxAnnuel <= 0 || !dateDebut) {
    return capital
  }

  const tauxMensuel = tauxAnnuel / 100 / 12
  const debut = new Date(dateDebut)
  const aujourdhui = new Date()
  const moisEcoules = Math.max(0, Math.floor(
    (aujourdhui.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ))

  if (moisEcoules >= nombreMois) {
    return 0
  }

  const capitalRestant = capital *
    (Math.pow(1 + tauxMensuel, nombreMois) - Math.pow(1 + tauxMensuel, moisEcoules)) /
    (Math.pow(1 + tauxMensuel, nombreMois) - 1)

  return Math.round(capitalRestant * 100) / 100
}

/**
 * Met à jour un crédit avec les calculs automatiques
 */
export function updateCreditWithCalculations(credit: Credit): Credit {
  const updatedCredit = { ...credit }

  if (updatedCredit.montantInitial > 0 &&
      updatedCredit.nombreMois > 0 &&
      updatedCredit.tauxInteret > 0) {

    updatedCredit.mensualite = calculerMensualite(
      updatedCredit.montantInitial,
      updatedCredit.tauxInteret,
      updatedCredit.nombreMois
    )

    updatedCredit.capitalRestantDu = calculerCapitalRestantDu(
      updatedCredit.montantInitial,
      updatedCredit.tauxInteret,
      updatedCredit.nombreMois,
      updatedCredit.dateDebut
    )
  }

  return updatedCredit
}
