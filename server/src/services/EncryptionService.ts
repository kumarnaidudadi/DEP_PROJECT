import crypto from 'crypto';

export class EncryptionService {
    // We use aes-256-cbc. The key must be 32 bytes (256 bits).
    private static readonly ALGORITHM = 'aes-256-cbc';
    private static readonly IV_LENGTH = 16;
    
    // Fallback key purely for development if the env var isn't set.
    // In production, SIGNATURE_ENCRYPTION_KEY MUST be set and securely stored.
    private static readonly DEFAULT_KEY = crypto.createHash('sha256').update('dep-project-signature-fallback-key').digest('base64').substring(0, 32);

    private static getKey(): Buffer {
        const keyString = process.env.SIGNATURE_ENCRYPTION_KEY || this.DEFAULT_KEY;
        // Ensure the key is exactly 32 bytes
        if (Buffer.from(keyString).length !== 32) {
             console.warn('SIGNATURE_ENCRYPTION_KEY is not 32 bytes long. Hashing it to get a valid 32 byte key.');
             return crypto.createHash('sha256').update(keyString).digest();
        }
        return Buffer.from(keyString);
    }

    /**
     * Encrypts a buffer.
     * The resulting buffer contains the 16-byte IV followed by the encrypted data.
     */
    static encrypt(buffer: Buffer): Buffer {
        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.getKey(), iv);
        
        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        
        // Prepend the IV to the encrypted data
        return Buffer.concat([iv, encrypted]);
    }

    /**
     * Decrypts a buffer that was encrypted with `encrypt`.
     * Expects the first 16 bytes to be the IV.
     */
    static decrypt(buffer: Buffer): Buffer {
        if (buffer.length < this.IV_LENGTH) {
            throw new Error('Encrypted data is too short to contain an IV');
        }

        const iv = buffer.subarray(0, this.IV_LENGTH);
        const encryptedData = buffer.subarray(this.IV_LENGTH);

        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getKey(), iv);
        
        return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    }
}
