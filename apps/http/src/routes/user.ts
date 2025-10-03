import db, { type Prisma } from "@repo/db";
import { generateKeyPair } from "@repo/keygen";
import { AlphabeticOTP, sendEmailOtp } from "@repo/notifications";
import { SigninType, type SignupResponse, SignupType, VerificationType } from "@repo/types";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import express, { type Request, type Response, type Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import userMiddleware from "../middleware";
import { createCardsForUser } from "../utils/bankCards";
import { decrypt, encrypt } from "../utils/encrypter";

// have to Add public private key logic Cards logic OTP logic

dotenv.config();
const userRouter: Router = express.Router();

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
userRouter.post(
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
                    role: "user",
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
userRouter.post(
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
userRouter.post("/verify", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const parseResult = VerificationType.safeParse(req.body);

        if (!userId || !parseResult.success) {
            return res.status(400).json({
                message: "Invalid userId or OTP format",
            });
        }
        const { otp } = parseResult.data;
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

            const _cards = await createCardsForUser(userId);
            const { publicKey, privateKey } = await generateKeyPair();
            const encrypted_privateKey = encrypt(privateKey);

            await tx.user.update({
                data: {
                    encrypted_private_key: encrypted_privateKey,
                    is_verified: true,
                    public_key: publicKey,
                },
                where: {
                    id: userId,
                },
            });
        });

        return res.status(200).json({
            message: "OTP verified successfully",
        });
    } catch (_error) {
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
userRouter.post("/logout", userMiddleware, async (req: Request, res: Response) => {
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
userRouter.post(
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
 * Get the User details after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.get("/me", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const result = await db.user.findUnique({
            where: {
                id: userId,
            },
        });
        let decryptPrivateKey: string | undefined;
        if (typeof result?.encrypted_private_key === "string") {
            decryptPrivateKey = decrypt(result.encrypted_private_key);
        }
        return res.status(200).json({
            email: result?.email,
            firstName: result?.first_name,
            lastName: result?.last_name,
            message: "User was successfully retrived",
            privateKey: decryptPrivateKey,
            proficPic: result?.profile_image_url,
            publicKey: result?.public_key,
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});
/**
 * Patch the User details after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.put("/me", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { firstName, lastName, profileImageUrl } = req.body;

        if (!firstName && !lastName && !profileImageUrl) {
            return res.status(400).json({
                message: "At least one field must be provided",
            });
        }

        const updatedUser = await db.user.update({
            data: {
                ...(firstName && {
                    first_name: firstName,
                }),
                ...(lastName && {
                    last_name: lastName,
                }),
                ...(profileImageUrl && {
                    profile_image_url: profileImageUrl,
                }),
            },
            where: {
                id: userId,
            },
        });

        return res.status(200).json({
            message: "User updated successfully",
            user: {
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                id: updatedUser.id,
                lastName: updatedUser.last_name,
                profileImageUrl: updatedUser.profile_image_url,
            },
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Deletes the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.delete(
    "/me",
    userMiddleware,
    async (
        req: Request,
        res: Response<{
            message: string;
        }>,
    ) => {
        try {
            const userId = req.userId;
            await db.$transaction([
                db.otp.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.passwordResetToken.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.jwtToken.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.card.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.transaction.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.ticket.deleteMany({
                    where: {
                        userId,
                    },
                }),
                db.event.deleteMany({
                    where: {
                        organiserId: userId,
                    },
                }),
                db.user.delete({
                    where: {
                        id: userId,
                    },
                }),
            ]);
            return res.json({
                message: "User and all related data deleted successfully",
            });
        } catch (_error) {
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

export default userRouter;
