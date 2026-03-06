import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { verifyToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Response } from 'express';

const router = express.Router();

// ─── MULTER CONFIG for signature uploads ─────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/signatures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `sig-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
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

        res.json({
            id: user.id,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            email: user.email,
            department_id: user.department_id,
            signature_url: (user as any).signature_url || null,
            display_name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' '),
            roles: user.user_roles.map((ur: any) => ur.roles.name),
            department: user.departments?.name || null,
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

        const signatureUrl = `/uploads/signatures/${file.filename}`;

        // Use raw query to update signature_url since TS types might not be fresh
        await prisma.$executeRaw`UPDATE users SET signature_url = ${signatureUrl}, updated_at = NOW() WHERE id = ${userId}`;

        res.json({ signature_url: signatureUrl });
    } catch (error) {
        console.error('Upload signature error:', error);
        res.status(500).json({ error: 'Failed to upload signature' });
    }
});

export default router;
