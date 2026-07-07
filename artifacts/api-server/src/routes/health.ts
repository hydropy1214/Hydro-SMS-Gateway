import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * GET /api/downloads/hydropy-gateway.apk
 * Serves the Android gateway APK if present, or returns 404 with a friendly message.
 */
router.get("/downloads/hydropy-gateway.apk", (_req, res) => {
  const apkPath = path.resolve(process.cwd(), "public", "hydropy-gateway.apk");

  if (fs.existsSync(apkPath)) {
    res.download(apkPath, "hydropy-gateway.apk");
  } else {
    res.status(404).json({
      error: "APK not yet available",
      message:
        "The HYDROPY Gateway APK has not been built yet. " +
        "Build the Android companion app and place the signed APK at server/public/hydropy-gateway.apk.",
    });
  }
});

export default router;
