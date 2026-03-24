const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function check() {
  const fileNames = [
    'Leave Travel Concession.pdf',
    'APPLICATION FOR PERMISSION TO TRAVEL BY AIRLINE OTHER THAN AIR INDIA.pdf'
  ];
  for (const file of fileNames) {
    console.log(`Checking ${file}...`);
    const path = `../forms/${file}`;
    if (!fs.existsSync(path)) {
      console.log('File not found', path);
      continue;
    }
    const pdfBytes = fs.readFileSync(path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('Number of fields:', fields.length);
    fields.forEach(f => {
        try {
            console.log(f.getName(), f.constructor.name);
        } catch(e) {}
    });
  }
}

check().catch(console.error);
