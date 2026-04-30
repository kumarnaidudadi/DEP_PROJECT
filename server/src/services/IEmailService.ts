export interface EmailMetadata {
    requestId: number;
    applicantName: string;
    formType: string;
    currentStep?: string;
    status: string;
    actionUrl: string;
    timestamp: Date;
    actingRole?: {
        actingRoleLabel: string;
        fromDate: Date;
        untilDate: Date;
        targetName?: string;
    };
}

export interface IEmailService {
    sendEmailNotification(eventType: 'REQUEST_ASSIGNED' | 'REQUEST_COMPLETED' | 'REQUEST_REJECTED' | 'ACTING_ROLE_REQUESTED' | 'ACTING_ROLE_ACCEPTED' | 'ACTING_ROLE_REJECTED' | 'ACTING_ROLE_EXPIRING', recipient: string, metadata: EmailMetadata): Promise<void>;
}
