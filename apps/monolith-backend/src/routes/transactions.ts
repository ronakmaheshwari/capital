import db, { type Prisma } from "@repo/db";
import { AlphanumericOTP } from "@repo/notifications";
import { InitiateSchema } from "@repo/types";
import Decimal from "decimal.js";
import express, { type Request, type Response, type Router } from "express";
import userMiddleware from "../middleware";

const transactionRouter: Router = express.Router();

/**
 * GET /transactions/my
 * Get all transactions of the user
 */
transactionRouter.get("/my", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const transactions = await db.transaction.findMany({
            orderBy: {
                created_at: "desc",
            },
            select: {
                amount: true,
                bank_name: true,
                canceled_at: true,

                card: {
                    select: {
                        bank_name: true,
                        card_number: true,
                        id: true,
                    },
                },
                cardId: true,
                created_at: true,
                description: true,
                id: true,
                ticket: {
                    select: {
                        eventSlot: {
                            select: {
                                capacity: true,
                                end_time: true,
                                eventId: true,
                                id: true,
                                price: true,
                                start_time: true,
                            },
                        },
                        eventSlotId: true,
                        id: true,
                        is_valid: true,
                        issued_at: true,
                        qr_code_data: true,
                        scanned_at: true,
                        scannedById: true,
                        signature: true,
                    },
                },
                ticket_count: true,
                ticketId: true,
                token: true,
                type: true,
                wallet: true,
                walletId: true,
            },
            where: {
                userId,
            },
        });

        return res.status(200).json({
            transactions,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

transactionRouter.get("/token", async (_req: Request, res: Response) => {
    try {
        const token = AlphanumericOTP(6);
        return res.status(200).json({
            token,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * GET /transactions/:txnId
 * Get transaction details by ID
 */
transactionRouter.get("/:txnId", userMiddleware, async (req: Request, res: Response) => {
    try {
        const { txnId } = req.params;
        const userId = req.userId;

        const transaction = await db.transaction.findUnique({
            select: {
                amount: true,
                bank_name: true,
                canceled_at: true,
                card: {
                    select: {
                        balance: true,
                        bank_name: true,
                        card_number: true,
                        created_at: true,
                        id: true,
                    },
                },
                cardId: true,
                created_at: true,
                description: true,
                id: true,
                ticket: {
                    select: {
                        eventSlot: {
                            select: {
                                end_time: true,
                                eventId: true,
                                id: true,
                                price: true,
                                start_time: true,
                            },
                        },
                        eventSlotId: true,
                        id: true,
                        is_valid: true,
                        issued_at: true,
                        qr_code_data: true,
                        scanned_at: true,
                        scannedById: true,
                        signature: true,
                    },
                },
                ticket_count: true,
                ticketId: true,
                token: true,
                type: true,

                user: {
                    select: {
                        created_at: true,
                        email: true,
                        first_name: true,
                        is_verified: true,
                        last_name: true,
                        profile_image_url: true,
                        role: true,
                    },
                },
                wallet: true,
                walletId: true,
            },
            where: {
                id: txnId,
            },
        });

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found",
            });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            return res.status(403).json({
                message: "User not found",
            });
        }

        if (user.role !== "admin" && transaction.user.email !== user.email) {
            return res.status(403).json({
                message: "Forbidden",
            });
        }

        return res.status(200).json(transaction);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Initiates a transaction.
 * @route POST /transaction/initiate
 * @body {string} token - Transaction token.
 * @body {string} amount - Amount (2-4 digits).
 * @body {string} cardNumber - Card in format 1234-5678-9012-1234.
 * @body {string} [bankName] - Optional bank name.
 * @returns {200|400|500} JSON response with message or errors.
 */
transactionRouter.post("/initiate", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const parsedData = InitiateSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.flatten(),
                message: "Invalid data was provided",
            });
        }
        const { token, amount, cardNumber } = parsedData.data;

        const Amount = new Decimal(amount);
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            if (Amount.lessThanOrEqualTo(0)) {
                throw new Error("Amount must be greater than zero");
            }
            const checkCard = await tx.card.findUnique({
                where: {
                    card_number: cardNumber,
                    userId,
                },
            });
            if (!checkCard) {
                throw new Error("Invalid card was provided");
            }
            await tx.transaction.create({
                data: {
                    amount,
                    bank_name: checkCard.bank_name,
                    cardId: checkCard.id,
                    token,
                    type: "Initiate",
                    userId: checkCard.userId,
                },
            });
        });
        return res.status(200).json({
            message: "Transaction was successfully initialized",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Internal server error",
            message: "Internal server error",
        });
    }
});

export default transactionRouter;
