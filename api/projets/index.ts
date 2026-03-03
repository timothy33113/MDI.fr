import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

// Valeurs autorisées par les CHECK constraints de la BDD
const VALID_CATEGORIES_TRAVAUX = ['Gros_Oeuvre', 'Second_Oeuvre', 'Finitions', 'Equipements', 'Exterieur', 'Autre'];
const VALID_ETATS = ['Neuf', 'Bon', 'A_Renover', 'A_Renover_Entierement'];
const VALID_TYPES_BIEN = ['Appartement', 'Maison', 'Immeuble', 'Local_Commercial', 'Terrain', 'Autre'];
const VALID_DESTINATIONS = ['Location', 'Residence_Principale', 'Revente', 'Autre'];
const VALID_TYPES_ELEMENT = ['Appartement', 'Studio', 'Maison', 'Parking', 'Cave', 'Local_Commercial', 'Garage', 'Autre'];
const VALID_PRIORITES = ['Haute', 'Moyenne', 'Basse'];
const VALID_PHOTO_TYPES = ['Facade', 'Interieur', 'Avant_Travaux', 'Apres_Travaux', 'Plan', 'Autre'];

function sanitize(value: string | undefined | null, validValues: string[], fallback: string): string {
  if (!value) return fallback;
  return validValues.includes(value) ? value : fallback;
}

// Schemas de validation
const elementBienSchema = z.object({
  type: z.string().default('Autre'),
  superficie: z.number().min(0).default(0),
  nombrePieces: z.number().optional().nullable(),
  etage: z.number().optional().nullable(),
  etat: z.string().default('Bon'),
  enLocation: z.boolean().default(false),
  loyerMensuel: z.number().min(0).default(0),
  chargesMensuelles: z.number().min(0).default(0),
  equipements: z.array(z.string()).optional().nullable(),
});

const travauxSchema = z.object({
  categorie: z.string().optional(),
  type: z.string().optional(),
  description: z.string().default(''),
  montant: z.number().min(0).default(0),
  priorite: z.string().default('Moyenne'),
  dureeEstimee: z.number().min(0).default(0),
  artisan: z.string().optional().nullable(),
  devisObtenu: z.boolean().default(false),
  dateDebutPrevue: z.string().optional().nullable(),
});

const financementSchema = z.object({
  prixAchat: z.number().min(0).default(0),
  fraisNotaire: z.number().min(0).default(0),
  fraisAgence: z.number().min(0).default(0),
  montantTravaux: z.number().min(0).default(0),
  fraisDossierBancaire: z.number().min(0).default(0),
  fraisGarantie: z.number().min(0).default(0),
  autresFrais: z.number().min(0).default(0),
  coutTotalProjet: z.number().min(0).optional(),
  apportPersonnel: z.number().min(0).default(0),
  montantEmprunt: z.number().min(0).optional(),
  dureeCredit: z.number().min(1).max(40).default(20),
  tauxInteretEstime: z.number().min(0).max(20).default(3.5),
  tauxAssuranceEstime: z.number().min(0).max(5).default(0.3),
  typePret: z.string().default('Amortissable'),
}).optional().nullable();

const porteurSchema = z.object({
  structureId: z.string().uuid(),
  pourcentageProjet: z.number().min(0).max(100).default(100),
});

const createProjetSchema = z.object({
  nom: z.string().min(1, 'Nom du projet requis').max(255),
  description: z.string().max(2000).optional().nullable(),
  status: z.string().optional(),
  bien: z.object({
    adresse: z.string().optional().nullable(),
    codePostal: z.string().optional().nullable(),
    ville: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    superficie: z.number().min(0).optional().nullable(),
    nombrePieces: z.number().min(0).optional().nullable(),
    nombreChambres: z.number().min(0).optional().nullable(),
    nombreSDB: z.number().min(0).optional().nullable(),
    anneeConstruction: z.number().optional().nullable(),
    etatActuel: z.string().optional().nullable(),
    dpe: z.string().optional().nullable(),
    ges: z.string().optional().nullable(),
    destinationBien: z.string().optional().nullable(),
    loyerMensuelEstime: z.number().min(0).optional().nullable(),
    chargesMensuelles: z.number().min(0).optional().nullable(),
    taxeFonciere: z.number().min(0).optional().nullable(),
  }).optional().nullable(),
  financement: financementSchema,
  porteurs: z.array(porteurSchema).optional(),
  elementsBien: z.array(elementBienSchema).optional(),
  travaux: z.array(travauxSchema).optional(),
  photos: z.array(z.union([z.string(), z.object({ url: z.string() }).passthrough()])).optional(),
});

