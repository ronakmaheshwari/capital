import express, { type Router } from "express";
import validatorRouter from "./validator";

const app: Router = express();

app.use("/validator", validatorRouter);

export default app;
