import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkUser() {
  const user = await prisma.users.findFirst({
    where: { email: { contains: '2023csb1144' } },
    select: { id: true, email: true, emp_code: true, joining_date: true, department_id: true }
  });
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}

checkUser();
