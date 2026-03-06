import prisma from './src/prisma';

async function main() {
    console.log("--- HODs ---");
    const hods = await prisma.department_heads.findMany();
    console.log(hods);
}

main().catch(console.error).finally(() => prisma.$disconnect());
