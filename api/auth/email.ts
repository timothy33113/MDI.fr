import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

  try {
    // VERIFY EMAIL (GET with token param)
    if (action === 'verify') {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token requis' });
      }

      const users = await sql`
        SELECT id, email FROM users
        WHERE email_verification_token = ${token}
        AND email_verification_expires > CURRENT_TIMESTAMP
      `;

      if (users.length === 0) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      const user = users[0];

      await sql`
        UPDATE users
        SET email_verified = true,
            email_verification_token = NULL,
            email_verification_expires = NULL
        WHERE id = ${user.id}
      `;

      return res.status(200).json({
        success: true,
        message: 'Email vérifié avec succès'
      });
    }

    // RESEND VERIFICATION EMAIL (POST, requires auth)
    if (action === 'resend') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const user = getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const users = await sql`
        SELECT id, email, email_verified FROM users WHERE id = ${user.userId}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      if (users[0].email_verified) {
        return res.status(400).json({ error: 'Email déjà vérifié' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await sql`
        UPDATE users
        SET email_verification_token = ${verificationToken},
            email_verification_expires = ${verificationExpires}
        WHERE id = ${user.userId}
      `;

      const verifyUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      console.log(`Verification link for ${users[0].email}: ${verifyUrl}`);

      return res.status(200).json({
        success: true,
        message: 'Un nouveau lien de vérification a été envoyé.'
      });
    }

    return res.status(400).json({ error: 'Action invalide', available: ['verify', 'resend'] });
  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
