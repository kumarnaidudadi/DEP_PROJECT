// ─── IPdfService ──────────────────────────────────────────────────────────────
// Interface for PDF generation business logic.

export interface IPdfService {
    generateFormPdf(formId: number): Promise<Buffer>;
}
