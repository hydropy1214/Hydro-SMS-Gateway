import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import devicesRouter from "./devices";
import campaignsRouter from "./campaigns";
import messagesRouter from "./messages";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(devicesRouter);
router.use(campaignsRouter);
router.use(messagesRouter);
router.use(statsRouter);

export default router;
