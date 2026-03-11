// ─── IFormService ─────────────────────────────────────────────────────────────
// Interface for all form/application business logic.

import { CreateFormDto, UpdateFormStatusDto, CreateFormTypeDto } from '../dtos/FormDto';

export interface IFormService {
    getFormTypes(): Promise<any[]>;
    createFormType(dto: CreateFormTypeDto): Promise<any>;
    updateFormType(id: number, dto: CreateFormTypeDto): Promise<any>;
    deleteFormType(id: number, roles: string[]): Promise<void>;

    getForms(userId: number, roles: string[]): Promise<any[]>;
    getFormById(id: number): Promise<any>;
    createForm(dto: CreateFormDto): Promise<any>;
    updateFormStatus(dto: UpdateFormStatusDto): Promise<any>;
    deleteForm(id: number, roles: string[]): Promise<void>;
}
