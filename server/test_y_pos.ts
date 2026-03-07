import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

(async () => {
    const templatePath = path.join(__dirname, '../forms/Permission to travel by airline other than air india.pdf');
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const p = pages[0];
    const { height } = p.getSize();
    console.log("PDF Height:", height);

    const draw = (txt: string, y: number) => {
        p.drawText(txt, { x: 100, y: height - y, size: 10, color: rgb(1, 0, 0) });
    };

    draw("Y100", 100);
    draw("Y150", 150);
    draw("Y200", 200);
    draw("Y250", 250);
    draw("Y300", 300);
    
    fs.writeFileSync('/tmp/pdfparse/test.pdf', await pdfDoc.save());
    console.log("Wrote test.pdf");
})();
