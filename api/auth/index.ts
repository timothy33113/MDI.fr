import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  return { valid: errors.length === 0, errors };
}

async function getBody(req: VercelRequest): Promise<{ email?: string; password?: string }> {
  // Si le body est déjà parsé par Vercel (objet JS)
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  // Si c'est un string JSON
  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body);
  }
  // Si c'est un Buffer
  if (Buffer.isBuffer(req.body)) {
    const str = req.body.toString('utf8');
    return str ? JSON.parse(str) : {};
  }
  // Fallback: lire le stream
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return {};
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

  const { action } = req.query;
  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
  const jwtSecret = JWT_SECRET || 'mdi-dev-secret';

  try {
    // LOGIN
    if (action === 'login') {
      const body = await getBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Format d\'email invalide' });
      }

      const users = await sql`
        SELECT id, email, password_hash, has_paid, created_at, email_verified
        FROM users WHERE email = ${email}
      `;

      if (users.length === 0) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          hasPaid: user.has_paid,
          createdAt: user.created_at,
          emailVerified: user.email_verified || false
        }
      });
    }

    // REGISTER
    if (action === 'register') {
      const body = await getBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Format d\'email invalide' });
      }

      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Mot de passe invalide',
          details: passwordValidation.errors
        });
      }

      const existingUsers = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await sql`
        INSERT INTO users (email, password_hash, email_verified, email_verification_token, email_verification_expires)
        VALUES (${email}, ${passwordHash}, false, ${emailVerificationToken}, ${emailVerificationExpires})
        RETURNING id, email, created_at, email_verified
      `;

      const user = result[0];
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.BASE_URL || 'http://localhost:5173';
      const verificationLink = `${baseUrl}/verify-email?token=${emailVerificationToken}`;

      console.log(`[register] Verification link for ${email}: ${verificationLink}`);

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          emailVerified: user.email_verified || false
        }
      });
    }

    return res.status(400).json({ error: 'Action invalide', available: ['login', 'register'] });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
