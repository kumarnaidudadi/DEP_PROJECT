import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.users.create({
        data: {
            first_name: 'Test',
            last_name: 'User',
            email: 'test' + Date.now() + '@example.com',
            password: 'pass',
            user_roles: {
                create: [{ role_id: 1 }]
            }
        }
    });
    console.log(u);
}
main().catch(console.error).finally(() => prisma.$disconnect());
