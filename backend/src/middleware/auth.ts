import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt';
import { prisma } from '../lib/prisma';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        emailVerified: boolean;
      };
      jwtPayload?: {
        userId: string;
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
  };
  jwtPayload: {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Verify JWT token
    const jwtPayload = JWTService.verifyAccessToken(token);
    
    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account is deactivated',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Attach user and JWT payload to request
    req.user = user;
    req.jwtPayload = jwtPayload;
    
    next();
    
  } catch (error) {
    let errorCode = 'UNAUTHORIZED';
    let errorMessage = 'Authentication failed';
    
    if (error instanceof Error) {
      switch (error.message) {
        case 'ACCESS_TOKEN_EXPIRED':
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Access token has expired';
          break;
        case 'INVALID_ACCESS_TOKEN':
          errorCode = 'INVALID_TOKEN';
          errorMessage = 'Invalid access token';
          break;
        case 'TOKEN_VERIFICATION_FAILED':
          errorCode = 'TOKEN_VERIFICATION_FAILED';
          errorMessage = 'Token verification failed';
          break;
      }
    }
    
    res.status(401).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }
    
    // Verify JWT token
    const jwtPayload = JWTService.verifyAccessToken(token);
    
    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });
    
    if (user && user.isActive) {
      // Attach user and JWT payload to request
      req.user = user;
      req.jwtPayload = jwtPayload;
    }
    
    next();
    
  } catch (error) {
    // Ignore authentication errors for optional authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};

/**
 * Email verification requirement middleware
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  if (!req.user.emailVerified) {
    res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};

/**
 * Member-only middleware (requires member role or higher)
 */
export const requireMember = [
  authenticate,
  authorize(['member', 'editor', 'admin']),
];

/**
 * Editor-only middleware (requires editor role or higher)
 */
export const requireEditor = [
  authenticate,
  authorize(['editor', 'admin']),
];

/**
 * Admin-only middleware (requires admin role)
 */
export const requireAdmin = [
  authenticate,
  authorize(['admin']),
];

/**
 * Verified member middleware (requires member role and email verification)
 */
export const requireVerifiedMember = [
  authenticate,
  authorize(['member', 'editor', 'admin']),
  requireEmailVerification,
];

/**
 * Role requirement middleware factory
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};