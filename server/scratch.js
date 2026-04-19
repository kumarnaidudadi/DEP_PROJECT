const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log(await prisma.applied_forms.findMany({take:2, orderBy:{updated_at:'desc'}}));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
