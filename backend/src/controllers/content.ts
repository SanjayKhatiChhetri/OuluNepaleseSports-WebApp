import { Request, Response } from 'express';
import { contentService } from '../services/content';
import { AuthenticatedRequest } from '../middleware/auth';

export const contentController = {
  // GET /api/content - List content with filtering and pagination
  async getContent(req: Request, res: Response): Promise<void> {
    try {
      const { type, isPublished, search, page = 1, limit = 10 } = req.query;
      
      const filters = {
        type: type as string | undefined,
        isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
        search: search as string | undefined,
      };
      
      const pagination = {
        page: Number(page),
        limit: Number(limit),
      };
      
      const result = await contentService.getContent(filters, pagination);
      
      res.json({
        success: true,
        data: result.content,
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
      console.error('Error fetching content:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // GET /api/content/:id - Get specific content by ID
  async getContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const content = await contentService.getContentById(id);
      
      if (!content) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.json({
        success: true,
        data: content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching content by ID:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // POST /api/content - Create new content
  async createContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const contentData = req.body;
      const authorId = req.user.id;
      
      const content = await contentService.createContent({
        ...contentData,
        authorId,
      });
      
      res.status(201).json({
        success: true,
        data: content,
        message: 'Content created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating content:', error);
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Content with this slug already exists',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // PUT /api/content/:id - Update existing content
  async updateContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as AuthenticatedRequest).user!.id;
      const userRole = (req as AuthenticatedRequest).user!.role;
      
      // Check if content exists and user has permission to edit
      const existingContent = await contentService.getContentById(id);
      
      if (!existingContent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check permissions: only author, editors, or admins can update
      if (existingContent.authorId !== userId && userRole !== 'EDITOR' && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this content',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const updatedContent = await contentService.updateContent(id, updateData);
      
      res.json({
        success: true,
        data: updatedContent,
        message: 'Content updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating content:', error);
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Content with this slug already exists',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },

  // DELETE /api/content/:id - Delete content
  async deleteContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user!.id;
      const userRole = (req as AuthenticatedRequest).user!.role;
      
      // Check if content exists and user has permission to delete
      const existingContent = await contentService.getContentById(id);
      
      if (!existingContent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check permissions: only author, editors, or admins can delete
      if (existingContent.authorId !== userId && userRole !== 'EDITOR' && userRole !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this content',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      await contentService.deleteContent(id);
      
      res.json({
        success: true,
        message: 'Content deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
};