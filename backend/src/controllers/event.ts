import { Request, Response } from 'express';
import { eventService } from '../services/event';
import { AuthenticatedRequest } from '../middleware/auth';

export const eventController = {
  // GET /api/events - List events with filtering and pagination
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { 
        dateFrom, 
        dateTo, 
        location, 
        registrationEnabled, 
        search, 
        page = 1, 
        limit = 10 
      } = req.query;
      
      const filters = {
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        location: location as string | undefined,
        registrationEnabled: registrationEnabled === 'true' ? true : registrationEnabled === 'false' ? false : undefined,
        search: search as string | undefined,
      };
      
      const pagination = {
        page: Number(page),
        limit: Number(limit),
      };
      
      const result = await eventService.getEvents(filters, pagination);
      
      res.json({
        success: true,
        data: result.events,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(result.total / pagination.limit),
          hasPrev: pagination.page > 1,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch events',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // GET /api/events/:id - Get specific event by ID
  async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const event = await eventService.getEventById(id);
      
      if (!event) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.json({
        success: true,
        data: event,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch event',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // POST /api/events - Create new event
  async createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const eventData = req.body;
      const authorId = (req as AuthenticatedRequest).user!.id;
      
      const event = await eventService.createEvent({
        ...eventData,
        authorId,
      });
      
      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating event:', error);
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Event with this slug already exists',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // PUT /api/events/:id - Update existing event
  async updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Check if event exists and user has permission to edit
      const existingEvent = await eventService.getEventById(id);
      
      if (!existingEvent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check permissions: only author, editors, or admins can update
      if (existingEvent.authorId !== userId && userRole !== 'EDITOR' && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this event',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const updatedEvent = await eventService.updateEvent(id, updateData);
      
      res.json({
        success: true,
        data: updatedEvent,
        message: 'Event updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating event:', error);
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Event with this slug already exists',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update event',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // DELETE /api/events/:id - Delete event
  async deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Check if event exists and user has permission to delete
      const existingEvent = await eventService.getEventById(id);
      
      if (!existingEvent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check permissions: only author, editors, or admins can delete
      if (existingEvent.authorId !== userId && userRole !== 'EDITOR' && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this event',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      await eventService.deleteEvent(id);
      
      res.json({
        success: true,
        message: 'Event deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete event',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // POST /api/events/:id/register - Register for event
  async registerForEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;
      const registrationData = req.body;
      
      // If user is authenticated, get their ID
      const userId = (req as AuthenticatedRequest).user?.id;
      
      const registration = await eventService.registerForEvent({
        eventId,
        userId,
        ...registrationData,
      });
      
      res.status(201).json({
        success: true,
        data: registration,
        message: 'Successfully registered for event',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error registering for event:', error);
      
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message === 'Event not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Event not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        
        if (error.message === 'Registration is not enabled for this event') {
          res.status(400).json({
            success: false,
            error: {
              code: 'REGISTRATION_DISABLED',
              message: 'Registration is not enabled for this event',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        
        if (error.message === 'Registration deadline has passed') {
          res.status(400).json({
            success: false,
            error: {
              code: 'REGISTRATION_CLOSED',
              message: 'Registration deadline has passed',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        
        if (error.message === 'Event is full') {
          res.status(400).json({
            success: false,
            error: {
              code: 'EVENT_FULL',
              message: 'Event is full',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        
        if (error.message === 'Email is already registered for this event') {
          res.status(409).json({
            success: false,
            error: {
              code: 'ALREADY_REGISTERED',
              message: 'Email is already registered for this event',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register for event',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // GET /api/events/:id/registrations - Get event registrations
  async getEventRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Check if event exists and user has permission to view registrations
      const existingEvent = await eventService.getEventById(eventId);
      
      if (!existingEvent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check permissions: only author, editors, or admins can view registrations
      if (existingEvent.authorId !== userId && userRole !== 'EDITOR' && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view event registrations',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const pagination = {
        page: Number(page),
        limit: Number(limit),
      };
      
      const result = await eventService.getEventRegistrations(eventId, pagination);
      
      res.json({
        success: true,
        data: result.registrations,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(result.total / pagination.limit),
          hasPrev: pagination.page > 1,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching event registrations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch event registrations',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
};