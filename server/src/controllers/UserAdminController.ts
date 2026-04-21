import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { ExcelService } from '../services/ExcelService';
import { ReactivationService } from '../services/ReactivationService';

// Assuming AuthenticatedRequest extension exists like from other controllers
interface AuthenticatedRequest extends Request {
    user?: { userId: number, email: string, roles: string[] };
}

export class UserAdminController {
    constructor(
        private userService: UserService,
        private excelService: ExcelService,
        private reactivationService: ReactivationService
    ) {}

    // ── ADD USER (Single) ──
    addUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const user = await this.userService.createUser(req.body);
            res.json(user);
        } catch (error: any) {
            console.error('[UserAdminController] addUser:', error.message);
            res.status(500).json({ error: error.message });
        }
    };

    // ── BULK UPLOAD (Excel) ──
    bulkUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            
            const usersData = this.excelService.parseUsersUpload(req.file.buffer);
            if (usersData.length === 0) {
                res.status(400).json({ error: 'Excel file is empty or invalid format.' });
                return;
            }
            
            const result = await this.userService.bulkCreate(usersData);
            res.json(result);
        } catch (error: any) {
            console.error('[UserAdminController] bulkUpload:', error.message);
            res.status(500).json({ error: 'Failed to process bulk upload.' });
        }
    };

    // ── TEMPLATE DOWNLOAD ──
    downloadTemplate = async (req: Request, res: Response): Promise<void> => {
        try {
            const buffer = this.excelService.generateTemplate();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="users_template.xlsx"');
            res.send(buffer);
        } catch (error: any) {
            console.error('[UserAdminController] downloadTemplate:', error.message);
            res.status(500).json({ error: 'Failed to generate template.' });
        }
    };

    // ── INACTIVE USERS VIEW ──
    getInactiveUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const inactiveUsers = await this.userService.getInactiveUsers();
            res.json(inactiveUsers);
        } catch (error: any) {
            console.error('[UserAdminController] getInactiveUsers:', error.message);
            res.status(500).json({ error: 'Failed to fetch inactive users.' });
        }
    };

    getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const users = await this.userService.getAllUsers();
            res.json(users);
        } catch (error: any) {
            console.error('[UserAdminController] getAllUsers:', error.message);
            res.status(500).json({ error: 'Failed to fetch users.' });
        }
    };

    // ── TOGGLE STATUS ──
    toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = Number(req.params.id);
        const adminId = Number(req.user?.userId);
        const { is_active, reason } = req.body;

        if (!adminId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const user = await this.userService.toggleUserStatus(userId, is_active, adminId, reason || 'Admin toggled status');
            res.json(user);
        } catch (error: any) {
            console.error('[UserAdminController] toggleUserStatus:', error.message);
            res.status(500).json({ error: 'Failed to toggle status.' });
        }
    };

    // ── REACTIVATION REQUESTS (ADMIN) ──
    getPendingRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const requests = await this.reactivationService.getPendingRequests();
            res.json(requests);
        } catch (error: any) {
            console.error('[UserAdminController] getPendingRequests:', error.message);
            res.status(500).json({ error: 'Failed to fetch pending requests.' });
        }
    };

    processReactivationRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const requestId = Number(req.params.id);
        const adminId = Number(req.user?.userId);
        const { status, admin_note } = req.body;

        if (!adminId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const result = await this.reactivationService.processRequest(requestId, status, adminId, admin_note);
            res.json(result);
        } catch (error: any) {
            console.error('[UserAdminController] processReactivationRequest:', error.message);
            res.status(500).json({ error: 'Failed to process request.' });
        }
    };

    // ── SUBMIT REACTIVATION REQUEST (INACTIVE USER) ──
    submitReactivationRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = Number(req.user?.userId);
        const { reason } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const result = await this.reactivationService.submitRequest(userId, reason);
            res.json(result);
        } catch (error: any) {
            console.error('[UserAdminController] submitReactivationRequest:', error.message);
            res.status(400).json({ error: error.message });
        }
    };
}
