import { prisma } from '../../config/database';
import { AuthResponse, LoginRequest, RegisterRequest } from './auth.interface';
import { comparePassword, hashPassword, validatePasswordStrength } from '../../utils/password.util';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.util';

/**
 * User registration service
 * @param userData - User registration data
 * @returns Created user with tokens
 */
export const registerService = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const { email, password, name, role, phoneNumber, address } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Validate password strength
  if (!validatePasswordStrength(password)) {
    throw new Error('Password does not meet security requirements');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      phoneNumber: phoneNumber || null,
      address: address || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phoneNumber: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * User login service
 * @param credentials - User login credentials
 * @returns Authenticated user with tokens
 */
export const loginService = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const { email, password } = credentials;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account has been deactivated. Please contact support.');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Get current user service
 * @param userId - User ID from token
 * @returns User data
 */
export const getCurrentUserService = async (userId: string): Promise<AuthResponse['user']> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phoneNumber: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};