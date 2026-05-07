const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const forms = await prisma.applied_forms.findMany({
        where: {
            status: { notIn: ['approved', 'rejected', 'APPROVED', 'REJECTED'] }
        },
        select: {
            id: true,
            applicant_id: true,
            form_forwards: {
                orderBy: { forwarded_at: 'desc' },
                take: 1,
                select: { forwarded_to: true, action: true }
            }
        }
    });
    
    // Assume Tharun_hod is requester_id.
    // Let's print all forms that are pending for whoever.
    const pendingForms = forms.filter(f => f.form_forwards[0] && f.form_forwards[0].action === 'forwarded');
    
    for (const f of pendingForms) {
        console.log(`Form ID: ${f.id}, Submitter: ${f.applicant_id}, Forwarded To: ${f.form_forwards[0].forwarded_to}`);
    }
}
main().finally(() => prisma.$disconnect());
