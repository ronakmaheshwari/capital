import db, { type Prisma } from "@repo/db";
import { AlphabeticOTP, sendEmailOtp } from "@repo/notifications";
import { SigninType, type SignupResponse, SignupType, VerificationType } from "@repo/types";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import express, { type Request, type Response, type Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import validatorMiddleware from "../middleware";

dotenv.config();
const validatorRouter: Router = express.Router();

const jwtSecret = process.env.JWT_SECRET as string;
const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export interface SignupErrorResponse {
    message: string;
    errors?: unknown;
}

const generateToken = (id: string, expire?: string) =>
    jwt.sign(
        {
            userId: id,
        },
        jwtSecret,
        {
            expiresIn: (expire ?? "10m") as SignOptions["expiresIn"],
        },
    );

/**
 * Signup a User
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */
validatorRouter.post(
    "/signup",
    async (req: Request, res: Response<SignupResponse | SignupErrorResponse>) => {
        try {
            const parsed = SignupType.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    errors: parsed.error.format(),
                    message: "Validation failed",
                });
            }

            const { firstName, lastName, email, password } = parsed.data;

            const existingUser = await db.user.findUnique({
                where: {
                    email,
                },
            });
            if (existingUser) {
                return res.status(400).json({
                    message: "User already registered",
                });
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            if (!firstName || !lastName) {
                throw new Error("First name and last name are required");
            }

            const newUser = await db.user.create({
                data: {
                    email,
                    first_name: firstName,
                    is_verified: false,
                    last_name: lastName,
                    password: hashedPassword,
                    role: "verifier",
                },
            });

            if (typeof newUser.id !== "string") {
                return res.status(500).json({
                    message: "User ID is invalid",
                });
            }

            const otp = AlphabeticOTP(6);
            await db.otp.create({
                data: {
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    otp_code: otp,
                    purpose: "signup",
                    userId: newUser.id,
                },
            });
            await sendEmailOtp(newUser.email, otp);

            const token = generateToken(newUser.id, "10m");
            await db.jwtToken.create({
                data: {
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    issued_at: new Date(),
                    token,
                    userId: newUser.id,
                },
            });

            return res.status(201).json({
                message: "User successfully registered",
                token: token,
                user: {
                    email: newUser.email,
                    firstName: newUser.first_name,
                    id: newUser.id,
                    lastName: newUser.last_name,
                },
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

/**
 * Signin a User
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */
validatorRouter.post(
    "/signin",
    async (req: Request, res: Response<SignupResponse | SignupErrorResponse>) => {
        try {
            const parsed = SigninType.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    errors: parsed.error.format(),
                    message: "Validation failed",
                });
            }

            const { email, password } = parsed.data;

            const existingUser = await db.user.findUnique({
                where: {
                    email,
                },
            });
            if (!existingUser) {
                return res.status(400).json({
                    message: "Invalid email or password",
                });
            }

            const isPasswordCorrect = await bcrypt.compare(
                password,
                existingUser.password as string,
            );
            if (!isPasswordCorrect) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            if (typeof existingUser.id !== "string") {
                return res.status(500).json({
                    message: "User ID is invalid",
                });
            }
            const token = generateToken(existingUser.id, "1d");
            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.jwtToken.deleteMany({
                    where: {
                        userId: existingUser.id,
                    },
                });
                await tx.jwtToken.create({
                    data: {
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        issued_at: new Date(),
                        token,
                        userId: existingUser.id,
                    },
                });
            });

            return res.status(200).json({
                message: "Signin successful",
                token: token,
                user: {
                    email: existingUser.email,
                    firstName: existingUser.first_name,
                    id: existingUser.id,
                    lastName: existingUser.last_name,
                },
            });
        } catch (_error) {
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

/**
 * Verify the User after signup
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */

validatorRouter.post("/verify", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const parsed = VerificationType.safeParse(req.body);
        if (!userId || !parsed.success) {
            return res.status(400).json({
                message: "Invalid request",
            });
        }

        const { otp } = parsed.data;
        const otpRecord = await db.otp.findFirst({
            where: {
                expires_at: {
                    gt: new Date(),
                },
                is_used: false,
                otp_code: otp,
                userId,
            },
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
            });
        }

        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.otp.update({
                data: {
                    is_used: true,
                },
                where: {
                    id: otpRecord.id,
                },
            });
            await tx.user.update({
                data: {
                    is_verified: true,
                },
                where: {
                    id: userId,
                },
            });
        });

        return res.status(200).json({
            message: "User verified successfully",
        });
    } catch (_err) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Logout the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
