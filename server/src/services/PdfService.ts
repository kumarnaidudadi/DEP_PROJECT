// ─── PdfService ───────────────────────────────────────────────────────────────
// Handles all PDF generation logic. Extracted from the /download route in
// routes/forms.ts. Single Responsibility: only generates PDF buffers.
// Open/Closed: new form types / templates can be added without touching
// the controller.

import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { IPdfService } from './IPdfService';
import { EncryptionService } from './EncryptionService';
import { getPdfMappingForForm, airIndiaMapping } from './pdfMappings';

export class PdfService implements IPdfService {
    constructor(private readonly prisma: PrismaClient) { }

    async generateFormPdf(formId: number): Promise<Buffer> {
        const form = await this.prisma.forms.findUnique({
            where: { id: formId },
            include: { users: true, form_approvals: true, form_types: true }
        });

        if (!form) throw new Error('FORM_NOT_FOUND');

        const formTypeName = form.form_types?.name || '';
        let templatePath = '';

        const formsDir = path.join(__dirname, '../../../forms');
        if (fs.existsSync(formsDir)) {
            const allPdfs = fs.readdirSync(formsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
            const matchingPdf = allPdfs.find(f => f.toLowerCase() === `${formTypeName.toLowerCase()}.pdf`);
            
            if (matchingPdf) {
                templatePath = path.join(formsDir, matchingPdf);
            }
        }

        if (!templatePath) {
            templatePath = path.join(
                __dirname,
                '../../../forms/Permission to travel by airline other than air india.pdf'
            );
        }

        if (!fs.existsSync(templatePath)) {
            // Attempt another fallback just in case
            templatePath = path.join(
                __dirname,
                '../../../forms/APPLICATION FOR PERMISSION TO TRAVEL BY AIRLINE OTHER THAN AIR INDIA.pdf'
            );
        }

        if (!fs.existsSync(templatePath)) {
            throw new Error('PDF_TEMPLATE_NOT_FOUND');
        }

        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const page = pages[0];
        const { height } = page.getSize();

        // Helper: draw text using top-left origin (converts to bottom-left internally)
        const draw = (txt: string | null | undefined, x: number, y: number, size = 11) => {
            if (!txt) return;
            page.drawText(String(txt), {
                x,
                y: height - y,
                size,
                color: rgb(0.1, 0.25, 0.5),
            });
        };

        const fd = form.form_data as any;

        const getFd = (keySub: string) => {
            const keys = Object.keys(fd || {});
            const found = keys.find(k => k.toLowerCase().includes(keySub.toLowerCase()));
            return found ? fd[found] : '';
        };

        // ── Field mapping ──────────────────────────────────────────────────
        const mappingToUse = getPdfMappingForForm(formTypeName) || airIndiaMapping;

        // ── Draw fields onto PDF ───────────────────────────────────────────
        for (const field of mappingToUse.fields) {
            draw(field.getter(form, getFd), field.x, field.y, field.size || 11);
        }

        // ── Embed signatures ───────────────────────────────────────────────
        const embedSig = async (sigUrl: string | undefined | null, targetY: number, targetX = 350) => {
            if (!sigUrl || typeof sigUrl !== 'string' || !sigUrl.includes('/uploads/')) return;
            try {
                const cleanUrl = sigUrl.split('?')[0].replace(/^\/+/, '');
                const sigPath = path.join(__dirname, '../../', cleanUrl);

                if (fs.existsSync(sigPath)) {
                    const encryptedBytes = fs.readFileSync(sigPath);
                    let sigImageBytes;
                    try {
                        sigImageBytes = EncryptionService.decrypt(encryptedBytes);
                    } catch (decErr) {
                        console.error('Failed to decrypt signature:', decErr);
                        return; // Handle gracefully without breaking PDF gen
                    }

                    let sigImage;

                    if (sigPath.toLowerCase().endsWith('.png')) {
                        sigImage = await pdfDoc.embedPng(sigImageBytes);
                    } else if (sigPath.toLowerCase().match(/\.jpe?g$/)) {
                        sigImage = await pdfDoc.embedJpg(sigImageBytes);
                    }

                    if (sigImage) {
                        page.drawImage(sigImage, {
                            x: targetX,
                            y: height - targetY,
                            width: 100,
                            height: 38,
                        });
                        const dateStr = form.updated_at
                            ? new Date(form.updated_at).toLocaleDateString()
                            : new Date().toLocaleDateString();
                        draw(dateStr, targetX + 20, targetY + 5, 9);
                    }
                }
            } catch (e) {
                console.error('Signature embed failed:', e);
            }
        };

        const applicantSig = getFd('applicant') || form.users?.signature_url;

        const getStageSig = (stageStart: string) => {
            if (!Array.isArray(form.form_approvals)) return null;
            const approval = form.form_approvals.find(
                (a: any) => a.stage?.toLowerCase().includes(stageStart) && a.decision === 'APPROVED'
            );
            if (!approval?.approval_data) return null;
            const ad = approval.approval_data as any;
            for (const key of Object.keys(ad)) {
                if (typeof ad[key] === 'string' && ad[key].includes('/uploads/')) return ad[key];
            }
            return null;
        };

        for (const sigMapping of mappingToUse.signatures) {
           if (sigMapping.stage === 'applicant') {
               await embedSig(applicantSig, sigMapping.y, sigMapping.x);
           } else {
               const stagesToCheck = Array.isArray(sigMapping.stage) ? sigMapping.stage : [sigMapping.stage];
               for (const s of stagesToCheck) {
                   const sigUrl = getStageSig(s);
                   if (sigUrl) {
                       await embedSig(sigUrl, sigMapping.y, sigMapping.x);
                       break;
                   }
               }
           }
        }

        const outBytes = await pdfDoc.save();
        return Buffer.from(outBytes);
    }
}
