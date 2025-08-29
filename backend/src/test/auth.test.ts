import request from 'supertest';
import app from '../index';
import { JWTService } from '../utils/jwt';

describe('Authentication Endpoints', () => {
  describe('GET /api/auth/health', () => {
    it('should return authentication service health status', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('authentication');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('workos');
      expect(response.body.data).toHaveProperty('jwt');
    });
  });

  describe('JWT Service', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'MEMBER',
    };

    it('should generate and verify access tokens', () => {
      const token = JWTService.generateAccessToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = JWTService.verifyAccessToken(token);
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should generate and verify refresh tokens', () => {
      const token = JWTService.generateRefreshToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = JWTService.verifyRefreshToken(token);
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should generate token pairs', () => {
      const tokens = JWTService.generateTokenPair(mockUser);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should extract token from authorization header', () => {
      const token = 'test-token';
      const authHeader = `Bearer ${token}`;
      
      const extractedToken = JWTService.extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
    });

    it('should return null for invalid authorization header', () => {
      const extractedToken = JWTService.extractTokenFromHeader('Invalid header');
      expect(extractedToken).toBe(null);
    });

    it('should throw error for invalid access token', () => {
      expect(() => {
        JWTService.verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTService.verifyRefreshToken('invalid-token');
      }).toThrow();
    });
  });

  describe('GET /api/auth/login/:provider', () => {
    it('should return authorization URL for Google', async () => {
      const response = await request(app)
        .get('/api/auth/login/google')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authUrl');
      expect(response.body.data.provider).toBe('google');
      expect(response.body.data.authUrl).toContain('workos');
    });

    it('should return authorization URL for Facebook', async () => {
      const response = await request(app)
        .get('/api/auth/login/facebook')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authUrl');
      expect(response.body.data.provider).toBe('facebook');
      expect(response.body.data.authUrl).toContain('workos');
    });

    it('should return error for invalid provider', async () => {
      const response = await request(app)
        .get('/api/auth/login/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PROVIDER');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_INVALID');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logout successful');
    });
  });
});