import { Router } from 'express';
import { mediaController } from '../controllers/media.js';
import { authenticate } from '../middleware/auth.js';
import {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  validateFileUpload,
} from '../middleware/upload.js';

const router = Router();

// Apply authentication middleware to all media routes
router.use(authenticate);

// Upload routes
router.post(
  '/upload',
  uploadSingle('file'),
  handleUploadError,
  validateFileUpload,
  mediaController.uploadSingle.bind(mediaController)
);

router.post(
  '/upload/multiple',
  uploadMultiple('files', 10),
  handleUploadError,
  validateFileUpload,
  mediaController.uploadMultiple.bind(mediaController)
);

// File validation route
router.post(
  '/validate',
  uploadSingle('file'),
  handleUploadError,
  mediaController.validateFile.bind(mediaController)
);

// Media retrieval routes
router.get('/search', mediaController.searchMedia.bind(mediaController));
router.get('/tags', mediaController.getMediaByTags.bind(mediaController));
router.get(
  '/gallery/:eventId',
  mediaController.getEventGallery.bind(mediaController)
);
router.get(
  '/gallery/:eventId/photos',
  mediaController.getPhotoGallery.bind(mediaController)
);
router.get(
  '/gallery/:eventId/videos',
  mediaController.getVideoGallery.bind(mediaController)
);
router.get(
  '/:id/download',
  mediaController.getDownloadUrl.bind(mediaController)
);
router.get('/:id', mediaController.getMedia.bind(mediaController));

// Media management routes
router.get(
  '/statistics',
  mediaController.getMediaStatistics.bind(mediaController)
);
router.delete('/bulk', mediaController.bulkDeleteMedia.bind(mediaController));
router.put('/:id', mediaController.updateMedia.bind(mediaController));
router.delete('/:id', mediaController.deleteMedia.bind(mediaController));

export default router;
