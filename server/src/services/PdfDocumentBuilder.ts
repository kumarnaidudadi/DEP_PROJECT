// PdfDocumentBuilder — Government-form style PDF generator
import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const PW = 595.28, PH = 841.89, ML = 55, MR = 55, CW = PW - ML - MR;
const BLACK = rgb(0,0,0), GREY = rgb(0.4,0.4,0.4), LGREY = rgb(0.85,0.85,0.85);
const NAVY = rgb(0.05,0.15,0.38), WHITE = rgb(1,1,1);

interface Ctx { doc: PDFDocument; B: PDFFont; R: PDFFont; I: PDFFont; }
interface FieldEntry { label: string; value: any; type: string; options: string[]; }

export class PdfDocumentBuilder {
    constructor(private readonly prisma: PrismaClient) {}

    async generateFormPdf(formId: number): Promise<Buffer> {
        const form = await this.prisma.applied_forms.findUnique({
            where: { id: formId },
            include: {
                users: { include: { user_roles: { include: { roles: true } } } },
                form_types: true,
                form_forwards: {
                    include: { from_user: { include: { user_roles: { include: { roles: true } } } } },
                    orderBy: { forwarded_at: 'asc' },
                },
            },
        });
        if (!form) throw new Error('FORM_NOT_FOUND');

        const doc = await PDFDocument.create();
        const B = await doc.embedFont(StandardFonts.HelveticaBold);
        const R = await doc.embedFont(StandardFonts.Helvetica);
        const I = await doc.embedFont(StandardFonts.HelveticaOblique);
        const ctx: Ctx = { doc, B, R, I };

        const schema   = form.form_types?.schema as any;
        const fd       = (form.form_data as any) || {};
        const fields   = this.extractFields(schema, fd);
        const formName = form.form_types?.name || 'Application';

        let pg = doc.addPage([PW, PH]);
        let y  = await this.drawLetterhead(ctx, pg);
        y      = this.drawTitle(ctx, pg, y, formName, form);
        y      = this.drawFields(ctx, pg, doc, y, fields, form, formName);

        const ap = doc.addPage([PW, PH]);
        await this.drawAuditPage(ctx, ap, form);

        doc.getPages().forEach((p, i) => this.drawFooter(p, ctx, i + 1, doc.getPageCount(), form));
        return Buffer.from(await doc.save());
    }

    // ── Letterhead (async — embeds real logo if available) ────────────────
    private async drawLetterhead(ctx: Ctx, pg: PDFPage): Promise<number> {
        const LH = 90;
        pg.drawRectangle({ x: 0, y: PH - LH, width: PW, height: LH, color: WHITE });

        // Embed the full header image (the entire IIT letterhead)
        const imgPath = path.join(__dirname, '../assets/iit_logo.png.png');
        if (fs.existsSync(imgPath)) {
            try {
                const imgBytes = fs.readFileSync(imgPath);
                // Try PNG first, fallback to JPG
                let img;
                try { img = await ctx.doc.embedPng(imgBytes); } catch { img = await ctx.doc.embedJpg(imgBytes); }
                // Draw full width, proportional height
                const dims = img.scaleToFit(PW - ML - MR, LH - 10);
                pg.drawImage(img, { x: ML, y: PH - LH + (LH - dims.height) / 2, width: dims.width, height: dims.height });
            } catch (e) {
                // Fallback: draw text header
                const { B, R } = ctx;
                const cx = ML + 30, cy = PH - 44;
                pg.drawCircle({ x: cx, y: cy, size: 28, color: rgb(0.93,0.95,0.99) });
                pg.drawCircle({ x: cx, y: cy, size: 28, borderColor: NAVY, borderWidth: 1.5 });
                pg.drawText('IIT',   { x: cx - 10, y: cy - 4,  size: 11, font: B, color: NAVY });
                pg.drawText('ROPAR', { x: cx - 14, y: cy - 16, size: 7,  font: B, color: NAVY });
                const tx = ML + 72;
                pg.drawText('INDIAN INSTITUTE OF TECHNOLOGY ROPAR', { x: tx, y: PH - 24, size: 13, font: B, color: NAVY });
                pg.drawText('Nangal Road, Rupnagar, Punjab - 140001', { x: tx, y: PH - 40, size: 8,  font: R, color: GREY });
                pg.drawText('Tele: +91-1881-227078  |  Fax: +91-1881-223395', { x: tx, y: PH - 52, size: 8, font: R, color: GREY });
            }
        } else {
            // No image file — text fallback
            const { B, R } = ctx;
            const cx = ML + 30, cy = PH - 44;
            pg.drawCircle({ x: cx, y: cy, size: 28, color: rgb(0.93,0.95,0.99) });
            pg.drawCircle({ x: cx, y: cy, size: 28, borderColor: NAVY, borderWidth: 1.5 });
            pg.drawText('IIT',   { x: cx - 10, y: cy - 4,  size: 11, font: B, color: NAVY });
            pg.drawText('ROPAR', { x: cx - 14, y: cy - 16, size: 7,  font: B, color: NAVY });
            const tx = ML + 72;
            pg.drawText('INDIAN INSTITUTE OF TECHNOLOGY ROPAR', { x: tx, y: PH - 24, size: 13, font: B, color: NAVY });
            pg.drawText('Nangal Road, Rupnagar, Punjab - 140001', { x: tx, y: PH - 40, size: 8,  font: R, color: GREY });
            pg.drawText('Tele: +91-1881-227078  |  Fax: +91-1881-223395', { x: tx, y: PH - 52, size: 8, font: R, color: GREY });
        }

        pg.drawLine({ start: { x: ML, y: PH - LH },     end: { x: PW - MR, y: PH - LH },     thickness: 2,   color: NAVY });
        pg.drawLine({ start: { x: ML, y: PH - LH - 2 }, end: { x: PW - MR, y: PH - LH - 2 }, thickness: 0.5, color: NAVY });
        return PH - LH - 14;
    }

