import { Router } from 'express';
import { getChecksByMonitorHandler } from '../controllers/checkController.js';

const router = Router();
router.get('/monitor/:monitorId', getChecksByMonitorHandler);
export default router;
