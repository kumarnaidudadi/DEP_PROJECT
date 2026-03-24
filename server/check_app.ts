import 'dotenv/config';
import prisma from './src/prisma';
async function run() {
    const app = await prisma.forms.findUnique({ where: { id: 47 } });
    console.dir(app?.form_data, { depth: null });
    process.exit(0);
}
run();
