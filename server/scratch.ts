import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.users.findFirst({
        where: { email: '2023csb1115+4@iitrpr.ac.in' },
        select: {
            id: true,
            email: true,
            first_name: true,
            user_roles: { include: { roles: { select: { name: true } } } }
        }
    });

    console.log(JSON.stringify(res, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
