import prisma from './src/prisma';
(async () => {
    const f = await prisma.forms.findUnique({
        where: { id: 15 },
        include: { form_approvals: true, form_types: true }
    });
    console.log("SCHEMA:", JSON.stringify(f?.form_types?.schema_definition, null, 2));
    console.log("APPROVALS:", JSON.stringify(f?.form_approvals, null, 2));
    console.log("FORM_DATA:", JSON.stringify(f?.form_data, null, 2));
})();
