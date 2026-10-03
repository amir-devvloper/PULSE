import express from "express";

import {
    createMonitorHandler,
    getMonitorsHandler,
    getMonitorHandler,
    updateMonitorHandler,
    deleteMonitorHandler
} from "../controllers/monitorController.js";

const router = express.Router();

router.post("/", createMonitorHandler);
router.get("/", getMonitorsHandler);
router.get("/:id", getMonitorHandler);
router.put("/:id", updateMonitorHandler);
router.delete("/:id", deleteMonitorHandler);

export default router;