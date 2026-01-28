import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, MemberCategory } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const members = [
    { dni: '32145678', name: 'Juan Manuel González', email: 'jm.gonzalez@email.com', phone: '1155501001', category: MemberCategory.PLANTEL_SUPERIOR, debt: 0 },
    { dni: '45321908', name: 'Lucas Beltrán', email: 'lucas.beltran@email.com', phone: '1155502002', category: MemberCategory.M17, debt: 12500 },
    { dni: '48765432', name: 'Mateo Rodríguez', email: 'mateo.rodriguez@email.com', phone: '1155503003', category: MemberCategory.M15, debt: 8000 },
    { dni: '35987123', name: 'Santiago Paz', email: 'santiago.paz@email.com', phone: '1155504004', category: MemberCategory.PLANTEL_SUPERIOR, debt: 15000 },
    { dni: '50123456', name: 'Nicolás Herrera', email: 'nico.herrera@email.com', phone: '1155505005', category: MemberCategory.M14, debt: 0 },
    { dni: '42654789', name: 'Facundo Díaz', email: 'facundo.diaz@email.com', phone: '1155506006', category: MemberCategory.M19, debt: 25000 },
    { dni: '47333222', name: 'Tomás Vicent', email: 'tomas.vicent@email.com', phone: '1155507007', category: MemberCategory.M16, debt: 12500 },
    { dni: '52987654', name: 'Bautista López', email: 'bautista.lopez@email.com', phone: '1155508008', category: MemberCategory.INFANTILES, debt: 0 },
    { dni: '38456789', name: 'Joaquín Sosa', email: 'joaquin.sosa@email.com', phone: '1155509009', category: MemberCategory.PLANTEL_SUPERIOR, debt: 30000 },
    { dni: '49001002', name: 'Felipe Castro', email: 'felipe.castro@email.com', phone: '1155500010', category: MemberCategory.M15, debt: 8000 },
];

async function main() {
    console.log('🌱 Seeding database...');

    for (const member of members) {
        await prisma.member.upsert({
            where: { dni: member.dni },
            update: member,
            create: member,
        });
    }

    console.log(`✅ Created ${members.length} members`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
