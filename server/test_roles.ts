process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import prisma from './src/prisma';

(async () => {
    try {
        const roles = await prisma.roles.findMany({ where: { name: 'DEAN_FAA' } });
        console.log('Roles table DEAN_FAA:', roles);
        
        if(roles.length > 0) {
            const userRoles = await prisma.user_roles.findMany({ where: { role_id: roles[0].id } });
            console.log('User roles for DEAN_FAA:', userRoles);
        }
        
        const dheads = await prisma.department_heads.findMany({ where: { role_type: 'DEAN_FAA'} });
        console.log('Department heads DEAN_FAA:', dheads);
        
        const pendingForms = await prisma.form_approvals.findMany({ where: { stage: { contains: 'Dean' } } });
        console.log('Form approvals for Dean stage:', pendingForms);
    } catch(e) {
        console.error(e);
    }
})();
