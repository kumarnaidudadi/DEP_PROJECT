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

    const draw = (txt: string, x: number, y: number) => {
        p.drawText(txt, { x, y: height - y, size: 10, color: rgb(1, 0, 0) });
    };

    for (let y = 100; y <= 600; y += 20) {
        draw(`Y=${y}`, 200, y);
    }
    
    fs.writeFileSync('test_pos.pdf', await pdfDoc.save());
    console.log("Created test_pos.pdf");
})();
