import express from "express";

import {
    getIncidentsHandler,
    getIncidentsByMonitorHandler
} from "../controllers/incidentController.js";

const router = express.Router();

router.get("/", getIncidentsHandler);
router.get("/monitor/:monitorId", getIncidentsByMonitorHandler);

export default router;