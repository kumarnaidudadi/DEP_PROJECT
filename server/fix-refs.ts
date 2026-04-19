import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Starting reference backfill...");
    const year = new Date().getFullYear();
    const formsWithoutRef = await prisma.applied_forms.findMany({
        where: { reference_number: null, status: { not: 'draft' } },
        include: { form_types: true }
    });
    console.log(`Found ${formsWithoutRef.length} forms missing reference numbers.`);

    for (const form of formsWithoutRef) {
        if (!form.form_types) continue;
        const prefix = (form.form_types.ref_prefix || 'FORM').toUpperCase().padEnd(4, 'X').slice(0, 4);
        
        // Find max serial specifically each time
        const yearStr = String(year);
        const results = await prisma.applied_forms.findMany({
            where: {
                reference_number: { not: null },
                submitted_at: {
                    gte: new Date(`${year}-01-01T00:00:00.000Z`),
                    lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
                }
            },
            select: { reference_number: true },
        });

        let maxSerial = 0;
        for (const row of results) {
            if (!row.reference_number) continue;
            if (row.reference_number.length >= 14) {
                const yearPart = row.reference_number.slice(4, 8);
                if (yearPart === yearStr) {
                    const serial = parseInt(row.reference_number.slice(8), 10);
                    if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
                }
            }
        }
        const nextSerial = maxSerial + 1;
        const refNum = `${prefix}${year}${String(nextSerial).padStart(6, '0')}`;
        
        await prisma.applied_forms.update({
            where: { id: form.id },
            data: { reference_number: refNum }
        });
        console.log(`Updated form ${form.id} recursively with ${refNum}`);
    }
    console.log("Done.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
