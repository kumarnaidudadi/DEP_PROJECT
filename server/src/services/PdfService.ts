// ─── PdfService ───────────────────────────────────────────────────────────────
// Handles all PDF generation logic.
// Uses actual DB tables: applied_forms, form_types, form_forwards, form_history

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
        const form = await this.prisma.applied_forms.findUnique({
            where: { id: Number(formId) },
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
                form_forwards: {
                    include: {
                        from_user: {
                            include: {
                                user_roles: {
                                    include: {
                                        roles: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { forwarded_at: 'asc' }
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
            const schema = form.form_types?.schema as any;
            if (schema && typeof schema === 'object') {
                const fieldsArr = schema.data || schema.fields || [];
                if (Array.isArray(fieldsArr)) {
                    for (const field of fieldsArr) {
                        if (field.name && field.name.toLowerCase().includes(keyLower)) {
                            if (fd[field.id] !== undefined && fd[field.id] !== '') return fd[field.id];
                        }
                    }
                } else {
                    // Legacy fallback
                    for (const stepKey of Object.keys(schema)) {
                        const stepArr = schema[stepKey];
                        if (!Array.isArray(stepArr)) continue;
                        for (const field of stepArr) {
                            if (field.name && field.name.toLowerCase().includes(keyLower)) {
                                if (fd[field.id] !== undefined && fd[field.id] !== '') return fd[field.id];
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

            if (signerName && !imageDrawn) {
                const fs = size || 10;
                draw(`Digitally signed by ${signerName}`, targetX - 20, targetY, fs);
                draw(`Date: ${dateStr}`, targetX - 20, targetY + 12, fs);
            } else if (imageDrawn) {
                draw(dateStr, targetX + 20, targetY + 5, (size || 11) * 0.8);
            }
        };

        // Applicant signature: search form_data for signature fields
        const applicantSig = getFd('signature');
        const applicantName = [form.users?.first_name, form.users?.last_name].filter(Boolean).join(' ') || '';

        // Stage signatures from form_forwards approvals
        const getStageSig = (stageStart: string) => {
            if (!Array.isArray(form.form_forwards)) return null;
            const approval = form.form_forwards.find(
                (fwd: any) => fwd.action === 'approved' && 
                    fwd.from_user?.user_roles?.some((ur: any) => 
                        ur.roles?.name?.toLowerCase().includes(stageStart.toLowerCase())
                    )
            );
            if (!approval) return null;

            // Look for signature in the merged form_data
            let sigUrl = null;
            const fData = form.form_data as any;
            if (fData) {
                for (const key of Object.keys(fData)) {
                    if (typeof fData[key] === 'string' && fData[key].includes('/uploads/')) {
                        sigUrl = fData[key];
                        break;
                    }
                }
            }

            const signerName = [(approval as any).from_user?.first_name, (approval as any).from_user?.last_name].filter(Boolean).join(' ') || '';
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
