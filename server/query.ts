import { PrismaClient } from '@prisma/client';
import prisma from './src/prisma'; // Correctly initialized Prisma Client

async function main() {
    console.log("--- Steps ---");
    const steps = await prisma.workflow_steps.findMany();
    console.log(steps);

    console.log("--- Form Types ---");
    const types = await prisma.form_types.findMany();
    console.log(types);
}

main().catch(console.error).finally(() => prisma.$disconnect());
