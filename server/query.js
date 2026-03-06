const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({});

async function main() {
    console.log("--- Steps ---");
    const steps = await prisma.workflow_steps.findMany();
    console.log(steps);

    console.log("--- Form Types ---");
    const types = await prisma.form_types.findMany();
    console.log(types);
}

main().catch(console.error).finally(() => prisma.$disconnect());
