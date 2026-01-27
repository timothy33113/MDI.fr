import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { ApiResponse } from '@/types';
import logger from '@/utils/logger';
import axios from 'axios';
import llmAnalysisService from '@/services/llmAnalysisService';
import workCostEstimationService from '@/services/workCostEstimationService';
import * as cheerio from 'cheerio';

const router = Router();

const RAPIDAPI_KEY = 'b859fa9ccemsh497caa0d49a5890p1a0ed5jsnf3bd81eb95bd';
const RAPIDAPI_HOST = 'leboncoin1.p.rapidapi.com';

interface LeboncoinData {
  title: string;
  description: string;
  reformulatedDescription?: string; // Description reformulée par Claude
  price: number;
  location: string;
  city?: string; // Ville extraite
  zipCode?: string; // Code postal extrait
  address?: string; // Adresse complète si disponible
  propertyType?: string;
  propertyState?: string; // État du bien
  surface?: number;
  rooms?: number;
  images: string[];
  analysis?: {
    propertyType: string;
    propertyState?: string;
    estimatedRent?: number;
    workNeeded?: string[];
    estimatedWorkCost?: number;
    propertyFeatures?: string[];
    neighborhood?: string;
    proximities?: string[];
    advantages?: string[];
    disadvantages?: string[];
    investmentPotential?: string;
    recommendations?: string[];
  };
  enrichedDescription?: string;
  detailedWorkEstimates?: any; // Estimation détaillée des coûts de travaux basée sur la grille tarifaire
}

/**
 * @route   POST /api/leboncoin/test
 * @desc    Tester l'analyse LLM avec des données fictives
 * @access  Private
 */
