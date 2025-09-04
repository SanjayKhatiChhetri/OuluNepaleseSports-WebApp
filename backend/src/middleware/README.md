# Middleware Documentation

## Validation Middleware

The validation middleware provides comprehensive request validation using Zod schemas. It validates request body, parameters, and query strings according to predefined schemas.

### Usage

```typescript
import { validate, validationSchemas } from './middleware';

// Validate request body for user registration
app.post('/api/auth/register', 
  validate(validationSchemas.auth.register),
  (req, res) => {
    // req.body is now validated and typed
    const { email, password, name, phone } = req.body;
    // ... handle registration
  }
);

// Validate URL parameters
app.get('/api/content/:id',
  validate(validationSchemas.content.getById),
  (req, res) => {
    // req.params.id is now validated as UUID
    const { id } = req.params;
    // ... handle get content
  }
);

// Validate query parameters
app.get('/api/content',
  validate(validationSchemas.content.list),
  (req, res) => {
    // req.query is now validated and typed
    const { page, limit, type, search } = req.query;
    // ... handle list content
  }
);
```

### Available Validation Schemas

#### Authentication
- `validationSchemas.auth.register` - User registration
- `validationSchemas.auth.login` - User login
- `validationSchemas.auth.resetPassword` - Password reset request
- `validationSchemas.auth.changePassword` - Password change

#### Content Management
- `validationSchemas.content.create` - Create content
- `validationSchemas.content.update` - Update content
- `validationSchemas.content.getById` - Get content by ID
- `validationSchemas.content.list` - List content with pagination

#### Events
- `validationSchemas.event.create` - Create event
- `validationSchemas.event.register` - Register for event

#### Media
- `validationSchemas.media.upload` - Upload media
- `validationSchemas.media.getGallery` - Get media gallery
- `validationSchemas.media.updateTags` - Update media tags

#### User Management
- `validationSchemas.user.updateProfile` - Update user profile
- `validationSchemas.user.updateRole` - Update user role
- `validationSchemas.user.list` - List users

#### Social Media
- `validationSchemas.social.publish` - Publish to social media
- `validationSchemas.social.getStatus` - Get publish status

### Common Schemas

The middleware also provides common validation schemas that can be reused:

```typescript
import { commonSchemas } from './middleware';

// UUID validation
commonSchemas.uuid

// Email validation
commonSchemas.email

// Password validation (min 8 chars, letter + number)
commonSchemas.password

// Phone number validation
commonSchemas.phone

// Pagination parameters
commonSchemas.pagination

// Date string validation
commonSchemas.dateString

// Enum validations
commonSchemas.contentType // 'announcement' | 'news' | 'event'
commonSchemas.userRole    // 'visitor' | 'member' | 'editor' | 'admin'
commonSchemas.mediaType   // 'image' | 'video' | 'document'
```

### Error Response Format

When validation fails, the middleware returns a standardized error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Rate Limiting Middleware

The rate limiting middleware provides protection against abuse and ensures API stability.

### Usage

```typescript
import { rateLimiters, authRateLimit, contentCreationRateLimit } from './middleware';

// Apply general rate limiting to all API routes
app.use('/api', rateLimiters.general);

// Apply specific rate limiting to authentication routes
app.post('/api/auth/login', authRateLimit, loginHandler);

// Apply content creation rate limiting
app.post('/api/content', contentCreationRateLimit, createContentHandler);
```

### Available Rate Limiters

- `generalRateLimit` - 100 requests per 15 minutes (all routes)
- `authRateLimit` - 5 requests per 15 minutes (authentication)
- `passwordResetRateLimit` - 3 requests per hour (password reset)
- `contentCreationRateLimit` - 50 requests per hour (content creation)
- `mediaUploadRateLimit` - 20 requests per hour (media uploads)
- `eventRegistrationRateLimit` - 10 requests per hour (event registration)
- `socialMediaRateLimit` - 10 requests per hour (social media publishing)
- `contactFormRateLimit` - 5 requests per hour (contact form)

### Speed Limiters

Speed limiters add progressive delays to repeated requests:

- `speedLimiter` - General speed limiting (100ms delay after 50 requests)
- `authSpeedLimiter` - Authentication speed limiting (500ms delay after 2 requests)

### Custom Rate Limiters

You can create custom rate limiters for specific needs:

```typescript
import { createCustomRateLimit } from './middleware';

const customRateLimit = createCustomRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25, // 25 requests per hour
  message: 'Custom rate limit exceeded',
  skipSuccessfulRequests: true,
});

app.use('/api/custom-endpoint', customRateLimit, handler);
```

### Rate Limit Headers

Rate limiting middleware automatically adds headers to responses:

- `RateLimit-Limit` - The rate limit ceiling for that given request
- `RateLimit-Remaining` - The number of requests left for the time window
- `RateLimit-Reset` - The time at which the rate limit window resets

### Error Response Format

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later."
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Integration Example

Here's how to integrate both validation and rate limiting in a complete route:

```typescript
import express from 'express';
import { 
  validate, 
  validationSchemas, 
  authRateLimit, 
  authSpeedLimiter 
} from './middleware';

const app = express();

// User registration endpoint with validation and rate limiting
app.post('/api/auth/register',
  authRateLimit,           // Rate limiting
  authSpeedLimiter,        // Speed limiting
  validate(validationSchemas.auth.register), // Validation
  async (req, res) => {
    try {
      // req.body is now validated and typed
      const { email, password, name, phone } = req.body;
      
      // Handle registration logic
      const user = await createUser({ email, password, name, phone });
      
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
```

This ensures that:
1. Requests are rate-limited to prevent abuse
2. Request data is validated before processing
3. Errors are handled consistently
4. Response format is standardized