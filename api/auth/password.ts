import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getBody(req: VercelRequest): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  return { valid: errors.length === 0, errors };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

  const { action } = req.query;
  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

  try {
    const body = await getBody(req);

    // FORGOT PASSWORD
    if (action === 'forgot') {
      const { email } = body;
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Email valide requis' });
      }

      // Check if user exists
      const users = await sql`SELECT id, email FROM users WHERE email = ${email}`;

      if (users.length > 0) {
        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await sql`
          UPDATE users
          SET reset_token = ${resetToken}, reset_token_expires = ${resetExpires}
          WHERE id = ${user.id}
        `;

        const resetUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        console.log(`🔑 Password reset link for ${email}: ${resetUrl}`);
      }

      // Always return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'
      });
    }

    // RESET PASSWORD
    if (action === 'reset') {
      const { token, password } = body;

      if (!token) {
        return res.status(400).json({ error: 'Token requis' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Mot de passe requis' });
      }

      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Mot de passe invalide',
          details: passwordValidation.errors
        });
      }

      // Find user with valid token
      const users = await sql`
        SELECT id, email FROM users
        WHERE reset_token = ${token}
        AND reset_token_expires > CURRENT_TIMESTAMP
      `;

      if (users.length === 0) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      const user = users[0];
      const passwordHash = await bcrypt.hash(password, 10);

      await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, reset_token = NULL, reset_token_expires = NULL
        WHERE id = ${user.id}
      `;

      return res.status(200).json({
        success: true,
        message: 'Mot de passe mis à jour avec succès'
      });
    }

    return res.status(400).json({ error: 'Action invalide', available: ['forgot', 'reset'] });
  } catch (error: any) {
    console.error('Password error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
