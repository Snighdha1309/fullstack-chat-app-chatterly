import express from 'express';
import {
  adminDashboard,
  getAllUsers,
  updateUserRole,
  toggleUserStatus
} from '../controllers/admin.controller.js';
import { protectRoute, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes protected and admin-only
router.use(protectRoute, restrictTo('admin'));

router.get('/dashboard', adminDashboard);
router.get('/users', getAllUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/toggle-status', toggleUserStatus);

export default router;