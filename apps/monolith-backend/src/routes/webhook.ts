import redisCache from "@repo/cache";
import db from "@repo/db";
import { DepositSchema, type WithdrawResponse } from "@repo/types";
import express, { type Request, type Response, type Router } from "express";

const webhookRouter: Router = express.Router();

interface TransactionErrorResponse {
    message?: string;
    errors?: unknown;
    error?: string;
}

const client = redisCache;
const Queue_name = "transactions:pending";

/**
 * Deposits amount into the card.
 * @route POST /transaction/deposit
 * @body {string} token - Transaction token.
 * @returns {201|400|500} JSON response with message or errors.
 */
webhookRouter.post(
    "/deposit",
    async (req: Request, res: Response<WithdrawResponse | TransactionErrorResponse>) => {
        try {
            const parsedData = DepositSchema.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    errors: parsedData.error.flatten(),
                    message: "Invalid data was provided",
                });
            }
            const { token } = parsedData.data;

            const findDetails = await db.transaction.findUnique({
                where: {
                    token: token,
                },
            });

            if (!findDetails) {
                return res.status(400).json({
                    message: "Invalid token was provided",
                });
            }
            if (findDetails.type === "DEPOSIT") {
                return res.status(400).json({
                    message: "Transaction already processed",
                });
            }

            await client.rPush(
                Queue_name,
                JSON.stringify({
                    amount: findDetails.amount,
                    cardId: findDetails.cardId,
                    token,
                    transactionId: findDetails.id,
                    type: "DEPOSIT",
                    userId: findDetails.userId,
                }),
            );

            return res.status(201).json({
                message: "Deposit queued for processing by worker",
            });
        } catch (_error: any) {
            console.error(_error);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

/**
 * Withdraws amount from the card.
 * @route POST /transaction/withdraw
 * @body {string} token - Transaction token.
 * @returns {201|400|404|500} JSON response with message or errors.
 */
webhookRouter.post("/withdraw", async (req: Request, res: Response) => {
    try {
        const parsedData = DepositSchema.safeParse(req.body);

        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.flatten(),
                message: "Invalid data was provided",
            });
        }

        const { token } = parsedData.data;
        const findDetails = await db.transaction.findUnique({
            where: {
                token,
            },
        });

        if (!findDetails) {
            return res.status(400).json({
                message: "Invalid token was provided",
            });
        }

        if (findDetails.type === "WITHDRAWAL") {
            return res.status(400).json({
                message: "Transaction already processed",
            });
        }
        await redisCache.rPush(
            Queue_name,
            JSON.stringify({
                amount: findDetails.amount,
                cardId: findDetails.cardId,
                token,
                transactionId: findDetails.id,
                type: "WITHDRAWAL",
                userId: findDetails.userId,
            }),
        );

        return res.status(201).json({
            message: "Withdraw queued for processing by worker",
        });
    } catch (error: any) {
        console.error(error);
        if (error instanceof Error) {
            if (error.message === "Card not found") {
                return res.status(404).json({
                    error: "Card not found",
                });
            } else if (error.message === "Insufficient balance") {
                return res.status(400).json({
                    error: "Insufficient balance",
                });
            }
        }
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

webhookRouter.post("/refund", async (req: Request, res: Response) => {
    try {
        const parsedData = DepositSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.flatten(),
                message: "Invalid data was provided",
            });
        }
        const { token } = parsedData.data;
        const findDetails = await db.transaction.findUnique({
            where: {
                token,
            },
        });

        if (!findDetails) {
            return res.status(400).json({
                message: "Invalid token was provided",
            });
        }

        if (findDetails.type === "REFUND") {
            return res.status(400).json({
                message: "Refund already processed",
            });
        }

        await redisCache.rPush(
            Queue_name,
            JSON.stringify({
                amount: findDetails.amount.toString(),
                cardId: findDetails.cardId,
                token,
                transactionId: findDetails.id,
                type: "REFUND",
                userId: findDetails.userId,
            }),
        );
        return res.status(201).json({
            message: "Refund queued for processing by worker",
        });
    } catch (_error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

webhookRouter.post("/payout", async (req: Request, res: Response) => {
    try {
        const parsedData = DepositSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).json({
                errors: parsedData.error.flatten(),
                message: "Invalid data was provided",
            });
        }
        const { token } = parsedData.data;

        const findDetails = await db.transaction.findUnique({
            where: {
                token,
            },
        });

        if (!findDetails) {
            return res.status(400).json({
                message: "Invalid token was provided",
            });
        }

        if (findDetails.type === "PAYOUT") {
            return res.status(400).json({
                message: "Payout already processed",
            });
        }
        await client.rPush(
            Queue_name,
            JSON.stringify({
                amount: findDetails.amount.toString(),
                cardId: findDetails.cardId,
                token,
                transactionId: findDetails.id,
                type: "PAYOUT",
                userId: findDetails.userId,
            }),
        );

        return res.status(201).json({
            message: "Payout queued for processing by worker",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

export default webhookRouter;