process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import prisma from './src/prisma';

(async () => {
    try {
        const form = await prisma.forms.findUnique({
            where: { id: 14 },
            include: { users: true }
        });
        const role = 'DEAN_FAA';
        const roleRecord = await prisma.roles.findFirst({
            where: { name: { equals: role, mode: 'insensitive' } }
        });
        const roleIdStr = roleRecord ? roleRecord.id.toString() : role;
        console.log({roleRecord, roleIdStr, deptId: form?.users?.department_id});
        
        const deptHead = await prisma.department_heads.findFirst({
            where: {
                role_type: { in: [role, roleIdStr] },
                is_active: true,
                ...(form?.users?.department_id ? { department_id: form.users.department_id } : {})
            }
        });

        console.log('deptHead:', deptHead);
        
        const userRole = await prisma.user_roles.findFirst({
            where: { role_id: roleRecord?.id }
        });
        
        console.log('userRole:', userRole);
        
    } catch(e) {
        console.error(e);
    }
})();
