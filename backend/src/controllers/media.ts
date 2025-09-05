import { Request, Response } from 'express';
import { mediaService } from '../services/media.js';
import { z } from 'zod';

// Validation schemas
const uploadQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()) : []),
  isPublic: z.string().optional().transform(val => val === 'true'),
  generateThumbnail: z.string().optional().transform(val => val !== 'false'),
  description: z.string().optional(),
  altText: z.string().optional(),
  category: z.string().optional(),
});

const galleryQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['image', 'video', 'document']).optional(),
  eventId: z.string().uuid().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

const imageSizeSchema = z.object({
  size: z.enum(['thumbnail', 'medium', 'large', 'original']).optional().default('original'),
});

export class MediaController {
  /**
   * Upload single file
   * POST /api/media/upload
   */
  async uploadSingle(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded',
          },
        });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const queryParams = uploadQuerySchema.parse(req.query);
      
      const result = await mediaService.uploadFile(file, userId, {
        eventId: queryParams.eventId,
        tags: queryParams.tags,
        isPublic: queryParams.isPublic,
        generateThumbnail: queryParams.generateThumbnail,
        description: queryParams.description,
        altText: queryParams.altText,
        category: queryParams.category,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload file',
        },
      });
    }
  }

  /**
   * Upload multiple files
   * POST /api/media/upload/multiple
   */
  async uploadMultiple(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES_UPLOADED',
            message: 'No files were uploaded',
          },
        });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const queryParams = uploadQuerySchema.parse(req.query);
      
      const results = await mediaService.uploadMultipleFiles(files, userId, {
        eventId: queryParams.eventId,
        tags: queryParams.tags,
        isPublic: queryParams.isPublic,
        generateThumbnail: queryParams.generateThumbnail,
        description: queryParams.description,
        altText: queryParams.altText,
        category: queryParams.category,
      });

      res.status(201).json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload files',
        },
      });
    }
  }

  /**
   * Get media by ID
   * GET /api/media/:id
   */
  async getMedia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { size } = imageSizeSchema.parse(req.query);

      const media = await mediaService.getMedia(id, size);
      
      if (!media) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: 'Media not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      console.error('Get media error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch media',
        },
      });
    }
  }

  /**
   * Get event gallery
   * GET /api/media/gallery/:eventId
   */
  async getEventGallery(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { page, limit } = galleryQuerySchema.parse(req.query);

      const gallery = await mediaService.getEventGallery(eventId, page, limit);

      res.json({
        success: true,
        data: gallery,
      });
    } catch (error) {
      console.error('Get gallery error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch gallery',
        },
      });
    }
  }

  /**
   * Get photo gallery for an event
   * GET /api/media/gallery/:eventId/photos
   */
  async getPhotoGallery(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { page, limit } = galleryQuerySchema.parse(req.query);

      const gallery = await mediaService.getPhotoGallery(eventId, page, limit);

      res.json({
        success: true,
        data: gallery,
      });
    } catch (error) {
      console.error('Get photo gallery error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch photo gallery',
        },
      });
    }
  }

  /**
   * Get video gallery for an event with story format
   * GET /api/media/gallery/:eventId/videos
   */
  async getVideoGallery(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { page, limit } = galleryQuerySchema.parse(req.query);

      const gallery = await mediaService.getVideoGallery(eventId, page, limit);

      res.json({
        success: true,
        data: gallery,
      });
    } catch (error) {
      console.error('Get video gallery error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch video gallery',
        },
      });
    }
  }

  /**
   * Search media
   * GET /api/media/search
   */
  async searchMedia(req: Request, res: Response): Promise<void> {
    try {
      const { q, type, eventId, page, limit } = searchQuerySchema.parse(req.query);

      const results = await mediaService.searchMedia(q, type, eventId, page, limit);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Search media error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search media',
        },
      });
    }
  }

  /**
   * Delete media
   * DELETE /api/media/:id
   */
  async deleteMedia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const deleted = await mediaService.deleteMedia(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: 'Media not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Media deleted successfully',
      });
    } catch (error) {
      console.error('Delete media error:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete media',
        },
      });
    }
  }

  /**
   * Update media metadata (tags, etc.)
   * PUT /api/media/:id
   */
  async updateMedia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const updateSchema = z.object({
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        altText: z.string().optional(),
        category: z.string().optional(),
      });

      const updateData = updateSchema.parse(req.body);

      const updated = await mediaService.updateMediaMetadata(id, updateData, userId);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: 'Media not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Media updated successfully',
        data: { id, ...updateData },
      });
    } catch (error) {
      console.error('Update media error:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update media',
        },
      });
    }
  }

  /**
   * Get download URL for media
   * GET /api/media/:id/download
   */
  async getDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const downloadUrl = await mediaService.getDownloadUrl(id, userId);

      res.json({
        success: true,
        data: {
          downloadUrl,
          expiresIn: 3600, // 1 hour
        },
      });
    } catch (error) {
      console.error('Get download URL error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'MEDIA_NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        
        if (error.message.includes('Access denied')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to generate download URL',
        },
      });
    }
  }

  /**
   * Get media by tags
   * GET /api/media/tags
   */
  async getMediaByTags(req: Request, res: Response): Promise<void> {
    try {
      const tagsQuerySchema = z.object({
        tags: z.string().transform(val => val.split(',').map(tag => tag.trim())),
        eventId: z.string().uuid().optional(),
        page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
      });

      const { tags, eventId, page, limit } = tagsQuerySchema.parse(req.query);

      const results = await mediaService.getMediaByTags(tags, eventId, page, limit);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Get media by tags error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch media by tags',
        },
      });
    }
  }

  /**
   * Validate file before upload
   * POST /api/media/validate
   */
  async validateFile(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded for validation',
          },
        });
        return;
      }

      const validation = await mediaService.validateFileForUpload(file);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('File validation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Failed to validate file',
        },
      });
    }
  }

  /**
   * Bulk delete media files
   * DELETE /api/media/bulk
   */
  async bulkDeleteMedia(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const bulkDeleteSchema = z.object({
        ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
      });

      const { ids } = bulkDeleteSchema.parse(req.body);

      const result = await mediaService.bulkDeleteMedia(ids, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_DELETE_FAILED',
          message: 'Failed to delete media files',
        },
      });
    }
  }

  /**
   * Get media statistics
   * GET /api/media/statistics
   */
  async getMediaStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statsQuerySchema = z.object({
        userId: z.string().uuid().optional(),
        eventId: z.string().uuid().optional(),
        type: z.enum(['image', 'video', 'document']).optional(),
      });

      const filters = statsQuerySchema.parse(req.query);

      const statistics = await mediaService.getMediaStatistics(filters);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_FAILED',
          message: 'Failed to fetch media statistics',
        },
      });
    }
  }
}

export const mediaController = new MediaController();