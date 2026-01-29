import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    const url = process.env.DATABASE_URL;
    console.log('🔌 [PRISMA] Initializing client...');
    console.log(`🔌 [PRISMA] DATABASE_URL Present: ${!!url}`);
    if (url) console.log(`🔌 [PRISMA] URL Start: ${url.substring(0, 25)}...`);

    const connectionString = url ?? "postgresql://postgres:password@localhost:5432/club-rugby";
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
