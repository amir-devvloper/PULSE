import { Router } from 'express';
import { getSummaryHandler, getSeriesHandler } from '../controllers/analyticsController.js';

const router = Router();
router.get('/summary', getSummaryHandler);
router.get('/series', getSeriesHandler);
export default router;
