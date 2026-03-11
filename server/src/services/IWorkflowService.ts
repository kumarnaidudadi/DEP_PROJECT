// ─── IWorkflowService ─────────────────────────────────────────────────────────
// Interface for the workflow progression business logic.

export interface IWorkflowService {
    advanceWorkflow(formId: number, nextStepOrder: number): Promise<void>;
    finalizeForm(form: any): Promise<void>;
}
