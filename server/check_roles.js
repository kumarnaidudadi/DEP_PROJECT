require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching roles...');
    try {
        const roles = await prisma.roles.findMany();
        console.log('Roles in DB:', JSON.stringify(roles, null, 2));
    } catch (e) {
        console.error('Error fetching roles:', e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
