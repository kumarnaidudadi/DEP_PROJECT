require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const types = await prisma.form_types.findMany();
    for (const t of types) {
        if (t.name.toLowerCase().includes('station leave')) {
            console.dir(t.schema_definition, { depth: null });
        }
    }
    process.exit(0);
}
run();
