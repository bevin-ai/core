import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function connectDB(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(' Postgres connected successfully');
  } catch (error) {
    console.error(' Postgres connection error:', error);
    throw error;
  }
}
