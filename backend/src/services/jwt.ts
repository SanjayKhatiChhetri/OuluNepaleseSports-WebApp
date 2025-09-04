import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  workosUserId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const options: any = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ons-webapp',
    audience: 'ons-webapp-users',
  };
  return jwt.sign(payload, JWT_SECRET as string, options);
};

/**
 * Generate JWT refresh token (longer expiration)
 */
export const generateRefreshToken = (payload: Pick<JwtPayload, 'userId'>): string => {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: '30d',
    issuer: 'ons-webapp',
    audience: 'ons-webapp-users',
  });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: payload.userId });
  
  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string, {
      issuer: 'ons-webapp',
      audience: 'ons-webapp-users',
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    } else {
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Extract token from cookies or Authorization header
 */
export const extractToken = (authHeader: string | undefined, cookies: any): string | null => {
  // First try Authorization header
  const headerToken = extractTokenFromHeader(authHeader);
  if (headerToken) {
    return headerToken;
  }
  
  // Then try cookies
  if (cookies && cookies.access_token) {
    return cookies.access_token;
  }
  
  return null;
};