    // ── Centered bold underlined title ────────────────────────────────────
    private drawTitle(ctx: Ctx, pg: PDFPage, y: number, name: string, form: any): number {
        const { B, R } = ctx;
        const title = name.toUpperCase();
        const tW    = B.widthOfTextAtSize(title, 12);
        const tx    = (PW - tW) / 2;
        y -= 18;
        pg.drawText(title, { x: tx, y, size: 12, font: B, color: BLACK });
        pg.drawLine({ start: { x: tx, y: y - 2 }, end: { x: tx + tW, y: y - 2 }, thickness: 0.75, color: BLACK });

        y -= 14;
        const docId = form.reference_number || `DOC-${String(form.id).padStart(5,'0')}`;
        const status = String(form.status || form.current_status || 'pending').toUpperCase();
        let date = '';
        if (form.submitted_at || form.created_at) {
            const d = new Date(form.submitted_at || form.created_at);
            date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        pg.drawText(`${docId}   |   Status: ${status}   |   Date: ${date}`, { x: ML, y, size: 8, font: R, color: GREY });

        y -= 10;
        pg.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 0.4, color: LGREY });
        return y - 16;
    }

    // ── Field list ────────────────────────────────────────────────────────
    private drawFields(ctx: Ctx, pg: PDFPage, doc: PDFDocument, startY: number,
        fields: FieldEntry[], form: any, formName: string): number {

        let y = startY, num = 1;

        const newPage = async (): Promise<PDFPage> => {
            const p = doc.addPage([PW, PH]);
            y = await this.drawLetterhead(ctx, p);
            y -= 8;
            ctx.R && p.drawText(`${formName.toUpperCase()} (continued)`, { x: ML, y, size: 9, font: ctx.R, color: GREY });
            y -= 14;
            return p;
        };

        // Note: newPage is async but drawFields is sync; handle inline with a sync wrapper
        const ensurePage = (neededHeight: number) => {
            if (y - neededHeight < 80) {
                // Can't await here — add page synchronously with no letterhead (will be added by footer)
                pg = doc.addPage([PW, PH]);
                y  = PH - 110;
                pg.drawText(`${formName.toUpperCase()} (continued)`, { x: ML, y, size: 9, font: ctx.R, color: GREY });
                y -= 14;
            }
        };

        for (const f of fields) {
            const est = f.type === 'table' ? 100 : f.type === 'textarea' ? 70 : 40;
            ensurePage(est);

            switch (f.type) {
                case 'table':         y = this.drawTableField(ctx, pg, doc, y, f, num); break;
                case 'date_range':    y = this.drawDateRange(ctx, pg, y, f, num); break;
                case 'textarea':      y = this.drawTextarea(ctx, pg, y, f, num); break;
                case 'checkbox_group':
                case 'radio':         y = this.drawOptions(ctx, pg, y, f, num); break;
                default:              y = this.drawSimpleField(ctx, pg, y, f, num);
            }
            num++;
            y -= 8;
        }

        // Applicant signature
        ensurePage(50);
        y -= 20;
        const u    = form.users;
        const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || '';
        pg.drawText('(Signature of the applicant)', { x: PW - MR - 135, y, size: 9, font: ctx.R, color: BLACK });
        y -= 18;
        if (name) pg.drawText(this.s(name), { x: PW - MR - 135, y, size: 8, font: ctx.I, color: GREY });

        return y;
    }

    // ── Simple field: N. Label : value _____ ────────────────────────────
    private drawSimpleField(ctx: Ctx, pg: PDFPage, y: number, f: FieldEntry, num: number): number {
        // Any non-array object: redirect to date range FIRST (avoids drawing label twice)
        if (typeof f.value === 'object' && !Array.isArray(f.value) && f.value !== null) {
            return this.drawDateRange(ctx, pg, y, { ...f, type: 'date_range' }, num);
        }

        const { R } = ctx;
        const colonX = ML + 230, valX = colonX + 14, LINE_H = 13;
        const labelLines = this.wrapText(f.label, 30);
        const rowH = Math.max(22, labelLines.length * LINE_H + 8);

        pg.drawText(`${num}.`, { x: ML, y, size: 9, font: R, color: BLACK });
        labelLines.forEach((ln, i) => pg.drawText(this.s(ln), { x: ML + 20, y: y - i * LINE_H, size: 9, font: R, color: BLACK }));
        pg.drawText(':', { x: colonX, y, size: 9, font: R, color: BLACK });

        const val = this.s(this.fmtVal(f.value));
        if (val) pg.drawText(val, { x: valX, y, size: 9, font: R, color: BLACK, maxWidth: PW - MR - valX - 4 });
        
        // Underline directly beneath the value text on the first line
        pg.drawLine({ start: { x: valX, y: y - 2 }, end: { x: PW - MR, y: y - 2 }, thickness: 0.4, color: BLACK });
        
        return y - rowH;
    }

    // ── Date range: No. of days ___ From ___ to ___ ──────────────────
    private drawDateRange(ctx: Ctx, pg: PDFPage, y: number, f: FieldEntry, num: number): number {
        const { R } = ctx;
        const colonX = ML + 228, valX = colonX + 12, LINE_H = 13;
        const labelLines = this.wrapText(f.label, 30);
        const labelBottomY = y - labelLines.length * LINE_H;

        pg.drawText(`${num}.`, { x: ML, y, size: 9, font: R, color: BLACK });
        labelLines.forEach((ln, i) => pg.drawText(this.s(ln), { x: ML + 20, y: y - i * LINE_H, size: 9, font: R, color: BLACK }));
        pg.drawText(':', { x: colonX, y, size: 9, font: R, color: BLACK });

        const raw = f.value as any;
        const allVals = Object.values(raw as object) as any[];
        const fromRaw = raw?.from ?? raw?.From ?? raw?.from_date ?? raw?.start ?? raw?.Start ?? raw?.date_from ?? allVals[0] ?? '';
        const toRaw   = raw?.to   ?? raw?.To   ?? raw?.to_date   ?? raw?.end   ?? raw?.End   ?? raw?.date_to   ?? allVals[1] ?? '';
        const daysRaw = raw?.days ?? raw?.no_of_days ?? raw?.Days ?? raw?.numDays ?? raw?.num_days ?? allVals[2] ?? '';
        const from = this.fmtDate(String(fromRaw || ''));
        const to   = this.fmtDate(String(toRaw   || ''));
        const days = (daysRaw !== undefined && daysRaw !== null && daysRaw !== '') ? String(daysRaw) : '';

        const daysDisplay = days && !/\d{4}/.test(days) ? days : '';

        let rx = valX;
        let valueBottomY = y;
        if (daysDisplay) {
            pg.drawText('No. of days', { x: rx, y, size: 8.5, font: R, color: BLACK });
            rx += 64;
            pg.drawText(daysDisplay, { x: rx, y, size: 8.5, font: R, color: BLACK });
            pg.drawLine({ start: { x: rx, y: y - 2 }, end: { x: rx + 55, y: y - 2 }, thickness: 0.4, color: BLACK });
            y -= 16; rx = valX;
            valueBottomY = y;
        }
        // From ___ to ___  on same line
        pg.drawText('From', { x: rx, y, size: 8.5, font: R, color: BLACK }); rx += 28;
        if (from) pg.drawText(this.s(from), { x: rx, y, size: 8.5, font: R, color: BLACK });
        pg.drawLine({ start: { x: rx, y: y - 2 }, end: { x: rx + 105, y: y - 2 }, thickness: 0.4, color: BLACK });
        rx += 112;
        pg.drawText('to', { x: rx, y, size: 8.5, font: R, color: BLACK }); rx += 14;
        if (to) pg.drawText(this.s(to), { x: rx, y, size: 8.5, font: R, color: BLACK });
        pg.drawLine({ start: { x: rx, y: y - 2 }, end: { x: PW - MR, y: y - 2 }, thickness: 0.4, color: BLACK });
        
        valueBottomY = y - 12;

        return Math.min(labelBottomY - 8, valueBottomY);
    }

    // ── Textarea: box on the RIGHT side after the colon ────────────────────
    private drawTextarea(ctx: Ctx, pg: PDFPage, y: number, f: FieldEntry, num: number): number {
        const { R } = ctx;
        const LINE_H  = 13;
        const colonX  = ML + 230;
        const valX    = colonX + 14;       // box starts right after colon
        const boxW    = PW - MR - valX;    // spans to right margin
        const labelLines = this.wrapText(f.label, 30);

        pg.drawText(`${num}.`, { x: ML, y, size: 9, font: R, color: BLACK });
        labelLines.forEach((ln, i) => pg.drawText(this.s(ln), { x: ML + 20, y: y - i * LINE_H, size: 9, font: R, color: BLACK }));
        pg.drawText(':', { x: colonX, y, size: 9, font: R, color: BLACK });

        const val   = this.fmtVal(f.value);
        const lines = this.wrapText(val || ' ', 48);  // 48 chars fits in the right column
        const bH    = Math.max(28, lines.length * 13 + 10);
        // Box sits on the same row as the first label line
        pg.drawRectangle({ x: valX, y: y + 4 - bH, width: boxW, height: bH, borderColor: BLACK, borderWidth: 0.5 });
        lines.forEach((ln, i) => pg.drawText(this.s(ln), { x: valX + 4, y: y - 8 - i * 13, size: 8.5, font: R, color: BLACK }));

        // Return y below whichever is taller: label or box
        const labelBottom = y - labelLines.length * LINE_H;
        const boxBottom   = y + 4 - bH;
        return Math.min(labelBottom, boxBottom) - 8;
    }

    // ── Checkbox/radio ────────────────────────────────────────────────────
    private drawOptions(ctx: Ctx, pg: PDFPage, y: number, f: FieldEntry, num: number): number {
        const { R } = ctx;
        const colonX = ML + 230, valX = colonX + 14, LINE_H = 13;
        const labelLines = this.wrapText(f.label, 30);
        pg.drawText(`${num}.`, { x: ML, y, size: 9, font: R, color: BLACK });
        labelLines.forEach((ln, i) => pg.drawText(this.s(ln), { x: ML + 20, y: y - i * LINE_H, size: 9, font: R, color: BLACK }));
        pg.drawText(':', { x: colonX, y, size: 9, font: R, color: BLACK });

        const selected = Array.isArray(f.value) ? f.value : [String(f.value)];
        let rx = valX;
        for (const opt of (f.options || [])) {
            const checked = selected.some(s => String(s).toLowerCase() === String(opt).toLowerCase());
            pg.drawRectangle({ x: rx, y: y - 9, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.5 });
            if (checked) pg.drawText('X', { x: rx + 1, y: y - 7, size: 7, font: ctx.B, color: BLACK });
            rx += 13;
            pg.drawText(this.s(String(opt)), { x: rx, y, size: 8.5, font: R, color: BLACK });
            rx += R.widthOfTextAtSize(String(opt), 8.5) + 14;
        }
        return y - Math.max(22, labelLines.length * LINE_H + 8);
    }

    // ── Table ─────────────────────────────────────────────────────────────
    private drawTableField(ctx: Ctx, pg: PDFPage, doc: PDFDocument, y: number, f: FieldEntry, num: number): number {
        const { B, R } = ctx;
        pg.drawText(`${num}. ${this.s(f.label)}`, { x: ML, y, size: 9, font: B, color: BLACK });
        y -= 14;

        const rows: any[]    = Array.isArray(f.value) ? f.value : [];
        const cols: string[] = f.options?.length ? f.options : (rows[0] ? Object.keys(rows[0]) : []);
        if (!cols.length) return y;

        const colW  = CW / cols.length;
        const ROW_H = 16;

        // Header
        cols.forEach((col, ci) => {
            const cx = ML + ci * colW;
            pg.drawRectangle({ x: cx, y: y - ROW_H, width: colW, height: ROW_H, color: LGREY, borderColor: BLACK, borderWidth: 0.5 });
            pg.drawText(this.s(col), { x: cx + 4, y: y - 12, size: 7.5, font: B, color: BLACK, maxWidth: colW - 8 });
        });
        y -= ROW_H;

        const dataRows = rows.length > 0 ? rows : Array(3).fill({});
        for (const row of dataRows) {
            if (y < 80) { pg = doc.addPage([PW, PH]); y = PH - 80; }
            cols.forEach((col, ci) => {
                const cx = ML + ci * colW;
                pg.drawRectangle({ x: cx, y: y - ROW_H, width: colW, height: ROW_H, borderColor: BLACK, borderWidth: 0.5 });
                const cell = row[col] ?? row[col.toLowerCase()] ?? '';
                if (cell) pg.drawText(this.s(String(cell)), { x: cx + 4, y: y - 12, size: 8, font: R, color: BLACK, maxWidth: colW - 8 });
            });
            y -= ROW_H;
        }
        return y;
    }

    // ── Audit trail ───────────────────────────────────────────────────────
    private async drawAuditPage(ctx: Ctx, pg: PDFPage, form: any): Promise<void> {
        const { B, R, I } = ctx;
        let y = await this.drawLetterhead(ctx, pg);
        y -= 8;
        const title = 'PROCESSING HISTORY & TIMELINE';
        const tW    = B.widthOfTextAtSize(title, 12);
        pg.drawText(title, { x: (PW - tW) / 2, y, size: 12, font: B, color: NAVY });
        y -= 4;
        pg.drawLine({ start: { x: (PW - tW) / 2, y }, end: { x: (PW + tW) / 2, y }, thickness: 0.75, color: NAVY });
        y -= 20;

        const steps = [
            {
                action: 'SUBMITTED',
                actor: [form.users?.first_name, form.users?.last_name].filter(Boolean).join(' ') || 'Applicant',
                role: form.users?.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean).join(', ') || '',
                ts: form.created_at, remarks: 'Application submitted.',
            },
            ...(form.form_forwards || []).map((fwd: any) => ({
                action: String(fwd.action || 'FORWARDED').toUpperCase(),
                actor: [fwd.from_user?.first_name, fwd.from_user?.last_name].filter(Boolean).join(' ') || 'System',
                role: fwd.from_user?.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean).join(', ') || '',
                ts: fwd.forwarded_at, remarks: fwd.remarks || fwd.comment || '',
            })),
        ];

        const SPINE = ML + 20;
        pg.drawLine({ start: { x: SPINE, y }, end: { x: SPINE, y: 80 }, thickness: 1, color: LGREY });

        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (y < 130) break;
            const dotC = s.action === 'APPROVED' ? rgb(0.08,0.55,0.3)
                : s.action === 'REJECTED'  ? rgb(0.75,0.1,0.1)
                : s.action === 'SUBMITTED' ? NAVY : GREY;
            const CARD_H = s.remarks ? 74 : 56;
            const CX = ML + 36, CW2 = PW - MR - CX;

            pg.drawRectangle({ x: CX, y: y - CARD_H, width: CW2, height: CARD_H, color: rgb(0.97,0.97,0.99), borderColor: rgb(0.82,0.84,0.9), borderWidth: 0.5 });
            pg.drawRectangle({ x: CX, y: y - CARD_H, width: 3, height: CARD_H, color: dotC });
            pg.drawCircle({ x: SPINE, y: y - 16, size: 9, color: dotC });
            pg.drawText(String(i + 1), { x: SPINE - (i < 9 ? 3 : 5), y: y - 20, size: 7, font: B, color: WHITE });
            pg.drawRectangle({ x: CX + 8, y: y - 18, width: 80, height: 14, color: dotC });
            pg.drawText(s.action, { x: CX + 12, y: y - 12, size: 7, font: B, color: WHITE });
            const ts = s.ts ? new Date(s.ts).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
            pg.drawText(ts, { x: CX + 96, y: y - 12, size: 7, font: R, color: GREY });
            pg.drawText(this.s(s.actor), { x: CX + 10, y: y - 32, size: 9, font: B, color: BLACK });
            if (s.role) pg.drawText(this.s(s.role), { x: CX + 10, y: y - 44, size: 7, font: R, color: GREY });
            if (s.remarks) {
                pg.drawText('Remarks:', { x: CX + 10, y: y - 58, size: 7, font: B, color: GREY });
                pg.drawText(this.s(String(s.remarks).substring(0, 85)), { x: CX + 55, y: y - 58, size: 7, font: I, color: BLACK, maxWidth: CW2 - 65 });
            }
            y -= CARD_H + 12;
        }
    }

    // ── Footer ────────────────────────────────────────────────────────────
    private drawFooter(pg: PDFPage, ctx: Ctx, n: number, total: number, form: any): void {
        pg.drawLine({ start: { x: ML, y: 38 }, end: { x: PW - MR, y: 38 }, thickness: 0.4, color: GREY });
        pg.drawText('LTMS — Official Document', { x: ML, y: 24, size: 6.5, font: ctx.R, color: GREY });
        pg.drawText(`DOC-${String(form.id).padStart(5,'0')}`, { x: PW/2 - 25, y: 24, size: 6.5, font: ctx.B, color: GREY });
        pg.drawText(`Page ${n} of ${total}`, { x: PW - MR - 45, y: 24, size: 6.5, font: ctx.R, color: GREY });
    }

    // ── Extract fields from schema ────────────────────────────────────────
    private extractFields(schema: any, fd: any): FieldEntry[] {
        const result: FieldEntry[] = [];

        const processField = (field: any) => {
            if (!field) return;
            if (['section_header','divider','heading','label','signature','file'].includes(field.type)) return;
            const label = field.name || field.label || field.id || '';
            if (!label) return;

            let val = fd[field.id] ?? fd[field.name] ?? fd[label];
            if (val === undefined || val === null || val === '') return;
            if (typeof val === 'string' && val.startsWith('data:image/')) return;

            // Detect date_range: object with from/to keys
            let type = field.type || 'text';
            if (typeof val === 'object' && !Array.isArray(val)) {
                const keys = Object.keys(val).map(k => k.toLowerCase());
                if (keys.some(k => ['from','to','start','end'].includes(k))) type = 'date_range';
                else if (type === 'object') type = 'textarea';
            }
            // Detect table: array of objects
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') type = 'table';

            result.push({ label, value: val, type, options: field.options || field.choices || [] });
        };

        if (!schema) {
            for (const [k, v] of Object.entries(fd || {})) {
                if (!v || String(v).startsWith('data:image/')) continue;
                result.push({ label: k, value: v, type: 'text', options: [] });
            }
            return result;
        }

        const arr = schema.data || schema.fields;
        if (Array.isArray(arr)) arr.forEach(processField);
        else if (Array.isArray(schema.steps)) schema.steps.forEach((s: any) => (s.fields || []).forEach(processField));
        else for (const k of Object.keys(schema)) {
            const v = schema[k];
            if (Array.isArray(v)) v.forEach(processField);
            else if (v?.fields) (v.fields as any[]).forEach(processField);
        }

        if (result.length === 0) {
            for (const [k, v] of Object.entries(fd)) {
                if (!v || String(v).startsWith('data:image/')) continue;
                let type = 'text';
                if (typeof v === 'object' && !Array.isArray(v)) {
                    const keys = Object.keys(v as object).map(k2 => k2.toLowerCase());
                    if (keys.some(k2 => ['from','to','start','end'].includes(k2))) type = 'date_range';
                    else type = 'textarea';
                } else if (Array.isArray(v) && v.length > 0 && typeof (v as any[])[0] === 'object') {
                    type = 'table';
                }
                result.push({ label: k, value: v, type, options: [] });
            }
        }
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    /** Strip non-WinAnsi (non-Latin) characters to prevent pdf-lib encoding errors */
    private s(text: string): string {
        if (!text) return '';
        // Keep only printable ASCII + common Latin extended (WinAnsi range)
        return String(text).replace(/[^\x20-\xFF]/g, '?');
    }

    private fmtVal(val: any): string {
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (Array.isArray(val)) return this.s(val.map(v => this.fmtDate(String(v))).join(', '));
        if (typeof val === 'object') return ''; // handled by specific renderers
        return this.s(this.fmtDate(String(val)));
    }

    private fmtDate(val: string): string {
        if (!val) return '';
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            try { return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); } catch {}
        }
        return s.substring(0, 80);
    }

    private wrapText(text: string, maxChars: number): string[] {
        if (!text) return [''];
        const words = String(text).split(' ');
        const lines: string[] = [];
        let cur = '';
        for (const w of words) {
            if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
            else cur = (cur + ' ' + w).trim();
        }
        if (cur) lines.push(cur);
        return lines.length ? lines : [''];
    }
}
