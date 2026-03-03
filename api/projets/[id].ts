import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

function getUserFromRequest(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string; email: string };
  } catch { return null; }
}

function getSQL() {
  return neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID du projet requis' });
  }

  const sql = getSQL();

  try {
    // GET - Recuperer un projet par ID avec toutes les sous-donnees
    if (req.method === 'GET') {
      const projets = await sql`
        SELECT p.*,
          bi.id as bien_id, bi.adresse as bien_adresse, bi.code_postal as bien_code_postal,
          bi.ville as bien_ville, bi.type as bien_type, bi.superficie as bien_superficie,
          bi.nombre_pieces as bien_nombre_pieces, bi.nombre_chambres as bien_nombre_chambres,
          bi.nombre_sdb as bien_nombre_sdb, bi.annee_construction as bien_annee_construction,
          bi.etat_actuel as bien_etat_actuel, bi.dpe as bien_dpe, bi.ges as bien_ges,
          bi.destination_bien as bien_destination, bi.loyer_mensuel_estime as bien_loyer_mensuel,
          bi.charges_mensuelles as bien_charges_mensuelles, bi.taxe_fonciere as bien_taxe_fonciere,
          pf.id as financement_id, pf.prix_achat, pf.frais_notaire, pf.frais_agence,
          pf.montant_travaux, pf.frais_dossier_bancaire, pf.frais_garantie, pf.autres_frais,
          pf.cout_total_projet, pf.apport_personnel, pf.montant_emprunt, pf.duree_credit,
          pf.taux_interet_estime, pf.taux_assurance_estime, pf.mensualite_capital_interets,
          pf.mensualite_assurance, pf.mensualite_totale, pf.type_pret
        FROM projets p
        LEFT JOIN biens_immobiliers_v2 bi ON bi.projet_id = p.id
        LEFT JOIN plans_financement_v2 pf ON pf.projet_id = p.id
        WHERE p.id = ${id} AND p.user_id = ${user.userId}
      `;

      if (projets.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      const p = projets[0];

      // Porteurs avec structures
      const porteurs = await sql`
        SELECT pp.*, s.id as structure_id, s.type as structure_type, s.nom as structure_nom,
          s.adresse as structure_adresse, s.telephone as structure_telephone, s.email as structure_email,
          s.photo as structure_photo, s.personne_physique, s.personne_morale, s.detenteurs
        FROM porteurs_projet pp
        JOIN structures s ON s.id = pp.structure_id
        WHERE pp.projet_id = ${id}
        ORDER BY pp.pourcentage_projet DESC
      `;

      // Elements du bien
      const elementsBien = await sql`
        SELECT * FROM elements_bien_v2
        WHERE projet_id = ${id}
        ORDER BY created_at
      `;

      // Travaux
      let travaux: any[] = [];
      if (p.bien_id) {
        travaux = await sql`
          SELECT * FROM travaux_details_v2
          WHERE bien_immobilier_id = ${p.bien_id}
          ORDER BY created_at
        `;
      }

      // Photos
      let photos: any[] = [];
      if (p.bien_id) {
        photos = await sql`
          SELECT * FROM photos_v2
          WHERE bien_immobilier_id = ${p.bien_id}
          ORDER BY created_at
        `;
      }

      // Formater la reponse
      const projet = {
        id: p.id,
        userId: p.user_id,
        nom: p.nom,
        description: p.description,
        status: p.status,
        dateCreation: p.date_creation,
        dateModification: p.date_modification,
        bienImmobilier: p.bien_id ? {
          id: p.bien_id,
          adresse: p.bien_adresse,
          codePostal: p.bien_code_postal,
          ville: p.bien_ville,
          type: p.bien_type,
          superficie: p.bien_superficie,
          nombrePieces: p.bien_nombre_pieces,
          nombreChambres: p.bien_nombre_chambres,
          nombreSDB: p.bien_nombre_sdb,
          anneeConstruction: p.bien_annee_construction,
          etatActuel: p.bien_etat_actuel,
          dpe: p.bien_dpe,
          ges: p.bien_ges,
          destinationBien: p.bien_destination,
          loyerMensuelEstime: p.bien_loyer_mensuel,
          chargesMensuelles: p.bien_charges_mensuelles,
          taxeFonciere: p.bien_taxe_fonciere,
          elements: elementsBien.map(e => ({
            id: e.id,
            type: e.type,
            superficie: e.superficie,
            nombrePieces: e.nombre_pieces,
            etage: e.etage,
            etat: e.etat,
            enLocation: e.en_location,
            loyerMensuel: e.loyer_mensuel,
            chargesMensuelles: e.charges_mensuelles,
            equipements: e.equipements
          })),
          travauxPrevus: travaux.map(t => ({
            id: t.id,
            categorie: t.categorie,
            description: t.description,
            montant: t.montant,
            priorite: t.priorite || 'Moyenne',
            dureeEstimee: t.duree_estimee || 0,
            artisan: t.artisan,
            devisObtenu: t.devis_obtenu || false,
            dateDebutPrevue: t.date_debut_prevue
          })),
          photos: photos.map(ph => ({
            id: ph.id,
            url: ph.url,
            filename: ph.filename,
            description: ph.description,
            type: ph.type,
            size: ph.size,
            mimeType: ph.mime_type
          }))
        } : null,
        financement: p.financement_id ? {
          id: p.financement_id,
          prixAchat: p.prix_achat,
          fraisNotaire: p.frais_notaire,
          fraisAgence: p.frais_agence,
          montantTravaux: p.montant_travaux,
          fraisDossierBancaire: p.frais_dossier_bancaire,
          fraisGarantie: p.frais_garantie,
          autresFrais: p.autres_frais,
          coutTotalProjet: p.cout_total_projet,
          apportPersonnel: p.apport_personnel,
          montantEmprunt: p.montant_emprunt,
          dureeCredit: p.duree_credit,
          tauxInteretEstime: p.taux_interet_estime,
          tauxAssuranceEstime: p.taux_assurance_estime,
          mensualiteCapitalInterets: p.mensualite_capital_interets,
          mensualiteAssurance: p.mensualite_assurance,
          mensualiteTotale: p.mensualite_totale,
          typePret: p.type_pret
        } : null,
        porteurs: porteurs.map((pt: any) => ({
          id: pt.id,
          pourcentageProjet: pt.pourcentage_projet,
          structure: {
            id: pt.structure_id,
            type: pt.structure_type,
            nom: pt.structure_nom,
            adresse: pt.structure_adresse,
            telephone: pt.structure_telephone,
            email: pt.structure_email,
            photo: pt.structure_photo,
            personnePhysique: pt.personne_physique,
            personneMorale: pt.personne_morale,
            detenteurs: pt.detenteurs
          }
        }))
      };

      return res.status(200).json({ data: { projet } });
    }

    // PUT - Mise a jour complete du projet
    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      // Verifier que le projet existe et appartient a l'utilisateur
      const existing = await sql`
        SELECT id FROM projets WHERE id = ${id} AND user_id = ${user.userId}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      const { nom, description, status, bien, financement, porteurs, elementsBien, travaux, photos } = body || {};

      // 1. Mettre a jour le projet
      await sql`
        UPDATE projets
        SET nom = COALESCE(${nom || null}, nom),
            description = COALESCE(${description !== undefined ? description : null}, description),
            status = COALESCE(${status || null}, status),
            date_modification = NOW()
        WHERE id = ${id} AND user_id = ${user.userId}
      `;

      // 2. Upsert bien immobilier
      if (bien) {
        const existingBien = await sql`
          SELECT id FROM biens_immobiliers_v2 WHERE projet_id = ${id}
        `;

        let bienId: string;

        if (existingBien.length > 0) {
          bienId = existingBien[0].id;
          await sql`
            UPDATE biens_immobiliers_v2 SET
              adresse = ${bien.adresse || null},
              code_postal = ${bien.codePostal || null},
              ville = ${bien.ville || null},
              type = ${bien.type || null},
              superficie = ${bien.superficie || null},
              nombre_pieces = ${bien.nombrePieces || null},
              nombre_chambres = ${bien.nombreChambres || null},
              nombre_sdb = ${bien.nombreSDB || null},
              annee_construction = ${bien.anneeConstruction || null},
              etat_actuel = ${bien.etatActuel || null},
              dpe = ${bien.dpe || null},
              ges = ${bien.ges || null},
              destination_bien = ${bien.destinationBien || null},
              loyer_mensuel_estime = ${bien.loyerMensuelEstime || null},
              charges_mensuelles = ${bien.chargesMensuelles || null},
              taxe_fonciere = ${bien.taxeFonciere || null},
              updated_at = NOW()
            WHERE id = ${bienId}
          `;
        } else {
          const bienResult = await sql`
            INSERT INTO biens_immobiliers_v2 (
              projet_id, adresse, code_postal, ville, type, superficie,
              nombre_pieces, nombre_chambres, nombre_sdb, annee_construction,
              etat_actuel, dpe, ges, destination_bien,
              loyer_mensuel_estime, charges_mensuelles, taxe_fonciere
            ) VALUES (
              ${id},
              ${bien.adresse || null}, ${bien.codePostal || null}, ${bien.ville || null},
              ${bien.type || null}, ${bien.superficie || null},
              ${bien.nombrePieces || null}, ${bien.nombreChambres || null}, ${bien.nombreSDB || null},
              ${bien.anneeConstruction || null}, ${bien.etatActuel || null},
              ${bien.dpe || null}, ${bien.ges || null}, ${bien.destinationBien || null},
              ${bien.loyerMensuelEstime || null}, ${bien.chargesMensuelles || null}, ${bien.taxeFonciere || null}
            )
            RETURNING id
          `;
          bienId = bienResult[0].id;
        }

        // 3. Remplacer les elements du bien
        if (elementsBien && Array.isArray(elementsBien)) {
          await sql`DELETE FROM elements_bien_v2 WHERE projet_id = ${id}`;
          for (const elem of elementsBien) {
            await sql`
              INSERT INTO elements_bien_v2 (
                projet_id, type, superficie, nombre_pieces, etage, etat,
                en_location, loyer_mensuel, charges_mensuelles, equipements
              ) VALUES (
                ${id},
                ${elem.type || 'Autre'}, ${elem.superficie || 0}, ${elem.nombrePieces || null},
                ${elem.etage || null}, ${elem.etat || 'Bon'},
                ${elem.enLocation || false}, ${elem.loyerMensuel || 0}, ${elem.chargesMensuelles || 0},
                ${elem.equipements ? `{${elem.equipements.join(',')}}` : null}
              )
            `;
          }
        }

        // 4. Remplacer les travaux
        if (travaux && Array.isArray(travaux)) {
          await sql`DELETE FROM travaux_details_v2 WHERE bien_immobilier_id = ${bienId}`;
          for (const t of travaux) {
            await sql`
              INSERT INTO travaux_details_v2 (
                bien_immobilier_id, categorie, description, montant,
                priorite, duree_estimee, artisan, devis_obtenu, date_debut_prevue
              ) VALUES (
                ${bienId},
                ${t.categorie || t.type || 'Autre'}, ${t.description || ''}, ${t.montant || 0},
                ${t.priorite || 'Moyenne'}, ${t.dureeEstimee || null},
                ${t.artisan || null}, ${t.devisObtenu || false}, ${t.dateDebutPrevue || null}
              )
            `;
          }
        }

        // 5. Remplacer les photos
        if (photos && Array.isArray(photos)) {
          await sql`DELETE FROM photos_v2 WHERE bien_immobilier_id = ${bienId}`;
          for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const url = typeof photo === 'string' ? photo : photo.url;
            const filename = typeof photo === 'string' ? `photo_${i}.jpg` : (photo.filename || `photo_${i}.jpg`);
            const type = typeof photo === 'string' ? 'Autre' : (photo.type || 'Autre');
            const size = typeof photo === 'string' ? 0 : (photo.size || 0);
            const mimeType = typeof photo === 'string' ? 'image/jpeg' : (photo.mimeType || 'image/jpeg');
            const photoDescription = typeof photo === 'string' ? null : (photo.description || null);

            await sql`
              INSERT INTO photos_v2 (
                bien_immobilier_id, url, filename, type, size, mime_type, description
              ) VALUES (
                ${bienId}, ${url}, ${filename}, ${type}, ${size}, ${mimeType}, ${photoDescription}
              )
            `;
          }
        }
      }

      // 6. Upsert plan de financement
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

        const tauxMensuel = tauxInteret / 100 / 12;
        const nombreMensualites = dureeCredit * 12;
        const mensualiteCapitalInterets = tauxMensuel > 0
          ? (montantEmprunt * tauxMensuel * Math.pow(1 + tauxMensuel, nombreMensualites)) / (Math.pow(1 + tauxMensuel, nombreMensualites) - 1)
          : montantEmprunt / nombreMensualites;
        const mensualiteAssurance = (montantEmprunt * (tauxAssurance / 100)) / 12;
        const mensualiteTotale = mensualiteCapitalInterets + mensualiteAssurance;

        const existingFin = await sql`
          SELECT id FROM plans_financement_v2 WHERE projet_id = ${id}
        `;

        if (existingFin.length > 0) {
          await sql`
            UPDATE plans_financement_v2 SET
              prix_achat = ${prixAchat}, frais_notaire = ${fraisNotaire}, frais_agence = ${fraisAgence},
              montant_travaux = ${montantTravaux}, frais_dossier_bancaire = ${fraisDossierBancaire},
              frais_garantie = ${fraisGarantie}, autres_frais = ${autresFrais},
              cout_total_projet = ${coutTotalProjet}, apport_personnel = ${apportPersonnel},
              montant_emprunt = ${montantEmprunt}, duree_credit = ${dureeCredit},
              taux_interet_estime = ${tauxInteret}, taux_assurance_estime = ${tauxAssurance},
              mensualite_capital_interets = ${Math.round(mensualiteCapitalInterets * 100) / 100},
              mensualite_assurance = ${Math.round(mensualiteAssurance * 100) / 100},
              mensualite_totale = ${Math.round(mensualiteTotale * 100) / 100},
              type_pret = ${financement.typePret || 'Amortissable'},
              updated_at = NOW()
            WHERE projet_id = ${id}
          `;
        } else {
          await sql`
            INSERT INTO plans_financement_v2 (
              projet_id, prix_achat, frais_notaire, frais_agence, montant_travaux,
              frais_dossier_bancaire, frais_garantie, autres_frais, cout_total_projet,
              apport_personnel, montant_emprunt, duree_credit, taux_interet_estime,
              taux_assurance_estime, mensualite_capital_interets, mensualite_assurance,
              mensualite_totale, type_pret
            ) VALUES (
              ${id}, ${prixAchat}, ${fraisNotaire}, ${fraisAgence}, ${montantTravaux},
              ${fraisDossierBancaire}, ${fraisGarantie}, ${autresFrais}, ${coutTotalProjet},
              ${apportPersonnel}, ${montantEmprunt}, ${dureeCredit}, ${tauxInteret}, ${tauxAssurance},
              ${Math.round(mensualiteCapitalInterets * 100) / 100},
              ${Math.round(mensualiteAssurance * 100) / 100},
              ${Math.round(mensualiteTotale * 100) / 100},
              ${financement.typePret || 'Amortissable'}
            )
          `;
        }
      }

      // 7. Remplacer les porteurs
      if (porteurs && Array.isArray(porteurs)) {
        await sql`DELETE FROM porteurs_projet WHERE projet_id = ${id}`;
        for (const porteur of porteurs) {
          if (porteur.structureId) {
            await sql`
              INSERT INTO porteurs_projet (projet_id, structure_id, pourcentage_projet)
              VALUES (${id}, ${porteur.structureId}, ${porteur.pourcentageProjet || 100})
            `;
          }
        }
      }

      // Retourner le projet mis a jour
      const updated = await sql`SELECT * FROM projets WHERE id = ${id}`;
      return res.status(200).json({ success: true, data: { projet: updated[0] } });
    }

    // PATCH - Mise a jour du statut uniquement
    if (req.method === 'PATCH') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const { status } = body || {};
      if (!status) {
        return res.status(400).json({ error: 'Statut requis' });
      }

      const result = await sql`
        UPDATE projets
        SET status = ${status}, date_modification = NOW()
        WHERE id = ${id} AND user_id = ${user.userId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      return res.status(200).json({ data: { projet: result[0] } });
    }

    // DELETE - Supprimer un projet et toutes les donnees liees
    if (req.method === 'DELETE') {
      const existing = await sql`
        SELECT id FROM projets WHERE id = ${id} AND user_id = ${user.userId}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
      }

      // Recuperer le bien pour supprimer les sous-donnees
      const biens = await sql`SELECT id FROM biens_immobiliers_v2 WHERE projet_id = ${id}`;
      const bienId = biens.length > 0 ? biens[0].id : null;

      // Supprimer dans l'ordre (respect des FK)
      if (bienId) {
        await sql`DELETE FROM photos_v2 WHERE bien_immobilier_id = ${bienId}`;
        await sql`DELETE FROM travaux_details_v2 WHERE bien_immobilier_id = ${bienId}`;
      }
      await sql`DELETE FROM elements_bien_v2 WHERE projet_id = ${id}`;
      await sql`DELETE FROM checklist_documents WHERE projet_id = ${id}`;
      await sql`DELETE FROM analyses_rentabilite WHERE projet_id = ${id}`;
      await sql`DELETE FROM porteurs_projet WHERE projet_id = ${id}`;
      await sql`DELETE FROM plans_financement_v2 WHERE projet_id = ${id}`;
      await sql`DELETE FROM biens_immobiliers_v2 WHERE projet_id = ${id}`;
      await sql`DELETE FROM projets WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Projet supprime' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projet error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
