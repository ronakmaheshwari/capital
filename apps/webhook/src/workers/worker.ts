import redisCache, { initRedis } from "@repo/cache";
import db, { type Prisma, type TransactionType } from "@repo/db";
import Decimal from "decimal.js";

const _client = redisCache;

const QUEUE_NAME = "transactions:pending";
const PROCESS_QUEUE = "transactions:processing";
const FAILED_QUEUE = "transactions:failed";

const MAX_ATTEMPTS = 3;

interface JobInterface {
    amount: string;
    cardId: string;
    token: string;
    transactionId: string;
    type: TransactionType;
    userId: string;
    attempts?: number;
}

async function redisStarter(): Promise<void> {
    await initRedis();
}

async function processJob(): Promise<void> {
    while (true) {
        let job: string | null = null;
        let jobValue: JobInterface | undefined;

        try {
            job = (await _client.brPopLPush(
                QUEUE_NAME,
                PROCESS_QUEUE,
                0,
            ))?.toString() ?? null;

            if (!job) {
                continue;
            }

            jobValue = JSON.parse(job) as JobInterface;

            jobValue.attempts = jobValue.attempts ?? 0;

            validateJob(jobValue);

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
                    throw new Error(
                        `Unknown job type: ${jobValue.type}`,
                    );
            }
            await _client.lRem(PROCESS_QUEUE, 1, job);
        } catch (error) {
            console.error("Transaction job failed:", error);
            if (!jobValue || !job) {
                if (job) {
                    await _client.lRem(
                        PROCESS_QUEUE,
                        1,
                        job,
                    );
                }

                continue;
            }

            jobValue.attempts = (jobValue.attempts ?? 0) + 1;

            try {
                if (jobValue.attempts < MAX_ATTEMPTS) {
                    const delay =
                        2 ** jobValue.attempts * 1000;

                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, delay);
                    });

                    await _client.lPush(
                        QUEUE_NAME,
                        JSON.stringify(jobValue),
                    );
                } else {
                    await _client.lPush(
                        FAILED_QUEUE,
                        JSON.stringify(jobValue),
                    );

                    if (jobValue.transactionId) {
                        await db.transaction.updateMany({
                            where: {
                                id: jobValue.transactionId,
                                type: {
                                    not: "REFUND",
                                },
                            },
                            data: {
                                canceled_at: new Date(),
                                type: "CANCEL",
                            },
                        });
                    }
                }
            } catch (queueError) {
                console.error(
                    "Failed to handle failed transaction job:",
                    queueError,
                );
            }

            try {
                await _client.lRem(
                    PROCESS_QUEUE,
                    1,
                    job,
                );
            } catch (removeError) {
                console.error(
                    "Failed to remove job from processing queue:",
                    removeError,
                );
            }
        }
    }
}

function validateJob(job: JobInterface): void {
    if (!job.transactionId) {
        throw new Error("transactionId is required");
    }

    if (!job.cardId) {
        throw new Error("cardId is required");
    }

    if (!job.userId) {
        throw new Error("userId is required");
    }

    if (!job.amount) {
        throw new Error("amount is required");
    }

    const amount = new Decimal(job.amount);

    if (!amount.isFinite()) {
        throw new Error("Invalid transaction amount");
    }

    if (amount.lessThanOrEqualTo(0)) {
        throw new Error(
            "Transaction amount must be greater than zero",
        );
    }
}

export async function depositMoney(
    job: JobInterface,
): Promise<{ message: string }> {
    try {
        const depositAmount = new Decimal(job.amount);

        if (
            !depositAmount.isFinite() ||
            depositAmount.lessThanOrEqualTo(0)
        ) {
            throw new Error("Invalid deposit amount");
        }

        await db.$transaction(
            async (tx: Prisma.TransactionClient) => {

                const card = await tx.card.findUnique({
                    where: {
                        id: job.cardId,
                    },
                    select: {
                        id: true,
                        userId: true,
                    },
                });

                if (!card) {
                    throw new Error("Card not found");
                }

                if (card.userId !== job.userId) {
                    throw new Error(
                        "Card does not belong to this user",
                    );
                }

                await tx.card.update({
                    where: {
                        id: card.id,
                    },
                    data: {
                        balance: {
                            increment: depositAmount.toFixed(2),
                        },
                    },
                });

                const transaction =
                    await tx.transaction.updateMany({
                        where: {
                            id: job.transactionId,
                            type: "Initiate",
                        },
                        data: {
                            type: "DEPOSIT",
                        },
                    });

                if (transaction.count !== 1) {
                    throw new Error(
                        "Deposit transaction is invalid or already processed",
                    );
                }
            },
        );

        return {
            message: "Deposit successful",
        };
    } catch (error) {
        console.error(
            "Internal error occurred during deposit:",
            error,
        );
        throw error;
    }
}

