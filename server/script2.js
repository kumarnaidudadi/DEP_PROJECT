const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const history = await prisma.form_history.findMany({
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.dir(history, { depth: null });
}
main().finally(() => prisma.$disconnect());
