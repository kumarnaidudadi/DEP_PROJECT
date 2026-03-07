process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import prisma from './src/prisma';

(async () => {
    try {
        const app = await prisma.forms.findUnique({
            where: { id: 15 },
            include: { form_types: true }
        });
        console.log(JSON.stringify(app?.form_types?.schema_definition, null, 2));
        console.log("FORM DATA:");
        console.log(JSON.stringify(app?.form_data, null, 2));
    } catch(e) { console.error(e) }
})();
