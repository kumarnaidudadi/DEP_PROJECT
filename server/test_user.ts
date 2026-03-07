import prisma from './src/prisma';

(async () => {
    try {
        const u = await prisma.users.findMany({
            where: { id: 22 },
            include: { user_roles: { include: { roles: true } } }
        });
        console.log(JSON.stringify(u, null, 2));
    } catch (e) { console.error(e) }
})();
