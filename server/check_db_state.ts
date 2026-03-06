
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Form Types ---');
        const formTypes = await prisma.form_types.findMany();
        console.log('Form Types:', JSON.stringify(formTypes, null, 2));

        if (formTypes.length === 0) {
            console.log('WARNING: No form types found! Application creation will fail.');
            // Optional: Create one if missing
            // await prisma.form_types.create({ data: { name: 'Leave Application', description: 'Standard leave form' } });
        }

        console.log('\n--- Checking Users ---');
        const count = await prisma.users.count();
        console.log(`Total Users: ${count}`);

    } catch (error) {
        console.error('Error checking DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
