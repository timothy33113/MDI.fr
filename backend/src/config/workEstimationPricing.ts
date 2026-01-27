/**
 * Barème des coûts de travaux par corps d'état
 * Prix en euros
 */

export interface PriceRange {
  min: number;
  max: number;
  unit: 'per_m2' | 'per_unit' | 'per_linear_meter' | 'forfait';
}

export interface WorkCategory {
  name: string;
  items: {
    [key: string]: PriceRange;
  };
}

export const WORK_ESTIMATION_PRICING: { [category: string]: WorkCategory } = {
  facade: {
    name: 'Façade',
    items: {
      'Peinture et reprise légère': { min: 20, max: 40, unit: 'per_m2' },
      'Enduit simple': { min: 40, max: 60, unit: 'per_m2' },
      'Reprise lourde des murs': { min: 70, max: 120, unit: 'per_m2' },
      'Échafaudage': { min: 300, max: 5000, unit: 'forfait' },
    },
  },

  toiture: {
    name: 'Toiture',
    items: {
      'Charpente': { min: 50, max: 150, unit: 'per_m2' },
      'Couverture': { min: 80, max: 120, unit: 'per_m2' },
      'Gouttière': { min: 30, max: 65, unit: 'per_linear_meter' },
      'Démoussage': { min: 8, max: 15, unit: 'per_m2' },
      'Isolation toiture': { min: 30, max: 30, unit: 'per_m2' }, // 30€/m² comme spécifié
    },
  },

  gros_oeuvre: {
    name: 'Gros Œuvre',
    items: {
      'Montage mur parpaing': { min: 50, max: 80, unit: 'per_m2' },
      'Traitement anti-humidité': { min: 3000, max: 5000, unit: 'forfait' },
      'Ouverture mur porteur': { min: 800, max: 2500, unit: 'per_unit' },
      'Création dalle béton': { min: 45, max: 55, unit: 'per_m2' },
      'Création plancher béton': { min: 90, max: 120, unit: 'per_m2' },
      'Surélévation': { min: 1000, max: 2500, unit: 'per_m2' },
      'Terrassement': { min: 10, max: 15, unit: 'per_m2' },
    },
  },

  murs_cloisons_plafonds: {
    name: 'Murs / Cloisons / Plafonds',
    items: {
      'Isolation + BA13': { min: 40, max: 80, unit: 'per_m2' },
      'Isolation combles': { min: 20, max: 35, unit: 'per_m2' },
      'Création cloison': { min: 40, max: 65, unit: 'per_m2' },
      'Porte intérieure': { min: 90, max: 250, unit: 'per_unit' },
      'Faux plafond BA13 + isolation': { min: 40, max: 55, unit: 'per_m2' },
      'Faux plafond BA13': { min: 30, max: 35, unit: 'per_m2' },
      'Dalle plafond local commercial': { min: 45, max: 90, unit: 'per_m2' },
      'Dépose et évacuation': { min: 20, max: 40, unit: 'per_m2' },
      'Peinture': { min: 13, max: 20, unit: 'per_m2' },
      'Peinture + lessivage': { min: 14, max: 23, unit: 'per_m2' },
      'Peinture + enduit': { min: 18, max: 30, unit: 'per_m2' },
      'Détapisser': { min: 8, max: 10, unit: 'per_m2' },
      'Toile de verre / tapisserie': { min: 15, max: 25, unit: 'per_m2' },
      'Faïence': { min: 35, max: 65, unit: 'per_m2' },
      'ITE Extérieur': { min: 70, max: 90, unit: 'per_m2' },
    },
  },

  sols: {
    name: 'Sols',
    items: {
      'Ragréage / chape': { min: 10, max: 30, unit: 'per_m2' },
      'Pose carrelage': { min: 45, max: 95, unit: 'per_m2' },
      'Pose parquet stratifié': { min: 35, max: 50, unit: 'per_m2' },
      'Pose parquet massif': { min: 80, max: 120, unit: 'per_m2' },
      'Pose lino': { min: 15, max: 25, unit: 'per_m2' },
      'Pose moquette': { min: 17, max: 30, unit: 'per_m2' },
      'Pose sol PVC': { min: 30, max: 70, unit: 'per_m2' },
      'Dépose carrelage': { min: 10, max: 20, unit: 'per_m2' },
      'Dépose revêtement': { min: 5, max: 20, unit: 'per_m2' },
    },
  },

  electricite: {
    name: 'Électricité',
    items: {
      'Colonne montante': { min: 800, max: 1200, unit: 'per_unit' },
      'Prise de courant': { min: 40, max: 90, unit: 'per_unit' },
      'Installation VMC': { min: 250, max: 600, unit: 'per_unit' },
      'Alimentation sèche-serviette': { min: 40, max: 90, unit: 'per_unit' },
      'Point lumineux': { min: 50, max: 90, unit: 'per_unit' },
      'Tableau électrique': { min: 500, max: 1500, unit: 'per_unit' },
      'Disjoncteur': { min: 45, max: 70, unit: 'per_unit' },
      'Différentiel 30mA': { min: 90, max: 120, unit: 'per_unit' },
      'Climatisation': { min: 2800, max: 5000, unit: 'per_unit' },
      'Installation complète': { min: 50, max: 90, unit: 'per_m2' },
      'Compteur EDF': { min: 1000, max: 3000, unit: 'per_unit' },
      'Forfait T2': { min: 5000, max: 5000, unit: 'forfait' },
      'Forfait T3': { min: 6000, max: 6000, unit: 'forfait' },
      'Forfait T4': { min: 7000, max: 7000, unit: 'forfait' },
    },
  },

  chauffage: {
    name: 'Chauffage',
    items: {
      // Électrique
      'Radiateur électrique': { min: 350, max: 800, unit: 'per_unit' },
      // Gaz
      'Chaudière gaz simple': { min: 1500, max: 2000, unit: 'per_unit' },
      'Chaudière gaz condensation': { min: 3500, max: 5000, unit: 'per_unit' },
      'Radiateur à eau': { min: 500, max: 900, unit: 'per_unit' },
      // Bois
      'Poêle à granulés': { min: 3000, max: 6000, unit: 'per_unit' },
      'Cheminée insert': { min: 1500, max: 5000, unit: 'per_unit' },
      'Chaudière bois': { min: 3000, max: 7000, unit: 'per_unit' },
      // Fioul
      'Chaudière fioul': { min: 3000, max: 7000, unit: 'per_unit' },
    },
  },

  plomberie: {
    name: 'Plomberie',
    items: {
      'Chauffe-eau': { min: 500, max: 900, unit: 'per_unit' },
      'Tube cuivre': { min: 20, max: 40, unit: 'per_linear_meter' },
      'Tube PER': { min: 15, max: 30, unit: 'per_linear_meter' },
      'Tuyau PVC évacuation': { min: 20, max: 30, unit: 'per_linear_meter' },
      'Cabine douche intégrale': { min: 650, max: 1200, unit: 'per_unit' },
      'Receveur + paroi + robinetterie': { min: 700, max: 1500, unit: 'per_unit' },
      'Baignoire': { min: 500, max: 1200, unit: 'per_unit' },
      'Meuble SDB': { min: 300, max: 800, unit: 'per_unit' },
      'WC': { min: 180, max: 350, unit: 'per_unit' },
      'WC suspendu': { min: 450, max: 850, unit: 'per_unit' },
      'Compteur gaz': { min: 1850, max: 3500, unit: 'per_unit' },
      'Compteur eau': { min: 900, max: 3500, unit: 'per_unit' },
      'Forfait plomberie': { min: 4000, max: 6000, unit: 'forfait' },
    },
  },

  salle_de_bain: {
    name: 'Salle de Bain',
    items: {
      'Salle de bain complète': { min: 6000, max: 6000, unit: 'per_unit' },
    },
  },

  cuisine: {
    name: 'Cuisine',
    items: {
      'Kitchenette': { min: 2000, max: 3000, unit: 'per_unit' },
      'Cuisine équipée': { min: 6000, max: 10000, unit: 'per_unit' },
      'Forfait cuisine': { min: 5000, max: 5000, unit: 'forfait' },
    },
  },

  menuiserie: {
    name: 'Menuiserie',
    items: {
      'Porte d\'entrée': { min: 800, max: 1800, unit: 'per_unit' },
      'Fenêtre bois': { min: 850, max: 1200, unit: 'per_unit' },
      'Fenêtre PVC': { min: 600, max: 900, unit: 'per_unit' },
      'Fenêtre aluminium': { min: 850, max: 1500, unit: 'per_unit' },
      'Porte-fenêtre': { min: 800, max: 1500, unit: 'per_unit' },
      'Baie vitrée': { min: 1500, max: 2500, unit: 'per_unit' },
      'Velux': { min: 800, max: 1800, unit: 'per_unit' },
      'Escalier': { min: 500, max: 2000, unit: 'per_unit' },
      'Porte garage': { min: 800, max: 1500, unit: 'per_unit' },
      'Portail': { min: 700, max: 2000, unit: 'per_unit' },
      'Forfait fenêtres': { min: 1200, max: 1200, unit: 'per_unit' },
      'Forfait portes': { min: 3000, max: 3000, unit: 'per_unit' },
    },
  },

  exterieur: {
    name: 'Extérieur',
    items: {
      'Piscine': { min: 18000, max: 22000, unit: 'per_unit' },
      'Contour piscine + terrasse': { min: 80, max: 110, unit: 'per_m2' },
      'Clôture': { min: 50, max: 115, unit: 'per_linear_meter' },
      'Terrassement pavé/goudron': { min: 25, max: 50, unit: 'per_m2' },
      'Pergola': { min: 500, max: 1000, unit: 'per_unit' },
      'Arbres paysagés': { min: 1500, max: 2000, unit: 'forfait' },
    },
  },
};

/**
 * Calculer le prix moyen d'un item
 */
export function calculateAveragePrice(priceRange: PriceRange): number {
  return (priceRange.min + priceRange.max) / 2;
}

/**
 * Obtenir le forfait électricité selon le type de logement
 */
export function getElectricityForfait(roomCount: number): number {
  if (roomCount <= 2) return 5000; // T2
  if (roomCount === 3) return 6000; // T3
  if (roomCount >= 4) return 7000; // T4+
  return 5000; // Par défaut
}
