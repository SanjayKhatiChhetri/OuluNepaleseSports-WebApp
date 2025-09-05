const multer = require('multer');
import { Request } from 'express';
import { MEDIA_CONFIG, MediaType } from '../config/media.js';

// Type definitions for multer callback
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  try {
    // Determine media type from mime type
    let mediaType: MediaType;
    
    if (MEDIA_CONFIG.ALLOWED_TYPES.IMAGE.includes(file.mimetype as any)) {
      mediaType = 'image';
    } else if (MEDIA_CONFIG.ALLOWED_TYPES.VIDEO.includes(file.mimetype as any)) {
      mediaType = 'video';
    } else if (MEDIA_CONFIG.ALLOWED_TYPES.DOCUMENT.includes(file.mimetype as any)) {
      mediaType = 'document';
    } else {
      return cb(new Error(`File type ${file.mimetype} is not supported`));
    }
    
    // Add media type to request for later use
    (req as any).mediaType = mediaType;
    
    cb(null, true);
  } catch (error) {
    cb(error as Error);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(
      MEDIA_CONFIG.MAX_FILE_SIZE.IMAGE,
      MEDIA_CONFIG.MAX_FILE_SIZE.VIDEO,
      MEDIA_CONFIG.MAX_FILE_SIZE.DOCUMENT
    ),
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 10) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for mixed file upload (different field names)
export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
  return upload.fields(fields);
};

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the allowed limit',
          },
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded',
          },
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field',
          },
        });
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message,
          },
        });
    }
  }
  
  if (error.message.includes('File type') || error.message.includes('not supported')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message,
      },
    });
  }
  
  next(error);
};

// Validation middleware to check file requirements
export const validateFileUpload = (req: Request, res: any, next: any) => {
  const files = req.files as Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  const file = req.file as Express.Multer.File;
  
  if (!files && !file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE_UPLOADED',
        message: 'No file was uploaded',
      },
    });
  }
  
  next();
};