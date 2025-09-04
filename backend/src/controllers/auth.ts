import { Request, Response } from 'express';
import { 
  getWorkOSAuthUrl, 
  handleWorkOSCallback, 
  loginWithPassword, 
  registerWithPassword,
  refreshAccessToken,
  getUserProfile,
  updateUserProfile 
} from '../services/auth';

/**
 * GET /api/auth/login/:provider
 * Initiate OAuth login with WorkOS
 */
export const initiateOAuthLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    const { redirect_uri } = req.query;
    
    if (!['google', 'facebook'].includes(provider)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Supported providers: google, facebook',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Generate state parameter for security
    const state = JSON.stringify({
      provider,
      redirect_uri: redirect_uri || process.env.FRONTEND_URL || 'http://localhost:3000',
      timestamp: Date.now(),
    });
    
    const authUrl = getWorkOSAuthUrl(provider as 'google' | 'facebook', state);
    
    res.json({
      success: true,
      data: {
        authUrl,
        provider,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_INITIATION_FAILED',
        message: 'Failed to initiate OAuth login',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * GET /api/auth/callback
 * Handle OAuth callback from WorkOS
 */
export const handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: `OAuth error: ${error}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    if (!code) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Authorization code is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Handle WorkOS callback
    const result = await handleWorkOSCallback(code as string, state as string);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_CALLBACK_FAILED',
          message: result.message || 'OAuth callback failed',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Set secure HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    res.cookie('access_token', result.tokens!.accessToken, cookieOptions);
    res.cookie('refresh_token', result.tokens!.refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    // Parse state to get redirect URI
    let redirectUri = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (state) {
      try {
        const stateData = JSON.parse(state as string);
        redirectUri = stateData.redirect_uri || redirectUri;
      } catch (error) {
        console.error('Failed to parse state:', error);
      }
    }
    
    // Redirect to frontend with success
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('auth', 'success');
    if (result.isNewUser) {
      redirectUrl.searchParams.set('new_user', 'true');
    }
    
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to frontend with error
    const redirectUri = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('auth', 'error');
    redirectUrl.searchParams.set('message', 'Authentication failed');
    
    res.redirect(redirectUrl.toString());
  }
};

/**
 * POST /api/auth/login
 * Traditional email/password login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await loginWithPassword(req.body);
    
    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: result.message || 'Login failed',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Set secure HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: req.body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
    };
    
    res.cookie('access_token', result.tokens!.accessToken, cookieOptions);
    res.cookie('refresh_token', result.tokens!.refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    res.json({
      success: true,
      data: {
        user: result.user,
        message: result.message,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed due to server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * POST /api/auth/register
 * User registration with email/password
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await registerWithPassword(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: result.message || 'Registration failed',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        message: result.message,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed due to server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * POST /api/auth/logout
 * User logout (clear cookies)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear authentication cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    
    res.json({
      success: true,
      data: {
        message: 'Logout successful',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout failed due to server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const result = await refreshAccessToken(token);
    
    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_INVALID',
          message: result.message || 'Invalid refresh token',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        accessToken: result.tokens!.accessToken,
        refreshToken: result.tokens!.refreshToken,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Token refresh failed due to server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * GET /api/auth/profile
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
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
    
    // Get fresh user data
    const user = await getUserProfile(req.user.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user profile',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
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
    
    const updatedUser = await updateUserProfile(req.user.id, req.body);
    
    if (!updatedUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        user: updatedUser,
        message: 'Profile updated successfully',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user profile',
      },
      timestamp: new Date().toISOString(),
    });
  }
};