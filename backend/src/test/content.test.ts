import request from 'supertest';
import app from '../index';
import { PrismaClient } from '../../generated/prisma';
import { generateToken } from '../services/jwt';

const prisma = new PrismaClient();

describe('Content API Endpoints', () => {
  let testUser: any;
  let editorUser: any;
  let adminUser: any;
  let testContent: any;
  let authToken: string;
  let editorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.content.deleteMany({
      where: {
        title: {
          contains: 'Test',
        },
      },
    });
    
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testuser@example.com', 'editor@example.com', 'admin@example.com'],
        },
      },
    });

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'testuser@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
        role: 'MEMBER',
        isActive: true,
        emailVerified: true,
      },
    });

    editorUser = await prisma.user.create({
      data: {
        email: 'editor@example.com',
        passwordHash: 'hashedpassword',
        name: 'Editor User',
        role: 'EDITOR',
        isActive: true,
        emailVerified: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hashedpassword',
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    // Generate auth tokens
    authToken = generateToken({ userId: testUser.id, email: testUser.email });
    editorToken = generateToken({ userId: editorUser.id, email: editorUser.email });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email });

    // Create test content
    testContent = await prisma.content.create({
      data: {
        type: 'NEWS',
        title: 'Test News Article',
        content: '<p>This is a test news article</p>',
        slug: 'test-news-article',
        isPublished: true,
        publishedAt: new Date(),
        authorId: editorUser.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.content.deleteMany({
      where: {
        title: {
          contains: 'Test',
        },
      },
    });
    
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testuser@example.com', 'editor@example.com', 'admin@example.com'],
        },
      },
    });

    await prisma.$disconnect();
  });

  describe('GET /api/content', () => {
    it('should return content list without authentication', async () => {
      const response = await request(app)
        .get('/api/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter content by type', async () => {
      const response = await request(app)
        .get('/api/content?type=news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned content should be news type
      response.body.data.forEach((content: any) => {
        expect(content.type).toBe('NEWS');
      });
    });

    it('should filter content by published status', async () => {
      const response = await request(app)
        .get('/api/content?isPublished=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((content: any) => {
        expect(content.isPublished).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/content?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/content?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should find our test content
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/content/:id', () => {
    it('should return specific content by ID', async () => {
      const response = await request(app)
        .get(`/api/content/${testContent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testContent.id);
      expect(response.body.data.title).toBe(testContent.title);
      expect(response.body.data.author).toBeDefined();
    });

    it('should return 404 for non-existent content', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/content/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/content/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/content', () => {
    it('should create content with editor role', async () => {
      const contentData = {
        type: 'announcement',
        title: 'Test Announcement',
        content: '<p>This is a test announcement</p>',
        isPublished: false,
        priority: 5,
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(contentData.title);
      expect(response.body.data.type).toBe('ANNOUNCEMENT');
      expect(response.body.data.slug).toBe('test-announcement');
      expect(response.body.data.authorId).toBe(editorUser.id);
    });

    it('should create content with admin role', async () => {
      const contentData = {
        type: 'news',
        title: 'Test Admin News',
        content: '<p>This is admin news</p>',
        isPublished: true,
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(contentData.title);
      expect(response.body.data.isPublished).toBe(true);
      expect(response.body.data.publishedAt).toBeDefined();
    });

    it('should reject content creation for member role', async () => {
      const contentData = {
        type: 'news',
        title: 'Test Member News',
        content: '<p>This should fail</p>',
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject content creation without authentication', async () => {
      const contentData = {
        type: 'news',
        title: 'Test Unauthenticated News',
        content: '<p>This should fail</p>',
      };

      const response = await request(app)
        .post('/api/content')
        .send(contentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize HTML content', async () => {
      const contentData = {
        type: 'news',
        title: 'Test HTML Sanitization',
        content: '<p>Safe content</p><script>alert("xss")</script>',
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Script tag should be removed
      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).toContain('<p>Safe content</p>');
    });
  });

  describe('PUT /api/content/:id', () => {
    let updateTestContent: any;

    beforeEach(async () => {
      updateTestContent = await prisma.content.create({
        data: {
          type: 'NEWS',
          title: 'Test Update Content',
          content: '<p>Original content</p>',
          slug: 'test-update-content',
          isPublished: false,
          authorId: editorUser.id,
        },
      });
    });

    afterEach(async () => {
      await prisma.content.deleteMany({
        where: {
          title: 'Test Update Content',
        },
      });
    });

    it('should update content by author', async () => {
      const updateData = {
        title: 'Updated Test Content',
        content: '<p>Updated content</p>',
        isPublished: true,
      };

      const response = await request(app)
        .put(`/api/content/${updateTestContent.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.isPublished).toBe(true);
      expect(response.body.data.publishedAt).toBeDefined();
    });

    it('should update content by admin', async () => {
      const updateData = {
        title: 'Admin Updated Content',
      };

      const response = await request(app)
        .put(`/api/content/${updateTestContent.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should reject update by non-author member', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      };

      const response = await request(app)
        .put(`/api/content/${updateTestContent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent content', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .put(`/api/content/${fakeId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/content/:id', () => {
    let deleteTestContent: any;

    beforeEach(async () => {
      deleteTestContent = await prisma.content.create({
        data: {
          type: 'NEWS',
          title: 'Test Delete Content',
          content: '<p>Content to delete</p>',
          slug: 'test-delete-content',
          isPublished: false,
          authorId: editorUser.id,
        },
      });
    });

    it('should delete content by author', async () => {
      const response = await request(app)
        .delete(`/api/content/${deleteTestContent.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify content is deleted
      const deletedContent = await prisma.content.findUnique({
        where: { id: deleteTestContent.id },
      });
      expect(deletedContent).toBeNull();
    });

    it('should delete content by admin', async () => {
      const response = await request(app)
        .delete(`/api/content/${deleteTestContent.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject delete by non-author member', async () => {
      const response = await request(app)
        .delete(`/api/content/${deleteTestContent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent content', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/content/${fakeId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});