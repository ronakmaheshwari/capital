import cors from "cors";
import dotenv from "dotenv";
import express, { type Express, type Request, type Response } from "express";
import morgan from "morgan";
import router from "./routes";

dotenv.config();
export const app: Express = express();
export const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/v1", router);

app.get("/", async (_req: Request, res: Response) => {
    res.status(200).send("<h1>Hello HTTP!</h1>");
});

app.get("/pid", (_req: Request, res: Response) => {
    res.send(`The process id is ${process.pid}!`);
});
