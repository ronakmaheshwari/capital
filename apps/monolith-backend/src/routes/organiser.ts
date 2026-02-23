import redisCache from "@repo/cache";
import db, { type Prisma } from "@repo/db";
import { AlphanumericOTP } from "@repo/notifications";
import { otpLimits, resetPasswordLimits } from "@repo/ratelimit";
import {
    ForgetType,
    InitiateSchema,
    OtpType,
    SigninType,
    SignupType,
    VerificationType,
} from "@repo/types";
import bcrypt from "bcrypt";
import Decimal from "decimal.js";
import dotenv from "dotenv";
import excel from "exceljs";
import express, { type Request, type Response, type Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { organiserMiddleware, unVerifiedOrganiserMiddleware } from "../middleware";
import { createCardForOrganiser } from "../utils/bankCards";

dotenv.config();
const organiserRouter: Router = express.Router();

const jwtSecret = process.env.JWT_SECRET as string;
const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
const client = redisCache;
const Queue_name = "notification:initiate";

if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

const generateToken = (id: string, expire?: string) =>
    jwt.sign(
        {
            organiserId: id,
            role: "organiser",
        },
        jwtSecret,
        {
            expiresIn: (expire ?? "10m") as SignOptions["expiresIn"],
        },
    );

/**
 * Helper: Apply Filters from Query Params
 */
function _filterEvents(
    events: any[],
    filters: {
        status?: string;
        title?: string;
        location?: string;
    },
) {
    return events.filter((event) => {
        return (
            (!filters.status || event.status === filters.status) &&
            (!filters.title || event.title?.toLowerCase().includes(filters.title.toLowerCase())) &&
            (!filters.location ||
                event.location_name?.toLowerCase().includes(filters.location.toLowerCase()))
        );
    });
}

/**
 * @route POST /signup
 * @desc Organiser Signup
 */
organiserRouter.post("/signup", async (req: Request, res: Response) => {
    try {
        const parsedData = SignupType.safeParse(req.body);

        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.issues,
                message: "Invalid data provided",
            });
        }

        const { firstName, lastName, email, password } = parsedData.data;

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
                    last_name: lastName,
                    password: hashedPassword,
                    role: "organiser",
                },
            });
        }
        const otp = AlphanumericOTP(6);

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
});

/**
 * @route POST /signin
 * @desc Organiser Signin
 */
organiserRouter.post("/signin", async (req: Request, res: Response) => {
    try {
        const parsedData = SigninType.safeParse(req.body);

        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.issues,
                message: "Invalid data provided",
            });
        }

        const { email, password } = parsedData.data;
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

        if (user.role !== "organiser") {
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
});

/**
 * Verify the User after signup
 * @param {Express.Request} req - The HTTP request object containing user details.
 * @param {Express.Response} res - The HTTP response object used to return data.
 * @returns {Promise<void>} - Responds with a JSON object containing user info and JWT token.
 * @route POST /verify
 */
organiserRouter.post(
    "/verify",
    otpLimits,
    unVerifiedOrganiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const organiserId = req.organiserId as string | undefined;
            const parsedData = VerificationType.safeParse(req.body);
            if (!parsedData.success || !organiserId) {
                return res.status(400).json({
                    message: "Invalid userId or OTP format",
                });
            }

            const { otp } = parsedData.data;
            const checkOTP = await db.otp.findFirst({
                where: {
                    expires_at: {
                        gt: new Date(),
                    },
                    is_used: false,
                    otp_code: otp,
                    userId: organiserId,
                },
            });

            if (!checkOTP) {
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
                        id: checkOTP.id,
                    },
                });
                await tx.user.update({
                    data: {
                        is_verified: true,
                    },
                    where: {
                        id: organiserId,
                    },
                });
                await createCardForOrganiser(checkOTP.userId);

                await tx.wallet.create({
                    data: {
                        balance: 3000.0,
                        status: "active",
                        userId: checkOTP.userId,
                    },
                });
            });

            return res.status(200).json({
                message: "OTP verified successfully",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Internal error occured",
                message: "Internal error occured",
            });
        }
    },
);

