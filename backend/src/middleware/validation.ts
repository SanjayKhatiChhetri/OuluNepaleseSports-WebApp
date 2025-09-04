import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation (minimum 8 characters, at least one letter and one number)
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  
  // Phone number validation (optional)
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional(),
  
  // Pagination parameters
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0, 'Page must be greater than 0').optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  }),
  
  // Date validation
  dateString: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  
  // Content type validation
  contentType: z.enum(['ANNOUNCEMENT', 'NEWS', 'EVENT'], {
    errorMap: () => ({ message: 'Content type must be ANNOUNCEMENT, NEWS, or EVENT' })
  }),
  
  // User role validation
  userRole: z.enum(['VISITOR', 'MEMBER', 'EDITOR', 'ADMIN'], {
    errorMap: () => ({ message: 'Invalid user role' })
  }),
  
  // Media type validation
  mediaType: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT'], {
    errorMap: () => ({ message: 'Media type must be IMAGE, VIDEO, or DOCUMENT' })
  }),
};

// Validation middleware factory
export const validate = (schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      // Validate request parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validationErrors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Handle unexpected errors
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during validation',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };
};

// Specific validation schemas for different endpoints
export const validationSchemas = {
  // Authentication schemas
  auth: {
    register: {
      body: z.object({
        email: commonSchemas.email,
        password: commonSchemas.password,
        name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be less than 100 characters'),
        phone: commonSchemas.phone,
      }),
    },
    
    login: {
      body: z.object({
        email: commonSchemas.email,
        password: z.string().min(1, 'Password is required'),
        rememberMe: z.boolean().optional(),
      }),
    },
    
    resetPassword: {
      body: z.object({
        email: commonSchemas.email,
      }),
    },
    
    changePassword: {
      body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: commonSchemas.password,
      }),
    },
  },
  
  // Content management schemas
  content: {
    create: {
      body: z.object({
        type: commonSchemas.contentType,
        title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
        content: z.string().min(1, 'Content is required'),
        featuredImage: z.string().url('Invalid image URL').optional(),
        isPublished: z.boolean().optional().default(false),
        publishedAt: commonSchemas.dateString.optional(),
        scheduledAt: commonSchemas.dateString.optional(),
        priority: z.number().int().min(1).max(10).optional(),
      }),
    },
    
    update: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
      body: z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
        content: z.string().min(1, 'Content is required').optional(),
        featuredImage: z.string().url('Invalid image URL').optional(),
        isPublished: z.boolean().optional(),
        publishedAt: commonSchemas.dateString.optional(),
        scheduledAt: commonSchemas.dateString.optional(),
        priority: z.number().int().min(1).max(10).optional(),
      }),
    },
    
    getById: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
    },
    
    list: {
      query: commonSchemas.pagination.extend({
        type: commonSchemas.contentType.optional(),
        isPublished: z.string().transform(val => val === 'true').optional(),
        search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
      }),
    },
  },
  
  // Event schemas
  event: {
    create: {
      body: z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
        description: z.string().min(1, 'Description is required'),
        date: commonSchemas.dateString,
        time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
        location: z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters'),
        maxParticipants: z.number().int().positive('Max participants must be a positive number').optional(),
        registrationDeadline: commonSchemas.dateString.optional(),
        registrationEnabled: z.boolean().optional().default(true),
        featuredImage: z.string().url('Invalid image URL').optional(),
        isPublished: z.boolean().optional().default(false),
        publishedAt: commonSchemas.dateString.optional(),
        scheduledAt: commonSchemas.dateString.optional(),
      }),
    },
    
    update: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
      body: z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
        description: z.string().min(1, 'Description is required').optional(),
        date: commonSchemas.dateString.optional(),
        time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
        location: z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters').optional(),
        maxParticipants: z.number().int().positive('Max participants must be a positive number').optional(),
        registrationDeadline: commonSchemas.dateString.optional(),
        registrationEnabled: z.boolean().optional(),
        featuredImage: z.string().url('Invalid image URL').optional(),
        isPublished: z.boolean().optional(),
        publishedAt: commonSchemas.dateString.optional(),
        scheduledAt: commonSchemas.dateString.optional(),
      }),
    },
    
    getById: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
    },
    
    list: {
      query: commonSchemas.pagination.extend({
        dateFrom: commonSchemas.dateString.optional(),
        dateTo: commonSchemas.dateString.optional(),
        location: z.string().max(100, 'Location filter must be less than 100 characters').optional(),
        registrationEnabled: z.string().transform(val => val === 'true').optional(),
        search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
      }),
    },
    
    register: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
      body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be less than 100 characters'),
        email: commonSchemas.email,
        phone: commonSchemas.phone,
        dietaryRestrictions: z.string().max(500, 'Dietary restrictions must be less than 500 characters').optional(),
        emergencyContact: z.string().max(200, 'Emergency contact must be less than 200 characters').optional(),
      }),
    },
    
    getRegistrations: {
      params: z.object({
        id: commonSchemas.uuid,
      }),
      query: commonSchemas.pagination,
    },
  },
  
  // Media schemas
  media: {
    upload: {
      body: z.object({
        category: commonSchemas.mediaType,
        eventId: commonSchemas.uuid.optional(),
        tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
        isPublic: z.boolean().optional().default(false),
      }),
    },
    
    getGallery: {
      params: z.object({
        eventId: commonSchemas.uuid,
      }),
      query: commonSchemas.pagination.extend({
        type: commonSchemas.mediaType.optional(),
      }),
    },
    
    updateTags: {
      params: z.object({
        mediaId: commonSchemas.uuid,
      }),
      body: z.object({
        tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed'),
      }),
    },
  },
  
  // User management schemas
  user: {
    updateProfile: {
      body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be less than 100 characters').optional(),
        phone: commonSchemas.phone,
        profileImage: z.string().url('Invalid image URL').optional(),
      }),
    },
    
    updateRole: {
      params: z.object({
        userId: commonSchemas.uuid,
      }),
      body: z.object({
        role: commonSchemas.userRole,
      }),
    },
    
    list: {
      query: commonSchemas.pagination.extend({
        role: commonSchemas.userRole.optional(),
        isActive: z.string().transform(val => val === 'true').optional(),
        search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
      }),
    },
  },
  
  // Social media schemas
  social: {
    publish: {
      body: z.object({
        contentId: commonSchemas.uuid,
        platforms: z.array(z.enum(['facebook', 'instagram'])).min(1, 'At least one platform must be selected'),
        scheduledAt: commonSchemas.dateString.optional(),
        customMessage: z.string().max(500, 'Custom message must be less than 500 characters').optional(),
      }),
    },
    
    getStatus: {
      params: z.object({
        publishId: commonSchemas.uuid,
      }),
    },
  },
};