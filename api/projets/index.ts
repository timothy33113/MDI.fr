import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

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

      const { nom, description, status, bien, financement, porteurs } = body || {};

      if (!nom) {
        return res.status(400).json({ error: 'Nom du projet requis' });
      }

      // 1. Créer le projet
      const projetResult = await sql`
        INSERT INTO projets (user_id, nom, description, status)
        VALUES (${user.userId}, ${nom}, ${description || null}, ${status || 'Analyse'})
        RETURNING *
      `;

      const projet = projetResult[0];
      const projetId = projet.id;

      // 2. Créer le bien immobilier si fourni
      if (bien) {
        await sql`
          INSERT INTO biens_immobiliers_v2 (
            projet_id, adresse, code_postal, ville, type, superficie,
            nombre_pieces, nombre_chambres, nombre_sdb, annee_construction,
            etat_actuel, dpe, ges, destination_bien,
            loyer_mensuel_estime, charges_mensuelles, taxe_fonciere
          ) VALUES (
            ${projetId},
            ${bien.adresse || null},
            ${bien.codePostal || null},
            ${bien.ville || null},
            ${bien.type || null},
            ${bien.superficie || null},
            ${bien.nombrePieces || null},
            ${bien.nombreChambres || null},
            ${bien.nombreSDB || null},
            ${bien.anneeConstruction || null},
            ${bien.etatActuel || null},
            ${bien.dpe || null},
            ${bien.ges || null},
            ${bien.destinationBien || null},
            ${bien.loyerMensuelEstime || null},
            ${bien.chargesMensuelles || null},
            ${bien.taxeFonciere || null}
          )
        `;
      }

      // 3. Créer le plan de financement si fourni
      if (financement) {
        // Calculer les valeurs dérivées si nécessaires
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

        // Calcul des mensualités (formule d'amortissement)
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

      // 4. Créer les porteurs du projet si fournis
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

      // 5. Retourner le projet créé
      const fullProjet = {
        ...projet,
        bienImmobilier: bien || null,
        financement: financement || null,
        porteurs: porteurs || []
      };

      return res.status(201).json({
        success: true,
        data: { projet: fullProjet },
        projet: fullProjet // Pour compatibilité
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projets error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
