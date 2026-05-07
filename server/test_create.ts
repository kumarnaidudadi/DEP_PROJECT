import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dep_db'
    }
  }
});
async function main() {
    try {
        const u = await prisma.users.create({
            data: {
                email: 'test' + Date.now() + '@example.com',
                password: 'pass',
                user_roles: {
                    create: [{ role_id: 1 }]
                }
            },
            include: { user_roles: true }
        });
        console.log(u);
    } catch(e) {
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
