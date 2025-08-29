// Re-export prisma from database.ts to avoid duplicate declarations
export { prisma, testDatabaseConnection, disconnectDatabase } from './database';