import { Router } from 'express';
import { contentController } from '../controllers/content';
import { validate, validationSchemas } from '../middleware/validation';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
// GET /api/content - List content with filtering and pagination
router.get(
  '/',
  validate(validationSchemas.content.list),
  contentController.getContent
);

// GET /api/content/:id - Get specific content by ID
router.get(
  '/:id',
  validate(validationSchemas.content.getById),
  contentController.getContentById
);

// Protected routes (authentication required)
// POST /api/content - Create new content (editors and admins only)
router.post(
  '/',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']),
  validate(validationSchemas.content.create),
  contentController.createContent as any
);

// PUT /api/content/:id - Update existing content (author, editors, or admins)
router.put(
  '/:id',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']), // Additional permission check in controller
  validate(validationSchemas.content.update),
  contentController.updateContent as any
);

// DELETE /api/content/:id - Delete content (author, editors, or admins)
router.delete(
  '/:id',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']), // Additional permission check in controller
  validate(validationSchemas.content.getById),
  contentController.deleteContent as any
);

export default router;