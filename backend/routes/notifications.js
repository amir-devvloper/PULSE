import { Router } from 'express';
import { getSettingsHandler, updateSettingsHandler, listNotificationsHandler } from '../controllers/notificationController.js';

const router = Router();
router.get('/', listNotificationsHandler);
router.get('/settings', getSettingsHandler);
router.put('/settings', updateSettingsHandler);
export default router;