/**
 * Withdraw money from a card.
 */
export async function withdrawMoney(
    job: JobInterface,
): Promise<{ message: string }> {
    try {
        const withdrawAmount = new Decimal(job.amount);

        if (
            !withdrawAmount.isFinite() ||
            withdrawAmount.lessThanOrEqualTo(0)
        ) {
            throw new Error("Invalid withdrawal amount");
        }

        await db.$transaction(
            async (tx: Prisma.TransactionClient) => {

                const card = await tx.card.findUnique({
                    where: {
                        id: job.cardId,
                    },
                    select: {
                        id: true,
                        userId: true,
                        balance: true,
                    },
                });

                if (!card) {
                    throw new Error("Card not found");
                }

                if (card.userId !== job.userId) {
                    throw new Error(
                        "Card does not belong to this user",
                    );
                }

                const currentBalance = new Decimal(
                    card.balance,
                );

                if (
                    currentBalance.lessThan(
                        withdrawAmount,
                    )
                ) {
                    throw new Error(
                        "Insufficient balance for withdrawal",
                    );
                }

                await tx.card.update({
                    where: {
                        id: card.id,
                    },
                    data: {
                        balance: {
                            decrement:
                                withdrawAmount.toFixed(2),
                        },
                    },
                });

                const transaction =
                    await tx.transaction.updateMany({
                        where: {
                            id: job.transactionId,
                            type: "Initiate",
                        },
                        data: {
                            type: "WITHDRAWAL",
                        },
                    });

                if (transaction.count !== 1) {
                    throw new Error(
                        "Withdrawal transaction is invalid or already processed",
                    );
                }
            },
        );

        return {
            message: "Withdraw successful",
        };
    } catch (error) {
        console.error(
            "Internal error occurred during withdrawal:",
            error,
        );

        throw error;
    }
}

export async function payoutMoney(
    job: JobInterface,
): Promise<{ message: string }> {
    try {
        const amount = new Decimal(job.amount);

        if (
            !amount.isFinite() ||
            amount.lessThanOrEqualTo(0)
        ) {
            throw new Error("Invalid payout amount");
        }

        if (!job.token) {
            throw new Error("Payout token is required");
        }

        await db.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const wallet = await tx.wallet.findUnique({
                    where: {
                        userId: job.userId,
                    },
                    select: {
                        id: true,
                        userId: true,
                        balance: true,
                        status: true,
                    },
                });

                if (!wallet) {
                    throw new Error("Wallet not found");
                }

                if (wallet.status !== "active") {
                    throw new Error(
                        "Wallet is not active",
                    );
                }

                const walletBalance = new Decimal(
                    wallet.balance,
                );

                if (
                    walletBalance.lessThan(amount)
                ) {
                    throw new Error(
                        "Insufficient wallet balance",
                    );
                }

                const card = await tx.card.findUnique({
                    where: {
                        id: job.cardId,
                    },
                    select: {
                        id: true,
                        userId: true,
                    },
                });

                if (!card) {
                    throw new Error("Card not found");
                }

                if (card.userId !== job.userId) {
                    throw new Error(
                        "Card does not belong to this user",
                    );
                }

                await tx.wallet.update({
                    where: {
                        id: wallet.id,
                    },
                    data: {
                        balance: {
                            decrement: amount.toFixed(2),
                        },
                        lastPayoutAt: new Date(),
                    },
                });

                await tx.card.update({
                    where: {
                        id: card.id,
                    },
                    data: {
                        balance: {
                            increment: amount.toFixed(2),
                        },
                    },
                });

                const transaction =
                    await tx.transaction.updateMany({
                        where: {
                            token: job.token,
                            type: "Initiate",
                        },
                        data: {
                            type: "PAYOUT",
                        },
                    });

                if (transaction.count !== 1) {
                    throw new Error(
                        "Payout transaction is invalid or already processed",
                    );
                }
            },
        );

        return {
            message: "Payout successful",
        };
    } catch (error) {
        console.error(
            "Internal error occurred during payout:",
            error,
        );

        throw error;
    }
}

