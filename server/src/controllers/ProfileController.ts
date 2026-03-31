import { Request, Response } from 'express';
import { IProfileService } from '../services/IProfileService';

export class ProfileController {
    constructor(private profileService: IProfileService) {}

    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const profile = await this.profileService.getProfile(userId);
            res.json(profile);
        } catch (error: any) {
            console.error('Get profile error:', error);
            res.status(error.message === 'User not found' ? 404 : 500).json({ error: error.message || 'Failed to get profile' });
        }
    };

    getRoles = async (req: Request, res: Response): Promise<void> => {
        try {
            const roles = await this.profileService.getRoles();
            res.json(roles);
        } catch (error: any) {
            console.error('Get roles error:', error);
            res.status(500).json({ error: 'Failed to get roles' });
        }
    };

    getDepartments = async (req: Request, res: Response): Promise<void> => {
        try {
            const depts = await this.profileService.getDepartments();
            res.json(depts);
        } catch (error: any) {
            console.error('Get departments error:', error);
            res.status(500).json({ error: 'Failed to get departments' });
        }
    };

    updateProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { name } = req.body;
            const updated = await this.profileService.updateProfile(userId, { name });
            res.json(updated);
        } catch (error: any) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    };

    uploadSignature = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const file = req.file;
            if (!file) { res.status(400).json({ error: 'No signature file provided' }); return; }

            const url = await this.profileService.uploadSignature(userId, file.buffer, file.originalname);
            res.json({ signature_url: url });
        } catch (error: any) {
            console.error('Upload signature error:', error);
            res.status(500).json({ error: 'Failed to upload signature' });
        }
    };

    getSignatureImage = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const buffer = await this.profileService.getSignature(userId);
            if (!buffer) { res.status(404).json({ error: 'No signature found' }); return; }

            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'private, max-age=300');
            res.send(buffer);
        } catch (error: any) {
            console.error('Serve signature image error:', error);
            res.status(500).json({ error: 'Failed to serve signature image' });
        }
    };
}
