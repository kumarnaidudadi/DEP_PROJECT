import { PrismaClient } from '.prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Roles
    const roleNames = ['ADMIN', 'USER', 'CO', 'ESTABLISHMENT', 'ACCOUNTS', 'DIRECTOR'];
    for (const name of roleNames) {
        await prisma.roles.upsert({
            where: { name },
            update: {},
            create: { name, description: `${name} Role` }
        });
    }

    // Form Types
    const formTypeNames = ['Leave Application', 'LTC Bill', 'Joining Report', 'Permission to Travel'];
    for (const name of formTypeNames) {
        await prisma.form_types.upsert({
            where: { name },
            update: {},
            create: { 
                name, 
                description: `${name} Form`,
                schema: {} // Required field
            }
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
