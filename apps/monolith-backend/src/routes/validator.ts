import dotenv from "dotenv";

dotenv.config();

import redisCache from "@repo/cache";
import db, { type Prisma } from "@repo/db";
import { decryptPayload, verifySignedTicket } from "@repo/keygen";
import { AlphabeticOTP, NumericOTP } from "@repo/notifications";
import { otpLimits, resetPasswordLimits } from "@repo/ratelimit";
import {
    ForgetType,
    OtpType,
    ResetPasswordSchema,
    SigninType,
    type SignupResponse,
    SignupType,
    UserDetailsType,
    VerificationType,
} from "@repo/types";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import { addDays, endOfDay, format, formatDate, startOfDay } from "date-fns";
import excel from "exceljs";
import express, { type Request, type Response, type Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import multer from "multer";
import validatorMiddleware, { unVerifiedValidatorMiddleware } from "../middleware";

const validatorRouter: Router = express.Router();

const jwtSecret = process.env.JWT_SECRET as string;
const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase keys are not defined in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const upload = multer();
const client = redisCache;
const Queue_name = "notification:initiate";

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
                        role: "verifier",
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
                    otp: otp,
                    type: "email",
                }),
            );

            // await sendEmailOtp(newUser.email, otp);

            const token = generateToken(user.id, "10m");
            await db.jwtToken.create({
                data: {
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    issued_at: new Date(),
                    token,
                    userId: user.id,
                },
            });

            return res.status(201).json({
                message: "Verifier successfully registered",
                token: token,
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

            if (!existingUser.is_verified) {
                return res.status(403).json({
                    message: "Email not verified, Please signup",
                });
            }

            if (existingUser.role !== "verifier") {
                return res.status(403).json({
                    message: "Access denied",
                });
            }

            const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

            if (!isPasswordCorrect) {
                return res.status(401).json({
                    message: "Invalid email or password",
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
validatorRouter.post(
    "/verify",
    unVerifiedValidatorMiddleware,
    otpLimits,
    async (req: Request, res: Response) => {
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

            const token = generateToken(userId, "1d");
            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.jwtToken.deleteMany({
                    where: {
                        userId: userId,
                    },
                }),
                    await tx.jwtToken.create({
                        data: {
                            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                            issued_at: new Date(),
                            token,
                            userId: userId,
                        },
                    });
            });

            return res.status(200).json({
                message: "Validator verified successfully",
                token: token,
            });
        } catch (_err) {
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

validatorRouter.post("/otp", otpLimits, async (req: Request, res: Response) => {
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
validatorRouter.post(
    "/forget-password",
    resetPasswordLimits,
    async (req: Request, res: Response) => {
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
    },
);

/**
 * Resets the User after signup/signin
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {message: string} - Responds with a messaging.
 */
validatorRouter.post(
    "/reset-password",
    resetPasswordLimits,
    validatorMiddleware,
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
            const userId = req.userId;
            const parsedData = ResetPasswordSchema.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    message: "Invalid password was provided",
                });
            }
            const { password } = parsedData.data;
            const userExist = await db.user.findUnique({
                where: {
                    id: userId,
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
                    id: userExist.id,
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

validatorRouter.get("/me", validatorMiddleware, async (req: Request, res: Response) => {
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

        // let _decryptPrivateKey: string | undefined;
        // if (typeof result.encrypted_private_key === "string") {
        //     _decryptPrivateKey = decrypt(result.encrypted_private_key);
        // }
        return res.status(200).json({
            data: {
                city: result.city,
                date: result.DOB,
                email: result.email,
                firstName: result.first_name,
                lastName: result.last_name,
                //privateKey: decryptPrivateKey,
                profilePic: result.profile_image_url,
                //publicKey: result.public_key,
                state: result.state,
                zip_code: result.zip_code,
            },
            message: "User was successfully retrived",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

validatorRouter.put(
    "/me",
    validatorMiddleware,
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
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

validatorRouter.get("/events", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const { search, location_name, category } = req.query;

        const today = startOfDay(new Date());
        const next7Days = endOfDay(addDays(today, 7));

        const whereClause: Record<string, any> = {
            slots: {
                some: {
                    event_date: {
                        gte: today,
                        lte: next7Days,
                    },
                },
            },
            status: "published",
        };

        if (typeof search === "string" && search.trim() !== "") {
            whereClause.title = {
                contains: search.trim(),
                mode: "insensitive",
            };
        }

        if (typeof location_name === "string" && location_name.trim() !== "") {
            whereClause.slots = {
                some: {
                    ...whereClause.slots.some,
                    location_name: {
                        contains: location_name.trim(),
                        mode: "insensitive",
                    },
                },
            };
        }

        if (typeof category === "string" && category.trim() !== "") {
            whereClause.category = {
                contains: category.trim(),
                mode: "insensitive",
            };
        }

        const metaLocations = await db.eventSlot.findMany({
            distinct: [
                "location_name",
            ],
            select: {
                location_name: true,
            },
            where: {
                event: {
                    status: "published",
                },
                event_date: {
                    gte: today,
                    lt: next7Days,
                },
            },
        });

        const formattedMeta = metaLocations.map((x) => {
            return x.location_name;
        });

        const getEvents = await db.event.findMany({
            orderBy: {
                created_at: "desc",
            },
            select: {
                banner_url: true,
                category: true,
                description: true,
                genre: true,
                hero_image_url: true,
                id: true,
                language: true,
                slots: {
                    select: {
                        event_date: true,
                        id: true,
                        location_name: true,
                    },
                },
                status: true,
                title: true,
            },
            where: whereClause,
        });

        return res.status(200).json({
            data: {
                events: getEvents,
                meta: formattedMeta,
            },
            message: "Next 7 days events were fetched",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

validatorRouter.get("/scanned/events", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.userId;

        const verifications = await db.ticketVerification.findMany({
            select: {
                ticket: {
                    select: {
                        eventSlot: {
                            select: {
                                capacity: true,
                                end_time: true,
                                event: {
                                    select: {
                                        banner_url: true,
                                        category: true,
                                        created_at: true,
                                        description: true,
                                        genre: true,
                                        hero_image_url: true,
                                        id: true,
                                        is_online: true,
                                        language: true,
                                        organiser: {
                                            select: {
                                                first_name: true,
                                                last_name: true,
                                            },
                                        },
                                        status: true,
                                        title: true,
                                    },
                                },
                                event_date: true,
                                id: true,
                                location_name: true,
                                location_url: true,
                                price: true,
                                start_time: true,
                            },
                        },
                    },
                },
            },
            where: {
                verifierId: user,
            },
        });

        const events = verifications.map((v) => {
            const slot = v.ticket.eventSlot;
            return {
                ...slot.event,
                eventSlot: {
                    capacity: slot.capacity,
                    end_time: format(new Date(slot.end_time), "h:mm a"),
                    event_date: formatDate(slot.event_date, "MMM d, yyyy"),
                    id: slot.id,
                    location_name: slot.location_name,
                    location_url: slot.location_url,
                    price: slot.price,
                    start_time: format(new Date(slot.start_time), "h:mm a"),
                },
            };
        });

        return res.status(200).json({
            data: events,
            message: "Events were fetched successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

validatorRouter.get("/download", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.userId;

        const findUser = await db.user.findUnique({
            where: {
                id: user,
            },
        });

        if (!findUser) {
            return res.status(401).json({
                message: "Unauthorized User tried to access the service",
            });
        }

        const { eventId, slotId } = req.query;
        const whereClause: Record<string, any> = {
            is_verified: true,
        };

        if (typeof eventId === "string" && eventId.trim() !== "") {
            whereClause.eventSlot = {
                eventId: eventId.trim(),
            };
        }

        if (typeof slotId === "string" && slotId.trim() !== "") {
            whereClause.eventSlotId = slotId.trim();

            whereClause.verifications = {
                some: {
                    //verifierId: user,
                    //is_successful: true
                },
            };
        }

        const getTickets = await db.ticket.findMany({
            include: {
                eventSlot: {
                    include: {
                        event: true,
                    },
                },
                user: true,
                verifications: {
                    include: {
                        verifier: true,
                    },
                },
            },
            orderBy: {
                issued_at: "desc",
            },
            where: whereClause,
        });

        const workbook = new excel.Workbook();
        const exportTimestamp = new Date().toLocaleString();
        const sheet = workbook.addWorksheet("Ticket List");

        sheet.mergeCells("A1:L1");
        const titleCell = sheet.getCell("A1");
        titleCell.value = "Tickets List";
        titleCell.font = {
            bold: true,
            size: 16,
        };
        titleCell.alignment = {
            horizontal: "center",
        };

        sheet.addRow([]);

        const infoRow = sheet.addRow([
            "Validator:",
            `${findUser.first_name} ${findUser.last_name}`,
            "Exported At:",
            exportTimestamp,
        ]);

        infoRow.eachCell((cell) => {
            cell.font = {
                bold: true,
            };
        });

        sheet.addRow([]);
        sheet.addRow([]);

        sheet.columns = [
            {
                header: "Sr No.",
                key: "index",
                width: 8,
            },
            {
                header: "Ticket ID",
                key: "ticket_id",
                width: 36,
            },
            {
                header: "Full Name",
                key: "full_name",
                width: 20,
            },
            {
                header: "Email",
                key: "email",
                width: 25,
            },
            {
                header: "Event",
                key: "event",
                width: 25,
            },
            {
                header: "Slot Date",
                key: "slot_date",
                width: 20,
            },
            {
                header: "Location",
                key: "location",
                width: 20,
            },
            {
                header: "Verifier",
                key: "verifier",
                width: 20,
            },
            {
                header: "Verified",
                key: "verified",
                width: 15,
            },
            {
                header: "Verified At",
                key: "verified_at",
                width: 22,
            },
            {
                header: "Remarks",
                key: "remarks",
                width: 25,
            },
        ];

        const headerRow = sheet.getRow(6);
        (headerRow.font = {
            bold: true,
            color: {
                argb: "000000",
            },
        }),
            (headerRow.fill = {
                fgColor: {
                    argb: "FFD9EAD3",
                },
                pattern: "solid",
                type: "pattern",
            });
        (headerRow.alignment = {
            horizontal: "center",
            vertical: "middle",
        }),
            (headerRow.height = 20);

        headerRow.eachCell((x) => {
            x.border = {
                bottom: {
                    style: "thin",
                },
                left: {
                    style: "thin",
                },
                right: {
                    style: "thin",
                },
                top: {
                    style: "thin",
                },
            };
        });

        getTickets.forEach((ticket, index) => {
            const latestVerification = ticket.verifications[0];
            sheet.addRow({
                email: ticket.user.email,
                event: ticket.eventSlot.event.title,
                full_name: `${ticket.user.first_name} ${ticket.user.last_name}`,
                index: index + 1,
                location: ticket.eventSlot.location_name,
                remarks: latestVerification?.remarks || "-",
                slot_date: ticket.eventSlot.event_date.toLocaleString(),
                ticket_id: ticket.id,
                verified: latestVerification?.is_successful ? "Yes" : "No",
                verified_at: latestVerification?.verification_time
                    ? new Date(latestVerification.verification_time).toLocaleString()
                    : "-",
                verifier: latestVerification?.verifier
                    ? `${latestVerification.verifier.first_name} ${latestVerification.verifier.last_name}`
                    : "-",
            });
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );

        res.setHeader("Content-Disposition", `attachment; filename=tickets_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * POST /validator/validate
 * Validates a ticket for an event and marks it as scanned by the validator.
 * @param {Express.Request} req - The HTTP request object containing ticketId in the body and validator's userId from the middleware.
 * @param {Express.Response} res - The HTTP response object used to return validation result.
 * @returns {success: boolean, ticket?: object, error?: string} - Returns updated ticket details if validation is successful, otherwise an error message.
 */
validatorRouter.post("/validate", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const _verifierId = req.userId;

        const { nonce, ciphertext } = req.body;

        if (!nonce || !ciphertext) {
            return res.status(400).json({
                message: "Missing nonce or ciphertext",
            });
        }

        const decryptedTicket = await decryptPayload(ciphertext, nonce);
        const ticketId = decryptedTicket.ticketId;

        const checkId = await db.ticket.findUnique({
            where: {
                id: ticketId,
            },
        });
        if (!checkId) {
            return res.status(400).json({
                message: "Invalid Ticket was provided",
            });
        }
        const publicKeyObj = await db.user.findUnique({
            where: {
                id: checkId.userId,
            },
        });
        if (!publicKeyObj || !publicKeyObj.public_key) {
            return res.status(400).json({
                message: "User public key not found",
            });
        }

        const validateTicket = await verifySignedTicket(
            {
                ciphertext,
                nonce,
            },
            publicKeyObj.public_key,
        );

        if (!validateTicket.valid) {
            return res.status(400).json({
                message: "Invalid ticket was submitted",
            });
        }

        const otp = NumericOTP(4).toString();
        const otpRecord = await db.otp.create({
            data: {
                expires_at: new Date(Date.now() + 5 * 60 * 1000),
                otp_code: otp,
                purpose: "ticket_validation",
                ticketId: checkId.id,
                userId: publicKeyObj.id,
            },
        });
        await client.rPush(
            Queue_name,
            JSON.stringify({
                email: publicKeyObj.email,
                otp: otpRecord.otp_code,
                type: "email",
            }),
        );
        // await sendEmailOtp(publicKeyObj.email, otpRecord.otp_code);
        return res.status(200).json({
            message: "OTP for person validation",
            ticketId: checkId.id,
        });
    } catch (err) {
        console.error("Validation error:", err);
        res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

validatorRouter.post("/otp", validatorMiddleware, async (req: Request, res: Response) => {
    try {
        const verifierId = req.userId;
        const { otp_code, ticketId } = req.body;

        if (!otp_code || !ticketId) {
            return res.status(400).json({
                message: "OTP code and ticketId are required",
            });
        }

        const otpCheck = await db.otp.findFirst({
            where: {
                expires_at: {
                    gt: new Date(),
                },
                is_used: false,
                otp_code: otp_code.toString(),
                purpose: "ticket_validation",
                ticketId,
            },
        });

        if (!otpCheck) {
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
                    id: otpCheck.id,
                },
            });

            await tx.ticketVerification.create({
                data: {
                    is_successful: true,
                    remarks: "OTP verified successfully",
                    ticketId: ticketId,
                    verification_time: new Date(),
                    verifierId: verifierId,
                },
            });

            await tx.ticket.update({
                data: {
                    is_valid: true,
                    is_verified: true,
                    scanned_at: new Date(),
                    scannedById: verifierId,
                },
                where: {
                    id: ticketId,
                },
            });
        });

        const ticket = await db.ticket.findUnique({
            where: {
                id: ticketId,
            },
        });
        if (ticket?.eventSlotId) {
            await redisCache.del(`pendingTickets:${ticket.eventSlotId}`);
            await redisCache.del(`validatedTickets:${ticket.eventSlotId}`);
        }

        return res.status(200).json({
            message: "Ticket successfully validated",
            success: true,
        });
    } catch (error) {
        console.error("OTP validation error:", error);
        return res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

/**
 * LIST — Pending Tickets (not validated yet)
 */
validatorRouter.get(
    "/slots/:slotId/pending",
    validatorMiddleware,
    async (req: Request, res: Response) => {
        try {
            const { slotId } = req.params;
            const cacheKey = `pendingTickets:${slotId}`;

            const cached = await redisCache.get(cacheKey);
            if (cached) {
                return res.status(200).json({
                    source: "cache",
                    tickets: JSON.parse(cached.toString()),
                });
            }

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
                    is_valid: true,
                    is_verified: false,
                },
            });

            await redisCache.set(cacheKey, JSON.stringify(tickets), {
                EX: 60,
            });

            return res.status(200).json({
                source: "database",
                tickets,
            });
        } catch (err) {
            console.error("List pending tickets error:", err);
            return res.status(500).json({
                error: "Internal server error",
                success: false,
            });
        }
    },
);

/**
 * LIST — Validated Tickets
 */
validatorRouter.get(
    "/slots/:slotId/validated",
    validatorMiddleware,
    async (req: Request, res: Response) => {
        try {
            const { slotId } = req.params;
            const cacheKey = `validatedTickets:${slotId}`;

            const cached = await redisCache.get(cacheKey);
            if (cached) {
                return res.status(200).json({
                    source: "cache",
                    tickets: JSON.parse(cached.toString()),
                });
            }

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
                    is_valid: true,
                    is_verified: false,
                },
            });

            await redisCache.set(cacheKey, JSON.stringify(tickets), {
                EX: 60,
            });

            return res.status(200).json({
                source: "database",
                tickets,
            });
        } catch (err) {
            console.error("List validated tickets error:", err);
            return res.status(500).json({
                error: "Internal server error",
                success: false,
            });
        }
    },
);

/**
 * GET /validator/tickets/:ticketId
 * Retrieves detailed information for a specific ticket by its ID.
 * @param {Express.Request} req - The HTTP request object containing ticketId as a URL parameter.
 * @param {Express.Response} res - The HTTP response object used to return the ticket data.
 * @returns {success: boolean, ticket?: object, error?: string} - Returns ticket details if found, otherwise an error message.
 */
validatorRouter.get("/tickets/:ticketId", validatorMiddleware, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const cacheKey = `ticket:${ticketId}`;
        const cached = await redisCache.get(cacheKey);
        if (cached) {
            return res.status(200).json({
                ticket: JSON.parse(cached.toString()),
            });
        }

        const ticket = await db.ticket.findFirst({
            include: {
                eventSlot: {
                    select: {
                        end_time: true,
                        event: {
                            select: {
                                status: true,
                                title: true,
                            },
                        },
                        event_date: true,
                        location_name: true,
                        location_url: true,
                        price: true,
                        start_time: true,
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
                verifications: {
                    select: {
                        is_successful: true,
                    },
                },
            },
            where: {
                id: ticketId,
            },
        });

        if (!ticket) {
            return res.status(404).json({
                error: "Invalid ticket Id was provided",
                success: false,
            });
        }
        await redisCache.set(cacheKey, JSON.stringify(ticket), {
            EX: 60,
        });
        return res.json({
            success: true,
            ticket: ticket,
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
validatorRouter.get("/slots/:slotId", validatorMiddleware, async (req, res) => {
    try {
        const { slotId } = req.params;
        const cache = `tickets:${slotId}`;
        const cached = await redisCache.get(cache);
        if (cached) {
            return res.status(200).json({
                store: "cache",
                tickets: JSON.parse(cached.toString()),
            });
        }

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
                is_verified: false,
            },
        });

        await redisCache.set(cache, JSON.stringify(tickets), {
            EX: 60,
        });

        return res.json({
            store: "Database",
            tickets: tickets,
        });
    } catch (err) {
        console.error("List validated tickets error:", err);
        res.status(500).json({
            error: "Internal server error",
            success: false,
        });
    }
});

validatorRouter.get(
    "/ticketcount/pending",
    validatorMiddleware,
    async (_req: Request, res: Response) => {
        try {
            const total_pending = await db.ticket.findMany({
                where: {
                    is_verified: false,
                },
            });
            return res.status(200).json({
                total: total_pending,
            });
        } catch (error) {
            console.error("List validated tickets error:", error);
            res.status(500).json({
                error: "Internal server error",
                success: false,
            });
        }
    },
);

validatorRouter.get(
    "/ticketcount/validated",
    validatorMiddleware,
    async (_req: Request, res: Response) => {
        try {
            const total_pending = await db.ticket.findMany({
                where: {
                    is_verified: true,
                },
            });
            return res.status(200).json({
                total: total_pending,
            });
        } catch (error) {
            console.error("List validated tickets error:", error);
            res.status(500).json({
                error: "Internal server error",
                success: false,
            });
        }
    },
);
export default validatorRouter;
