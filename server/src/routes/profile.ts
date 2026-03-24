import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { verifyToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Response } from 'express';
import { EncryptionService } from '../services/EncryptionService';

const router = express.Router();

// ─── MULTER CONFIG for signature uploads ─────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/signatures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

// ─── GET Profile ──────────────────────────────────────────────────────
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.users.findUnique({
            where: { id: userId },
            include: {
                departments: { select: { name: true } },
                user_roles: {
                    include: { roles: { select: { name: true } } }
                }
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log('[DEBUG] GET /profile fetched user:', JSON.stringify(user, null, 2));

        res.json({
            id: user.id,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            email: user.email,
            department_id: user.department_id,
            signature_url: user.signature_url,
            display_name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' '),
            roles: user.user_roles.map((ur: any) => ur.roles.name),
            department: user.departments?.name || null,
            emp_code: (user as any).emp_code || null,
            joining_date: (user as any).joining_date ? (user as any).joining_date.toISOString().split('T')[0] : null,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// ─── GET All Roles ────────────────────────────────────────────────────
router.get('/roles', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const roles = await prisma.roles.findMany({
            select: { name: true, description: true }
        });

        res.json(roles);
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Failed to get roles' });
    }
});

// ─── GET All Departments ──────────────────────────────────────────────
router.get('/departments', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const departments = await prisma.departments.findMany({
            select: { id: true, name: true }
        });

        res.json(departments);
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Failed to get departments' });
    }
});

// ─── UPDATE Profile ───────────────────────────────────────────────────
router.patch('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { first_name, middle_name, last_name } = req.body;

        const updated = await prisma.users.update({
            where: { id: userId },
            data: {
                ...(first_name && { first_name }),
                ...(middle_name !== undefined && { middle_name }),
                ...(last_name && { last_name }),
                updated_at: new Date(),
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ─── UPLOAD Signature ─────────────────────────────────────────────────
router.post('/signature', verifyToken, upload.single('signature'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No signature file provided' });

        // Generate filename and save path
        const ext = path.extname(file.originalname);
        const filename = `sig-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Encrypt and write to disk
        const encryptedBuffer = EncryptionService.encrypt(file.buffer);
        fs.writeFileSync(filePath, encryptedBuffer);

        const signatureUrl = `/uploads/signatures/${filename}`;

        // Use raw query to update signature_url since TS types might not be fresh
        await prisma.$executeRaw`UPDATE users SET signature_url = ${signatureUrl}, updated_at = NOW() WHERE id = ${userId}`;

        res.json({ signature_url: signatureUrl });
    } catch (error) {
        console.error('Upload signature error:', error);
        res.status(500).json({ error: 'Failed to upload signature' });
    }
});

// ─── SERVE Decrypted Signature Image (for profile page only) ──────────
router.get('/signature-image', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.users.findUnique({ where: { id: userId }, select: { signature_url: true } });
        if (!user?.signature_url) return res.status(404).json({ error: 'No signature found' });

        const sigPath = path.join(__dirname, '../..', user.signature_url);
        if (!fs.existsSync(sigPath)) return res.status(404).json({ error: 'Signature file not found' });

        const encryptedBytes = fs.readFileSync(sigPath);
        const decryptedBytes = EncryptionService.decrypt(encryptedBytes);

        // Determine content type from extension
        const ext = path.extname(sigPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'image/png';

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'private, max-age=300');
        res.send(decryptedBytes);
    } catch (error) {
        console.error('Serve signature image error:', error);
        res.status(500).json({ error: 'Failed to serve signature image' });
    }
});

export default router;
