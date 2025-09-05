import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  r2Client,
  R2_BUCKET_NAME,
  imageKit,
  MEDIA_CONFIG,
  MediaType,
  ImageSize,
} from '../config/media.js';
import { prisma } from '../lib/prisma.js';

export interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  type: MediaType;
  size: number;
  mimeType: string;
  tags?: string[];
  description?: string;
  altText?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface MediaProcessingOptions {
  eventId?: string;
  tags?: string[];
  isPublic?: boolean;
  generateThumbnail?: boolean;
  description?: string;
  altText?: string;
  category?: string;
}

export class MediaService {
  /**
   * Upload file to Cloudflare R2 and process with ImageKit
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedById: string,
    options: MediaProcessingOptions = {}
  ): Promise<UploadResult> {
    const {
      eventId,
      tags = [],
      isPublic = false,
      generateThumbnail = true,
      description,
      altText,
      category,
    } = options;

    // Generate unique filename
    const fileExtension = this.getFileExtension(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const mediaType = this.getMediaType(file.mimetype);

    // Validate file
    this.validateFile(file, mediaType);

    let processedBuffer = file.buffer;
    let thumbnailUrl: string | undefined;

    // Process images
    if (mediaType === 'image') {
      processedBuffer = await this.processImage(file.buffer);

      if (generateThumbnail) {
        thumbnailUrl = await this.generateThumbnail(
          file.buffer,
          uniqueFilename
        );
      }
    }

    // Upload to Cloudflare R2
    const r2Key = `media/${mediaType}s/${uniqueFilename}`;
    await this.uploadToR2(r2Key, processedBuffer, file.mimetype);

    // Get ImageKit URL for images
    let finalUrl: string;
    if (mediaType === 'image') {
      finalUrl = await this.getImageKitUrl(r2Key);
    } else {
      finalUrl = await this.getSignedUrl(r2Key);
    }

    // Prepare metadata object
    const metadata = {
      tags,
      description,
      altText,
      category,
    };

    // Save to database
    const mediaRecord = await prisma.media.create({
      data: {
        filename: uniqueFilename,
        originalName: file.originalname,
        url: finalUrl,
        thumbnailUrl,
        type: mediaType,
        size: file.size,
        mimeType: file.mimetype,
        tags: JSON.stringify(metadata), // Store all metadata as JSON string
        eventId,
        uploadedById,
        isPublic,
      },
    });

    return {
      id: mediaRecord.id,
      filename: mediaRecord.filename,
      originalName: mediaRecord.originalName,
      url: mediaRecord.url,
      thumbnailUrl: mediaRecord.thumbnailUrl || undefined,
      type: mediaRecord.type as MediaType,
      size: mediaRecord.size,
      mimeType: mediaRecord.mimeType,
      tags,
      description,
      altText,
      category,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    uploadedById: string,
    options: MediaProcessingOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, uploadedById, options)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Get media by ID with different image sizes
   */
  async getMedia(
    id: string,
    imageSize: ImageSize = 'original'
  ): Promise<UploadResult | null> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) return null;

    let url = media.url;

    // Apply ImageKit transformations for images
    if (media.type === 'image' && imageSize !== 'original') {
      url = this.getImageKitUrlWithTransformation(media.url, imageSize);
    }

    return {
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      url,
      thumbnailUrl: media.thumbnailUrl || undefined,
      type: media.type as MediaType,
      size: media.size,
      mimeType: media.mimeType,
    };
  }

  /**
   * Get media gallery for an event
   */
  async getEventGallery(eventId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [media, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({
        where: { eventId },
      }),
    ]);

    const processedMedia = media.map((item) => {
      const metadata = this.parseMediaMetadata(item.tags);
      return {
        id: item.id,
        filename: item.filename,
        originalName: item.originalName,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || undefined,
        type: item.type as MediaType,
        size: item.size,
        mimeType: item.mimeType,
        tags: metadata.tags,
        description: metadata.description,
        altText: metadata.altText,
        category: metadata.category,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      };
    });

    return {
      media: processedMedia,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Get photo gallery for an event (photos only)
   */
  async getPhotoGallery(eventId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [photos, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: {
          eventId,
          type: 'image',
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({
        where: {
          eventId,
          type: 'image',
        },
      }),
    ]);

    const processedPhotos = photos.map((item) => {
      const metadata = this.parseMediaMetadata(item.tags);
      return {
        id: item.id,
        filename: item.filename,
        originalName: item.originalName,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || undefined,
        type: item.type as MediaType,
        size: item.size,
        mimeType: item.mimeType,
        tags: metadata.tags,
        description: metadata.description,
        altText: metadata.altText,
        category: metadata.category,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      };
    });

    return {
      photos: processedPhotos,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Get video gallery for an event with story format support
   */
  async getVideoGallery(eventId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [videos, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: {
          eventId,
          type: 'video',
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({
        where: {
          eventId,
          type: 'video',
        },
      }),
    ]);

    const processedVideos = videos.map((item) => {
      const metadata = this.parseMediaMetadata(item.tags);
      return {
        id: item.id,
        filename: item.filename,
        originalName: item.originalName,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || undefined,
        type: item.type as MediaType,
        size: item.size,
        mimeType: item.mimeType,
        tags: metadata.tags,
        description: metadata.description,
        altText: metadata.altText,
        category: metadata.category,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
        // Story format specific properties
        duration: this.getVideoDuration(item.mimeType, item.size), // Estimated duration
        autoPlay: true,
        expiresAt: this.getVideoExpirationDate(item.createdAt), // 30 days from upload
      };
    });

    return {
      videos: processedVideos,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      storyFormat: true,
    };
  }

  /**
   * Delete media
   */
  async deleteMedia(id: string, userId: string): Promise<boolean> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) return false;

    // Check if user owns the media or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (media.uploadedById !== userId && user.role !== 'admin')) {
      throw new Error('Unauthorized to delete this media');
    }

    // Delete from R2
    const r2Key = `media/${media.type}s/${media.filename}`;
    await this.deleteFromR2(r2Key);

    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailKey = `media/thumbnails/${media.filename}`;
      await this.deleteFromR2(thumbnailKey);
    }

    // Delete from database
    await prisma.media.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Search media by tags and type
   */
  async searchMedia(
    query: string,
    type?: MediaType,
    eventId?: string,
    page = 1,
    limit = 20
  ) {
    const offset = (page - 1) * limit;

    const whereClause: any = {
      OR: [
        { originalName: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query } }, // SQLite string search for tags
      ],
    };

    if (type) {
      whereClause.type = type;
    }

    if (eventId) {
      whereClause.eventId = eventId;
    }

    const [media, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({
        where: whereClause,
      }),
    ]);

    return {
      media,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Update media tags and metadata
   */
  async updateMediaTags(
    id: string,
    tags: string[],
    userId: string
  ): Promise<boolean> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) return false;

    // Check if user owns the media or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (media.uploadedById !== userId && user.role !== 'admin')) {
      throw new Error('Unauthorized to update this media');
    }

    // Parse existing metadata and update tags
    const existingMetadata = this.parseMediaMetadata(media.tags);
    const updatedMetadata = {
      ...existingMetadata,
      tags,
    };

    await prisma.media.update({
      where: { id },
      data: {
        tags: JSON.stringify(updatedMetadata),
      },
    });

    return true;
  }

  /**
   * Update media metadata (description, altText, category, tags)
   */
  async updateMediaMetadata(
    id: string,
    metadata: {
      tags?: string[];
      description?: string;
      altText?: string;
      category?: string;
    },
    userId: string
  ): Promise<boolean> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) return false;

    // Check if user owns the media or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (media.uploadedById !== userId && user.role !== 'admin')) {
      throw new Error('Unauthorized to update this media');
    }

    // Parse existing metadata and merge with updates
    const existingMetadata = this.parseMediaMetadata(media.tags);
    const updatedMetadata = {
      tags: metadata.tags ?? existingMetadata.tags,
      description: metadata.description ?? existingMetadata.description,
      altText: metadata.altText ?? existingMetadata.altText,
      category: metadata.category ?? existingMetadata.category,
    };

    await prisma.media.update({
      where: { id },
      data: {
        tags: JSON.stringify(updatedMetadata),
      },
    });

    return true;
  }

  /**
   * Get download URL with access control
   */
  async getDownloadUrl(id: string, userId: string): Promise<string> {
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: true,
      },
    });

    if (!media) {
      throw new Error('Media not found');
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Allow access if:
    // 1. Media is public
    // 2. User is the uploader
    // 3. User is admin
    // 4. User is a member (for member-exclusive content)
    const hasAccess =
      media.isPublic ||
      media.uploadedById === userId ||
      user.role === 'admin' ||
      user.role === 'member';

    if (!hasAccess) {
      throw new Error('Access denied to this media');
    }

    // Generate download URL with longer expiration for downloads
    const r2Key = `media/${media.type}s/${media.filename}`;
    return await this.getSignedUrl(r2Key, 3600); // 1 hour expiration
  }

  /**
   * Get media by tags
   */
  async getMediaByTags(tags: string[], eventId?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Create OR conditions for each tag
    const tagConditions = tags.map((tag) => ({
      tags: { contains: tag },
    }));

    const whereClause: any = {
      OR: tagConditions,
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    const [media, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({
        where: whereClause,
      }),
    ]);

    const processedMedia = media.map((item) => {
      const metadata = this.parseMediaMetadata(item.tags);
      return {
        id: item.id,
        filename: item.filename,
        originalName: item.originalName,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || undefined,
        type: item.type as MediaType,
        size: item.size,
        mimeType: item.mimeType,
        tags: metadata.tags,
        description: metadata.description,
        altText: metadata.altText,
        category: metadata.category,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      };
    });

    return {
      media: processedMedia,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Validate file before upload
   */
  async validateFileForUpload(file: Express.Multer.File): Promise<{
    isValid: boolean;
    errors: string[];
    mediaType?: MediaType;
  }> {
    const errors: string[] = [];

    try {
      const mediaType = this.getMediaType(file.mimetype);

      // Validate file type
      const allowedTypes =
        MEDIA_CONFIG.ALLOWED_TYPES[
          mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.ALLOWED_TYPES
        ];
      if (!(allowedTypes as readonly string[]).includes(file.mimetype)) {
        errors.push(
          `File type ${file.mimetype} not allowed for ${mediaType} files`
        );
      }

      // Validate file size
      const maxSize =
        MEDIA_CONFIG.MAX_FILE_SIZE[
          mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.MAX_FILE_SIZE
        ];
      if (file.size > maxSize) {
        errors.push(
          `File size ${file.size} exceeds limit of ${maxSize} bytes for ${mediaType} files`
        );
      }

      // Additional validation for images
      if (mediaType === 'image' && file.buffer) {
        try {
          const metadata = await sharp(file.buffer).metadata();
          if (!metadata.width || !metadata.height) {
            errors.push('Invalid image file - unable to read dimensions');
          }
        } catch (error) {
          errors.push('Invalid image file - corrupted or unsupported format');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        mediaType,
      };
    } catch (error) {
      errors.push(`Unsupported file type: ${file.mimetype}`);
      return {
        isValid: false,
        errors,
      };
    }
  }

  /**
   * Bulk delete media files
   */
  async bulkDeleteMedia(
    ids: string[],
    userId: string
  ): Promise<{
    deleted: string[];
    failed: { id: string; error: string }[];
  }> {
    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const success = await this.deleteMedia(id, userId);
        if (success) {
          deleted.push(id);
        } else {
          failed.push({ id, error: 'Media not found' });
        }
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { deleted, failed };
  }

  /**
   * Get media statistics for a user or event
   */
  async getMediaStatistics(filters: {
    userId?: string;
    eventId?: string;
    type?: MediaType;
  }) {
    const whereClause: any = {};

    if (filters.userId) {
      whereClause.uploadedById = filters.userId;
    }

    if (filters.eventId) {
      whereClause.eventId = filters.eventId;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    const [totalCount, totalSize, typeBreakdown] = await Promise.all([
      prisma.media.count({ where: whereClause }),
      prisma.media.aggregate({
        where: whereClause,
        _sum: { size: true },
      }),
      prisma.media.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { type: true },
        _sum: { size: true },
      }),
    ]);

    return {
      totalCount,
      totalSize: totalSize._sum.size || 0,
      typeBreakdown: typeBreakdown.map((item) => ({
        type: item.type,
        count: item._count.type,
        totalSize: item._sum.size || 0,
      })),
    };
  }

  // Private helper methods

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  private getMediaType(mimeType: string): MediaType {
    if (MEDIA_CONFIG.ALLOWED_TYPES.IMAGE.includes(mimeType as any)) {
      return 'image';
    } else if (MEDIA_CONFIG.ALLOWED_TYPES.VIDEO.includes(mimeType as any)) {
      return 'video';
    } else if (MEDIA_CONFIG.ALLOWED_TYPES.DOCUMENT.includes(mimeType as any)) {
      return 'document';
    }
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  private validateFile(file: Express.Multer.File, mediaType: MediaType): void {
    const maxSize =
      MEDIA_CONFIG.MAX_FILE_SIZE[
        mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.MAX_FILE_SIZE
      ];

    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit for ${mediaType} files`);
    }

    const allowedTypes =
      MEDIA_CONFIG.ALLOWED_TYPES[
        mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.ALLOWED_TYPES
      ];
    const isAllowed = (allowedTypes as readonly string[]).includes(
      file.mimetype
    );
    if (!isAllowed) {
      throw new Error(
        `File type ${file.mimetype} not allowed for ${mediaType} files`
      );
    }
  }

  private async processImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .jpeg({ quality: 90 })
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  private async generateThumbnail(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = `media/thumbnails/${filename}`;
    await this.uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg');

    return await this.getImageKitUrl(thumbnailKey);
  }

  private async uploadToR2(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    if (!r2Client) {
      throw new Error(
        'Cloudflare R2 is not configured. Please set the required environment variables.'
      );
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);
  }

  private async deleteFromR2(key: string): Promise<void> {
    if (!r2Client) {
      throw new Error(
        'Cloudflare R2 is not configured. Please set the required environment variables.'
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  }

  private async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!r2Client) {
      throw new Error(
        'Cloudflare R2 is not configured. Please set the required environment variables.'
      );
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
  }

  private async getImageKitUrl(r2Key: string): Promise<string> {
    if (!imageKit || !process.env.IMAGEKIT_URL_ENDPOINT) {
      // Fallback to R2 signed URL if ImageKit is not configured
      return await this.getSignedUrl(r2Key);
    }
    // ImageKit URL format: https://ik.imagekit.io/your_imagekit_id/path/to/image
    const imagePath = r2Key.replace('media/', '');
    return `${process.env.IMAGEKIT_URL_ENDPOINT}/${imagePath}`;
  }

  private getImageKitUrlWithTransformation(
    url: string,
    size: ImageSize
  ): string {
    if (!imageKit) {
      // Return original URL if ImageKit is not configured
      return url;
    }

    const transformation =
      MEDIA_CONFIG.TRANSFORMATIONS[
        size.toUpperCase() as keyof typeof MEDIA_CONFIG.TRANSFORMATIONS
      ];
    if (!transformation) return url;

    const params = new URLSearchParams();
    params.append(
      'tr',
      `w-${transformation.width},h-${transformation.height},c-${transformation.crop},q-${transformation.quality}`
    );

    return `${url}?${params.toString()}`;
  }

  private getVideoDuration(mimeType: string, fileSize: number): number {
    // Estimate video duration based on file size and type
    // This is a rough estimation - in production, you'd want to use ffprobe or similar
    const avgBitrate = mimeType.includes('mp4') ? 1000000 : 800000; // 1Mbps for mp4, 800kbps for others
    return Math.round((fileSize * 8) / avgBitrate); // Duration in seconds
  }

  private getVideoExpirationDate(uploadDate: Date): Date {
    // Videos expire after 30 days for story format
    const expirationDate = new Date(uploadDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    return expirationDate;
  }

  private parseMediaMetadata(tagsJson: string) {
    try {
      const parsed = JSON.parse(tagsJson || '{}');
      // Handle both old format (array) and new format (object)
      if (Array.isArray(parsed)) {
        return {
          tags: parsed,
          description: undefined,
          altText: undefined,
          category: undefined,
        };
      }
      return {
        tags: parsed.tags || [],
        description: parsed.description,
        altText: parsed.altText,
        category: parsed.category,
      };
    } catch {
      return {
        tags: [],
        description: undefined,
        altText: undefined,
        category: undefined,
      };
    }
  }
}

export const mediaService = new MediaService();
