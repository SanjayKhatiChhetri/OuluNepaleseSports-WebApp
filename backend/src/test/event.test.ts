import request from 'supertest';
import { PrismaClient } from '../../generated/prisma';
import app from '../index';
import { JWTService } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Event API', () => {
  let authToken: string;
  let userId: string;
  let eventId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.eventRegistration.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
        role: 'EDITOR',
        isActive: true,
        emailVerified: true,
      },
    });

    userId = user.id;
    authToken = JWTService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.eventRegistration.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        date: '2024-12-25',
        time: '18:00',
        location: 'Test Location',
        maxParticipants: 50,
        registrationEnabled: true,
        isPublished: true,
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.event.location).toBe(eventData.location);
      expect(response.body.data.event.maxParticipants).toBe(eventData.maxParticipants);

      eventId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        description: 'This should fail',
        date: '2024-12-25',
        time: '18:00',
        location: 'Test Location',
      };

      await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidEventData = {
        title: '', // Empty title should fail
        description: 'Valid description',
        date: '2024-12-25',
        time: '18:00',
        location: 'Test Location',
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/events', () => {
    it('should list events without authentication', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter events by date range', async () => {
      const response = await request(app)
        .get('/api/events')
        .query({
          dateFrom: '2024-12-01',
          dateTo: '2024-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/events')
        .query({
          page: 1,
          limit: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(eventId);
      expect(response.body.data.event).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/events/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event', async () => {
      const updateData = {
        title: 'Updated Test Event',
        location: 'Updated Location',
        maxParticipants: 100,
      };

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.event.location).toBe(updateData.location);
      expect(response.body.data.event.maxParticipants).toBe(updateData.maxParticipants);
    });

    it('should require authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      };

      await request(app)
        .put(`/api/events/${eventId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('POST /api/events/:id/register', () => {
    it('should register for event without authentication', async () => {
      const registrationData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        dietaryRestrictions: 'Vegetarian',
        emergencyContact: 'Jane Doe +0987654321',
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .send(registrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(registrationData.name);
      expect(response.body.data.email).toBe(registrationData.email);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should prevent duplicate registrations', async () => {
      const registrationData = {
        name: 'John Doe',
        email: 'john@example.com', // Same email as previous test
        phone: '+1234567890',
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .send(registrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALREADY_REGISTERED');
    });

    it('should validate registration data', async () => {
      const invalidRegistrationData = {
        name: 'A', // Too short
        email: 'invalid-email', // Invalid email format
      };

      const response = await request(app)
        .post(`/api/events/${eventId}/register`)
        .send(invalidRegistrationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/events/:id/registrations', () => {
    it('should get event registrations with authentication', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/registrations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/events/${eventId}/registrations`)
        .expect(401);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    it('should return 404 for already deleted event', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      // Create another event for this test
      const eventData = {
        title: 'Event to Delete',
        description: 'This event will be deleted',
        date: '2024-12-25',
        time: '18:00',
        location: 'Test Location',
      };

      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData);

      const newEventId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/events/${newEventId}`)
        .expect(401);
    });
  });
});