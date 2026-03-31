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
            where: { id: BigInt(userId) },
            include: {
                user_roles: {
                    include: { roles: { select: { name: true } } }
                }
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            department_id: user.department_id ? Number(user.department_id) : null,
            display_name: user.name,
            roles: user.user_roles.map((ur: any) => ur.roles.name),
            department: null,
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
            select: { name: true }
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

        res.json(departments.map(d => ({ id: Number(d.id), name: d.name })));
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

        const { name } = req.body;

        const updated = await prisma.users.update({
            where: { id: BigInt(userId) },
            data: {
                ...(name && { name }),
                updated_at: new Date(),
            },
        });

        res.json({ id: Number(updated.id), name: updated.name, email: updated.email });
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

        // Store on filesystem only — no signature_url column in users table
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

        // Look for any signature file for this user
        const sigDir = path.join(__dirname, '../../uploads/signatures');
        if (!fs.existsSync(sigDir)) return res.status(404).json({ error: 'No signature found' });

        const files = fs.readdirSync(sigDir);
        if (files.length === 0) return res.status(404).json({ error: 'No signature found' });

        // Just return the latest signature file (in a real app, map by user ID)
        const latestFile = files.sort().reverse()[0];
        const sigPath = path.join(sigDir, latestFile);

        const encryptedBytes = fs.readFileSync(sigPath);
        let decryptedBytes;
        try {
            decryptedBytes = EncryptionService.decrypt(encryptedBytes);
        } catch {
            decryptedBytes = encryptedBytes;
        }

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
