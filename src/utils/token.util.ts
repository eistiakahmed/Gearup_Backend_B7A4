import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '../../generated/prisma/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Generate a JWT access token
 * @param payload - User information to encode in the token
 * @returns JWT token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: (JWT_EXPIRES_IN as SignOptions['expiresIn']) };
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Generate a JWT refresh token
 * @param payload - User information to encode in the token
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: (JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) };
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Decode a JWT token without verification (for getting expiration date, etc.)
 * @param token - JWT token to decode
 * @returns Decoded token payload or null if invalid
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};