organiserRouter.post("/otp", otpLimits, async (req: Request, res: Response) => {
    try {
        const parsed = OtpType.safeParse(req.body);
        if (!parsed.success) {
            const _error = parsed.error.format();
            return res.status(401).json({
                message: "No Email was provided",
            });
        }
        const { email } = parsed.data;

        const findEmail = await db.user.findUnique({
            where: {
                email,
            },
        });

        if (!findEmail) {
            return res.status(404).json({
                message: `No ${email} was found with our services`,
            });
        }

        if (!findEmail.is_verified) {
            return res.status(404).json({
                message: `Your email is not verified with our services.Please signup`,
            });
        }
        const otp = AlphanumericOTP(6);
        const _createOTP = await db.otp.create({
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

organiserRouter.post(
    "/forget-password",
    resetPasswordLimits,
    async (req: Request, res: Response) => {
        try {
            const parsed = ForgetType.safeParse(req.body);
            if (!parsed.success) {
                const error = parsed.error.format();
                return res.status(422).json({
                    error: error,
                    messsage: "Invalid data format was provided",
                });
            }
            const { email, otp, newpassword } = parsed.data;
            const findEmail = await db.user.findUnique({
                where: {
                    email,
                },
            });
            if (!findEmail) {
                return res.status(404).json({
                    message: `No email ${email} was found`,
                });
            }
            if (!findEmail.is_verified) {
                return res.status(403).json({
                    message: `Your email is not verified with our services`,
                });
            }

            const findOtp = await db.otp.findFirst({
                where: {
                    otp_code: otp,
                    userId: findEmail.id,
                },
            });

            if (!findOtp) {
                return res.status(404).json({
                    message: "OTP record not found",
                });
            }

            if (findOtp.is_used) {
                return res.status(400).json({
                    message: "OTP already used",
                });
            }

            if (findOtp.expires_at < new Date(Date.now())) {
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
                        id: findOtp.id,
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

organiserRouter.get("/profile", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.organiserId;
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

organiserRouter.get("/wallet", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId;
        const { startDate, endDate, type, eventId, page = 1, limit = 20 } = req.query;

        const start = startDate ? new Date(String(startDate)) : new Date("2000-01-01");
        const end = endDate ? new Date(String(endDate)) : new Date();

        const organiserData = await db.user.findUnique({
            select: {
                cards: {
                    select: {
                        balance: true,
                        bank_name: true,
                        card_number: true,
                        id: true,
                        transactions: {
                            select: {
                                amount: true,
                                canceled_at: true,
                                created_at: true,
                                description: true,
                                id: true,
                                ticket: {
                                    select: {
                                        eventSlot: {
                                            select: {
                                                event: {
                                                    select: {
                                                        id: true,
                                                        title: true,
                                                    },
                                                },
                                            },
                                        },
                                        id: true,
                                    },
                                },
                                token: true,
                                type: true,
                                wallet: {
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                            where: {
                                AND: [
                                    {
                                        created_at: {
                                            gte: start,
                                            lte: end,
                                        },
                                    },
                                    type
                                        ? {
                                              type: {
                                                  equals: type as any,
                                              },
                                          }
                                        : {},
                                    eventId
                                        ? {
                                              ticket: {
                                                  eventSlot: {
                                                      eventId: String(eventId),
                                                  },
                                              },
                                          }
                                        : {},
                                ],
                            },
                        },
                    },
                },
                wallet: {
                    select: {
                        balance: true,
                        currency: true,
                        id: true,
                        lastPayoutAt: true,
                        status: true,
                        transactions: {
                            select: {
                                amount: true,
                                canceled_at: true,
                                card: {
                                    select: {
                                        bank_name: true,
                                        card_number: true,
                                        id: true,
                                    },
                                },
                                created_at: true,
                                description: true,
                                id: true,
                                ticket: {
                                    select: {
                                        eventSlot: {
                                            select: {
                                                event: {
                                                    select: {
                                                        id: true,
                                                        title: true,
                                                    },
                                                },
                                            },
                                        },
                                        id: true,
                                    },
                                },
                                token: true,
                                type: true,
                            },
                            where: {
                                AND: [
                                    {
                                        created_at: {
                                            gte: start,
                                            lte: end,
                                        },
                                    },
                                    type
                                        ? {
                                              type: {
                                                  equals: type as any,
                                              },
                                          }
                                        : {},
                                    eventId
                                        ? {
                                              ticket: {
                                                  eventSlot: {
                                                      eventId: String(eventId),
                                                  },
                                              },
                                          }
                                        : {},
                                ],
                            },
                        },
                    },
                },
            },
            where: {
                id: organiserId,
            },
        });

        if (!organiserData) {
            return res.status(404).json({
                message: "Organizer not found",
            });
        }

        const allTransactions = [
            ...(organiserData.wallet?.transactions || []),
            ...organiserData.cards.flatMap((c) => c.transactions || []),
        ];

        allTransactions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

        const pageNumber = Number(page);
        const pageSize = Number(limit);

        const paginatedTransactions = allTransactions.slice(
            (pageNumber - 1) * pageSize,
            pageNumber * pageSize,
        );

        const cardsWithMasked = organiserData.cards.map((card) => ({
            ...card,
            balance: Number(card.balance),
            card_number: card.card_number,
        }));

        const formattedTransactions = paginatedTransactions.map((tx) => {
            const hasCard = "card" in tx && tx.card !== undefined && tx.card !== null;

            return {
                amount: Number(tx.amount),
                canceledAt: tx.canceled_at,
                card: hasCard
                    ? {
                          bank_name: (tx as any).card.bank_name,
                          card_number: (tx as any).card.card_number,
                          id: (tx as any).card.id,
                      }
                    : null,
                createdAt: tx.created_at,
                description: tx.description || "",
                id: tx.id,
                source: hasCard ? "Card" : "Wallet",
                status: tx.canceled_at ? "CANCELED" : "COMPLETED",
                ticket: tx.ticket
                    ? {
                          event: tx.ticket.eventSlot?.event
                              ? {
                                    id: tx.ticket.eventSlot.event.id,
                                    title: tx.ticket.eventSlot.event.title,
                                }
                              : null,
                          id: tx.ticket.id,
                      }
                    : null,
                token: tx.token || null,
                type: tx.type,
            };
        });

        const totalEarnings = allTransactions
            .filter((tx) =>
                [
                    "DEPOSIT",
                    "PURCHASE",
                    "REFUND",
                    "PAYOUT",
                ].includes(tx.type),
            )
            .reduce((acc, tx) => acc + Number(tx.amount), 0);

        const totalWithdrawals = allTransactions
            .filter((tx) =>
                [
                    "WITHDRAWAL",
                    "CANCEL",
                ].includes(tx.type),
            )
            .reduce((acc, tx) => acc + Number(tx.amount), 0);

        const numberOfTransactions = allTransactions.length;

        const totalTicketsSold = allTransactions.filter((tx) => tx.ticket).length;

        const monthsToShow = 6;
        const now = new Date();
        const monthlyIncomeMap: Record<string, number> = {};

        for (let i = monthsToShow - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
            monthlyIncomeMap[monthKey] = 0;
        }

        allTransactions.forEach((tx) => {
            if (
                ![
                    "DEPOSIT",
                    "PURCHASE",
                    "REFUND",
                    "PAYOUT",
                ].includes(tx.type)
            )
                return;

            const monthKey = `${tx.created_at.getFullYear()}-${(tx.created_at.getMonth() + 1)
                .toString()
                .padStart(2, "0")}`;

            if (Object.hasOwn(monthlyIncomeMap, monthKey)) {
                monthlyIncomeMap[monthKey] += Number(tx.amount);
            }
        });

        const monthlyIncome = Object.entries(monthlyIncomeMap).map(([month, amount]) => ({
            amount,
            month,
        }));

        const walletBalance = Number(organiserData.wallet?.balance || 0);

        const cardBalance = organiserData.cards.reduce((acc, c) => acc + Number(c.balance), 0);

        return res.json({
            cards: cardsWithMasked,
            charts: {
                balances: {
                    cards: cardBalance,
                    wallet: walletBalance,
                },
                monthlyIncome,
            },
            pagination: {
                limit: pageSize,
                page: pageNumber,
                totalPages: Math.ceil(allTransactions.length / pageSize),
                totalTransactions: allTransactions.length,
            },
            summary: {
                numberOfTransactions,
                totalEarnings,
                totalTicketsSold,
                totalWithdrawals,
            },
            transactions: formattedTransactions,
            wallet: {
                balance: walletBalance,
                currency: organiserData.wallet?.currency || "INR",
                id: organiserData.wallet?.id,
                lastPayoutAt: organiserData.wallet?.lastPayoutAt,
                status: organiserData.wallet?.status || "active",
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Initiate a payment from wallet to cardNumber
 * @route POST /initiate
 */
organiserRouter.post("/initiate", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string;
        const parsedData = InitiateSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.flatten(),
                message: "Invalid data was provided",
            });
        }
        const { token, amount, cardNumber, walletId } = parsedData.data;
        const Amount = new Decimal(amount);

        if (Amount.lte(0)) {
            return res.status(400).json({
                message: "Amount must be greater than zero",
            });
        }

        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            const checkCard = await tx.card.findUnique({
                where: {
                    card_number: cardNumber,
                    userId: organiserId,
                },
            });

            if (!checkCard) {
                throw new Error("Invalid card was provided");
            }

            const walletDetail = await tx.wallet.findUnique({
                where: {
                    id: walletId,
                },
            });

            if (!walletDetail) {
                throw new Error("Wallet not found");
            }

            if (walletDetail.balance.lt(Amount)) {
                throw new Error("Wallet balance is insufficient");
            }

            await tx.transaction.create({
                data: {
                    amount: Amount.toNumber(),
                    bank_name: checkCard.bank_name,
                    cardId: checkCard.id,
                    token,
                    type: "Initiate",
                    userId: checkCard.userId,
                },
            });
        });

        return res.status(200).json({
            message: "Payment initiation recorded successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
});

/**
 * @route GET /events
 * @desc Get all events (with optional filters)
 */
organiserRouter.get("/events", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string;

        const {
            status,
            title,
            category,
            genre,
            language,
            isOnline,
            location,
            from,
            to,
            page = "1",
            limit = "10",
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            organiserId,
        };

        if (status) where.status = status;

        if (title) {
            where.title = {
                contains: title as string,
                mode: "insensitive",
            };
        }

        if (category) where.category = category;
        if (genre) where.genre = genre;
        if (language) where.language = language;

        if (isOnline !== undefined) {
            where.is_online = isOnline === "true";
        }

        if (location || from || to) {
            where.slots = {
                some: {
                    ...(location && {
                        location_name: {
                            contains: location as string,
                            mode: "insensitive",
                        },
                    }),
                    ...(from || to
                        ? {
                              event_date: {
                                  ...(from && {
                                      gte: new Date(from as string),
                                  }),
                                  ...(to && {
                                      lte: new Date(to as string),
                                  }),
                              },
                          }
                        : {}),
                },
            };
        }

        const events = await db.event.findMany({
            include: {
                slots: {
                    include: {
                        tickets: {
                            where: {
                                status: "ISSUED",
                            },
                        },
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
            skip,
            take: Number(limit),
            where,
        });

        let totalRevenue = 0;

        const enrichedEvents = events.map((event) => {
            let revenue = 0;
            let ticketsSold = 0;

            event.slots.forEach((slot) => {
                const sold = slot.tickets.length;
                ticketsSold += sold;
                revenue += Number(slot.price) * sold;
            });

            totalRevenue += revenue;

            return {
                ...event,
                revenue,
                ticketsSold,
            };
        });

        const total = await db.event.count({
            where,
        });

        const statusCounts = await db.event.groupBy({
            _count: {
                status: true,
            },
            by: [
                "status",
            ],
            where: {
                organiserId,
            },
        });

        const byStatus = {
            cancelled: 0,
            draft: 0,
            published: 0,
        };

        statusCounts.forEach((s) => {
            byStatus[s.status] = s._count.status;
        });

        return res.status(200).json({
            data: enrichedEvents,
            message: "Events fetched",
            meta: {
                byStatus,
                limit: Number(limit),
                page: Number(page),
                total,
                totalRevenue,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal error occurred",
        });
    }
});

/**
 * @route GET /events/summary
 * @desc Event summary grouped by event: tickets sold, revenue, attendees
 */
organiserRouter.get("/events/summary", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string | undefined;
        if (!organiserId)
            return res.status(403).json({
                message: "Unauthenticated",
            });

        const eventSummary = (await db.$queryRawUnsafe(
            `
            SELECT 
                e.id AS "eventId",
                e.title AS "eventName",
                COALESCE(SUM(t."ticket_count"), 0) AS "ticketsSold",
                COALESCE(SUM(t.amount), 0) AS "totalRevenue",
                COUNT(DISTINCT t."userId") AS "attendees"
            FROM "Transaction" t
            INNER JOIN "Ticket" tk ON t."ticketId" = tk.id
            INNER JOIN "EventSlot" es ON tk."eventSlotId" = es.id
            INNER JOIN "Event" e ON es."eventId" = e.id
            WHERE e."organiserId" = $1
                AND t.type = 'PURCHASE'
            GROUP BY e.id, e.title
            ORDER BY e.title ASC;
            `,
            organiserId,
        )) as unknown as {
            eventId: string;
            eventName: string;
            ticketsSold: number;
            totalRevenue: number;
            attendees: number;
        }[];

        return res.status(200).json({
            data: eventSummary,
            message: "Event summaries fetched successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : error,
            message: "Internal error occurred",
        });
    }
});

/**
 * @route GET /events/analytics
 * @desc Analytics for organiser: total events, tickets sold, total revenue
 */
organiserRouter.get(
    "/events/analytics",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const organiserId = req.organiserId as string | undefined;
            if (!organiserId)
                return res.status(403).json({
                    message: "Unauthenticated",
                });

            const [totalEvents, totalPublished, totalTicketsSold, totalRevenueAgg] =
                await Promise.all([
                    db.event.count({
                        where: {
                            organiserId,
                        },
                    }),
                    db.event.count({
                        where: {
                            organiserId: organiserId,
                            status: "published",
                        },
                    }),
                    db.ticket.count({
                        where: {
                            eventSlot: {
                                event: {
                                    organiserId,
                                },
                            },
                        },
                    }),
                    db.transaction.aggregate({
                        _sum: {
                            amount: true,
                        },
                        where: {
                            ticket: {
                                eventSlot: {
                                    event: {
                                        organiserId,
                                    },
                                },
                            },
                            type: "PURCHASE",
                        },
                    }),
                ]);

            return res.status(200).json({
                data: {
                    totalEvents,
                    totalPublished,
                    totalRevenue: (totalRevenueAgg._sum.amount as any) || 0,
                    totalTicketsSold,
                },
                message: "Analytics fetched successfully",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : error,
                message: "Internal error occurred",
            });
        }
    },
);

/**
 * @route GET /events/
 * @desc  performing events by revenue or tickets sold
 * @query limit (number) default 5
 * @query sortBy 'revenue' | 'tickets'
 */
organiserRouter.get("/events/top", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string | undefined;
        if (!organiserId)
            return res.status(403).json({
                message: "Unauthenticated",
            });

        const limit = Math.max(1, parseInt((req.query.limit as string) || "5", 10));
        const sortBy = (req.query.sortBy as string) || "revenue";
        const orderByCol = sortBy === "tickets" ? `"ticketsSold"` : `"totalRevenue"`;

        const topEvents = (await db.$queryRawUnsafe(
            `
            SELECT 
                e.id AS "eventId",
                e.title AS "eventName",
                COALESCE(SUM(t."ticket_count"), 0) AS "ticketsSold",
                COALESCE(SUM(t.amount), 0) AS "totalRevenue"
            FROM "Transaction" t
            INNER JOIN "Ticket" tk ON t."ticketId" = tk.id
            INNER JOIN "EventSlot" es ON tk."eventSlotId" = es.id
            INNER JOIN "Event" e ON es."eventId" = e.id
            WHERE e."organiserId" = $1
                AND t.type = 'PURCHASE'
            GROUP BY e.id, e.title
            ORDER BY ${orderByCol} DESC
            LIMIT $2;
            `,
            organiserId,
            limit,
        )) as {
            eventId: string;
            eventName: string;
            ticketsSold: number;
            totalRevenue: number;
        }[];

        return res.status(200).json({
            data: topEvents,
            message: "Top performing events fetched successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : error,
            message: "Internal error occurred",
        });
    }
});

/**
 * @route GET /events/revenue
 * @desc Revenue trend for a given date range (daily totals)
 * @query startDate YYYY-MM-DD, endDate YYYY-MM-DD
 */
organiserRouter.get("/events/revenue", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string | undefined;
        if (!organiserId)
            return res.status(403).json({
                message: "Unauthenticated",
            });

        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                message: "startDate and endDate are required",
            });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);

        const txns = await db.transaction.findMany({
            orderBy: {
                created_at: "asc",
            },
            select: {
                amount: true,
                created_at: true,
            },
            where: {
                created_at: {
                    gte: start,
                    lte: end,
                },
                ticket: {
                    eventSlot: {
                        event: {
                            organiserId,
                        },
                    },
                },
                type: "PURCHASE",
            },
        });

        const dailyMap = new Map<string, number>();
        const dayCursor = new Date(start);
        while (dayCursor <= end) {
            const key = dayCursor.toISOString().slice(0, 10);
            dailyMap.set(key, 0);
            dayCursor.setDate(dayCursor.getDate() + 1);
        }

        txns.forEach((t) => {
            const key = t.created_at.toISOString().slice(0, 10);
            dailyMap.set(key, (dailyMap.get(key) || 0) + Number(t.amount));
        });

        const revenueData = Array.from(dailyMap.entries()).map(([date, amount]) => ({
            amount,
            date,
        }));

        return res.status(200).json({
            data: revenueData,
            message: "Revenue data fetched successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : error,
            message: "Internal error occurred",
        });
    }
});

/**
 * @route GET /balance
 * @desc Get organiser wallet balance
 */
organiserRouter.get("/balance", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId as string | undefined;
        if (!organiserId)
            return res.status(403).json({
                message: "Unauthenticated",
            });

        const wallet = await db.wallet.findUnique({
            include: {
                user: true,
            },
            where: {
                userId: organiserId,
            },
        });

        if (!wallet) {
            return res.status(404).json({
                message: "Wallet not found",
            });
        }

        return res.status(200).json({
            balance: wallet,
            message: `${wallet.user.first_name} balance is fetched`,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : error,
            message: "Internal error occurred",
        });
    }
});

organiserRouter.get("/:eventId/slots", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.organiserId;
        const { eventId } = req.params;

        const {
            location,
            capacity,
            event_date,
            sort,
            minPrice,
            maxPrice,
            page = "1",
            limit = "5",
        } = req.query;

        const pageNumber = Number(page);
        const pageSize = Number(limit);
        const skip = (pageNumber - 1) * pageSize;

        const event = await db.event.findUnique({
            select: {
                banner_url: true,
                category: true,
                description: true,
                genre: true,
                hero_image_url: true,
                id: true,
                is_online: true,
                language: true,
                organiserId: true,
                title: true,
            },
            where: {
                id: eventId,
            },
        });

        if (!event) {
            return res.status(404).json({
                message: "Event not found",
            });
        }

        if (event.organiserId !== user) {
            return res.status(401).json({
                message: "Unauthorized access",
            });
        }

        const slotWhere: Prisma.EventSlotWhereInput = {
            eventId,

            ...(location && {
                location_name: {
                    equals: String(location),
                    mode: "insensitive",
                },
            }),

            ...(capacity && {
                capacity: {
                    gte: Number(capacity),
                },
            }),

            ...(event_date && {
                event_date: {
                    gte: new Date(`${event_date}T00:00:00.000Z`),
                    lt: new Date(`${event_date}T23:59:59.999Z`),
                },
            }),

            ...(minPrice || maxPrice
                ? {
                      price: {
                          ...(minPrice && {
                              gte: Number(minPrice),
                          }),
                          ...(maxPrice && {
                              lte: Number(maxPrice),
                          }),
                      },
                  }
                : {}),
        };

        const orderBy: Prisma.EventSlotOrderByWithRelationInput[] = [];

        if (sort === "price-asc") {
            orderBy.push({
                price: "asc",
            });
        } else if (sort === "price-desc") {
            orderBy.push({
                price: "desc",
            });
        } else if (sort === "capacity-asc") {
            orderBy.push({
                capacity: "asc",
            });
        } else if (sort === "capacity-desc") {
            orderBy.push({
                capacity: "desc",
            });
        } else if (sort === "date-asc") {
            orderBy.push({
                event_date: "asc",
            });
        } else if (sort === "date-desc") {
            orderBy.push({
                event_date: "desc",
            });
        } else {
            orderBy.push({
                event_date: "asc",
            });
            orderBy.push({
                start_time: "asc",
            });
        }

        const [totalSlots, totalCapacity, totalBooked, filteredCount, slots] = await Promise.all([
            db.eventSlot.count({
                where: {
                    eventId,
                },
            }),

            db.eventSlot.aggregate({
                _sum: {
                    capacity: true,
                },
                where: {
                    eventId,
                },
            }),

            db.ticket.count({
                where: {
                    eventSlot: {
                        eventId,
                    },
                    is_valid: true,
                },
            }),

            db.eventSlot.count({
                where: slotWhere,
            }),

            db.eventSlot.findMany({
                include: {
                    _count: {
                        select: {
                            tickets: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: pageSize,
                where: slotWhere,
            }),
        ]);

        const formattedSlots = slots.map((slot) => ({
            booked: slot._count.tickets,
            capacity: slot.capacity,
            endTime: slot.end_time,
            eventDate: slot.event_date,
            id: slot.id,
            location: slot.location_name,
            locationUrl: slot.location_url,
            price: Number(slot.price),
            startTime: slot.start_time,
        }));

        return res.status(200).json({
            event,
            meta: {
                limit: pageSize,
                page: pageNumber,
                totalBooked,
                totalCapacity: totalCapacity._sum.capacity ?? 0,
                totalPages: Math.ceil(filteredCount / pageSize),
                totalSlots,
            },
            slots: formattedSlots,
        });
    } catch (error) {
        console.error("EVENT SLOT ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

organiserRouter.get("/:eventId/graph", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.organiserId;
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(422).json({
                message: "No EventId was provided",
            });
        }
        const findEvent = await db.event.findUnique({
            where: {
                id: eventId,
            },
        });

        if (!findEvent) {
            return res.status(404).json({
                message: "Invalid EventId was provided",
            });
        }

        if (findEvent.organiserId !== user) {
            return res.status(401).json({
                message: "You are unauthorized to access this event as it doesnt belong to you",
            });
        }

        const eventSlots = await db.eventSlot.findMany({
            where: {
                eventId: eventId,
            },
        });

        const groupedByLocation: Record<string, typeof eventSlots> = eventSlots.reduce(
            (acc, slot) => {
                const location = slot.location_name || "Unknown";
                if (!acc[location]) acc[location] = [];
                acc[location].push(slot);
                return acc;
            },
            {} as Record<string, typeof eventSlots>,
        );

        return res.status(200).json({
            data: {
                event: findEvent,
                slotsByLocation: groupedByLocation,
            },
            message: "Event slots grouped by location",
        });
    } catch (error) {
        console.error("EVENT SLOT GRAPH:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * @route GET /events/:eventId/tickets
 * @desc Number of tickets sold for a specific event (only PURCHASE transactions)
 */
organiserRouter.get(
    "/events/:eventId/tickets",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const organiserId = req.organiserId as string | undefined;
            if (!organiserId)
                return res.status(403).json({
                    message: "Unauthenticated",
                });

            const eventId = req.params.eventId;
            if (!eventId)
                return res.status(400).json({
                    message: "eventId required",
                });

            const totalSold = await db.ticket.count({
                where: {
                    eventSlot: {
                        event: {
                            organiserId,
                        },
                        eventId,
                    },
                    transactions: {
                        some: {
                            type: "PURCHASE",
                        },
                    },
                },
            });

            return res.status(200).json({
                message: `Number of tickets sold for ${eventId}`,
                ticketSold: totalSold,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : error,
                message: "Internal error occurred",
            });
        }
    },
);

/**
 * @route GET /events/:eventId
 * @desc Get event info (and number of slots)
 */
organiserRouter.get(
    "/events/:eventId",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const organiserId = req.organiserId as string | undefined;
            if (!organiserId)
                return res.status(403).json({
                    message: "Unauthenticated",
                });

            const eventId = req.params.eventId;
            if (!eventId)
                return res.status(400).json({
                    message: "eventId required",
                });

            const event = await db.event.findFirst({
                include: {
                    slots: true,
                },
                where: {
                    id: eventId,
                    organiserId,
                },
            });

            if (!event) {
                return res.status(404).json({
                    message: "Event not found",
                });
            }

            return res.status(200).json({
                event: {
                    banner_url: event.banner_url,
                    created_at: event.created_at,
                    hero_image_url: event.hero_image_url,
                    id: event.id,
                    slotCount: event.slots.length,
                    status: event.status,
                    title: event.title,
                },
                message: "Event fetched",
                slots: event.slots,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : error,
                message: "Internal error occurred",
            });
        }
    },
);

organiserRouter.get(
    "/:eventId/:slotId",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const organiserId = req.organiserId;
            const { eventId, slotId } = req.params;
            const event = await db.event.findUnique({
                include: {
                    organiser: {
                        select: {
                            email: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                },
                where: {
                    id: eventId,
                },
            });

            if (!event) {
                return res.status(404).json({
                    message: "Invalid event id",
                });
            }

            if (event.organiserId !== organiserId) {
                return res.status(401).json({
                    message: "Unauthorized to download this sheet",
                });
            }

            const slot = await db.eventSlot.findUnique({
                where: {
                    id: slotId,
                },
            });

            if (!slot) {
                return res.status(404).json({
                    message: "Invalid slot id",
                });
            }

            const tickets = await db.ticket.findMany({
                include: {
                    transactions: true,
                    user: true,
                    verifications: {
                        include: {
                            verifier: true,
                        },
                    },
                },
                where: {
                    eventSlotId: slotId,
                },
            });

            const workbook = new excel.Workbook();
            const exportTimestamp = new Date().toLocaleString();
            const sheet1 = workbook.addWorksheet("Ticket List");

            sheet1.addRow([
                "Event Title:",
                event.title,
                "",
                "Organiser:",
                `${event.organiser.first_name} ${event.organiser.last_name}`,
            ]);

            sheet1.addRow([
                "Exported At:",
                exportTimestamp,
            ]);

            sheet1.addRow([]);
            sheet1.addRow([]);

            sheet1.columns = [
                {
                    header: "Ticket ID",
                    key: "ticketId",
                    width: 36,
                },
                {
                    header: "Full Name",
                    key: "name",
                    width: 25,
                },
                {
                    header: "Email",
                    key: "email",
                    width: 28,
                },
                {
                    header: "Phone",
                    key: "phone",
                    width: 15,
                },
                {
                    header: "City",
                    key: "city",
                    width: 15,
                },
                {
                    header: "Status",
                    key: "status",
                    width: 15,
                },
                {
                    header: "Valid",
                    key: "valid",
                    width: 10,
                },
                {
                    header: "Verified",
                    key: "verified",
                    width: 10,
                },
                {
                    header: "Issued At",
                    key: "issuedAt",
                    width: 22,
                },
                {
                    header: "Verified By",
                    key: "verifiedBy",
                    width: 25,
                },
                {
                    header: "Verification Time",
                    key: "verificationTime",
                    width: 25,
                },
            ];

            sheet1.getRow(5).font = {
                bold: true,
            };

            tickets.forEach((ticket) => {
                sheet1.addRow({
                    city: ticket.user.city ?? "N/A",
                    email: ticket.user.email,
                    issuedAt: ticket.issued_at,
                    name: `${ticket.user.first_name} ${ticket.user.last_name}`,
                    phone: ticket.user.phone_number ?? "N/A",
                    status: ticket.status,
                    ticketId: ticket.id,
                    valid: ticket.is_valid ? "Yes" : "No",
                    verificationTime: ticket.verifications[0]?.verification_time ?? "N/A",
                    verified: ticket.is_verified ? "Yes" : "No",
                    verifiedBy: ticket.verifications[0]
                        ? `${ticket.verifications[0].verifier.first_name} ${ticket.verifications[0].verifier.last_name}`
                        : "N/A",
                });
            });

            sheet1.views = [
                {
                    state: "frozen",
                    ySplit: 5,
                },
            ];

            const sheet2 = workbook.addWorksheet("Revenue & Stats");

            const totalTickets = tickets.length;
            const verifiedTickets = tickets.filter((t) => t.is_verified).length;
            const usedTickets = tickets.filter((t) => t.status === "USED").length;
            const cancelledTickets = tickets.filter((t) => t.status === "CANCELLED").length;

            let totalRevenue = 0;
            tickets.forEach((t) => {
                t.transactions.forEach((trx) => {
                    if (trx.type === "PURCHASE") {
                        totalRevenue += Number(trx.amount);
                    }
                });
            });

            const occupancy =
                slot.capacity > 0 ? ((totalTickets / slot.capacity) * 100).toFixed(2) : 0;

            sheet2.addRow([
                "Event Metadata",
            ]);
            sheet2.getRow(1).font = {
                bold: true,
            };
            sheet2.addRow([
                "Title",
                event.title,
            ]);
            sheet2.addRow([
                "Category",
                event.category,
            ]);
            sheet2.addRow([
                "Status",
                event.status,
            ]);
            sheet2.addRow([
                "Slot Date",
                slot.event_date,
            ]);
            sheet2.addRow([
                "Location",
                slot.location_name,
            ]);
            sheet2.addRow([]);

            sheet2.addRow([
                "Statistics",
            ]);
            sheet2.getRow(sheet2.lastRow?.number).font = {
                bold: true,
            };

            sheet2.addRow([
                "Total Tickets",
                totalTickets,
            ]);
            sheet2.addRow([
                "Verified Tickets",
                verifiedTickets,
            ]);
            sheet2.addRow([
                "Used Tickets",
                usedTickets,
            ]);
            sheet2.addRow([
                "Cancelled Tickets",
                cancelledTickets,
            ]);
            sheet2.addRow([
                "Capacity",
                slot.capacity,
            ]);
            sheet2.addRow([
                "Occupancy %",
                `${occupancy}%`,
            ]);
            sheet2.addRow([
                "Total Revenue",
                totalRevenue,
            ]);

            const sheet3 = workbook.addWorksheet("Verifier Activity");

            sheet3.columns = [
                {
                    header: "Ticket ID",
                    key: "ticketId",
                    width: 36,
                },
                {
                    header: "Verifier Name",
                    key: "verifier",
                    width: 25,
                },
                {
                    header: "Verification Time",
                    key: "time",
                    width: 25,
                },
                {
                    header: "Success",
                    key: "success",
                    width: 15,
                },
                {
                    header: "Remarks",
                    key: "remarks",
                    width: 30,
                },
            ];

            sheet3.getRow(1).font = {
                bold: true,
            };

            tickets.forEach((ticket) => {
                ticket.verifications.forEach((v) => {
                    sheet3.addRow({
                        remarks: v.remarks ?? "N/A",
                        success: v.is_successful ? "Yes" : "No",
                        ticketId: ticket.id,
                        time: v.verification_time,
                        verifier: `${v.verifier.first_name} ${v.verifier.last_name}`,
                    });
                });
            });

            sheet3.views = [
                {
                    state: "frozen",
                    ySplit: 1,
                },
            ];

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${event.title}-slot-report.xlsx`,
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : error,
                message: "Internal error occurred",
            });
        }
    },
);

export default organiserRouter;
