import { WORK_ESTIMATION_PRICING, getElectricityForfait } from '@/config/workEstimationPricing';
import logger from '@/utils/logger';

export interface DetailedWorkEstimate {
  category: string;
  categoryName: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
  }[];
  subtotal: number;
  priority: 'Urgent' | 'Important' | 'Souhaitable';
}

export interface WorkCostEstimation {
  estimates: DetailedWorkEstimate[];
  totalCost: number;
  summary: string;
}

/**
 * Calculer les coûts détaillés des travaux basés sur l'analyse LLM et la grille tarifaire
 */
export function calculateDetailedWorkCosts(
  workCategories: string[],
  surface: number,
  rooms?: number,
  propertyType?: string,
  propertyState?: string
): WorkCostEstimation {
  const estimates: DetailedWorkEstimate[] = [];
  let totalCost = 0;

  // Mapper les catégories détectées par Claude aux catégories de notre grille tarifaire
  const categoryMapping: { [key: string]: string } = {
    'Façade': 'facade',
    'Toiture': 'toiture',
    'Gros œuvre': 'gros_oeuvre',
    'Gros oeuvre': 'gros_oeuvre',
    'Structure': 'gros_oeuvre',
    'Murs': 'murs_cloisons_plafonds',
    'Cloisons': 'murs_cloisons_plafonds',
    'Plafonds': 'murs_cloisons_plafonds',
    'Peinture': 'murs_cloisons_plafonds',
    'Sols': 'sols',
    'Carrelage': 'sols',
    'Parquet': 'sols',
    'Revêtement': 'sols',
    'Électricité': 'electricite',
    'Electrique': 'electricite',
    'Chauffage': 'chauffage',
    'Plomberie': 'plomberie',
    'Sanitaire': 'plomberie',
    'Salle de bain': 'salle_de_bain',
    'Salle d\'eau': 'salle_de_bain',
    'Cuisine': 'cuisine',
    'Menuiserie': 'menuiserie',
    'Fenêtres': 'menuiserie',
    'Portes': 'menuiserie',
    'Extérieur': 'exterieur',
    'Jardin': 'exterieur',
    'Terrasse': 'exterieur'
  };

  // Déterminer la priorité basée sur l'état du bien
  const getDefaultPriority = (category: string): 'Urgent' | 'Important' | 'Souhaitable' => {
    if (propertyState === 'A_Renover_Entierement') {
      if (['gros_oeuvre', 'toiture', 'electricite', 'plomberie'].includes(category)) {
        return 'Urgent';
      }
      return 'Important';
    }
    if (propertyState === 'A_Renover') {
      if (['toiture', 'electricite'].includes(category)) {
        return 'Important';
      }
      return 'Souhaitable';
    }
    return 'Souhaitable';
  };

  // Pour chaque catégorie de travaux détectée
  workCategories.forEach(workCategory => {
    // Trouver la catégorie correspondante dans notre grille
    let matchedCategory = '';
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (workCategory.toLowerCase().includes(key.toLowerCase())) {
        matchedCategory = value;
        break;
      }
    }

    if (!matchedCategory || !WORK_ESTIMATION_PRICING[matchedCategory]) {
      logger.warn(`Catégorie de travaux non reconnue: ${workCategory}`);
      return;
    }

    const pricingCategory = WORK_ESTIMATION_PRICING[matchedCategory];
    const items: DetailedWorkEstimate['items'] = [];
    let subtotal = 0;

    // Cas spéciaux pour les forfaits
    if (matchedCategory === 'electricite' && rooms) {
      const forfait = getElectricityForfait(rooms);
      const itemName = rooms <= 2 ? 'Forfait T2' : rooms === 3 ? 'Forfait T3' : 'Forfait T4';
      items.push({
        name: itemName,
        quantity: 1,
        unit: 'forfait',
        unitPrice: forfait,
        totalCost: forfait
      });
      subtotal = forfait;
    } else if (matchedCategory === 'salle_de_bain') {
      // Estimation du nombre de salles de bain selon le nombre de pièces
      const nbSallesDeBain = rooms ? Math.max(1, Math.floor(rooms / 2)) : 1;
      const unitPrice = 6000;
      items.push({
        name: 'Salle de bain complète',
        quantity: nbSallesDeBain,
        unit: 'unité',
        unitPrice: unitPrice,
        totalCost: unitPrice * nbSallesDeBain
      });
      subtotal = unitPrice * nbSallesDeBain;
    } else if (matchedCategory === 'cuisine') {
      items.push({
        name: 'Forfait cuisine',
        quantity: 1,
        unit: 'forfait',
        unitPrice: 5000,
        totalCost: 5000
      });
      subtotal = 5000;
    } else if (matchedCategory === 'menuiserie') {
      // Estimation du nombre de fenêtres et portes
      const nbFenetres = rooms ? Math.max(2, rooms) : 3;
      const nbPortes = rooms ? Math.max(1, Math.floor(rooms / 2)) : 1;

      items.push({
        name: 'Forfait fenêtres',
        quantity: nbFenetres,
        unit: 'unité',
        unitPrice: 1200,
        totalCost: 1200 * nbFenetres
      });

      items.push({
        name: 'Forfait portes',
        quantity: nbPortes,
        unit: 'unité',
        unitPrice: 3000,
        totalCost: 3000 * nbPortes
      });

      subtotal = (1200 * nbFenetres) + (3000 * nbPortes);
    } else {
      // Pour les autres catégories, calculer un forfait global basé sur la surface
      // Ne pas détailler chaque item (prises, interrupteurs, etc.)
      let totalCategoryPrice = 0;

      Object.entries(pricingCategory.items).forEach(([itemName, priceRange]) => {
        let itemCost = 0;
        const avgPrice = (priceRange.min + priceRange.max) / 2;

        switch (priceRange.unit) {
          case 'per_m2':
            itemCost = surface * avgPrice;
            break;
          case 'per_linear_meter':
            // Estimation du périmètre
            const perimeter = Math.sqrt(surface) * 4;
            itemCost = perimeter * avgPrice;
            break;
          case 'per_unit':
            itemCost = avgPrice;
            break;
          case 'forfait':
            itemCost = avgPrice;
            break;
        }

        totalCategoryPrice += itemCost;
      });

      // Ajouter un seul item forfait pour toute la catégorie
      items.push({
        name: `Forfait ${pricingCategory.name}`,
        quantity: 1,
        unit: 'forfait',
        unitPrice: Math.round(totalCategoryPrice * 100) / 100,
        totalCost: Math.round(totalCategoryPrice * 100) / 100
      });
      subtotal = totalCategoryPrice;
    }

    if (items.length > 0) {
      estimates.push({
        category: matchedCategory,
        categoryName: pricingCategory.name,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        priority: getDefaultPriority(matchedCategory)
      });
      totalCost += subtotal;
    }
  });

  // Générer un résumé
  const summary = estimates.length > 0
    ? `Estimation détaillée basée sur ${estimates.length} catégorie(s) de travaux pour une surface de ${surface}m²${rooms ? ` (${rooms} pièces)` : ''}.`
    : 'Aucun travaux estimé.';

  return {
    estimates,
    totalCost: Math.round(totalCost * 100) / 100,
    summary
  };
}

