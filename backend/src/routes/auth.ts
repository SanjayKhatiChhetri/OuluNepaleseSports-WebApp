import { Router } from 'express';
import { 
  initiateOAuthLogin,
  handleOAuthCallback,
  login,
  register,
  logout,
  refreshToken,
  getProfile,
  updateProfile
} from '../controllers/auth';
import { validate, validationSchemas } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimiting';

const router = Router();

// OAuth routes
router.get('/login/:provider', 
  authRateLimit,
  initiateOAuthLogin
);

router.get('/callback', 
  authRateLimit,
  handleOAuthCallback
);

// Traditional authentication routes
router.post('/login',
  authRateLimit,
  validate(validationSchemas.auth.login),
  login
);

router.post('/register',
  authRateLimit,
  validate(validationSchemas.auth.register),
  register
);

router.post('/logout',
  logout
);

router.post('/refresh',
  authRateLimit,
  refreshToken
);

// Protected profile routes
router.get('/profile',
  authenticate,
  getProfile
);

router.put('/profile',
  authenticate,
  validate(validationSchemas.user.updateProfile),
  updateProfile
);

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'authentication',
      status: 'healthy',
      workos: {
        configured: !!(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID),
      },
      jwt: {
        configured: !!process.env.JWT_SECRET,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;