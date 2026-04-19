import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.applied_forms.findMany({
        orderBy: { updated_at: 'desc' },
        take: 5,
        select: {
            id: true,
            status: true,
            reference_number: true,
            submitted_at: true,
            updated_at: true,
            form_types: { select: { name: true, ref_prefix: true } }
        }
    });
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
