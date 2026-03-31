export interface EmailMetadata {
    requestId: number;
    applicantName: string;
    formType: string;
    currentStep?: string;
    status: string;
    actionUrl: string;
    timestamp: Date;
}

export interface IEmailService {
    sendEmailNotification(eventType: 'REQUEST_ASSIGNED' | 'REQUEST_COMPLETED' | 'REQUEST_REJECTED', recipient: string, metadata: EmailMetadata): Promise<void>;
}
