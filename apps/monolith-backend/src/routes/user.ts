import redisCache from "@repo/cache";
import db, { type Prisma } from "@repo/db";
import { generateKeyPair } from "@repo/keygen";
import { AlphabeticOTP } from "@repo/notifications";
import { otpLimits, resetPasswordLimits } from "@repo/ratelimit";
import {
    ForgetType,
    OtpType,
    ResetType,
    SigninType,
    type SignupResponse,
    SignupType,
    UserDetailsType,
    VerificationType,
} from "@repo/types";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import express, { type Request, type Response, type Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import multer from "multer";
import userMiddleware, { unVerifiedUserMiddleware } from "../middleware";
import { createCardsForUser } from "../utils/bankCards";
import { decrypt, encrypt } from "../utils/encrypter";

dotenv.config();
const userRouter: Router = express.Router();

const jwtSecret = process.env.JWT_SECRET as string;
const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const upload = multer();

const client = redisCache;
const Queue_name = "notification:initiate";

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

            let user: any;

            if (existingUser) {
                if (existingUser.is_verified) {
                    return res.status(409).json({
                        message: "Account already exists. Please login.",
                    });
                }

                user = existingUser;
            } else {
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                user = await db.user.create({
                    data: {
                        email,
                        first_name: firstName,
                        is_verified: false,
                        last_name: lastName,
                        password: hashedPassword,
                        role: "user",
                    },
                });
            }

            const otp = AlphabeticOTP(6);

            await db.otp.create({
                data: {
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    otp_code: otp,
                    purpose: "signup",
                    userId: user.id,
                },
            });

            await client.rPush(
                Queue_name,
                JSON.stringify({
                    email: user.email,
                    otp,
                    type: "email",
                }),
            );

            const token = generateToken(user.id, "10m");

            await db.jwtToken.create({
                data: {
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    issued_at: new Date(),
                    token,
                    userId: user.id,
                },
            });

            return res.status(existingUser ? 200 : 201).json({
                message: existingUser
                    ? "OTP resent. Please verify your email."
                    : "User successfully registered",
                token,
                user: {
                    email: user.email,
                    firstName: user.first_name,
                    id: user.id,
                    lastName: user.last_name,
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

            const user = await db.user.findUnique({
                where: {
                    email,
                },
            });

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            if (user.role !== "user") {
                return res.status(403).json({
                    message: "Access denied",
                });
            }

            if (!user.is_verified) {
                return res.status(403).json({
                    message: "Please verify your email before signing in",
                });
            }

            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            const token = generateToken(user.id, "1d");

            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.jwtToken.deleteMany({
                    where: {
                        userId: user.id,
                    },
                });

                await tx.jwtToken.create({
                    data: {
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        issued_at: new Date(),
                        token,
                        userId: user.id,
                    },
                });
            });

            return res.status(200).json({
                message: "Signin successful",
                token,
                user: {
                    email: user.email,
                    firstName: user.first_name,
                    id: user.id,
                    lastName: user.last_name,
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
 * Verify the User after signup
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */
userRouter.post(
    "/verify",
    otpLimits,
    unVerifiedUserMiddleware,
    async (req: Request, res: Response) => {
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
            const findUser = await db.$transaction(async (tx: Prisma.TransactionClient) => {
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

                const updatedUser = await tx.user.update({
                    data: {
                        encrypted_private_key: encrypted_privateKey,
                        is_verified: true,
                        public_key: publicKey,
                    },
                    where: {
                        id: userId,
                    },
                });

                return updatedUser;
            });

            const token = generateToken(findUser.id, "1d");
            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.jwtToken.deleteMany({
                    where: {
                        userId: findUser.id,
                    },
                });
                await tx.jwtToken.create({
                    data: {
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        issued_at: new Date(),
                        token,
                        userId: findUser.id,
                    },
                });
            });

            return res.status(200).json({
                message: "OTP verified successfully",
                token: token,
            });
        } catch (_error) {
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);
/**
 * Logout the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.get("/logout", userMiddleware, async (req: Request, res: Response) => {
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
 * 2FA Verifications for Forget_PASSWORDs
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */
userRouter.post("/otp", otpLimits, async (req: Request, res: Response) => {
    try {
        const parsed = OtpType.safeParse(req.body);
        if (!parsed.success) {
            return res.status(401).json({
                message: "No Email was provided",
            });
        }
        const { email } = parsed.data;

        const findEmail = await db.user.findUnique({
            where: {
                email,
                is_verified: true,
            },
        });

        if (!findEmail) {
            return res.status(404).json({
                message: `The given ${email} is not registered with our services`,
            });
        }

        const otp = AlphabeticOTP(6);
        const _createOtp = await db.otp.create({
            data: {
                expires_at: new Date(Date.now() + 15 * 60 * 1000),
                otp_code: otp,
                purpose: "forgot_password",
                userId: findEmail.id,
            },
        });

        await client.rPush(
            Queue_name,
            JSON.stringify({
                email: findEmail.email,
                otp: otp,
                reason: "forget-password",
                type: "email",
            }),
        );

        return res.status(200).json({
            message: `If your ${email} exists, a reset link will be sent`,
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Complete Process for Forget_PASSWORDs
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 */
userRouter.post("/forget-password", resetPasswordLimits, async (req: Request, res: Response) => {
    try {
        const parsed = ForgetType.safeParse(req.body);
        if (!parsed.success) {
            const error = parsed.error.format();
            return res.status(422).json({
                error: error,
                message: "Invalid Data format was provided",
            });
        }
        const { email, otp, newpassword } = parsed.data;
        const findEmail = await db.user.findUnique({
            where: {
                email,
                is_verified: true,
            },
        });

        if (!findEmail) {
            return res.status(404).json({
                message: `Invalid email ${email} was provided`,
            });
        }

        const otpRecord = await db.otp.findFirst({
            where: {
                otp_code: otp,
                userId: findEmail.id,
            },
        });

        if (!otpRecord) {
            return res.status(404).json({
                message: "OTP record not found",
            });
        }

        if (otpRecord.is_used) {
            return res.status(400).json({
                message: "OTP already used",
            });
        }

        if (otpRecord.expires_at < new Date(Date.now())) {
            return res.status(400).json({
                message: "OTP was already expired",
            });
        }

        const hashedPassword = await bcrypt.hash(newpassword, saltRounds);

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
                    password: hashedPassword,
                },
                where: {
                    id: findEmail.id,
                },
            });
        });
        return res.status(200).json({
            message: "Password reset successfully",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Resets the User after signup/signin like normal ones that allow to change in settings
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.post(
    "/reset-password",
    resetPasswordLimits,
    userMiddleware,
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
            const user = req.userId;
            const parsedData = ResetType.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    errors: parsedData.error.format(),
                    message: "Invalid data was provided",
                });
            }
            const { newpassword, password } = parsedData.data;
            const userExist = await db.user.findUnique({
                select: {
                    email: true,
                    id: true,
                    password: true,
                },
                where: {
                    id: user,
                    is_verified: true,
                },
            });
            if (!userExist) {
                return res.status(400).json({
                    message: "Provided email is invalid",
                });
            }
            const comparePassword = await bcrypt.hash(password, userExist.password);

            if (!comparePassword) {
                return res.status(403).json({
                    message: "Provided password was invalid",
                });
            }

            const hashedPassword = await bcrypt.hash(newpassword, saltRounds);
            await db.user.update({
                data: {
                    password: hashedPassword,
                },
                where: {
                    email: userExist.email,
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
                is_verified: true,
            },
        });

        if (!result) {
            return res.status(404).json({
                message: "Invalid UserId was provided",
            });
        }

        let _decryptPrivateKey: string | undefined;
        if (typeof result.encrypted_private_key === "string") {
            _decryptPrivateKey = decrypt(result.encrypted_private_key);
        }
        return res.status(200).json({
            data: {
                city: result.city,
                date: result.DOB,
                email: result.email,
                firstName: result.first_name,
                lastName: result.last_name,
                //privateKey: decryptPrivateKey,
                profilePic: result.profile_image_url,
                publicKey: result.public_key,
                state: result.state,
                zip_code: result.zip_code,
            },
            message: "User was successfully retrived",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

userRouter.get("/profile", userMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.userId;
        const findUser = await db.user.findUnique({
            select: {
                first_name: true,
                profile_image_url: true,
            },
            where: {
                id: user,
            },
        });
        if (!findUser) {
            return res.status(404).json({
                message: "Invalid data was provided",
            });
        }
        return res.status(200).json({
            data: {
                firstName: findUser.first_name,
                proficPic: findUser.profile_image_url,
            },
            message: "Data was retrieved successfully",
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
userRouter.put(
    "/me",
    userMiddleware,
    upload.single("file"),
    async (req: Request, res: Response) => {
        try {
            const userId = req.userId;
            const file = req.file as Express.Multer.File;
            const parsed = UserDetailsType.safeParse(req.body);
            if (!parsed.success) {
                const err = parsed.error.format();
                return res.status(401).json({
                    error: err,
                    message: "Invalid data was provided",
                });
            }
            const { firstName, lastName, zipCode, state, city, date } = parsed.data;
            let publicUrl = "";
            if (file) {
                const key = `avatar/${userId}-${Date.now()}.png`;

                const { error: uploadError } = await supabase.storage
                    .from("uploads")
                    .upload(key, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from("uploads").getPublicUrl(key);
                publicUrl = data.publicUrl;
            }

            const updatedUser = await db.user.update({
                data: {
                    ...(firstName && {
                        first_name: firstName,
                    }),
                    ...(lastName && {
                        last_name: lastName,
                    }),
                    ...(file && {
                        profile_image_url: publicUrl,
                    }),
                    ...(zipCode && {
                        zip_code: zipCode,
                    }),
                    ...(state && {
                        state: state,
                    }),
                    ...(city && {
                        city: city,
                    }),
                    ...(date && {
                        DOB: date,
                    }),
                },
                where: {
                    id: userId,
                    is_verified: true,
                },
            });

            return res.status(200).json({
                message: "User updated successfully",
                user: {
                    city: updatedUser.city,
                    date: updatedUser.DOB,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    id: updatedUser.id,
                    lastName: updatedUser.last_name,
                    profileImageUrl: updatedUser.profile_image_url,
                    state: updatedUser.state,
                    zipCode: updatedUser.zip_code,
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
 * Deletes the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
userRouter.delete(
    "/my",
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

/**
 * GET /my/cards
 * Get all cards of the logged-in user
 */
userRouter.get("/my/cards", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(403).json({
                message: "User not authenticated",
            });
        }

        const cards = await db.card.findMany({
            orderBy: {
                created_at: "desc",
            },
            select: {
                balance: true,
                bank_name: true,
                card_number: true,
                created_at: true,
                id: true,
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
            },
            where: {
                userId,
            },
        });

        if (!cards.length) {
            return res.status(200).json({
                cards: [],
                message: "No cards found for this user",
            });
        }

        const formatedData = cards.map((x) => ({
            balance: x.balance,
            bank_name: x.bank_name,
            card_number: x.card_number,
            created_at: x.created_at,
            id: x.id,
            name: `${x.user.first_name} ${x.user.last_name}`.toUpperCase(),
        }));

        return res.status(200).json({
            data: formatedData,
            message: "Cards retrieved successfully",
        });
    } catch (error) {
        console.error("Error fetching user cards:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

export default userRouter;
