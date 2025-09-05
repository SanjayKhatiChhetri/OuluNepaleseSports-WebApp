# Media Gallery API Documentation

## Overview

This document describes the media gallery APIs implemented for Task 5.2 of the ONS WebApp. The APIs provide comprehensive media management functionality including photo galleries, video galleries with story format support, media tagging, search functionality, and secure download endpoints with access control.

## API Endpoints

### 1. Photo Gallery Endpoints

#### Get Event Photo Gallery
```
GET /api/media/gallery/:eventId/photos
```

**Description:** Retrieves all photos for a specific event with pagination support.

**Parameters:**
- `eventId` (path): UUID of the event
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "uuid",
        "filename": "unique-filename.jpg",
        "originalName": "original-photo.jpg",
        "url": "https://imagekit.io/path/to/image",
        "thumbnailUrl": "https://imagekit.io/path/to/thumbnail",
        "type": "image",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "tags": ["event", "sports", "team"],
        "uploadedBy": {
          "id": "user-uuid",
          "name": "User Name"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 50,
    "hasMore": true,
    "currentPage": 1,
    "totalPages": 3
  }
}
```

### 2. Video Gallery Endpoints

#### Get Event Video Gallery (Story Format)
```
GET /api/media/gallery/:eventId/videos
```

**Description:** Retrieves all videos for a specific event with story format support, including auto-play settings and expiration dates.

**Parameters:**
- `eventId` (path): UUID of the event
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 10, optimized for story format)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "uuid",
        "filename": "unique-video.mp4",
        "originalName": "original-video.mp4",
        "url": "https://r2.cloudflare.com/path/to/video",
        "thumbnailUrl": "https://imagekit.io/path/to/thumbnail",
        "type": "video",
        "size": 5120000,
        "mimeType": "video/mp4",
        "tags": ["event", "highlights"],
        "uploadedBy": {
          "id": "user-uuid",
          "name": "User Name"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "duration": 45,
        "autoPlay": true,
        "expiresAt": "2024-01-31T00:00:00.000Z"
      }
    ],
    "totalCount": 15,
    "hasMore": true,
    "currentPage": 1,
    "totalPages": 2,
    "storyFormat": true
  }
}
```

### 3. Media Tagging and Search

#### Search Media by Tags
```
GET /api/media/tags?tags=tag1,tag2&eventId=uuid&page=1&limit=20
```

**Description:** Retrieves media filtered by specific tags.

