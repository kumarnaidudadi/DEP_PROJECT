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
            include: { 
                users: {
                    include: {
                        user_roles: {
                            include: {
                                roles: true
                            }
                        }
                    }
                }, 
                form_approvals: { 
                    include: { 
                        users: {
                            include: {
                                user_roles: {
                                    include: {
                                        roles: true
                                    }
                                }
                            }
                        } 
                    } 
                }, 
                form_types: true 
            }
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
            if (!fd) return '';
            const keyLower = keySub.toLowerCase();
            
            // 1) Direct key or substring match against form_data
            const keys = Object.keys(fd);
            const found = keys.find(k => k.toLowerCase().includes(keyLower));
            if (found && fd[found]) return fd[found];

            // 2) Schema-based match: search for field by label/name, then use its ID to get value
            const schema = form.form_types?.schema_definition as any;
            if (schema && typeof schema === 'object') {
                for (const stepKey of Object.keys(schema)) {
                    const stepArr = schema[stepKey];
                    if (!Array.isArray(stepArr)) continue;
                    
                    for (const field of stepArr) {
                        if (field.name && field.name.toLowerCase().includes(keyLower)) {
                            // Extract direct value using exact field.id
                            if (fd[field.id] !== undefined && fd[field.id] !== '') return fd[field.id];
                            
                            // Also check approval_data
                            if (form.form_approvals) {
                                for (const approval of form.form_approvals as any[]) {
                                    if (approval.approval_data && approval.decision === 'APPROVED') {
                                        if (approval.approval_data[field.id] !== undefined && approval.approval_data[field.id] !== '') {
                                            return approval.approval_data[field.id];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return '';
        };

        // ── Field mapping ──────────────────────────────────────────────────
        const mappingToUse = getPdfMappingForForm(formTypeName) || airIndiaMapping;

        // ── Draw fields onto PDF ───────────────────────────────────────────
        for (const field of mappingToUse.fields) {
            draw(field.getter(form, getFd), field.x, field.y, field.size || 11);
        }

        // ── Embed signatures ───────────────────────────────────────────────
        const embedSig = async (sigUrl: string | undefined | null, targetY: number, targetX = 350, signerName = '', size?: number) => {
            if (!sigUrl || typeof sigUrl !== 'string' || !sigUrl.includes('/uploads/')) return;

            const dateStr = form.updated_at
                ? new Date(form.updated_at).toLocaleDateString()
                : new Date().toLocaleDateString();

            let imageDrawn = false;
            try {
                const cleanUrl = sigUrl.split('?')[0].replace(/^\/+/, '');
                const sigPath = path.join(__dirname, '../../', cleanUrl);

                if (fs.existsSync(sigPath)) {
                    const storedBytes = fs.readFileSync(sigPath);
                    let sigImageBytes;
                    try {
                        sigImageBytes = EncryptionService.decrypt(storedBytes);
                    } catch (decErr) {
                        console.error('Failed to decrypt signature:', decErr);
                        // Some older uploads were stored as plain image bytes instead of encrypted blobs.
                        sigImageBytes = storedBytes;
                    }

                    if (sigImageBytes) {
                        let sigImage;
                        if (sigPath.toLowerCase().endsWith('.png')) {
                            sigImage = await pdfDoc.embedPng(sigImageBytes);
                        } else if (sigPath.toLowerCase().match(/\.jpe?g$/)) {
                            sigImage = await pdfDoc.embedJpg(sigImageBytes);
                        }

                        if (sigImage) {
                            const scale = size ? size / 11 : 1; 
                            page.drawImage(sigImage, {
                                x: targetX,
                                y: height - targetY,
                                width: 100 * scale,
                                height: 38 * scale,
                            });
                            imageDrawn = true;
                        }
                    }
                }
            } catch (e) {
                console.error('Signature embed failed:', e);
            }

            // Fallback securely to textual representation if image isn't supported (e.g. .webp) or couldn't be loaded
            if (signerName && !imageDrawn) {
                const fs = size || 10;
                draw(`Digitally signed by ${signerName}`, targetX - 20, targetY, fs);
                draw(`Date: ${dateStr}`, targetX - 20, targetY + 12, fs);
            } else if (imageDrawn) {
                draw(dateStr, targetX + 20, targetY + 5, (size || 11) * 0.8);
            }
        };

        const applicantSig = getFd('applicant') || form.users?.signature_url;
        const applicantName = form.users ? `${form.users.first_name || ''} ${form.users.last_name || ''}`.trim() : '';

        const getStageSig = (stageStart: string) => {
            if (!Array.isArray(form.form_approvals)) return null;
            const approval = form.form_approvals.find(
                (a: any) => a.stage?.toLowerCase().includes(stageStart) && a.decision === 'APPROVED'
            );
            if (!approval) return null;
            
            let sigUrl = null;
            if (approval.approval_data) {
                const ad = approval.approval_data as any;
                for (const key of Object.keys(ad)) {
                    if (typeof ad[key] === 'string' && ad[key].includes('/uploads/')) {
                        sigUrl = ad[key];
                        break;
                    }
                }
            }

            if (!sigUrl && (approval as any).users?.signature_url) {
                sigUrl = (approval as any).users.signature_url;
            }
            
            const signerName = (approval as any).users ? `${(approval as any).users.first_name || ''} ${(approval as any).users.last_name || ''}`.trim() : '';
            return { sigUrl, signerName };
        };

        for (const sigMapping of mappingToUse.signatures) {
           if (sigMapping.stage === 'applicant') {
               await embedSig(applicantSig, sigMapping.y, sigMapping.x, applicantName, sigMapping.size);
           } else {
               const stagesToCheck = Array.isArray(sigMapping.stage) ? sigMapping.stage : [sigMapping.stage];
               for (const s of stagesToCheck) {
                   const stageSigData = getStageSig(s);
                   if (stageSigData && stageSigData.sigUrl) {
                       await embedSig(stageSigData.sigUrl, sigMapping.y, sigMapping.x, stageSigData.signerName, sigMapping.size);
                       break;
                   }
               }
           }
        }

        const outBytes = await pdfDoc.save();
        return Buffer.from(outBytes);
    }
}
