# Database Schema Documentation

## Overview

This directory contains the Prisma schema and database-related files for the ONS WebApp backend. The database uses PostgreSQL and is designed to support a community platform with user management, content management, events, media galleries, and social media integration.

## Schema Structure

### Core Models

#### User Model
- **Purpose**: Manages user authentication and authorization
- **Key Features**: 
  - UUID primary keys for security
  - Role-based access control (VISITOR, MEMBER, EDITOR, ADMIN)
  - Email verification and account activation
  - Audit timestamps (createdAt, updatedAt)

#### Content Model
- **Purpose**: Base model for all content types (announcements, news, events)
- **Key Features**:
  - Polymorphic content types
  - SEO-friendly slugs
  - Publishing workflow (draft/published/scheduled)
  - Priority ordering for announcements
  - Rich text content support

#### Event Model
- **Purpose**: Extends content for event-specific functionality
- **Key Features**:
  - One-to-one relationship with Content
  - Registration management with capacity limits
  - Date/time and location tracking
  - Registration deadline enforcement

#### Media Model
- **Purpose**: Handles file uploads and media galleries
- **Key Features**:
  - Support for images, videos, and documents
  - Thumbnail generation support
  - Tag-based organization
  - Public/private access control
  - File metadata tracking

#### EventRegistration Model
- **Purpose**: Manages event sign-ups and attendee information
- **Key Features**:
  - Support for both member and guest registrations
  - Dietary restrictions and emergency contact info
  - Registration status tracking
  - Duplicate prevention (unique constraint on event + email)

### Supporting Models

#### ContentTranslation Model
- **Purpose**: Multilingual content support
- **Languages**: Finnish (fi), English (en), Nepali (ne)
- **Features**: Title and content translation with language-specific unique constraints

#### SocialPost Model
- **Purpose**: Social media integration tracking
- **Platforms**: Facebook, Instagram
- **Features**: Publishing status tracking, error handling, scheduling support

## Database Setup

### Prerequisites
- PostgreSQL database (local or cloud-hosted like Neon)
- Node.js and npm installed
- Environment variables configured in `.env`

### Environment Variables
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ons_webapp?schema=public"
```

### Commands

#### Generate Prisma Client
```bash
npm run db:generate
# or
npx prisma generate
```

#### Apply Migrations (when database is available)
```bash
npm run db:migrate
# or
npx prisma migrate dev
```

#### Reset Database (development only)
```bash
npm run db:reset
# or
npx prisma migrate reset
```

#### Seed Database with Sample Data
```bash
npm run db:seed
# or
npx tsx prisma/seed.ts
```

#### Open Prisma Studio (database browser)
```bash
npm run db:studio
# or
npx prisma studio
```

## Sample Data

The seed script (`prisma/seed.ts`) creates:

### Test Users
- **Admin**: admin@ons-webapp.com / admin123
- **Editor**: editor@ons-webapp.com / editor123  
- **Member**: member@ons-webapp.com / member123
- **Member2**: member2@ons-webapp.com / member123

### Sample Content
- 2 announcements with different priorities
- 2 news articles with rich content
- 2 events with registration capabilities
- 3 event registrations (including guest registration)
- 2 media files (image and video)
- 2 content translations (Finnish and Nepali)

## Schema Verification

Run the schema verification script to ensure everything is set up correctly:

```bash
npx tsx src/verify-schema.ts
```

This script verifies:
- Prisma client generation
- Model availability
- Enum definitions
- Type safety
- Relationship configurations

## Key Design Decisions

### Security
- UUID primary keys instead of auto-incrementing integers
- Soft deletes using CASCADE relationships where appropriate
- Password hashing with bcrypt (handled in application layer)
- Input validation at database level with constraints

### Performance
- Composite indexes on frequently queried combinations
- Proper foreign key relationships for query optimization
- JSON arrays for flexible metadata (tags, etc.)
- Efficient pagination support with cursor-based queries

### Scalability
- Separate models for different content types while maintaining relationships
- Flexible media handling supporting multiple storage backends
- Extensible user role system
- Multilingual support without schema changes

### Data Integrity
- Foreign key constraints with appropriate cascade behaviors
- Unique constraints to prevent duplicates
- Required fields for essential data
- Enum types for controlled vocabularies

## Migration Strategy

### Development
- Use `prisma migrate dev` for schema changes
- Migrations are automatically generated and applied
- Database is reset and seeded as needed

### Production
- Use `prisma migrate deploy` for production deployments
- Migrations are applied without prompts
- No automatic seeding in production
- Backup database before major migrations

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Check network connectivity for cloud databases

2. **Migration Errors**
   - Check for schema conflicts
   - Verify database permissions
   - Review migration files for syntax errors

3. **Type Errors**
   - Run `npx prisma generate` after schema changes
   - Restart TypeScript server in IDE
   - Check import paths for generated types

### Useful Commands

```bash
# Check database connection
npx prisma db pull

# View current schema
npx prisma db pull --print

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Next Steps

After completing the database setup:

1. **Backend API Implementation** (Task 3.1)
   - Set up Express.js server with middleware
   - Implement authentication endpoints
   - Create CRUD operations for each model

2. **Authentication Integration** (Task 3.2)
   - Integrate WorkOS for OAuth
   - Implement JWT token management
   - Set up role-based access control

3. **Content Management APIs** (Task 4.1-4.2)
   - Build REST endpoints for content operations
   - Implement search and filtering
   - Add validation and sanitization