import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Custom error response for rate limiting
const rateLimitErrorResponse = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
    timestamp: new Date().toISOString(),
  });
};

// General API rate limiter - applies to all API routes
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: rateLimitErrorResponse,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (2xx status codes)
  skipSuccessfulRequests: false,
  // Skip failed requests (4xx and 5xx status codes)
  skipFailedRequests: false,
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 authentication attempts per windowMs
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to allow normal usage after successful auth
  skipSuccessfulRequests: true,
});

// Rate limiter for password reset requests
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for content creation (for editors/admins)
export const contentCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 content creation requests per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for media uploads
export const mediaUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 media uploads per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for event registration
export const eventRegistrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 event registrations per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for social media publishing
export const socialMediaRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 social media posts per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for contact form submissions
export const contactFormRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 contact form submissions per hour
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down middleware for repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: (hits) => hits * 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
});

// Progressive slow down for authentication attempts
export const authSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per windowMs without delay
  delayMs: (hits) => hits * 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 10000, // Maximum delay of 10 seconds
});

// Rate limiter configuration for different endpoint types
export const rateLimiters = {
  general: generalRateLimit,
  auth: authRateLimit,
  passwordReset: passwordResetRateLimit,
  contentCreation: contentCreationRateLimit,
  mediaUpload: mediaUploadRateLimit,
  eventRegistration: eventRegistrationRateLimit,
  socialMedia: socialMediaRateLimit,
  contactForm: contactFormRateLimit,
};

// Speed limiter configuration
export const speedLimiters = {
  general: speedLimiter,
  auth: authSpeedLimiter,
};

// Utility function to create custom rate limiters
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message ? 
      (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: options.message,
          },
          timestamp: new Date().toISOString(),
        });
      } : rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  });
};