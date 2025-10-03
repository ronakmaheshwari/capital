import express, { type Router } from "express";
import eventRouter from "./event";
import organiserRouter from "./organiser";
import userRouter from "./user";

const router: Router = express.Router();

router.use("/user", userRouter);
router.use("/events", eventRouter);
router.use("/organiser", organiserRouter);

export default router;
