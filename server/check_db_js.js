
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Form Types ---');
        const formTypes = await prisma.form_types.findMany();
        console.log('Form Types:', JSON.stringify(formTypes, null, 2));

        if (formTypes.length === 0) {
            console.log('WARNING: No form types found! Application creation will fail.');
        } else {
            const leaveForm = formTypes.find(f => f.name.includes('Leave') || f.name.includes('Casual'));
            if (leaveForm) {
                console.log(`FOUND LEAVE FORM: ID = ${leaveForm.id}, Name = ${leaveForm.name}`);
            } else {
                console.log('WARNING: No "Leave" form type found.');
            }
        }

    } catch (error) {
        console.error('Error checking DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
