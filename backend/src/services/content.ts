import { PrismaClient } from '../../generated/prisma';
import { ContentType } from '../types/enums';
import { sanitizeHtml } from '../utils/sanitization';
import { generateSlug } from '../utils/slug';

const prisma = new PrismaClient();

export interface ContentFilters {
  type?: string;
  isPublished?: boolean;
  search?: string;
}

export interface ContentPagination {
  page: number;
  limit: number;
}

export interface CreateContentData {
  type: ContentType;
  title: string;
  content: string;
  featuredImage?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  priority?: number;
  authorId: string;
}

export interface UpdateContentData {
  title?: string;
  content?: string;
  featuredImage?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  priority?: number;
}

export const contentService = {
  // Get content with filtering and pagination
  async getContent(filters: ContentFilters, pagination: ContentPagination) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (filters.type) {
      where.type = filters.type.toUpperCase() as ContentType;
    }
    
    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    // Get content with author information
    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // Higher priority first for announcements
          { createdAt: 'desc' }, // Then by creation date
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              media: true,
              translations: true,
            },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);
    
    return {
      content,
      total,
    };
  },

  // Get content by ID
  async getContentById(id: string) {
    return await prisma.content.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            type: true,
            filename: true,
          },
        },
        translations: true,
        event: {
          include: {
            registrations: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });
  },

  // Create new content
  async createContent(data: CreateContentData) {
    // Sanitize HTML content to prevent XSS
    const sanitizedContent = sanitizeHtml(data.content);
    
    // Generate slug from title
    const baseSlug = generateSlug(data.title);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await prisma.content.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Parse dates if provided
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    
    // If content is published but no publishedAt date, set it to now
    const finalPublishedAt = data.isPublished && !publishedAt ? new Date() : publishedAt;
    
    const content = await prisma.content.create({
      data: {
        type: data.type,
        title: data.title,
        content: sanitizedContent,
        slug,
        featuredImage: data.featuredImage,
        isPublished: data.isPublished || false,
        publishedAt: finalPublishedAt,
        scheduledAt,
        priority: data.priority,
        authorId: data.authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return content;
  },

  // Update existing content
  async updateContent(id: string, data: UpdateContentData) {
    const updateData: any = {};
    
    if (data.title !== undefined) {
      updateData.title = data.title;
      // Regenerate slug if title changes
      const baseSlug = generateSlug(data.title);
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure slug is unique (excluding current content)
      while (await prisma.content.findFirst({ 
        where: { 
          slug,
          NOT: { id }
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }
    
    if (data.content !== undefined) {
      updateData.content = sanitizeHtml(data.content);
    }
    
    if (data.featuredImage !== undefined) {
      updateData.featuredImage = data.featuredImage;
    }
    
    if (data.isPublished !== undefined) {
      updateData.isPublished = data.isPublished;
      
      // If publishing for the first time, set publishedAt
      if (data.isPublished && !data.publishedAt) {
        const existingContent = await prisma.content.findUnique({
          where: { id },
          select: { publishedAt: true },
        });
        
        if (!existingContent?.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
    }
    
    if (data.publishedAt !== undefined) {
      updateData.publishedAt = new Date(data.publishedAt);
    }
    
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(data.scheduledAt);
    }
    
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    
    const updatedContent = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return updatedContent;
  },

  // Delete content
  async deleteContent(id: string) {
    await prisma.content.delete({
      where: { id },
    });
  },

  // Get published content for public access
  async getPublishedContent(type?: ContentType, limit: number = 10) {
    const where: any = {
      isPublished: true,
      publishedAt: {
        lte: new Date(), // Only show content that should be published by now
      },
    };
    
    if (type) {
      where.type = type;
    }
    
    return await prisma.content.findMany({
      where,
      take: limit,
      orderBy: [
        { priority: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },
};