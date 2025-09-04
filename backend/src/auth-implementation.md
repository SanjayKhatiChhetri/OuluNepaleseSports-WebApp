# WorkOS Authentication Implementation

## Overview

This implementation provides a complete authentication system using WorkOS for OAuth and traditional email/password authentication with JWT tokens.

## Features Implemented

### 1. WorkOS SDK Integration
- ✅ WorkOS client configuration
- ✅ OAuth provider support (Google, Facebook)
- ✅ Authorization URL generation
- ✅ OAuth callback handling

### 2. JWT Token Management
- ✅ Access token generation and verification
- ✅ Refresh token support
- ✅ Secure token extraction from headers and cookies
- ✅ Token expiration handling

### 3. Authentication Middleware
- ✅ `authenticate` - Required authentication
- ✅ `optionalAuthenticate` - Optional authentication
- ✅ `authorize` - Role-based authorization
- ✅ `requireEmailVerification` - Email verification requirement
- ✅ Convenience middleware: `requireMember`, `requireEditor`, `requireAdmin`

### 4. Authentication Routes
- ✅ `GET /api/auth/login/:provider` - Initiate OAuth login
- ✅ `GET /api/auth/callback` - Handle OAuth callback
- ✅ `POST /api/auth/login` - Email/password login
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/logout` - User logout
- ✅ `GET /api/auth/profile` - Get user profile
- ✅ `PUT /api/auth/profile` - Update user profile
- ✅ `GET /api/auth/health` - Authentication service health check

### 5. Security Features
- ✅ HTTP-only cookies for token storage
- ✅ Secure cookie configuration for production
- ✅ Rate limiting on authentication endpoints
- ✅ Request validation with Zod schemas
- ✅ Password hashing with bcrypt
- ✅ CORS and security headers

## Environment Variables Required

```env
# WorkOS Configuration
WORKOS_API_KEY=your_workos_api_key
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_REDIRECT_URI=http://localhost:3001/api/auth/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### 1. Protecting Routes
```typescript
import { authenticate, requireMember, requireAdmin } from '../middleware';

// Require authentication
router.get('/protected', authenticate, handler);

// Require member role or higher
router.get('/member-only', requireMember, handler);

// Require admin role
router.get('/admin-only', requireAdmin, handler);
```

### 2. OAuth Login Flow
```typescript
// 1. Frontend redirects to: GET /api/auth/login/google
// 2. User completes OAuth flow
// 3. WorkOS redirects to: GET /api/auth/callback?code=...
// 4. Backend sets cookies and redirects to frontend
```

### 3. Traditional Login
```typescript
// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

### 4. Accessing User in Controllers
```typescript
export const protectedHandler = (req: Request, res: Response) => {
  // User is available after authentication middleware
  const user = req.user; // { id, email, name, role, isActive, emailVerified }
  const jwtPayload = req.jwtPayload; // JWT payload with additional data
};
```

## Database Integration

The authentication system integrates with the Prisma User model:

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    // Empty for OAuth users
  name          String
  phone         String?
  profileImage  String?
  role          String    @default("member")
  isActive      Boolean   @default(false)
  emailVerified Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## Error Handling

The system provides standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common error codes:
- `UNAUTHORIZED` - No token or invalid token
- `TOKEN_EXPIRED` - Token has expired
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Request validation failed
- `ACCOUNT_DEACTIVATED` - User account is deactivated

## Testing

The implementation includes comprehensive error handling and validation. To test:

1. Start the server: `npm run dev`
2. Check health: `GET http://localhost:3001/api/auth/health`
3. Test OAuth: `GET http://localhost:3001/api/auth/login/google`
4. Test validation: Send invalid data to any endpoint

## Next Steps

1. Set up WorkOS dashboard with OAuth providers
2. Configure environment variables
3. Test OAuth flow with real providers
4. Implement email verification system
5. Add password reset functionality