**Parameters:**
- `tags` (query): Comma-separated list of tags to search for
- `eventId` (query, optional): Filter by specific event
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "id": "uuid",
        "filename": "tagged-media.jpg",
        "originalName": "original-name.jpg",
        "url": "https://imagekit.io/path/to/media",
        "thumbnailUrl": "https://imagekit.io/path/to/thumbnail",
        "type": "image",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "tags": ["tag1", "tag2", "event"],
        "uploadedBy": {
          "id": "user-uuid",
          "name": "User Name"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 25,
    "hasMore": true,
    "currentPage": 1,
    "totalPages": 2
  }
}
```

#### Update Media Tags
```
PUT /api/media/:id
```

**Description:** Updates tags for a specific media item. Only the media owner or admin can update tags.

**Parameters:**
- `id` (path): UUID of the media item

**Request Body:**
```json
{
  "tags": ["new-tag", "updated-tag", "event"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Media updated successfully",
  "data": {
    "id": "media-uuid",
    "tags": ["new-tag", "updated-tag", "event"]
  }
}
```

### 4. Download Endpoints with Access Control

#### Get Secure Download URL
```
GET /api/media/:id/download
```

**Description:** Generates a secure, time-limited download URL for media with proper access control.

**Access Control Rules:**
1. Media is public
2. User is the uploader
3. User is admin
4. User is a member (for member-exclusive content)

**Parameters:**
- `id` (path): UUID of the media item

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://r2.cloudflare.com/signed-url-with-token",
    "expiresIn": 3600
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Access denied to this media"
  }
}
```

### 5. Enhanced General Gallery Endpoint

#### Get Complete Event Gallery
```
GET /api/media/gallery/:eventId
```

**Description:** Retrieves all media (photos, videos, documents) for an event. This is the original endpoint enhanced with better organization.

**Parameters:**
- `eventId` (path): UUID of the event
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "id": "uuid",
        "filename": "media-file.jpg",
        "originalName": "original-name.jpg",
        "url": "https://imagekit.io/path/to/media",
        "thumbnailUrl": "https://imagekit.io/path/to/thumbnail",
        "type": "image",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "tags": ["event", "team"],
        "uploadedBy": {
          "id": "user-uuid",
          "name": "User Name"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 75,
    "hasMore": true,
    "currentPage": 1,
    "totalPages": 4
  }
}
```

## Authentication

All media gallery endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Error Handling

### Common Error Codes

- `UNAUTHORIZED` (401): User not authenticated
- `FORBIDDEN` (403): User lacks permission for the operation
- `MEDIA_NOT_FOUND` (404): Requested media does not exist
- `ACCESS_DENIED` (403): User doesn't have access to the media
- `FETCH_FAILED` (500): Server error during data retrieval
- `UPDATE_FAILED` (500): Server error during update operation
- `DOWNLOAD_FAILED` (500): Server error during download URL generation

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Features Implemented

### ✅ Photo Gallery Support
- Dedicated photo-only endpoint
- Thumbnail generation and optimization
- Lazy loading support with pagination
- Tag-based organization

### ✅ Video Gallery with Story Format
- Story-format optimized pagination (10 items per page)
- Auto-play configuration
- Video duration estimation
- Expiration date handling (30 days)
- Thumbnail generation for videos

### ✅ Media Tagging System
- Tag-based search and filtering
- Tag update functionality with access control
- Multi-tag search support
- Tag-based media organization

### ✅ Secure Download System
- Access control based on user roles and ownership
- Time-limited signed URLs (1 hour expiration)
- Support for all media types
- Proper error handling for access violations

### ✅ Enhanced Search Functionality
- Search by filename and tags
- Filter by media type and event
- Pagination support
- Case-insensitive search

## Integration with Existing Systems

### Cloudflare R2 Storage
- All media files stored in R2 with zero egress costs
- Organized folder structure: `media/{type}s/{filename}`
- Secure signed URLs for downloads

### ImageKit CDN
- Automatic image optimization and resizing
- Global CDN delivery
- Thumbnail generation
- Transformation support for different image sizes

### Database Integration
- PostgreSQL with Prisma ORM
- JSON storage for tags (SQLite compatible)
- Proper indexing for performance
- Audit trails with timestamps

## Performance Considerations

### Pagination
- Default limits optimized for different content types
- Photos: 20 per page
- Videos: 10 per page (story format)
- Search results: 20 per page

### Caching
- ImageKit provides automatic CDN caching
- Signed URLs cached for 1 hour
- Database queries optimized with proper indexing

### File Size Limits
- Images: Optimized to max 1920x1080, 90% quality
- Videos: Original size preserved
- Thumbnails: 300x300 for consistent loading

## Security Features

### Access Control
- Role-based permissions (visitor, member, editor, admin)
- Owner-based access for uploaded content
- Public/private media support

### File Validation
- MIME type validation
- File size limits per media type
- Malicious file detection

### URL Security
- Time-limited signed URLs
- No direct file access
- Secure token-based downloads

## Usage Examples

### Frontend Integration

```javascript
// Get photo gallery for an event
const photoGallery = await fetch('/api/media/gallery/event-uuid/photos?page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get video gallery with story format
const videoGallery = await fetch('/api/media/gallery/event-uuid/videos', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Search media by tags
const taggedMedia = await fetch('/api/media/tags?tags=sports,team&eventId=event-uuid', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get download URL
const downloadResponse = await fetch('/api/media/media-uuid/download', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { downloadUrl } = await downloadResponse.json();
```

This implementation fully satisfies the requirements for Task 5.2, providing comprehensive media gallery functionality with proper access control, tagging, search capabilities, and optimized delivery through Cloudflare R2 and ImageKit integration.