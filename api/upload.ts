import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del } from '@vercel/blob';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// JWT_SECRET - will be validated at runtime
const JWT_SECRET = process.env.JWT_SECRET;

// Interface pour le token JWT
interface JWTPayload {
  userId: string;
  email: string;
}

// Verification du token JWT
function verifyToken(authHeader: string | undefined): JWTPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const jwtSecret = JWT_SECRET || 'mdi-dev-secret';

  if (!jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

// Helper pour parser le body multipart
async function parseMultipartBody(req: VercelRequest): Promise<{
  file: Buffer | null;
  filename: string | null;
  contentType: string | null;
}> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';

  // Si c'est du JSON (pour la suppression), retourner null pour le file
  if (contentType.includes('application/json')) {
    return { file: null, filename: null, contentType: null };
  }

  // Parse multipart form data
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) {
    return { file: null, filename: null, contentType: null };
  }

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, boundaryBuffer);

  for (const part of parts) {
    const partString = part.toString('utf8', 0, Math.min(1000, part.length));

    // Check if this part contains a file
    const contentDispositionMatch = partString.match(/Content-Disposition: form-data;[^]*?filename="([^"]+)"/i);
    const contentTypeMatch = partString.match(/Content-Type: ([^\r\n]+)/i);

    if (contentDispositionMatch && contentTypeMatch) {
      const filename = contentDispositionMatch[1];
      const fileContentType = contentTypeMatch[1];

      // Find the start of the file content (after double CRLF)
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd !== -1) {
        let fileContent = part.slice(headerEnd + 4);

        // Remove trailing boundary markers and CRLF
        const trailingCRLF = fileContent.lastIndexOf(Buffer.from('\r\n'));
        if (trailingCRLF !== -1 && trailingCRLF > fileContent.length - 10) {
          fileContent = fileContent.slice(0, trailingCRLF);
        }

        return {
          file: fileContent,
          filename,
          contentType: fileContentType,
        };
      }
    }
  }

  return { file: null, filename: null, contentType: null };
}

// Helper pour split un buffer par un delimiter
function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);

  while (index !== -1) {
    if (index > start) {
      parts.push(buffer.slice(start, index));
    }
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  if (start < buffer.length) {
    parts.push(buffer.slice(start));
  }

  return parts;
}

// Valider l'extension du fichier
function validateFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}

// Generer un nom de fichier unique
function generateUniqueFilename(originalFilename: string, userId: string): string {
  const ext = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `users/${userId}/photos/${timestamp}-${random}${ext}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verification de l'authentification
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Non autorise. Veuillez vous connecter.' });
  }

  // Verifier que BLOB_READ_WRITE_TOKEN est configure
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured');
    return res.status(500).json({
      error: 'Configuration serveur invalide',
      details: 'Le stockage de fichiers n\'est pas configure. Contactez l\'administrateur.',
    });
  }

  // POST: Upload d'un fichier
  if (req.method === 'POST') {
    try {
      const { file, filename, contentType } = await parseMultipartBody(req);

      if (!file || !filename || !contentType) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      // Valider le type MIME
      if (!ALLOWED_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: 'Type de fichier non autorise',
          details: 'Formats acceptes: JPEG, PNG, WebP',
        });
      }

      // Valider l'extension
      if (!validateFileExtension(filename)) {
        return res.status(400).json({
          error: 'Extension de fichier non autorisee',
          details: 'Extensions acceptees: .jpg, .jpeg, .png, .webp',
        });
      }

      // Valider la taille
      if (file.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: 'Fichier trop volumineux',
          details: `La taille maximale autorisee est de ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      }

      // Generer un nom unique
      const uniqueFilename = generateUniqueFilename(filename, user.userId);

      // Upload vers Vercel Blob
      const blob = await put(uniqueFilename, file, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });

      return res.status(200).json({
        url: blob.url,
        filename: uniqueFilename,
        size: file.length,
        contentType,
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      return res.status(500).json({
        error: 'Erreur lors de l\'upload',
      });
    }
  }

  // DELETE: Suppression d'un fichier
  if (req.method === 'DELETE') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const { url } = body;

      if (!url) {
        return res.status(400).json({ error: 'URL du fichier requise' });
      }

      // Verifier que l'URL appartient au meme utilisateur (securite)
      if (!url.includes(`users/${user.userId}/`)) {
        return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres fichiers' });
      }

      await del(url);

      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      console.error('Delete error:', error);
      return res.status(500).json({
        error: 'Erreur lors de la suppression',
      });
    }
  }

  return res.status(405).json({ error: 'Methode non autorisee' });
}
