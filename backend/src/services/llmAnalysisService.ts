import axios from 'axios';
import logger from '@/utils/logger';

const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'] || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface PropertyUnit {
  type: 'Appartement' | 'Studio' | 'Maison' | 'Parking' | 'Cave' | 'Local_Commercial';
  surface: number;
  rooms?: number;
  floor?: number;
  estimatedRent?: number;
  features?: string[];
  currentlyRented?: boolean;
}

interface WorkEstimate {
  category: string;
  description: string;
  estimatedCost: number;
  priority: 'Urgent' | 'Important' | 'Souhaitable';
  details?: string;
}

interface PropertyAnalysis {
  propertyType: string;
  propertyState?: 'Neuf' | 'Bon' | 'A_Renover' | 'A_Renover_Entierement'; // État du bien
  reformulatedDescription?: string; // Description reformulée pour le champ description
  isMultiUnit: boolean; // Nouveau: détecte si c'est un immeuble
  units?: PropertyUnit[]; // Nouveau: détails de chaque logement
  estimatedRent?: number;
  workNeeded?: string[];
  estimatedWorkCost?: number;
  workEstimates?: WorkEstimate[]; // Nouveau: devis détaillés
  propertyFeatures?: string[];
  neighborhood?: string;
  proximities?: string[];
  advantages?: string[];
  disadvantages?: string[];
  investmentPotential?: 'Excellent' | 'Bon' | 'Moyen' | 'Faible';
  recommendations?: string[];
}

/**
 * Analyser une description d'annonce immobilière avec un LLM
 */
export async function analyzePropertyDescription(
  description: string,
  price: number,
  surface?: number,
  location?: string
): Promise<PropertyAnalysis> {
  try {
    if (!OPENROUTER_API_KEY) {
      logger.warn('Clé API OpenRouter non configurée, analyse LLM désactivée');
      return {
        propertyType: 'Appartement',
        isMultiUnit: false
      };
    }

    const prompt = `Tu es un expert en investissement immobilier. Analyse cette annonce immobilière et extrais des informations structurées TRÈS DÉTAILLÉES.

Annonce:
Prix: ${price.toLocaleString('fr-FR')} €
${surface ? `Surface totale: ${surface} m²` : ''}
${location ? `Localisation: ${location}` : ''}

Description originale:
${description}

INSTRUCTIONS IMPORTANTES:
1. REFORMULATION: Créer une version reformulée, professionnelle et concise (max 300 mots) de la description qui servira de description du projet d'investissement
2. TYPE DE BIEN: Sois TRÈS PRÉCIS sur le type (Appartement, Maison, Studio, Local Commercial, Immeuble, Parking, etc.) - base-toi sur les mots clés de la description
3. ÉTAT DU BIEN: Détermine précisément l'état parmi: "Neuf", "Bon", "A_Renover", "A_Renover_Entierement" en analysant les mots-clés (à créer, travaux nécessaires, rénové, etc.)
4. Si c'est un IMMEUBLE avec plusieurs logements, détecte-le et liste CHAQUE appartement/studio/local séparément
5. Pour les TRAVAUX, fournis des devis détaillés par catégorie (électricité, plomberie, peinture, etc.)
6. Estime les loyers de CHAQUE logement individuellement

Fournis une analyse détaillée au format JSON avec les champs suivants:
{
  "propertyType": "Type EXACT du bien - si c'est un local commercial, mets 'Local_Commercial', pas 'Appartement'",
  "propertyState": "Neuf|Bon|A_Renover|A_Renover_Entierement - analyse bien l'état mentionné dans la description",
  "reformulatedDescription": "Description reformulée professionnelle (max 300 mots) pour un dossier d'investissement",
  "isMultiUnit": true/false (true si immeuble avec plusieurs logements),
  "units": [
    // OBLIGATOIRE si isMultiUnit=true, liste de TOUS les logements détectés
    {
      "type": "Appartement/Studio/Parking/Cave/Local_Commercial",
      "surface": nombre en m²,
      "rooms": nombre de pièces (si applicable),
      "floor": étage (si mentionné),
      "estimatedRent": loyer mensuel estimé en euros,
      "features": ["balcon", "cave", etc.],
      "currentlyRented": true/false
    }
  ],
  "estimatedRent": Total des loyers mensuels en euros,
  "workNeeded": ["Liste courte des travaux"],
  "estimatedWorkCost": Coût TOTAL estimé des travaux en euros,
  "workEstimates": [
    // DEVIS DÉTAILLÉS PAR CATÉGORIE
    {
      "category": "Électricité/Plomberie/Peinture/Toiture/etc.",
      "description": "Description détaillée du poste de travaux",
      "estimatedCost": coût estimé en euros,
      "priority": "Urgent/Important/Souhaitable",
      "details": "Détails techniques si mentionnés"
    }
  ],
  "propertyFeatures": ["Caractéristiques globales"],
  "neighborhood": "Description du quartier",
  "proximities": ["Transports, commerces, écoles, etc."],
  "advantages": ["Points forts du bien"],
  "disadvantages": ["Points faibles du bien"],
  "investmentPotential": "Excellent/Bon/Moyen/Faible",
  "recommendations": ["Recommandations pour l'investissement"]
}

EXEMPLES:
- Si l'annonce dit "immeuble avec 3 appartements T2", créer 3 entrées dans units[]
- Si mentionné "travaux d'électricité nécessaires", créer une entrée workEstimates avec category="Électricité"
- Si "2 parkings", ajouter 2 entrées de type "Parking" dans units[]

Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`;

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en investissement immobilier qui analyse des annonces pour aider les investisseurs. Tu réponds toujours en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mdi.fr',
          'X-Title': 'MDI Investment Analysis'
        }
      }
    );

    const responseText = response.data.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Pas de réponse du LLM');
    }

    // Claude peut retourner le JSON entre des balises, on nettoie
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(cleanedResponse);
    logger.info('Analyse LLM complétée avec succès (Claude 3.5 via OpenRouter)');

    return analysis;
  } catch (error: any) {
    logger.error('Erreur lors de l\'analyse LLM:', error);
    return {
      propertyType: 'Appartement',
      isMultiUnit: false
    };
  }
}