validatorRouter.post("/logout", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        await db.jwtToken.updateMany({
            data: {
                is_revoked: true,
            },
            where: {
                is_revoked: false,
                userId,
            },
        });
        return res.status(200).json({
            message: "Successfully logged out",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Resets the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
validatorRouter.post(
    "/reset-password",
    async (
        req: Request,
        res: Response<
            | {
                  message: string;
              }
            | SignupErrorResponse
        >,
    ) => {
        try {
            const parsedData = SigninType.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    errors: parsedData.error.format(),
                    message: "Invalid data was provided",
                });
            }
            const { email, password } = parsedData.data;
            const userExist = await db.user.findUnique({
                where: {
                    email,
                },
            });
            if (!userExist) {
                return res.status(400).json({
                    message: "Provided email is invalid",
                });
            }
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            await db.user.update({
                data: {
                    password: hashedPassword,
                },
                where: {
                    email,
                },
            });
            return res.status(200).json({
                message: "Password was successfully updated",
            });
        } catch (_error) {
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

/**
 * POST /validator/validate
 * Validates a ticket for an event and marks it as scanned by the validator.
 * @param {Express.Request} req - The HTTP request object containing ticketId in the body and validator's userId from the middleware.
 * @param {Express.Response} res - The HTTP response object used to return validation result.
 * @returns {success: boolean, ticket?: object, error?: string} - Returns updated ticket details if validation is successful, otherwise an error message.
 */

validatorRouter.post("/validate", async (req, res) => {
    try {
        const { ticketId, verifierId } = req.body;

        const ticket = await db.ticket.findUnique({
            include: {
                eventSlot: {
                    include: {
                        event: true,
                    },
                },
            },
            where: {
                id: ticketId,
            },
        });

        if (!ticket) {
            await db.ticketVerification.create({
                data: {
                    is_successful: false,
                    remarks: "Ticket not found",
                    ticketId,
                    verification_time: new Date(),
                    verifierId,
                },
            });
            return res.status(404).json({
                error: "Ticket not found",
                success: false,
            });
        }

        if (!ticket.is_valid) {
            await db.ticketVerification.create({
                data: {
                    is_successful: false,
                    remarks: "Ticket already used/invalid",
                    ticketId,
                    verification_time: new Date(),
                    verifierId,
                },
            });
            return res.status(400).json({
                error: "Ticket already used/invalid",
                success: false,
            });
        }

        const updatedTicket = await db.ticket.update({
            data: {
                is_valid: false,
                scanned_at: new Date(),
                scanned_by: verifierId,
            },
            where: {
                id: ticketId,
            },
        });

        await db.ticketVerification.create({
            data: {
                is_successful: true,
                remarks: "Ticket validated successfully",
                ticketId,
                verification_time: new Date(),
                verifierId,
            },
        });

        return res.json({
            success: true,
            ticket: updatedTicket,
        });
    } catch (err) {
        console.error("Validation error:", err);
        res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

/**
 * GET /validator/tickets/:ticketId
 * Retrieves detailed information for a specific ticket by its ID.
 * @param {Express.Request} req - The HTTP request object containing ticketId as a URL parameter.
 * @param {Express.Response} res - The HTTP response object used to return the ticket data.
 * @returns {success: boolean, ticket?: object, error?: string} - Returns ticket details if found, otherwise an error message.
 */

validatorRouter.get("/tickets/:ticketId", async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticket = await db.ticket.findUnique({
            include: {
                eventSlot: {
                    include: {
                        event: {
                            select: {
                                id: true,
                                location_name: true,
                                title: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        email: true,
                        first_name: true,
                        id: true,
                        last_name: true,
                    },
                },
            },
            where: {
                id: ticketId,
            },
        });

        if (!ticket) {
            return res.status(404).json({
                error: "Ticket not found",
                success: false,
            });
        }

        return res.json({
            success: true,
            ticket,
        });
    } catch (err) {
        console.error("Get ticket error:", err);
        res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

/**
 * GET /validator/slots/:slotId/validated
 * Lists all tickets for a specific event slot that have already been validated/scanned.
 * @param {Express.Request} req - The HTTP request object containing slotId as a URL parameter.
 * @param {Express.Response} res - The HTTP response object used to return a list of validated tickets.
 * @returns {success: boolean, tickets?: Array<object>, error?: string} - Returns an array of validated tickets, or an error message if none found or an error occurs.
 */

validatorRouter.get("/slots/:slotId/validated", async (req, res) => {
    try {
        const { slotId } = req.params;

        const tickets = await db.ticket.findMany({
            include: {
                scanned_by: {
                    select: {
                        first_name: true,
                        id: true,
                        last_name: true,
                    },
                },
                user: {
                    select: {
                        email: true,
                        first_name: true,
                        id: true,
                        last_name: true,
                    },
                },
            },
            where: {
                eventSlotId: slotId,
                is_valid: false,
            },
        });

        return res.json({
            success: true,
            tickets,
        });
    } catch (err) {
        console.error("List validated tickets error:", err);
        res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

export default validatorRouter;
