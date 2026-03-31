import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware';
import { ProfileController } from '../controllers/ProfileController';
import { ProfileService } from '../services/ProfileService';
import prisma from '../prisma';

const router = express.Router();
const profileService = new ProfileService(prisma);
const profileController = new ProfileController(profileService);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

router.get('/', verifyToken, profileController.getProfile);
router.get('/roles', verifyToken, profileController.getRoles);
router.get('/departments', verifyToken, profileController.getDepartments);
router.patch('/', verifyToken, profileController.updateProfile);
router.post('/signature', verifyToken, upload.single('signature'), profileController.uploadSignature);
router.get('/signature-image', verifyToken, profileController.getSignatureImage);

export default router;
