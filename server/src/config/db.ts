import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Heroku's Postgres terminates TLS with certs node-postgres can't verify
// against its bundled CA store. Local Postgres doesn't use TLS at all, so
// `ssl: { rejectUnauthorized: false }` is a no-op there.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const prisma = new PrismaClient({ adapter });

export async function connectDB(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(' Postgres connected successfully');
  } catch (error) {
    console.error(' Postgres connection error:', error);
    throw error;
  }
}