function getUserFromRequest(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string; email: string };
  } catch { return null; }
}

function getSQL() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  return neon(dbUrl);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const sql = getSQL();

  try {
    if (req.method === 'GET') {
      const projets = await sql`
        SELECT p.*,
          bi.adresse as bien_adresse, bi.ville as bien_ville,
          bi.type as bien_type, bi.superficie as bien_superficie,
          pf.cout_total_projet, pf.montant_emprunt
        FROM projets p
        LEFT JOIN biens_immobiliers_v2 bi ON bi.projet_id = p.id
        LEFT JOIN plans_financement_v2 pf ON pf.projet_id = p.id
        WHERE p.user_id = ${user.userId}
        ORDER BY p.date_creation DESC
      `;

      return res.status(200).json(projets);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      // Validation Zod
      const validation = createProjetSchema.safeParse(body || {});
      if (!validation.success) {
        return res.status(400).json({
          error: 'Données invalides',
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        });
      }

      const { nom, description, status, bien, financement, porteurs, elementsBien, travaux, photos } = validation.data;

      // 1. Creer le projet
      const projetResult = await sql`
        INSERT INTO projets (user_id, nom, description, status)
        VALUES (${user.userId}, ${nom}, ${description || null}, ${status || 'Analyse'})
        RETURNING *
      `;

      const projet = projetResult[0];
      const projetId = projet.id;

      // 2. Creer le bien immobilier si fourni
      let bienId: string | null = null;
      if (bien) {
        const bienResult = await sql`
          INSERT INTO biens_immobiliers_v2 (
            projet_id, adresse, code_postal, ville, type, superficie,
            nombre_pieces, nombre_chambres, nombre_sdb, annee_construction,
            etat_actuel, dpe, ges, destination_bien,
            loyer_mensuel_estime, charges_mensuelles, taxe_fonciere
          ) VALUES (
            ${projetId},
            ${bien.adresse || ''},
            ${bien.codePostal || ''},
            ${bien.ville || ''},
            ${sanitize(bien.type, VALID_TYPES_BIEN, 'Autre')},
            ${bien.superficie || 0},
            ${bien.nombrePieces || null},
            ${bien.nombreChambres || null},
            ${bien.nombreSDB || null},
            ${bien.anneeConstruction || null},
            ${sanitize(bien.etatActuel, VALID_ETATS, 'Bon')},
            ${bien.dpe || null},
            ${bien.ges || null},
            ${sanitize(bien.destinationBien, VALID_DESTINATIONS, 'Autre')},
            ${bien.loyerMensuelEstime || null},
            ${bien.chargesMensuelles || null},
            ${bien.taxeFonciere || null}
          )
          RETURNING id
        `;
        bienId = bienResult[0].id;
      }

      // 3. Creer les elements du bien (appartements, parkings, etc.)
      if (elementsBien && Array.isArray(elementsBien) && elementsBien.length > 0) {
        for (const elem of elementsBien) {
          await sql`
            INSERT INTO elements_bien_v2 (
              projet_id, type, superficie, nombre_pieces, etage, etat,
              en_location, loyer_mensuel, charges_mensuelles, equipements
            ) VALUES (
              ${projetId},
              ${sanitize(elem.type, VALID_TYPES_ELEMENT, 'Autre')},
              ${elem.superficie || 0},
              ${elem.nombrePieces || null},
              ${elem.etage || null},
              ${sanitize(elem.etat, VALID_ETATS, 'Bon')},
              ${elem.enLocation || false},
              ${elem.loyerMensuel || 0},
              ${elem.chargesMensuelles || 0},
              ${elem.equipements ? `{${elem.equipements.join(',')}}` : null}
            )
          `;
        }
      }

      // 4. Creer les travaux
      if (travaux && Array.isArray(travaux) && travaux.length > 0 && bienId) {
        for (const t of travaux) {
          await sql`
            INSERT INTO travaux_details_v2 (
              bien_immobilier_id, categorie, description, montant,
              priorite, duree_estimee, artisan, devis_obtenu, date_debut_prevue
            ) VALUES (
              ${bienId},
              ${sanitize(t.categorie || t.type, VALID_CATEGORIES_TRAVAUX, 'Autre')},
              ${t.description || ''},
              ${t.montant || 0},
              ${sanitize(t.priorite, VALID_PRIORITES, 'Moyenne')},
              ${t.dureeEstimee || 0},
              ${t.artisan || null},
              ${t.devisObtenu || false},
              ${t.dateDebutPrevue || null}
            )
          `;
        }
      }

      // 5. Creer les photos
      if (photos && Array.isArray(photos) && photos.length > 0 && bienId) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          // Support both string (base64/URL) and object format
          const url = typeof photo === 'string' ? photo : photo.url;
          const filename = typeof photo === 'string' ? `photo_${i}.jpg` : (photo.filename || `photo_${i}.jpg`);
          const type = sanitize(typeof photo === 'string' ? 'Autre' : (photo.type || 'Autre'), VALID_PHOTO_TYPES, 'Autre');
          const size = typeof photo === 'string' ? 0 : (photo.size || 0);
          const mimeType = typeof photo === 'string' ? 'image/jpeg' : (photo.mimeType || 'image/jpeg');
          const description = typeof photo === 'string' ? null : (photo.description || null);

          await sql`
            INSERT INTO photos_v2 (
              bien_immobilier_id, url, filename, type, size, mime_type, description
            ) VALUES (
              ${bienId}, ${url}, ${filename}, ${type}, ${size}, ${mimeType}, ${description}
            )
          `;
        }
      }

      // 6. Creer le plan de financement si fourni
      if (financement) {
        const prixAchat = financement.prixAchat || 0;
        const fraisNotaire = financement.fraisNotaire || 0;
        const fraisAgence = financement.fraisAgence || 0;
        const montantTravaux = financement.montantTravaux || 0;
        const fraisDossierBancaire = financement.fraisDossierBancaire || 0;
        const fraisGarantie = financement.fraisGarantie || 0;
        const autresFrais = financement.autresFrais || 0;

        const coutTotalProjet = financement.coutTotalProjet ||
          (prixAchat + fraisNotaire + fraisAgence + montantTravaux + fraisDossierBancaire + fraisGarantie + autresFrais);

        const apportPersonnel = financement.apportPersonnel || 0;
        const montantEmprunt = financement.montantEmprunt || (coutTotalProjet - apportPersonnel);
        const dureeCredit = financement.dureeCredit || 20;
        const tauxInteret = financement.tauxInteretEstime || 3.5;
        const tauxAssurance = financement.tauxAssuranceEstime || 0.3;

        // Calcul des mensualites
        const tauxMensuel = tauxInteret / 100 / 12;
        const nombreMensualites = dureeCredit * 12;
        const mensualiteCapitalInterets = tauxMensuel > 0
          ? (montantEmprunt * tauxMensuel * Math.pow(1 + tauxMensuel, nombreMensualites)) / (Math.pow(1 + tauxMensuel, nombreMensualites) - 1)
          : montantEmprunt / nombreMensualites;
        const mensualiteAssurance = (montantEmprunt * (tauxAssurance / 100)) / 12;
        const mensualiteTotale = mensualiteCapitalInterets + mensualiteAssurance;

        await sql`
          INSERT INTO plans_financement_v2 (
            projet_id, prix_achat, frais_notaire, frais_agence, montant_travaux,
            frais_dossier_bancaire, frais_garantie, autres_frais, cout_total_projet,
            apport_personnel, montant_emprunt, duree_credit, taux_interet_estime,
            taux_assurance_estime, mensualite_capital_interets, mensualite_assurance,
            mensualite_totale, type_pret
          ) VALUES (
            ${projetId},
            ${prixAchat},
            ${fraisNotaire},
            ${fraisAgence},
            ${montantTravaux},
            ${fraisDossierBancaire},
            ${fraisGarantie},
            ${autresFrais},
            ${coutTotalProjet},
            ${apportPersonnel},
            ${montantEmprunt},
            ${dureeCredit},
            ${tauxInteret},
            ${tauxAssurance},
            ${Math.round(mensualiteCapitalInterets * 100) / 100},
            ${Math.round(mensualiteAssurance * 100) / 100},
            ${Math.round(mensualiteTotale * 100) / 100},
            ${financement.typePret || 'Amortissable'}
          )
        `;
      }

      // 7. Creer les porteurs du projet si fournis
      if (porteurs && Array.isArray(porteurs) && porteurs.length > 0) {
        for (const porteur of porteurs) {
          if (porteur.structureId) {
            await sql`
              INSERT INTO porteurs_projet (projet_id, structure_id, pourcentage_projet)
              VALUES (${projetId}, ${porteur.structureId}, ${porteur.pourcentageProjet || 100})
            `;
          }
        }
      }

      // 8. Retourner le projet cree avec les donnees completes
      const fullProjet = {
        ...projet,
        bienImmobilier: bien || null,
        financement: financement || null,
        porteurs: porteurs || [],
        elementsBien: elementsBien || [],
        travaux: travaux || []
      };

      return res.status(201).json({
        success: true,
        data: { projet: fullProjet },
        projet: fullProjet
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projets error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
