process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import prisma from './src/prisma';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

(async () => {
    try {
        const id = 15;
        const form = await prisma.forms.findUnique({
            where: { id },
            include: { users: true }
        });

        if (!form) return console.error('Form not found');

        const templatePath = path.join(__dirname, '../forms/Permission to travel by airline other than air india.pdf');
        
        if (!fs.existsSync(templatePath)) {
            return console.error('PDF template not found on server:', templatePath);
        }

        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const p = pages[0]; // Assuming one-page form
        const { height } = p.getSize();

        // Helper to draw text using traditional Top-Left as (0,0) (converts to bottom-left automatically)
        const draw = (txt: string | null | undefined, x: number, y: number, size = 11) => {
            if (!txt) return;
            p.drawText(String(txt), { x, y: height - y, size, color: rgb(0.1, 0.25, 0.5) }); // Dark blue to easily see injected text
        };

        const fd = form.form_data as any;

        // Coordinates estimated for standard A4
        draw(fd.Name || form.users?.first_name || '', 310, 233);
        draw(fd.Designation || '', 310, 260);
        draw(fd.Department || '', 310, 287);

        // Dates (handles camelCase or snake_case key variants)
        const visitDateFrom = fd.Visit_Dates_from || fd.visit_dates_from || '';
        const visitDateTo = fd.Visit_Dates_to || fd.visit_dates_to || '';
        draw(visitDateFrom, 320, 313, 10);
        draw(visitDateTo, 450, 313, 10);

        draw(fd.Place_To_Be_Visited || fd.Place_to_be_Visited || '', 310, 360);
        draw(fd.Purpose || '', 310, 388);

        // Handle potentially long text for sectors/reasons
        const sectors = fd.Sectors_For_Which_Permission_Is_Sought || fd['Sectors_for_which_permission_is_sought.'] || '';
        draw(sectors.substring(0, 50), 310, 420);

        const reasons = fd.Reason_For_Travel_By_Airline_Other_Than_Air_India || fd['Reason_for_travel_by_airline_other_than_Air_India'] || '';
        draw(reasons.substring(0, 50), 310, 480);

        const mhrd = fd.Permission_Sought_From_MHRD || fd['Permission_sought_from_MHRD'] || fd.Permission_Sought_From_MHRD;
        const mhrdText = typeof mhrd === 'boolean' ? (mhrd ? 'Yes' : 'No') : String(mhrd || '');
        draw(mhrdText, 310, 520);

        draw(fd['Budget_Head:_InstituteProject'] || fd.Budget_Head_InstituteProject || '', 310, 570);

        // Try to embed signature
        const sigUrl = fd['Signature_Of_ApplicantS_With_Date'] || fd['Signature_of_Applicant\'s_with_date'] || fd.Signature_Of_ApplicantS_With_Date || form.users?.signature_url;

        if (sigUrl && typeof sigUrl === 'string' && sigUrl.includes('/uploads/')) {
            try {
                const cleanUrl = sigUrl.split('?')[0]; 
                const sigPath = path.join(__dirname, '../', cleanUrl);
                
                console.log('sigPath:', sigPath);

                if (fs.existsSync(sigPath)) {
                    const sigImageBytes = fs.readFileSync(sigPath);
                    let sigImage;

                    if (sigPath.toLowerCase().endsWith('.png')) {
                        sigImage = await pdfDoc.embedPng(sigImageBytes);
                    } else if (sigPath.toLowerCase().match(/\.jpe?g$/)) {
                        sigImage = await pdfDoc.embedJpg(sigImageBytes);
                    } else if (sigPath.toLowerCase().endsWith('.webp')) {
                       // Do we support webp parsing?
                       console.log("image is webp");
                    }

                    if (sigImage) {
                        p.drawImage(sigImage, {
                            x: 400,
                            y: height - 680,
                            width: 120, // max width
                            height: 45, // max height
                        });
                        draw(new Date().toLocaleDateString(), 420, 695, 9); // Add date beneath signature
                    }
                }
            } catch (e) {
                console.error("Signature embed failed:", e);
            }
        }

        const outBytes = await pdfDoc.save();
        console.log("Successfully generated PDF of length:", outBytes.length);

    } catch (error) {
        console.error('Download PDF error:', error);
    }
})();
