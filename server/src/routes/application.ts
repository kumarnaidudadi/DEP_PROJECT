import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken, checkRole } from '../middleware/authMiddleware';
import { createApplication, getApplications, updateStatus } from '../controllers/ApplicationController';

const router = express.Router();

// ─── MULTER CONFIG ───────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/signatures');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
    console.log(`Creating upload directory: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // file-{timestamp}-{random}.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `signature-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// ─── ROUTES ──────────────────────────────────────────────────────────

// Create Application (Applicant)
router.post(
    '/',
    verifyToken,
    // checkRole(['APPLICANT', 'ADMIN', 'APPROVER']), // Allow all authenticated users to apply
    createApplication
);

// Get Applications (All roles, filtered by controller)
router.get(
    '/',
    verifyToken,
    getApplications
);

// Approve/Reject Application (Approver/Admin)
// Supports multipart/form-data for signature upload
router.patch(
    '/:id/status',
    verifyToken,
    checkRole(['APPROVER', 'ADMIN']),
    upload.single('signature'),
    updateStatus
);

export default router;
