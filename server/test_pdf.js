const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
(async () => {
    const pdfBytes = fs.readFileSync('../forms/Permission to travel by airline other than air india.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const p = pages[0];
    const { width, height } = p.getSize();
    
    const draw = (txt, x, y) => p.drawText(txt, { x, y: height - y, size: 12, color: rgb(1, 0, 0) });
    
    draw("NAME", 300, 200);
    draw("DESIGNATION", 300, 230);
    draw("DEPT", 300, 260);
    draw("ONWARD", 320, 290);
    draw("RETURN", 400, 290);
    
    draw("PLACE", 300, 360);
    draw("PURPOSE", 300, 390);
    draw("SECTORS", 300, 420);
    draw("REASON", 300, 480);
    draw("YES NO", 300, 520);
    draw("BUDGET", 300, 570);
    
    const pdfBytesOut = await pdfDoc.save();
    fs.writeFileSync('test_out.pdf', pdfBytesOut);
    console.log("Written test_out.pdf");
})();
