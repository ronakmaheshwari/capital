import db from "@repo/db";
import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { activeRequestsGauge, httpRequestDurationMs, requestCount } from "./metrics/requestCount";

dotenv.config();

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            organiserId?: string;
            token?: string;
        }
    }
}

const jwtSecret = process.env.JWT_SECRET ?? "123456";

if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export async function unVerifiedUserMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({
                message: "You are not logged in",
            });
        }

        const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        } catch (_err) {
            return res.status(403).json({
                message: "Invalid or expired token",
            });
        }

        const userId = decoded?.userId as string | undefined;
        if (!userId) {
            return res.status(403).json({
                message: "Invalid token payload",
            });
        }

        const dbToken = await db.jwtToken.findFirst({
            where: {
                is_revoked: false,
                token,
                userId,
            },
        });

        if (!dbToken) {
            return res.status(403).json({
                message: "Token not found or revoked",
            });
        }
        if (new Date() > dbToken.expires_at) {
            return res.status(403).json({
                message: "Token expired",
            });
        }
        req.userId = userId;
        next();
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export default async function userMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({
                message: "You are not logged in",
            });
        }

        const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        } catch (_err) {
            return res.status(403).json({
                message: "Invalid or expired token",
            });
        }

        const userId = decoded?.userId as string | undefined;
        if (!userId) {
            return res.status(403).json({
                message: "Invalid token payload",
            });
        }

        const dbToken = await db.jwtToken.findFirst({
            include: {
                user: true,
            },
            where: {
                is_revoked: false,
                token,
                userId,
            },
        });

        if (!dbToken) {
            return res.status(403).json({
                message: "Token not found or revoked",
            });
        }
        if (new Date() > dbToken.expires_at) {
            return res.status(403).json({
                message: "Token expired",
            });
        }

        if (!dbToken.user.is_verified) {
            return res.status(403).json({
                message: "Unverified User tried to access services",
            });
        }

        req.userId = userId;
        next();
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function unVerifiedOrganiserMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({
                message: "You are not logged in",
            });
        }
        const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        } catch (_err) {
            return res.status(403).json({
                message: "Invalid or expired token",
            });
        }

        const organiserId = decoded?.organiserId as string | undefined;
        const role = decoded.role as string | undefined;

        if (!organiserId || !role) {
            return res.status(403).json({
                message: "Invalid token payload",
            });
        }

        const dbToken = await db.jwtToken.findFirst({
            include: {
                user: true,
            },
            where: {
                is_revoked: false,
                token,
                userId: organiserId,
            },
        });

        if (!dbToken || dbToken.user.role !== "organiser") {
            return res.status(403).json({
                message: "Token not found or revoked",
            });
        }

        if (new Date() > dbToken.expires_at) {
            return res.status(403).json({
                message: "Token expired",
            });
        }

        req.organiserId = organiserId;
        next();
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function organiserMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({
                message: "You are not logged in",
            });
        }
        const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        } catch (_err) {
            return res.status(403).json({
                message: "Invalid or expired token",
            });
        }

        const organiserId = decoded?.organiserId as string | undefined;
        const role = decoded.role as string | undefined;

        if (!organiserId || !role) {
            return res.status(403).json({
                message: "Invalid token payload",
            });
        }

        const dbToken = await db.jwtToken.findFirst({
            include: {
                user: true,
            },
            where: {
                is_revoked: false,
                token,
                userId: organiserId,
            },
        });

        if (!dbToken || dbToken.user.role !== "organiser") {
            return res.status(403).json({
                message: "Token not found or revoked",
            });
        }

        if (new Date() > dbToken.expires_at) {
            return res.status(403).json({
                message: "Token expired",
            });
        }

        if (!dbToken.user.is_verified) {
            return res.status(403).json({
                message: "Unverified User tried to access services",
            });
        }

        req.organiserId = organiserId;
        next();
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip metrics for /metrics endpoint
    if (req.route?.path === "/metrics") {
        return next();
    }

    const startTime = Date.now();
    activeRequestsGauge.inc();

    const endRequest = () => {
        const duration = Date.now() - startTime;

        const params =
            req.params && Object.keys(req.params).length ? JSON.stringify(req.params) : "{}";
        const query = req.query && Object.keys(req.query).length ? JSON.stringify(req.query) : "{}";

        const routeLabel = req.route?.path || req.path;

        requestCount.inc({
            method: req.method,
            params,
            query,
            route: routeLabel,
            status_code: res.statusCode,
        });

        httpRequestDurationMs.observe(
            {
                method: req.method,
                params,
                query,
                route: routeLabel,
                status_code: res.statusCode,
            },
            duration,
        );

        activeRequestsGauge.dec();
    };

    res.on("finish", endRequest);
    res.on("close", endRequest);

    next();
};
