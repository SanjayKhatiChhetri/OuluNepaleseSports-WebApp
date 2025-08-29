import { Router } from 'express';
import { eventController } from '../controllers/event';
import { validate, validationSchemas } from '../middleware/validation';
import { authenticate, requireRole, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
// GET /api/events - List events with filtering and pagination
router.get(
  '/',
  validate(validationSchemas.event.list),
  eventController.getEvents
);

// GET /api/events/:id - Get specific event by ID
router.get(
  '/:id',
  validate(validationSchemas.event.getById),
  eventController.getEventById
);

// POST /api/events/:id/register - Register for event (optional authentication)
router.post(
  '/:id/register',
  optionalAuthenticate, // Allow both authenticated and guest registrations
  validate(validationSchemas.event.register),
  eventController.registerForEvent
);

// Protected routes (authentication required)
// POST /api/events - Create new event (editors and admins only)
router.post(
  '/',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']),
  validate(validationSchemas.event.create),
  eventController.createEvent as any
);

// PUT /api/events/:id - Update existing event (author, editors, or admins)
router.put(
  '/:id',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']), // Additional permission check in controller
  validate(validationSchemas.event.update),
  eventController.updateEvent as any
);

// DELETE /api/events/:id - Delete event (author, editors, or admins)
router.delete(
  '/:id',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']), // Additional permission check in controller
  validate(validationSchemas.event.getById),
  eventController.deleteEvent as any
);

// GET /api/events/:id/registrations - Get event registrations (author, editors, or admins)
router.get(
  '/:id/registrations',
  authenticate,
  requireRole(['EDITOR', 'ADMIN']), // Additional permission check in controller
  validate(validationSchemas.event.getRegistrations),
  eventController.getEventRegistrations as any
);

export default router;