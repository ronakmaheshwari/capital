import dotenv from "dotenv";

dotenv.config();

import fs from "node:fs";
import path from "node:path";
import db from "@repo/db";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import morgan from "morgan";
import client from "prom-client";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import redisCache, { initRedis } from "../../../packages/cache/dist";
import { metricsMiddleware } from "./middleware";
import router from "./routes";

export const app: Express = express();
export const port = process.env.PORT || 3003;

async function RedisStarter() {
    await initRedis();
}
RedisStarter();

app.use(
    cors({
        origin: "*",
    }),
);
app.use(express.json());
app.use(morgan("dev"));
app.use(metricsMiddleware);
app.use("/api/v1", router);

const swaggerPath = path.resolve(process.cwd(), "../../swagger/validator_spec.yaml");
const swaggerOptions = {
    customCss: `
    .topbar-wrapper img { content:url('https://yourcdn.com/logo.svg'); width:120px; }
    .swagger-ui .topbar { background: #0f172a; }
    .swagger-ui .topbar-wrapper .link span { color: #f8fafc !important; font-weight: bold; }
    .swagger-ui .info h1 { font-size: 2.2rem; font-weight: 700; color: #0f172a; }
    body { background-color: #f8fafc; }
  `,
    customfavIcon: "https://yourcdn.com/favicon.ico",
    customSiteTitle: "Capital API Docs",
};

if (!fs.existsSync(swaggerPath)) {
    console.warn(`Swagger file not found at ${swaggerPath}`);
} else {
    const file = fs.readFileSync(swaggerPath, "utf8");
    const swaggerDocument = YAML.parse(file);
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
}

app.get("/", async (_req: Request, res: Response) => {
    res.status(200).send("<h1>Hello HTTP!</h1>");
});

app.get("/pid", (_req: Request, res: Response) => {
    res.send(`The process id is ${process.pid}!`);
});

app.get("/health", async (_req: Request, res: Response) => {
    try {
        await db.$queryRaw`SELECT 1`;

        const redisCheck = await redisCache.ping();

        if (redisCheck !== "PONG") {
            throw new Error("Redis not responding");
        }

        return res.status(200).json({
            message: "Server is healthy",
            status: "ok",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(503).json({
            error: (error as Error).message,
            message: "Server is unhealthy",
            status: "fail",
            timestamp: new Date().toISOString(),
        });
    }
});

app.get("/metrics", async (_req: Request, res: Response) => {
    try {
        const metrics = await client.register.metrics();
        res.set("Content-Type", client.register.contentType);
        res.end(metrics);
    } catch (_error) {
        return res.status(500).json({
            message: "Internal Server error",
        });
    }
});

app.listen(port, () => {});
