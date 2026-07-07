import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Create a Prisma Client instance with connection pooling
let _prismaInstance: PrismaClient | null = null;

const getPrismaClient = (): PrismaClient => {
  if (_prismaInstance) {
    return _prismaInstance;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Prisma 7 requires the adapter to be passed in constructor
  const adapter = new PrismaPg({ connectionString });
  _prismaInstance = new PrismaClient({ adapter });

  return _prismaInstance;
};

// Export a singleton instance
export const prisma = getPrismaClient();

// Test database connection
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$connect();
    // Connection successful (silent logging - handled by caller)
  } catch (error) {
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : error}`);
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  if (_prismaInstance) {
    await _prismaInstance.$disconnect();
    _prismaInstance = null;
  }
};