import express, { type Router } from "express";
import eventRouter from "./event";
import organiserRouter from "./organiser";
import ticketRouter from "./ticketing";
import transactionRouter from "./transactions";
import userRouter from "./user";

const router: Router = express.Router();

router.use("/user", userRouter);
router.use("/events", eventRouter);
router.use("/organiser", organiserRouter);
router.use("/tickets", ticketRouter);
router.use("/transactions", transactionRouter);

export default router;
