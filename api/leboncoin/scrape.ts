import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

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

  // Extraire l'ID de l'annonce depuis l'URL
  const adIdMatch = url.match(/(\d{9,})/);
  if (!adIdMatch) {
    return res.status(400).json({ error: 'URL Leboncoin invalide - impossible d\'extraire l\'ID de l\'annonce' });
  }

  const adId = adIdMatch[1];

  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: 'Clé RapidAPI non configurée. Ajoutez RAPIDAPI_KEY dans les variables d\'environnement.' });
  }

  try {
    // Appeler l'API RapidAPI pour Leboncoin
    const response = await fetch(`https://leboncoin-scraper.p.rapidapi.com/ad/${adId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'leboncoin-scraper.p.rapidapi.com'
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

    const data = await response.json();

    // Transformer les données pour notre format
    const formattedData = {
      title: data.subject || data.title || '',
      description: data.body || data.description || '',
      price: data.price?.[0] || data.price || 0,
      location: {
        city: data.location?.city || '',
        postalCode: data.location?.zipcode || data.location?.postal_code || '',
        address: data.location?.address || ''
      },
      attributes: {
        surface: extractAttribute(data.attributes, ['square', 'surface', 'living_area']),
        rooms: extractAttribute(data.attributes, ['rooms', 'nb_rooms']),
        bedrooms: extractAttribute(data.attributes, ['bedrooms', 'nb_bedrooms']),
        propertyType: extractAttribute(data.attributes, ['real_estate_type', 'property_type']),
        energyRate: extractAttribute(data.attributes, ['energy_rate', 'dpe']),
        ges: extractAttribute(data.attributes, ['ges'])
      },
      images: data.images?.urls || data.images || [],
      url: url
    };

    // Créer une description enrichie
    let enrichedDescription = formattedData.description;
    if (formattedData.attributes.surface) {
      enrichedDescription += `\n\nSurface: ${formattedData.attributes.surface} m²`;
    }
    if (formattedData.attributes.rooms) {
      enrichedDescription += `\nNombre de pièces: ${formattedData.attributes.rooms}`;
    }
    if (formattedData.attributes.bedrooms) {
      enrichedDescription += `\nChambres: ${formattedData.attributes.bedrooms}`;
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

function extractAttribute(attributes: any[] | any, keys: string[]): any {
  if (!attributes) return null;

  // Si c'est un tableau d'attributs
  if (Array.isArray(attributes)) {
    for (const key of keys) {
      const attr = attributes.find((a: any) =>
        a.key === key || a.key_label === key || a.name === key
      );
      if (attr) {
        return attr.value || attr.value_label;
      }
    }
  }

  // Si c'est un objet
  if (typeof attributes === 'object') {
    for (const key of keys) {
      if (attributes[key] !== undefined) {
        return attributes[key];
      }
    }
  }

  return null;
}
