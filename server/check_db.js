const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const types = await prisma.form_types.findMany();
    console.log(types.map(t => t.name));
    process.exit(0);
}
run();
