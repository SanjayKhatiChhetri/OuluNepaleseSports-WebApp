import bcrypt from 'bcrypt';
import { workosService } from './workos';
import { JWTService } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}

export interface WorkOSAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser?: boolean;
  message?: string;
}

/**
 * Generate WorkOS authorization URL for OAuth login
 */
export const getWorkOSAuthUrl = (provider: 'google' | 'facebook', state?: string): string => {
  return workosService.getAuthorizationUrl({
    provider,
    state: state || `provider=${provider}`,
  });
};

/**
 * Handle WorkOS OAuth callback
 */
export const handleWorkOSCallback = async (code: string, state?: string): Promise<WorkOSAuthResult> => {
  try {
    // Exchange code for user profile
    const { user: workosUser } = await workosService.authenticateWithCode(code);
    
    if (!workosUser || !workosUser.email) {
      return {
        success: false,
        message: 'Failed to retrieve user information from WorkOS',
      };
    }
    
    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email: workosUser.email },
    });
    
    let isNewUser = false;
    
    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: workosUser.email,
          name: workosUser.firstName && workosUser.lastName 
            ? `${workosUser.firstName} ${workosUser.lastName}` 
            : workosUser.email.split('@')[0],
          passwordHash: '', // No password for OAuth users
          role: 'MEMBER', // Default role for new OAuth users
          isActive: true,
          emailVerified: true, // OAuth users are considered verified
          profileImage: workosUser.profilePictureUrl || undefined,
        },
      });
      isNewUser = true;
    } else {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          // Update profile picture if available
          profileImage: workosUser.profilePictureUrl || user.profileImage,
        },
      });
    }
    
    // Generate JWT tokens
    const tokens = JWTService.generateTokenPair(user);
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      tokens,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
    };
    
  } catch (error) {
    console.error('WorkOS callback error:', error);
    return {
      success: false,
      message: 'Authentication failed. Please try again.',
    };
  }
};

/**
 * Traditional email/password login
 */
export const loginWithPassword = async (credentials: LoginCredentials): Promise<AuthResult> => {
  try {
    const { email, password } = credentials;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }
    
    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        message: 'Account is deactivated. Please contact support.',
      };
    }
    
    // Verify password (skip for OAuth users who don't have passwords)
    if (user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }
    } else {
      return {
        success: false,
        message: 'Please use social login for this account',
      };
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Generate JWT tokens
    const tokens = JWTService.generateTokenPair(user);
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      tokens,
      message: 'Login successful',
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed. Please try again.',
    };
  }
};

/**
 * Register new user with email/password
 */
export const registerWithPassword = async (data: RegisterData): Promise<AuthResult> => {
  try {
    const { email, password, name, phone } = data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists',
      };
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone,
        role: 'MEMBER', // Default role for new users
        isActive: false, // Require admin approval
        emailVerified: false, // Require email verification
      },
    });
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      message: 'Registration successful. Please wait for admin approval and verify your email.',
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Registration failed. Please try again.',
    };
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: {
  name?: string;
  phone?: string;
  profileImage?: string;
}) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('Update user profile error:', error);
    return null;
  }
};
/**
 * 
Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<AuthResult> => {
  try {
    // Verify refresh token
    const payload = JWTService.verifyRefreshToken(refreshToken);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
      return {
        success: false,
        message: 'User not found',
      };
    }
    
    if (!user.isActive) {
      return {
        success: false,
        message: 'Account is deactivated',
      };
    }
    
    // Generate new token pair
    const tokens = JWTService.generateTokenPair(user);
    
    return {
      success: true,
      user,
      tokens,
      message: 'Token refreshed successfully',
    };
    
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error instanceof Error) {
      switch (error.message) {
        case 'REFRESH_TOKEN_EXPIRED':
          return {
            success: false,
            message: 'Refresh token has expired. Please login again.',
          };
        case 'INVALID_REFRESH_TOKEN':
          return {
            success: false,
            message: 'Invalid refresh token',
          };
        default:
          return {
            success: false,
            message: 'Token refresh failed',
          };
      }
    }
    
    return {
      success: false,
      message: 'Token refresh failed',
    };
  }
};