import { AuthService } from '@/services/authService';
import { AuthenticationError, ConflictError } from '@/utils/errors';

describe('AuthService', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await AuthService.hashPassword(testPassword);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(20);
    });
  });

  describe('comparePassword', () => {
    it('should compare password with hash correctly', async () => {
      const hash = await AuthService.hashPassword(testPassword);
      const isValid = await AuthService.comparePassword(testPassword, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hash = await AuthService.hashPassword(testPassword);
      const isValid = await AuthService.comparePassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const user = {
        id: '123',
        email: testEmail,
        hasPaid: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = AuthService.generateToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const user = {
        id: '123',
        email: testEmail,
        hasPaid: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = AuthService.generateToken(user);
      const decoded = AuthService.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        AuthService.verifyToken('invalid.token.here');
      }).toThrow(AuthenticationError);
    });
  });
}); 