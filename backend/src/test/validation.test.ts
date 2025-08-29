import request from 'supertest';
import app from '../index';

describe('Validation Middleware Tests', () => {
  describe('POST /api/test/validate-user', () => {
    it('should pass validation with valid user data', async () => {
      const validUserData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        phone: '+1234567890',
      };

      const response = await request(app)
        .post('/api/test/validate-user')
        .send(validUserData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(validUserData.email);
      expect(response.body.data.name).toBe(validUserData.name);
    });

    it('should fail validation with invalid email', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'John Doe',
      };

      const response = await request(app)
        .post('/api/test/validate-user')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Invalid email format',
        })
      );
    });

    it('should fail validation with weak password', async () => {
      const invalidUserData = {
        email: 'test@example.com',
        password: '123', // Too short and no letters
        name: 'John Doe',
      };

      const response = await request(app)
        .post('/api/test/validate-user')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'password',
        })
      );
    });

    it('should fail validation with missing required fields', async () => {
      const invalidUserData = {
        email: 'test@example.com',
        // Missing password and name
      };

      const response = await request(app)
        .post('/api/test/validate-user')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/test/validate-query', () => {
    it('should pass validation with valid query parameters', async () => {
      const response = await request(app)
        .get('/api/test/validate-query?page=1&limit=10&type=news&isPublished=true&search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.type).toBe('news');
      expect(response.body.data.isPublished).toBe(true);
    });

    it('should fail validation with invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/test/validate-query?page=0') // Page must be greater than 0
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail validation with invalid content type', async () => {
      const response = await request(app)
        .get('/api/test/validate-query?type=invalid-type')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/test/validate-params/:id', () => {
    it('should pass validation with valid UUID parameter', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/test/validate-params/${validUuid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validUuid);
    });

    it('should fail validation with invalid UUID parameter', async () => {
      const invalidUuid = 'not-a-uuid';
      
      const response = await request(app)
        .get(`/api/test/validate-params/${invalidUuid}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Rate Limiting Tests', () => {
  describe('POST /api/test/test-rate-limit', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app)
        .post('/api/test/test-rate-limit')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // Note: This test would require multiple requests to trigger rate limiting
    // In a real test environment, you might want to create a separate test
    // with a lower rate limit for testing purposes
  });
});