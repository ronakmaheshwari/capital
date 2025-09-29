// Transaction routes

import db from "@repo/db";
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

export default transactionRouter;
