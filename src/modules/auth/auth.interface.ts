import { UserRole } from '../../../generated/prisma/enums';

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  address?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phoneNumber?: string | null;
    address?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}