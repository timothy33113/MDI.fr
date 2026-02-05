import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '1f5058adf2msh780e6a254e722f7p14cb6ajsn73fe1ad3ba46';

function getUserFromRequest(req: VercelRequest): { userId: string; email: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }

  const { url } = body || {};

  if (!url) {
    return res.status(400).json({ error: 'URL Leboncoin requise' });
  }

  try {
    // Extraire l'ID de l'annonce depuis l'URL Leboncoin
    // Format: https://www.leboncoin.fr/ad/ventes_immobilieres/3104343961
    // ou: https://www.leboncoin.fr/ventes_immobilieres/3104343961.htm
    const adIdMatch = url.match(/\/(\d{8,12})(?:\.htm)?(?:\?|$)/);
    if (!adIdMatch) {
      return res.status(400).json({
        error: 'URL Leboncoin invalide. Format attendu: https://www.leboncoin.fr/ad/ventes_immobilieres/XXXXXXXXXX'
      });
    }
    const adId = adIdMatch[1];
    console.log('Extracted ad ID:', adId);

    // Appeler l'API RapidAPI Leboncoin avec le bon endpoint
    const response = await fetch(`https://leboncoin1.p.rapidapi.com/v2/leboncoin/ad?query=${adId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'leboncoin1.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error:', errorText);
      return res.status(response.status).json({
        error: 'Erreur lors de la récupération de l\'annonce',
        details: errorText
      });
    }

    const rawData = await response.json();
    console.log('RapidAPI response:', JSON.stringify(rawData).substring(0, 500));

    // La réponse peut être un tableau ou un objet selon l'API
    const adData = Array.isArray(rawData) ? rawData[0] : rawData;

    if (!adData) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    // Transformer les données pour notre format
    const formattedData = {
      title: adData.subject || adData.title || adData.name || '',
      description: adData.body || adData.description || '',
      price: extractPrice(adData),
      location: {
        city: adData.location?.city || adData.city || '',
        postalCode: adData.location?.zipcode || adData.location?.postal_code || adData.zipcode || '',
        address: adData.location?.address || adData.address || ''
      },
      attributes: {
        surface: extractAttribute(adData, ['square', 'surface', 'living_area', 'carrez_area']),
        rooms: extractAttribute(adData, ['rooms', 'nb_rooms']),
        bedrooms: extractAttribute(adData, ['bedrooms', 'nb_bedrooms']),
        propertyType: extractAttribute(adData, ['real_estate_type', 'property_type', 'type']),
        energyRate: extractAttribute(adData, ['energy_rate', 'dpe', 'energy_class']),
        ges: extractAttribute(adData, ['ges', 'ges_class'])
      },
      images: extractImages(adData),
      url: url
    };

    // Créer une description enrichie
    let enrichedDescription = formattedData.description;
    const details: string[] = [];

    if (formattedData.attributes.surface) {
      details.push(`Surface: ${formattedData.attributes.surface} m²`);
    }
    if (formattedData.attributes.rooms) {
      details.push(`Nombre de pièces: ${formattedData.attributes.rooms}`);
    }
    if (formattedData.attributes.bedrooms) {
      details.push(`Chambres: ${formattedData.attributes.bedrooms}`);
    }
    if (formattedData.attributes.propertyType) {
      details.push(`Type: ${formattedData.attributes.propertyType}`);
    }
    if (formattedData.attributes.energyRate) {
      details.push(`DPE: ${formattedData.attributes.energyRate}`);
    }

    if (details.length > 0) {
      enrichedDescription += '\n\n--- Caractéristiques ---\n' + details.join('\n');
    }

    return res.status(200).json({
      success: true,
      data: {
        ...formattedData,
        enrichedDescription
      }
    });

  } catch (error: any) {
    console.error('Leboncoin scrape error:', error);
    return res.status(500).json({
      error: 'Erreur lors du scraping',
      details: error.message
    });
  }
}

function extractPrice(data: any): number {
  if (data.price) {
    if (Array.isArray(data.price)) return data.price[0] || 0;
    if (typeof data.price === 'object') return data.price.value || data.price.amount || 0;
    return data.price;
  }
  if (data.prices) {
    if (Array.isArray(data.prices)) return data.prices[0] || 0;
    return data.prices;
  }
  return 0;
}

function extractImages(data: any): string[] {
  if (data.images) {
    if (Array.isArray(data.images)) {
      return data.images.map((img: any) => {
        if (typeof img === 'string') return img;
        return img.url || img.thumb_url || img.large_url || '';
      }).filter(Boolean);
    }
    if (data.images.urls) return data.images.urls;
  }
  if (data.photos) {
    return data.photos.map((p: any) => p.url || p).filter(Boolean);
  }
  return [];
}

function extractAttribute(data: any, keys: string[]): any {
  // Chercher dans attributes si c'est un tableau
  if (data.attributes && Array.isArray(data.attributes)) {
    for (const key of keys) {
      const attr = data.attributes.find((a: any) =>
        a.key === key || a.key_label === key || a.name === key
      );
      if (attr) {
        return attr.value || attr.value_label;
      }
    }
  }

  // Chercher dans attributes si c'est un objet
  if (data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)) {
    for (const key of keys) {
      if (data.attributes[key] !== undefined) {
        const val = data.attributes[key];
        if (typeof val === 'object') return val.value || val.value_label || val;
        return val;
      }
    }
  }

  // Chercher directement dans data
  for (const key of keys) {
    if (data[key] !== undefined) {
      return data[key];
    }
  }

  return null;
}