router.post('/test', authenticateToken, async (req: any, res: any) => {
  try {
    logger.info('Test endpoint appelé - Génération de données fictives');

    // Données fictives d'un immeuble de rapport
    let leboncoinData: LeboncoinData = {
      title: 'Immeuble de rapport 8 appartements - Centre ville',
      description: `Bel immeuble de rapport situé en plein centre-ville, composé de 8 appartements répartis sur 4 étages.

Composition:
- 4 T2 de 45m² (actuellement loués 650€/mois chacun)
- 3 T3 de 65m² (loués 850€/mois chacun)
- 1 T4 de 85m² (loué 1100€/mois)

L'immeuble nécessite des travaux de rénovation notamment sur la façade et la toiture (budget estimé: 80 000€).

Tous les appartements sont actuellement loués, offrant une rentabilité brute de 7,2%.

DPE: E
Année de construction: 1960
Taxe foncière: 3 200€/an`,
      price: 580000,
      location: '31000, Toulouse, Haute-Garonne',
      propertyType: 'Immeuble',
      surface: 480,
      rooms: 8,
      images: []
    };

    // Enrichir avec l'analyse LLM
    leboncoinData = await enrichWithLLMAnalysis(leboncoinData);

    const response: ApiResponse = {
      success: true,
      data: leboncoinData
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur test Leboncoin:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors du test'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/leboncoin/scrape
 * @desc    Récupérer les données d'une annonce Leboncoin via RapidAPI
 * @access  Private
 */
router.post('/scrape', authenticateToken, async (req: any, res: any) => {
  try {
    const { url } = req.body;

    if (!url || !url.includes('leboncoin.fr')) {
      const response: ApiResponse = {
        success: false,
        error: 'URL Leboncoin invalide'
      };
      return res.status(400).json(response);
    }

    logger.info(`Récupération des données Leboncoin pour: ${url}`);

    // Extraire l'ID de l'annonce depuis l'URL (supporte les deux formats)
    // Ancien format: https://www.leboncoin.fr/ventes_immobilieres/2457686687.htm
    // Nouveau format: https://www.leboncoin.fr/ad/ventes_immobilieres/3036700580
    const urlMatch = url.match(/\/(\d+)(?:\.htm)?$/);
    if (!urlMatch) {
      // Essayer via l'API RapidAPI avec l'URL complète
      try {
        const apiResponse = await axios.get('https://leboncoin1.p.rapidapi.com/v2/leboncoin/search', {
          params: { query: url },
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
          }
        });

        if (apiResponse.data && apiResponse.data.ads && apiResponse.data.ads.length > 0) {
          const ad = apiResponse.data.ads[0];
          let leboncoinData: LeboncoinData = parseAdData(ad);

          // Enrichir avec l'analyse LLM
          leboncoinData = await enrichWithLLMAnalysis(leboncoinData);

          const response: ApiResponse = {
            success: true,
            data: leboncoinData
          };
          return res.json(response);
        }
      } catch (apiError) {
        logger.warn('Erreur API RapidAPI, tentative de scraping direct');
      }
    }

    // Si on a un ID, essayer de récupérer directement l'annonce
    const adId = urlMatch ? urlMatch[1] : null;

    if (adId) {
      try {
        const apiResponse = await axios.get('https://leboncoin1.p.rapidapi.com/v2/leboncoin/ad', {
          params: { query: adId },
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
          }
        });

        if (apiResponse.data) {
          let leboncoinData: LeboncoinData = parseAdData(apiResponse.data);

          // Enrichir avec l'analyse LLM
          leboncoinData = await enrichWithLLMAnalysis(leboncoinData);

          const response: ApiResponse = {
            success: true,
            data: leboncoinData
          };
          return res.json(response);
        }
      } catch (apiError) {
        logger.error('Erreur lors de la récupération via RapidAPI:', apiError);
      }
    }

    // Fallback: scraping direct si l'API ne fonctionne pas
    let leboncoinData = await scrapeDirect(url);

    // Enrichir avec l'analyse LLM
    leboncoinData = await enrichWithLLMAnalysis(leboncoinData);

    const response: ApiResponse = {
      success: true,
      data: leboncoinData
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération Leboncoin:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération des données Leboncoin'
    };
    res.status(500).json(response);
  }
});

/**
 * Enrichir les données avec l'analyse LLM
 */
async function enrichWithLLMAnalysis(data: LeboncoinData): Promise<LeboncoinData> {
  // Extraire ville et code postal de la localisation
  if (data.location) {
    const locationMatch = data.location.match(/^([^,]+),?\s*(\d{5})?/);
    if (locationMatch) {
      data.city = locationMatch[1].trim();
      data.zipCode = locationMatch[2] || '';
    }
  }

  if (data.description) {
    try {
      logger.info('Analyse de la description avec LLM...');
      const analysis = await llmAnalysisService.analyzePropertyDescription(
        data.description,
        data.price,
        data.surface,
        data.location
      );

      data.analysis = analysis;

      // Utiliser la description reformulée par Claude
      if (analysis.reformulatedDescription) {
        data.reformulatedDescription = analysis.reformulatedDescription;
      }

      // Utiliser le type et l'état détectés par Claude
      if (analysis.propertyType) {
        data.propertyType = analysis.propertyType;
      }
      if (analysis.propertyState) {
        data.propertyState = analysis.propertyState;
      }

      // Générer une description enrichie
      const enrichedDescription = await llmAnalysisService.generateEnrichedDescription(
        data.description,
        analysis
      );

      data.enrichedDescription = enrichedDescription;

      // Calculer les coûts détaillés des travaux basés sur la grille tarifaire
      // On calcule si on a des travaux détectés OU si le bien est à rénover
      const shouldCalculateWorkCosts = data.surface && (
        (analysis.workNeeded && analysis.workNeeded.length > 0) ||
        (analysis.workEstimates && analysis.workEstimates.length > 0) ||
        data.propertyState === 'A_Renover' ||
        data.propertyState === 'A_Renover_Entierement'
      );

      if (shouldCalculateWorkCosts) {
        logger.info('Calcul des coûts détaillés des travaux...');
        logger.info(`Travaux détectés: ${JSON.stringify(analysis.workNeeded || [])}`);
        logger.info(`État du bien: ${data.propertyState}, Surface: ${data.surface}m²`);

        let workCategories: string[] = [];

        // Extraire les catégories depuis workNeeded ou workEstimates
        if (analysis.workNeeded && analysis.workNeeded.length > 0) {
          workCategories = workCostEstimationService.extractWorkCategories(analysis.workNeeded);
        } else if (analysis.workEstimates && analysis.workEstimates.length > 0) {
          workCategories = analysis.workEstimates.map((w: any) => w.category);
        }

        logger.info(`Catégories de travaux extraites: ${JSON.stringify(workCategories)}`);

        if (workCategories.length > 0) {
          const workCostEstimation = workCostEstimationService.calculateDetailedWorkCosts(
            workCategories,
            data.surface,
            data.rooms,
            data.propertyType,
            data.propertyState
          );

          data.detailedWorkEstimates = workCostEstimation;

          // Mettre à jour le coût total des travaux avec le calcul détaillé
          if (workCostEstimation.totalCost > 0) {
            if (!data.analysis) {
              data.analysis = { propertyType: data.propertyType || 'Appartement' };
            }
            data.analysis.estimatedWorkCost = workCostEstimation.totalCost;
          }

          logger.info(`✅ Coûts travaux calculés: ${workCostEstimation.totalCost.toLocaleString('fr-FR')}€ sur ${workCostEstimation.estimates.length} catégories`);
        } else {
          logger.warn('Aucune catégorie de travaux extraite malgré la détection de travaux');
        }
      } else {
        logger.info('Pas de calcul de travaux nécessaire (surface ou état du bien)');
      }

      logger.info('Analyse LLM complétée');
    } catch (llmError) {
      logger.warn('Erreur lors de l\'analyse LLM, continuation sans analyse:', llmError);
    }
  }
  return data;
}

/**
 * Parser les données d'une annonce depuis la réponse API
 */
function parseAdData(ad: any): LeboncoinData {
  const leboncoinData: LeboncoinData = {
    title: ad.subject || ad.title || '',
    description: ad.body || ad.description || '',
    price: 0,
    location: '',
    images: []
  };

  // Prix
  if (ad.price && ad.price[0]) {
    leboncoinData.price = parseInt(ad.price[0]);
  } else if (ad.price_cents) {
    leboncoinData.price = ad.price_cents / 100;
  }

  // Localisation
  if (ad.location) {
    logger.info('📍 Données de localisation disponibles:');
    logger.info(`  city: "${ad.location.city}"`);
    logger.info(`  zipcode: "${ad.location.zipcode}"`);
    logger.info(`  region_name: "${ad.location.region_name}"`);
    logger.info(`  department: "${ad.location.department}"`);
    logger.info(`  Objet complet location: ${JSON.stringify(ad.location, null, 2)}`);

    const locationParts = [];
    if (ad.location.city) locationParts.push(ad.location.city);
    if (ad.location.zipcode) locationParts.push(ad.location.zipcode);
    if (ad.location.region_name) locationParts.push(ad.location.region_name);
    leboncoinData.location = locationParts.join(', ');

    // Extraire ville et code postal
    if (ad.location.city) leboncoinData.city = ad.location.city;
    if (ad.location.zipcode) leboncoinData.zipCode = ad.location.zipcode;
  }

  // Images
  if (ad.images && ad.images.urls) {
    // L'API retourne un array de strings directement
    leboncoinData.images = Array.isArray(ad.images.urls)
      ? ad.images.urls
      : ad.images.urls.map((img: any) => typeof img === 'string' ? img : (img.large || img.small || img.thumb));
  } else if (ad.images && Array.isArray(ad.images)) {
    leboncoinData.images = ad.images;
  }

  // Attributs (surface, pièces, type de bien)
  if (ad.attributes) {
    // Logger TOUS les attributs pour debugging
    logger.info('📋 Attributs disponibles dans l\'annonce:');
    ad.attributes.forEach((attr: any, index: number) => {
      logger.info(`  [${index}] key: "${attr.key}" | value: "${attr.value}" | value_label: "${attr.value_label}"`);
    });

    let habitableSurface: number | undefined;
    let terrainSurface: number | undefined;

    ad.attributes.forEach((attr: any) => {
      const key = attr.key?.toLowerCase() || '';
      const value = attr.value || attr.value_label;

      // Distinguer surface habitable et surface terrain
      if (key.includes('square') || key.includes('surface')) {
        const parsedValue = parseInt(value);

        // Ignorer price_per_square_meter (ce n'est pas une surface)
        if (key.includes('price_per_square') || key.includes('price') || key.includes('meter')) {
          logger.info(`Ignoré (prix au m²): ${parsedValue} (attribut: ${key})`);
          return;
        }

        // Surface habitable (prioritaire pour les calculs de travaux)
        if (key.includes('habitable') || key.includes('square_meters') || (key.includes('square') && !key.includes('land') && !key.includes('terrain'))) {
          habitableSurface = parsedValue;
          logger.info(`Surface habitable détectée: ${parsedValue}m² (attribut: ${key})`);
        }
        // Surface terrain
        else if (key.includes('land') || key.includes('terrain') || key.includes('plot')) {
          terrainSurface = parsedValue;
          logger.info(`Surface terrain détectée: ${parsedValue}m² (attribut: ${key})`);
        }
        // Fallback: si on ne peut pas déterminer le type
        else {
          if (!habitableSurface) {
            habitableSurface = parsedValue;
            logger.info(`Surface détectée (type indéterminé): ${parsedValue}m² (attribut: ${key})`);
          }
        }
      }

      if (key.includes('rooms') || key.includes('pieces')) {
        leboncoinData.rooms = parseInt(value);
      }

      if (key.includes('real_estate_type') || key.includes('type')) {
        leboncoinData.propertyType = value;
      }
    });

    // Utiliser la surface habitable en priorité
    leboncoinData.surface = habitableSurface || terrainSurface || 0;
    logger.info(`Surface finale retenue pour calculs: ${leboncoinData.surface}m²`);
  }

  return leboncoinData;
}

/**
 * Scraping direct en cas d'échec de l'API
 */
async function scrapeDirect(url: string): Promise<LeboncoinData> {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(html);

  const leboncoinData: LeboncoinData = {
    title: $('h1').first().text().trim(),
    description: $('[data-qa-id="adview_description_container"]').text().trim(),
    price: 0,
    location: $('[data-qa-id="adview_location_informations"]').text().trim(),
    images: []
  };

  // Prix
  const priceText = $('[data-qa-id="adview_price"]').text().trim();
  const priceMatch = priceText.match(/[\d\s]+/);
  if (priceMatch) {
    leboncoinData.price = parseFloat(priceMatch[0].replace(/\s/g, ''));
  }

  // Images
  $('img[data-qa-id="slideshow_image"]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('placeholder')) {
      leboncoinData.images.push(src);
    }
  });

  return leboncoinData;
}

/**
 * @route   GET /api/leboncoin/proxy-image
 * @desc    Proxy pour récupérer les images Leboncoin (éviter CORS)
 * @access  Private
 */
router.get('/proxy-image', authenticateToken, async (req: any, res: any) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL de l\'image manquante'
      });
    }

    const response = await axios.get(url as string, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error: any) {
    logger.error('Erreur proxy image:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'image'
    });
  }
});

export default router;