/**
 * Générer une description enrichie pour le projet
 */
export async function generateEnrichedDescription(
  originalDescription: string,
  analysis: PropertyAnalysis
): Promise<string> {
  let enrichedDesc = originalDescription;

  // Si c'est un immeuble multi-logements, détailler chaque unité
  if (analysis.isMultiUnit && analysis.units && analysis.units.length > 0) {
    enrichedDesc += `\n\n🏢 COMPOSITION DE L'IMMEUBLE:\n`;
    let totalRent = 0;

    analysis.units.forEach((unit, index) => {
      enrichedDesc += `\n${index + 1}. ${unit.type} - ${unit.surface}m²`;
      if (unit.rooms) enrichedDesc += ` - ${unit.rooms} pièce${unit.rooms > 1 ? 's' : ''}`;
      if (unit.floor !== undefined) enrichedDesc += ` - Étage ${unit.floor}`;
      if (unit.estimatedRent) {
        enrichedDesc += ` - Loyer: ${unit.estimatedRent.toLocaleString('fr-FR')} €/mois`;
        totalRent += unit.estimatedRent;
      }
      if (unit.currentlyRented) enrichedDesc += ` ✓ Actuellement loué`;
      if (unit.features && unit.features.length > 0) {
        enrichedDesc += `\n   Équipements: ${unit.features.join(', ')}`;
      }
    });

    enrichedDesc += `\n\n💰 LOYER TOTAL: ${totalRent.toLocaleString('fr-FR')} €/mois`;
  } else if (analysis.estimatedRent) {
    enrichedDesc += `\n\n💰 Loyer estimé: ${analysis.estimatedRent.toLocaleString('fr-FR')} €/mois`;
  }

  // Ajouter les informations d'analyse
  if (analysis.advantages && analysis.advantages.length > 0) {
    enrichedDesc += `\n\n✅ Points forts:\n${analysis.advantages.map(a => `- ${a}`).join('\n')}`;
  }

  if (analysis.disadvantages && analysis.disadvantages.length > 0) {
    enrichedDesc += `\n\n⚠️ Points d'attention:\n${analysis.disadvantages.map(d => `- ${d}`).join('\n')}`;
  }

  // Devis détaillés des travaux
  if (analysis.workEstimates && analysis.workEstimates.length > 0) {
    enrichedDesc += `\n\n🔨 DEVIS DÉTAILLÉ DES TRAVAUX:\n`;
    let totalCost = 0;

    analysis.workEstimates.forEach((work, index) => {
      const priorityEmoji = work.priority === 'Urgent' ? '🔴' : work.priority === 'Important' ? '🟠' : '🟡';
      enrichedDesc += `\n${index + 1}. ${priorityEmoji} ${work.category} - ${work.estimatedCost.toLocaleString('fr-FR')} €`;
      enrichedDesc += `\n   ${work.description}`;
      if (work.details) enrichedDesc += `\n   Détails: ${work.details}`;
      totalCost += work.estimatedCost;
    });

    enrichedDesc += `\n\n💵 COÛT TOTAL DES TRAVAUX: ${totalCost.toLocaleString('fr-FR')} €`;
  } else if (analysis.workNeeded && analysis.workNeeded.length > 0) {
    enrichedDesc += `\n\n🔨 Travaux à prévoir:\n${analysis.workNeeded.map(w => `- ${w}`).join('\n')}`;

    if (analysis.estimatedWorkCost) {
      enrichedDesc += `\n\nCoût estimé des travaux: ${analysis.estimatedWorkCost.toLocaleString('fr-FR')} €`;
    }
  }

  if (analysis.proximities && analysis.proximities.length > 0) {
    enrichedDesc += `\n\n📍 Proximités:\n${analysis.proximities.map(p => `- ${p}`).join('\n')}`;
  }

  if (analysis.recommendations && analysis.recommendations.length > 0) {
    enrichedDesc += `\n\n💡 Recommandations:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}`;
  }

  return enrichedDesc;
}

export type { PropertyAnalysis, PropertyUnit, WorkEstimate };

export default {
  analyzePropertyDescription,
  generateEnrichedDescription
};
