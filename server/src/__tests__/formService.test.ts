// ─── formService.test.ts ───────────────────────────────────────────────────────
// Tests FormService workflow business logic.
// IFormRepository and IEmailService are fully mocked — no DB, no email.
//
// Coverage:
//   getFormById     — found, not found
//   createForm      — generates reference number, creates history, triggers forward
//   forwardForm     — valid forward, terminal form error, target not found
//   updateFormStatus — approval (APPROVED), rejection (REJECTED), role checks
//   getForms        — admin sees all, applicant sees own + forwarded

import { FormService } from '../services/FormService';

// ── Mock IFormRepository ──────────────────────────────────────────────────────
const mockFormRepo = {
    findAllFormTypes: jest.fn(),
    findFormTypeById: jest.fn(),
    findFormTypeByPrefix: jest.fn(),
    createFormType: jest.fn(),
    updateFormType: jest.fn(),
    deleteFormType: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    saveDraft: jest.fn(),
    createForward: jest.fn(),
    createActionComment: jest.fn(),
    findUserById: jest.fn(),
    getUserRoles: jest.fn(),
    findForwardsByForm: jest.fn(),
    getNextReferenceNumber: jest.fn(),
    findByApplicant: jest.fn(),
    updateFormData: jest.fn(),
};

// ── Mock IEmailService ────────────────────────────────────────────────────────
const mockEmailService = {
    sendEmailNotification: jest.fn().mockResolvedValue(undefined),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockFormType = {
    id: 1,
    name: 'Station Leave Permission',
    ref_prefix: 'STLP',
    schema: {
        sections: [{ title: 'Details', fields: [] }],
        approval_roles: ['APPROVER'],
    },
    approval_rules: { required_roles: ['APPROVER'] },
    is_active: true,
};

const mockForm = {
    id: 100,
    form_type_id: 1,
    applicant_id: 10,
    form_data: { destination: 'Delhi' },
    status: 'forwarded',
    reference_number: 'STLP2026000001',
    submitted_at: new Date(),
    users: { id: 10, first_name: 'Kumar', last_name: 'Naidu', email: 'kumar@iitropar.ac.in' },
    form_types: mockFormType,
    form_forwards: [],
};

const mockApprover = {
    id: 20,
    first_name: 'Prof',
    last_name: 'Singh',
    email: 'prof@iitropar.ac.in',
    is_active: true,
};

let service: FormService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new FormService(mockFormRepo as any, mockEmailService as any);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.getFormById()', () => {

    test('should return the form when it exists', async () => {
        mockFormRepo.findById.mockResolvedValue(mockForm);

        const result = await service.getFormById(100);

        expect(result).toEqual(mockForm);
        expect(mockFormRepo.findById).toHaveBeenCalledWith(100);
    });

    test('should throw FORM_NOT_FOUND when form does not exist', async () => {
        mockFormRepo.findById.mockResolvedValue(null);

        await expect(service.getFormById(999)).rejects.toThrow('FORM_NOT_FOUND');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.getForms()', () => {

    test('ADMIN should receive all forms (empty where clause)', async () => {
        mockFormRepo.findAll.mockResolvedValue([mockForm]);

        await service.getForms(1, ['ADMIN']);

        expect(mockFormRepo.findAll).toHaveBeenCalledWith({});
    });

    test('APPLICANT should receive only own + forwarded forms', async () => {
        mockFormRepo.findAll.mockResolvedValue([mockForm]);

        await service.getForms(10, ['APPLICANT']);

        const whereArg = mockFormRepo.findAll.mock.calls[0][0];
        expect(whereArg).toHaveProperty('OR');
        expect(whereArg.OR).toEqual(
            expect.arrayContaining([
                { applicant_id: 10 },
                { form_forwards: { some: { forwarded_to: 10 } } },
            ])
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.createForm()', () => {

    const createDto = {
        form_type_id: 1,
        form_data: { destination: 'Delhi' },
        userId: 10,
        ip_address: '10.0.0.1',
    };

    beforeEach(() => {
        mockFormRepo.findFormTypeById.mockResolvedValue(mockFormType);
        mockFormRepo.getNextReferenceNumber.mockResolvedValue(1);
        mockFormRepo.create.mockResolvedValue({ id: 101, ...createDto });
        mockFormRepo.findById.mockResolvedValue({ ...mockForm, id: 101 });
        mockFormRepo.createActionComment.mockResolvedValue(undefined);
    });

    test('should generate a valid reference number (PREFIX + YEAR + padded serial)', async () => {
        await service.createForm(createDto);

        const createCall = mockFormRepo.create.mock.calls[0][0];
        const ref = createCall.reference_number as string;
        const year = new Date().getFullYear().toString();
        expect(ref).toMatch(new RegExp(`^STLP${year}\\d{6}$`));
    });

    test('should embed __form_meta snapshot in form_data', async () => {
        await service.createForm(createDto);

        const createCall = mockFormRepo.create.mock.calls[0][0];
        expect(createCall.form_data).toHaveProperty('__form_meta');
        expect(createCall.form_data.__form_meta.form_type_name).toBe('Station Leave Permission');
    });

    test('should create action comment for submission', async () => {
        await service.createForm(createDto);

        expect(mockFormRepo.createActionComment).toHaveBeenCalledWith(
            expect.objectContaining({
                historyData: expect.objectContaining({
                    action: 'submitted',
                    ip_address: '10.0.0.1',
                }),
            })
        );
    });

    test('should trigger forwardForm when toUserId is provided', async () => {
        mockFormRepo.findUserById.mockResolvedValue(mockApprover);
        mockFormRepo.createForward.mockResolvedValue(undefined);

        await service.createForm({ ...createDto, toUserId: 20 });

        expect(mockFormRepo.createForward).toHaveBeenCalledWith(
            expect.objectContaining({ forwarded_to: 20 })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.forwardForm()', () => {

    beforeEach(() => {
        mockFormRepo.createForward.mockResolvedValue(undefined);
        mockFormRepo.updateStatus.mockResolvedValue({ ...mockForm, status: 'forwarded' });
        mockFormRepo.createActionComment.mockResolvedValue(undefined);
        mockFormRepo.findUserById.mockResolvedValue(mockApprover);
        mockFormRepo.findById.mockResolvedValue(mockForm);
    });

    test('should create forward record and update status', async () => {
        await service.forwardForm({
            formId: 100,
            fromUserId: 10,
            toUserId: 20,
            note: 'Please review',
        });

        expect(mockFormRepo.createForward).toHaveBeenCalledWith(
            expect.objectContaining({
                form_id: 100,
                forwarded_by: 10,
                forwarded_to: 20,
                action: 'forwarded',
            })
        );
        expect(mockFormRepo.updateStatus).toHaveBeenCalledWith(100, 'forwarded');
    });

    test('should throw FORM_NOT_FOUND when form does not exist', async () => {
        mockFormRepo.findById.mockResolvedValue(null);

        await expect(service.forwardForm({ formId: 999, fromUserId: 10, toUserId: 20 }))
            .rejects.toThrow('FORM_NOT_FOUND');
    });

    test('should throw FORM_ALREADY_FINALIZED when form is approved', async () => {
        mockFormRepo.findById.mockResolvedValue({ ...mockForm, status: 'approved' });

        await expect(service.forwardForm({ formId: 100, fromUserId: 10, toUserId: 20 }))
            .rejects.toThrow('FORM_ALREADY_FINALIZED');
    });

    test('should throw FORM_ALREADY_FINALIZED when form is rejected', async () => {
        mockFormRepo.findById.mockResolvedValue({ ...mockForm, status: 'rejected' });

        await expect(service.forwardForm({ formId: 100, fromUserId: 10, toUserId: 20 }))
            .rejects.toThrow('FORM_ALREADY_FINALIZED');
    });

    test('should throw TARGET_USER_NOT_FOUND when target user does not exist', async () => {
        mockFormRepo.findUserById.mockResolvedValue(null);

        await expect(service.forwardForm({ formId: 100, fromUserId: 10, toUserId: 999 }))
            .rejects.toThrow('TARGET_USER_NOT_FOUND');
    });

    test('should send email notification to the forwarded-to user', async () => {
        await service.forwardForm({ formId: 100, fromUserId: 10, toUserId: 20 });

        expect(mockEmailService.sendEmailNotification).toHaveBeenCalledWith(
            'REQUEST_ASSIGNED',
            mockApprover.email,
            expect.any(Object)
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.updateFormStatus() — REJECTION', () => {

    beforeEach(() => {
        mockFormRepo.findById.mockResolvedValue(mockForm);
        mockFormRepo.getUserRoles.mockResolvedValue(['APPROVER']);
        mockFormRepo.createForward.mockResolvedValue(undefined);
        mockFormRepo.updateStatus.mockResolvedValue({ ...mockForm, status: 'rejected' });
        mockFormRepo.createActionComment.mockResolvedValue(undefined);
        mockFormRepo.findUserById.mockResolvedValue(mockApprover);
    });

    test('should set form status to rejected and create rejection forward record', async () => {
        await service.updateFormStatus({
            formId: 100,
            userId: 20,
            decision: 'REJECTED',
            remarks: 'Incomplete documents',
        });

        expect(mockFormRepo.createForward).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'rejected' })
        );
        expect(mockFormRepo.updateStatus).toHaveBeenCalledWith(100, 'rejected');
    });

    test('should create a rejection action comment with remarks', async () => {
        await service.updateFormStatus({
            formId: 100,
            userId: 20,
            decision: 'REJECTED',
            remarks: 'Missing signature',
        });

        const commentCall = mockFormRepo.createActionComment.mock.calls[0][0];
        expect(commentCall.historyData.action).toBe('rejected');
        expect(commentCall.contentText).toContain('Missing signature');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.updateFormStatus() — APPROVAL', () => {

    beforeEach(() => {
        mockFormRepo.findById.mockResolvedValue(mockForm);
        mockFormRepo.getUserRoles.mockResolvedValue(['APPROVER']);
        mockFormRepo.createForward.mockResolvedValue(undefined);
        mockFormRepo.updateStatus.mockResolvedValue({ ...mockForm, status: 'approved' });
        mockFormRepo.updateFormData.mockResolvedValue(undefined);
        mockFormRepo.createActionComment.mockResolvedValue(undefined);
        mockFormRepo.findUserById.mockResolvedValue(mockApprover);
        // Simulate: both required roles (APPROVER) have now approved → final approval
        mockFormRepo.findForwardsByForm.mockResolvedValue([
            { action: 'forwarded', from_user: { user_roles: [{ roles: { name: 'APPROVER' } }] } },
            { action: 'approved',  from_user: { user_roles: [{ roles: { name: 'APPROVER' } }] } },
        ]);
    });

    test('should throw UNAUTHORIZED_ROLE when user lacks required role', async () => {
        mockFormRepo.getUserRoles.mockResolvedValue(['APPLICANT']); // not APPROVER

        await expect(service.updateFormStatus({
            formId: 100,
            userId: 10,
            decision: 'APPROVED',
        })).rejects.toThrow('UNAUTHORIZED_ROLE');
    });

    test('should create approval forward record', async () => {
        await service.updateFormStatus({
            formId: 100,
            userId: 20,
            decision: 'APPROVED',
            remarks: 'Looks good',
        });

        expect(mockFormRepo.createForward).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'approved' })
        );
    });

    test('ADMIN should be able to approve even without explicit required role match', async () => {
        mockFormRepo.getUserRoles.mockResolvedValue(['ADMIN']); // ADMIN bypass

        await expect(service.updateFormStatus({
            formId: 100,
            userId: 1,
            decision: 'APPROVED',
        })).resolves.not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FormService.deleteFormType()', () => {

    test('should throw UNAUTHORIZED when non-admin tries to delete', async () => {
        await expect(service.deleteFormType(1, ['APPLICANT'])).rejects.toThrow('UNAUTHORIZED');
        expect(mockFormRepo.deleteFormType).not.toHaveBeenCalled();
    });

    test('should call deleteFormType for ADMIN', async () => {
        mockFormRepo.deleteFormType.mockResolvedValue(undefined);

        await service.deleteFormType(1, ['ADMIN']);

        expect(mockFormRepo.deleteFormType).toHaveBeenCalledWith(1);
    });
});
