import redisCache, { initRedis } from "@repo/cache";
import db, { type Prisma, type TransactionType } from "@repo/db";
import Decimal from "decimal.js";

const _client = redisCache;
const Queue_name = "transactions:pending";
const Process_Queue = "transactions:processing";
const Failed_Queue = "transactions:failed";
const MAX_ATTEMPTS = 3;

interface jobInterface {
    amount: string;
    cardId: string;
    token: string;
    transactionId: string;
    type: TransactionType;
    userId: string;
    attempts?: number;
}

async function RedisStarter() {
    await initRedis();
}

RedisStarter();

async function processJob() {
    while (true) {
        const job = await _client.brPopLPush(Queue_name, Process_Queue, 0);
        if (!job) continue;

        let jobValue: jobInterface;

        try {
            jobValue = JSON.parse(job.toString());
            jobValue.attempts = jobValue.attempts || 0;

            switch (jobValue.type) {
                case "DEPOSIT":
                    await depositMoney(jobValue);
                    break;
                case "WITHDRAWAL":
                    await withdrawMoney(jobValue);
                    break;
                case "REFUND":
                    await refundMoney(jobValue);
                    break;
                case "PAYOUT":
                    await payoutMoney(jobValue);
                    break;
                default:
                    throw new Error(`Unknown job type: ${jobValue.type}`);
            }

            await _client.lRem(Process_Queue, 1, job);
        } catch (err) {
            console.error(" Job failed:", err);

            if (jobValue) {
                jobValue.attempts = (jobValue.attempts || 0) + 1;
                if (jobValue.attempts < MAX_ATTEMPTS) {
                    const delay = 2 ** jobValue.attempts * 1000;
                    await new Promise((res) => setTimeout(res, delay));
                    await _client.lPush(Queue_name, JSON.stringify(jobValue));
                } else {
                    await _client.lPush(Failed_Queue, JSON.stringify(jobValue));

                    if (jobValue?.transactionId) {
                        await db.transaction.update({
                            data: {
                                canceled_at: new Date().toISOString(),
                                type: "CANCEL",
                            },
                            where: {
                                id: jobValue.transactionId,
                            },
                        });
                    }
                }
            }

            await _client.lRem(Process_Queue, 1, job);
        }
    }
}

export async function depositMoney(job: jobInterface) {
    try {
        const depositAmount = new Decimal(job.amount);
        const _result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.card.update({
                data: {
                    balance: {
                        increment: depositAmount,
                    },
                },
                where: {
                    id: job.cardId,
                },
            });

            await tx.transaction.update({
                data: {
                    type: "DEPOSIT",
                },
                where: {
                    id: job.transactionId,
                },
            });

            return {
                message: "Deposit successful",
            };
        });
    } catch (error) {
        console.error("Internal error occured", error);
    }
}

export async function withdrawMoney(job: jobInterface) {
    try {
        const withdrawAmount = new Decimal(job.amount);

        const _result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            const card = await tx.card.update({
                data: {
                    balance: {
                        decrement: withdrawAmount,
                    },
                },
                where: {
                    id: job.cardId,
                },
            });

            if (new Decimal(card.balance).lessThan(withdrawAmount)) {
                throw new Error("Insufficient balance for withdrawal");
            }

            await tx.transaction.update({
                data: {
                    type: "WITHDRAWAL",
                },
                where: {
                    id: job.transactionId,
                },
            });

            return {
                message: "Withdraw successful",
            };
        });
    } catch (error) {
        console.error("Internal error occured", error);
    }
}

export async function payoutMoney(job: jobInterface) {
    try {
        const amount = new Decimal(job.amount);
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.wallet.update({
                data: {
                    balance: {
                        decrement: amount,
                    },
                    lastPayoutAt: new Date(Date.now()),
                },
                where: {
                    userId: job.userId,
                },
            }),
                await tx.card.update({
                    data: {
                        balance: {
                            increment: amount,
                        },
                    },
                    where: {
                        id: job.cardId,
                        // userId: job.userId,
                    },
                });
            await tx.transaction.update({
                data: {
                    type: "PAYOUT",
                },
                where: {
                    token: job.token,
                },
            });
        });
        return {
            message: "Payout successful",
        };
    } catch (error) {
        console.error("Internal error occured", error);
    }
}

export async function refundMoney(job: jobInterface) {
    try {
        const amount = new Decimal(job.amount);
        const originalTransaction = await db.transaction.findUnique({
            include: {
                ticket: {
                    select: {
                        eventSlot: {
                            select: {
                                event: {
                                    select: {
                                        organiserId: true,
                                    },
                                },
                                id: true,
                            },
                        },
                        id: true,
                    },
                },
            },
            where: {
                id: job.transactionId,
            },
        });

        if (!originalTransaction || !originalTransaction.ticket) {
            throw new Error("Original transaction or ticket not found");
        }

        const organiserId = originalTransaction.ticket.eventSlot.event.organiserId;
        const organiserWallet = await db.wallet.findUnique({
            where: {
                userId: organiserId,
            },
        });

        if (!organiserWallet) {
            throw new Error("Organiser wallet not found");
        }

        if (new Decimal(organiserWallet.balance).lessThan(amount)) {
            throw new Error("Organiser does not have enough balance to process refund");
        }

        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.wallet.update({
                data: {
                    balance: {
                        decrement: amount,
                    },
                },
                where: {
                    id: organiserWallet.id,
                },
            });

            await tx.card.update({
                data: {
                    balance: {
                        increment: amount,
                    },
                },
                where: {
                    id: job.cardId,
                },
            });

            await tx.transaction.update({
                data: {
                    canceled_at: new Date(),
                    type: "REFUND",
                },
                where: {
                    id: job.transactionId,
                },
            });

            await tx.eventSlot.update({
                data: {
                    capacity: {
                        increment: originalTransaction.ticket_count,
                    },
                },
                where: {
                    id: originalTransaction.ticket.eventSlot.id,
                },
            });

            await tx.ticket.delete({
                where: {
                    id: originalTransaction.ticket.id,
                },
            });
        });
        return {
            message: "Refund successful",
        };
    } catch (error) {
        console.error("Internal error occurred during refund:", error);
    }
}

processJob();
