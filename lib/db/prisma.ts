import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma Client instance.
// This allows us to persist the client across hot reloads in development.
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a new PrismaClient instance, with logging enabled only in development.
const prismaSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Use the global instance if it exists, otherwise create a new one.
export const db = globalThis.prisma ?? prismaSingleton();

// In development, store the created instance on the global object.
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}