export async function refundMoney(
    job: JobInterface,
): Promise<{ message: string }> {
    try {
        const amount = new Decimal(job.amount);

        if (
            !amount.isFinite() ||
            amount.lessThanOrEqualTo(0)
        ) {
            throw new Error("Invalid refund amount");
        }

        await db.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const transaction =
                    await tx.transaction.findUnique({
                        where: {
                            id: job.transactionId,
                        },
                        select: {
                            id: true,
                            type: true,
                            canceled_at: true,
                            amount: true,
                            cardId: true,
                            ticket_count: true,

                            ticket: {
                                select: {
                                    id: true,
                                    eventSlotId: true,

                                    eventSlot: {
                                        select: {
                                            id: true,

                                            event: {
                                                select: {
                                                    organiserId:
                                                        true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    });

                if (!transaction) {
                    throw new Error(
                        "Original transaction not found",
                    );
                }

                if (transaction.type !== "PURCHASE") {
                    throw new Error(
                        `Transaction cannot be refunded because its type is ${transaction.type}`,
                    );
                }

                if (!transaction.ticket) {
                    throw new Error(
                        "Ticket no longer exists",
                    );
                }

                const organiserId =
                    transaction.ticket.eventSlot.event
                        .organiserId;

                if (!organiserId) {
                    throw new Error(
                        "Organiser not found",
                    );
                }

                const ticketCount =
                    transaction.ticket_count ?? 1;

                if (ticketCount <= 0) {
                    throw new Error(
                        "Invalid ticket count",
                    );
                }

                const organiserWallet =
                    await tx.wallet.findUnique({
                        where: {
                            userId: organiserId,
                        },
                        select: {
                            id: true,
                            balance: true,
                            status: true,
                        },
                    });

                if (!organiserWallet) {
                    throw new Error(
                        "Organiser wallet not found",
                    );
                }

                if (
                    organiserWallet.status !==
                    "active"
                ) {
                    throw new Error(
                        "Organiser wallet is not active",
                    );
                }

                const organiserBalance =
                    new Decimal(
                        organiserWallet.balance,
                    );

                if (
                    organiserBalance.lessThan(amount)
                ) {
                    throw new Error(
                        "Organiser does not have enough balance to process refund",
                    );
                }

                const card =
                    await tx.card.findUnique({
                        where: {
                            id: job.cardId,
                        },
                        select: {
                            id: true,
                            userId: true,
                            balance: true,
                        },
                    });

                if (!card) {
                    throw new Error(
                        "User card not found",
                    );
                }

                if (
                    card.userId !== job.userId
                ) {
                    throw new Error(
                        "Card does not belong to this user",
                    );
                }

                if (
                    transaction.cardId !== card.id
                ) {
                    throw new Error(
                        "Refund card does not match original transaction",
                    );
                }

                const originalAmount =
                    new Decimal(
                        transaction.amount,
                    );

                if (
                    amount.greaterThan(
                        originalAmount,
                    )
                ) {
                    throw new Error(
                        "Refund amount cannot exceed original transaction amount",
                    );
                }

                await tx.wallet.update({
                    where: {
                        id: organiserWallet.id,
                    },
                    data: {
                        balance: {
                            decrement:
                                amount.toFixed(2),
                        },
                    },
                });

                await tx.card.update({
                    where: {
                        id: card.id,
                    },
                    data: {
                        balance: {
                            increment:
                                amount.toFixed(2),
                        },
                    },
                });

                const refundUpdate =
                    await tx.transaction.updateMany({
                        where: {
                            id: transaction.id,
                            type: "PURCHASE",
                        },
                        data: {
                            canceled_at: new Date(),
                            type: "REFUND",
                        },
                    });

                if (
                    refundUpdate.count !== 1
                ) {
                    throw new Error(
                        "Refund was already processed",
                    );
                }

                await tx.eventSlot.update({
                    where: {
                        id: transaction.ticket
                            .eventSlotId,
                    },
                    data: {
                        capacity: {
                            increment: ticketCount,
                        },
                    },
                });
                await tx.ticket.delete({
                    where: {
                        id: transaction.ticket.id,
                    },
                });
            },
        );

        return {
            message: "Refund successful",
        };
    } catch (error) {
        console.error(
            "Internal error occurred during refund:",
            error,
        );

        throw error;
    }
}

/**
 * Start worker.
 */
async function main(): Promise<void> {
    try {
        await redisStarter();

        console.log(
            `Transaction worker started. Listening on ${QUEUE_NAME}`,
        );

        await processJob();
    } catch (error) {
        console.error(
            "Transaction worker failed to start:",
            error,
        );

        process.exit(1);
    }
}

void main();