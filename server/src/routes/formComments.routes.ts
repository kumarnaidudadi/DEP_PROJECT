// ─── formComments.routes.ts ────────────────────────────────────────────────────
// Routes for form comments.

import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import {
    getComments,
    addComment,
    editComment,
    deleteComment,
} from '../controllers/formComments.controller';

const router = express.Router({ mergeParams: true }); // inherit :formId from parent

router.get('/', verifyToken, getComments);
router.post('/', verifyToken, addComment);
router.patch('/:commentId', verifyToken, editComment);
router.delete('/:commentId', verifyToken, deleteComment);

export default router;
