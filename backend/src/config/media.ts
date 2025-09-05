import { S3Client } from '@aws-sdk/client-s3';
const ImageKit = require('imagekit');

// Cloudflare R2 Configuration
export const r2Client = process.env.CLOUDFLARE_R2_ENDPOINT && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'test-bucket';

// ImageKit Configuration
export const imageKit = process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT
  ? new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    })
  : null;

// Media Configuration Constants
export const MEDIA_CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    DOCUMENT: 50 * 1024 * 1024, // 50MB
  },
  
  // Allowed file types
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'] as const,
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const,
  },
  
  // ImageKit transformations
  TRANSFORMATIONS: {
    THUMBNAIL: {
      width: 300,
      height: 300,
      crop: 'maintain_ratio',
      quality: 80,
    },
    MEDIUM: {
      width: 800,
      height: 600,
      crop: 'maintain_ratio',
      quality: 85,
    },
    LARGE: {
      width: 1200,
      height: 900,
      crop: 'maintain_ratio',
      quality: 90,
    },
  },
  
  // Video processing settings
  VIDEO_SETTINGS: {
    MAX_DURATION: 60, // seconds
    COMPRESSION_QUALITY: 'medium',
  },
} as const;

export type MediaType = 'image' | 'video' | 'document';
export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'original';