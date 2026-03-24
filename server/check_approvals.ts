import prisma from './src/prisma';
async function run() {
    const app = await prisma.forms.findUnique({ where: { id: 47 }, include: { form_approvals: true, form_types: true } });
    console.log("Form Data:");
    console.dir(app?.form_data, { depth: null });
    console.log("Approvals:");
    console.dir(app?.form_approvals, { depth: null });
    console.log("Schema config for steps:");
    const schema = app?.form_types?.schema_definition as any;
    for (const key of Object.keys(schema)) {
      console.log(key, schema[key][0]);
    }
    process.exit(0);
}
run();