/**
 * Extraire les catégories de travaux depuis l'analyse LLM
 */
export function extractWorkCategories(workNeeded?: string[]): string[] {
  if (!workNeeded || workNeeded.length === 0) {
    return [];
  }

  const categories = new Set<string>();

  workNeeded.forEach(work => {
    const workLower = work.toLowerCase();

    // Mapper les descriptions aux catégories
    if (workLower.includes('façade') || workLower.includes('facade')) categories.add('Façade');
    if (workLower.includes('toiture') || workLower.includes('toit')) categories.add('Toiture');
    if (workLower.includes('structure') || workLower.includes('gros œuvre') || workLower.includes('gros oeuvre')) categories.add('Gros œuvre');
    if (workLower.includes('mur') || workLower.includes('cloison') || workLower.includes('plafond') || workLower.includes('peinture')) categories.add('Murs');
    if (workLower.includes('sol') || workLower.includes('carrelage') || workLower.includes('parquet')) categories.add('Sols');
    if (workLower.includes('électri') || workLower.includes('electri')) categories.add('Électricité');
    if (workLower.includes('chauffage') || workLower.includes('radiateur')) categories.add('Chauffage');
    if (workLower.includes('plomberie') || workLower.includes('sanitaire') || workLower.includes('eau')) categories.add('Plomberie');
    if (workLower.includes('salle de bain') || workLower.includes('salle d\'eau') || workLower.includes('douche')) categories.add('Salle de bain');
    if (workLower.includes('cuisine')) categories.add('Cuisine');
    if (workLower.includes('menuiserie') || workLower.includes('fenêtre') || workLower.includes('porte')) categories.add('Menuiserie');
    if (workLower.includes('extérieur') || workLower.includes('jardin') || workLower.includes('terrasse')) categories.add('Extérieur');
  });

  return Array.from(categories);
}

export default {
  calculateDetailedWorkCosts,
  extractWorkCategories
};
