import { WorkOS } from '@workos-inc/node';
import { User } from '../../generated/prisma';

interface WorkOSConfig {
  apiKey: string;
  clientId: string;
  redirectUri: string;
}

interface WorkOSUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

interface AuthorizationURLOptions {
  provider?: 'google' | 'facebook' | 'microsoft';
  state?: string;
  domainHint?: string;
}

export class WorkOSService {
  private workos: WorkOS;
  private clientId: string;
  private redirectUri: string;

  constructor(config: WorkOSConfig) {
    this.workos = new WorkOS(config.apiKey);
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
  }

  /**
   * Generate authorization URL for OAuth login
   */
  getAuthorizationUrl(options: AuthorizationURLOptions = {}): string {
    const { provider, state, domainHint } = options;

    const authorizationUrl = this.workos.userManagement.getAuthorizationUrl({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      provider,
      state,
      domainHint,
    });

    return authorizationUrl;
  }

  /**
   * Exchange authorization code for user information
   */
  async authenticateWithCode(code: string): Promise<{
    user: WorkOSUser;
    accessToken: string;
    refreshToken?: string;
  }> {
    try {
      const { user, accessToken, refreshToken } = await this.workos.userManagement.authenticateWithCode({
        clientId: this.clientId,
        code,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profilePictureUrl: user.profilePictureUrl || undefined,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('WorkOS authentication error:', error);
      throw new Error('WORKOS_AUTHENTICATION_FAILED');
    }
  }

  /**
   * Get user information using access token
   */
  async getUser(accessToken: string): Promise<WorkOSUser> {
    try {
      const user = await this.workos.userManagement.getUser(accessToken);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profilePictureUrl: user.profilePictureUrl || undefined,
      };
    } catch (error) {
      console.error('WorkOS get user error:', error);
      throw new Error('WORKOS_GET_USER_FAILED');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
  }> {
    try {
      // Note: WorkOS API method may have changed, this needs to be updated based on current WorkOS SDK
      // const result = await this.workos.userManagement.refreshAccessToken(refreshToken);
      throw new Error('WorkOS refresh token method needs to be updated for current SDK version');
    } catch (error) {
      console.error('WorkOS refresh token error:', error);
      throw new Error('WORKOS_REFRESH_TOKEN_FAILED');
    }
  }

  /**
   * Create user with email and password
   */
  async createUser(email: string, password: string, firstName?: string, lastName?: string): Promise<WorkOSUser> {
    try {
      const user = await this.workos.userManagement.createUser({
        email,
        password,
        firstName,
        lastName,
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profilePictureUrl: user.profilePictureUrl || undefined,
      };
    } catch (error) {
      console.error('WorkOS create user error:', error);
      throw new Error('WORKOS_CREATE_USER_FAILED');
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateWithPassword(email: string, password: string): Promise<{
    user: WorkOSUser;
    accessToken: string;
    refreshToken?: string;
  }> {
    try {
      const result = await this.workos.userManagement.authenticateWithPassword({
        clientId: this.clientId,
        email,
        password,
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName || undefined,
          lastName: result.user.lastName || undefined,
          profilePictureUrl: result.user.profilePictureUrl || undefined,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      console.error('WorkOS password authentication error:', error);
      throw new Error('WORKOS_PASSWORD_AUTHENTICATION_FAILED');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await this.workos.userManagement.sendPasswordResetEmail({
        email,
        passwordResetUrl: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
    } catch (error) {
      console.error('WorkOS send password reset error:', error);
      throw new Error('WORKOS_SEND_PASSWORD_RESET_FAILED');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<WorkOSUser> {
    try {
      const user = await this.workos.userManagement.resetPassword({
        token,
        newPassword,
      });

      return {
        id: user.user.id,
        email: user.user.email,
        firstName: user.user.firstName || undefined,
        lastName: user.user.lastName || undefined,
        profilePictureUrl: user.user.profilePictureUrl || undefined,
      };
    } catch (error) {
      console.error('WorkOS reset password error:', error);
      throw new Error('WORKOS_RESET_PASSWORD_FAILED');
    }
  }
}

// Create singleton instance
const workosConfig: WorkOSConfig = {
  apiKey: process.env.WORKOS_API_KEY || '',
  clientId: process.env.WORKOS_CLIENT_ID || '',
  redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
};

export const workosService = new WorkOSService(workosConfig);