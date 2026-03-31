export interface IProfileService {
    getProfile(userId: number): Promise<any>;
    getRoles(): Promise<any[]>;
    getDepartments(): Promise<any[]>;
    updateProfile(userId: number, data: { name?: string }): Promise<any>;
    uploadSignature(userId: number, fileBuffer: Buffer, fileName: string): Promise<string>;
    getSignature(userId: number): Promise<Buffer | null>;
}
