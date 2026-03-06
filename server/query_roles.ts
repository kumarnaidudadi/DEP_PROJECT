import prisma from './src/prisma';

async function main() {
    console.log("--- Roles ---");
    const roles = await prisma.roles.findMany();
    console.log(roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
