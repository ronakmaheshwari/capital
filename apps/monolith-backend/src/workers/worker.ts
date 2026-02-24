import database, { type Prisma, type TransactionType } from "@repo/monolith-db";
import { sendEmailOtp } from "@repo/notifications";
import Decimal from "decimal.js";

const MAX_RETRIES = 5;
const BASE_DELAY = 2;
const POLL_INTERVAL = 3000;

interface TransactionJob {
    amount: string;
    cardId: string;
    token?: string;
    transactionId: string;
    type: TransactionType;
    userId: string;
    attempt?: number;
}

interface OTPJob {
    email: string;
    otp: string;
    attempt?: number;
}

export async function otpQueueInsert(email, otp) {
    try {
        await database.$executeRawUnsafe(
            `SELECT pgmq.send($1,$2::jsonb)`,
            "otp_queue",
            JSON.stringify({
                email,
                otp,
            }),
        );
    } catch (error) {
        console.error(error);
    }
}

async function processQueue(queueName: string, deadQueue: string) {
    const messages: any[] = await database.$queryRawUnsafe(
        `SELECT * FROM pgmq.read($1, 10, 30)`,
        queueName,
    );

    for (const msg of messages) {
        const payload = msg.message;
        const msgId = msg.msg_id;
        const attempt = payload.attempt ?? 0;

        try {
            await handleQueue(queueName, payload);

            await database.$executeRawUnsafe(`SELECT pgmq.delete($1, $2)`, queueName, msgId);
        } catch (error) {
            console.error("Job failed:", error);

            const nextAttempt = attempt + 1;

            if (nextAttempt >= MAX_RETRIES) {
                await database.$executeRawUnsafe(
                    `SELECT pgmq.send($1, $2::jsonb)`,
                    deadQueue,
                    JSON.stringify({
                        ...payload,
                        failedAt: new Date(),
                        finalAttempt: nextAttempt,
                    }),
                );

                await database.$executeRawUnsafe(`SELECT pgmq.delete($1, $2)`, queueName, msgId);
            } else {
                const delay = 2 ** nextAttempt * BASE_DELAY;

                await database.$executeRawUnsafe(
                    `SELECT pgmq.send($1, $2::jsonb, $3)`,
                    queueName,
                    JSON.stringify({
                        ...payload,
                        attempt: nextAttempt,
                    }),
                    delay,
                );

                await database.$executeRawUnsafe(`SELECT pgmq.delete($1, $2)`, queueName, msgId);
            }
        }
    }
}

async function handleQueue(queueName: string, payload: any) {
    switch (queueName) {
        case "transaction_queue":
            await processTransaction(payload as TransactionJob);
            break;

        case "otp_queue":
            await processOtp(payload as OTPJob);
            break;

        default:
            throw new Error(`Unhandled queue: ${queueName}`);
    }
}

async function processOtp(job: OTPJob) {
    await sendEmailOtp(job.email, job.otp);
}

async function processTransaction(job: TransactionJob) {
    switch (job.type) {
        case "DEPOSIT":
            await depositMoney(job);
            break;
        case "WITHDRAWAL":
            await withdrawMoney(job);
            break;
        case "REFUND":
            await refundMoney(job);
            break;
        case "PAYOUT":
            await payoutMoney(job);
            break;
        default:
            throw new Error(`Unknown transaction type ${job.type}`);
    }
}

async function depositMoney(job: TransactionJob) {
    const amount = new Decimal(job.amount);

    await database.$transaction(async (tx: Prisma.TransactionClient) => {
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
                type: "DEPOSIT",
            },
            where: {
                id: job.transactionId,
            },
        });
    });
}

async function withdrawMoney(job: TransactionJob) {
    const amount = new Decimal(job.amount);

    await database.$transaction(async (tx: Prisma.TransactionClient) => {
        const card = await tx.card.findUnique({
            where: {
                id: job.cardId,
            },
        });

        if (!card || new Decimal(card.balance).lessThan(amount)) {
            throw new Error("Insufficient balance");
        }

        await tx.card.update({
            data: {
                balance: {
                    decrement: amount,
                },
            },
            where: {
                id: job.cardId,
            },
        });

        await tx.transaction.update({
            data: {
                type: "WITHDRAWAL",
            },
            where: {
                id: job.transactionId,
            },
        });
    });
}

async function payoutMoney(job: TransactionJob) {
    const amount = new Decimal(job.amount);

    await database.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.wallet.update({
            data: {
                balance: {
                    decrement: amount,
                },
                lastPayoutAt: new Date(),
            },
            where: {
                userId: job.userId,
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
                type: "PAYOUT",
            },
            where: {
                token: job.token,
            },
        });
    });
}

async function refundMoney(job: TransactionJob) {
    const amount = new Decimal(job.amount);

    const original = await database.transaction.findUnique({
        include: {
            ticket: {
                include: {
                    eventSlot: {
                        include: {
                            event: true,
                        },
                    },
                },
            },
        },
        where: {
            id: job.transactionId,
        },
    });

    if (!original?.ticket) {
        throw new Error("Original transaction not found");
    }

    const organiserId = original.ticket.eventSlot.event.organiserId;

    await database.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.wallet.update({
            data: {
                balance: {
                    decrement: amount,
                },
            },
            where: {
                userId: organiserId,
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
                    increment: original.ticket_count ?? 1,
                },
            },
            where: {
                id: original.ticket.eventSlot.id,
            },
        });

        await tx.ticket.delete({
            where: {
                id: original.ticket.id,
            },
        });
    });
}

function startWorker() {
    setInterval(() => {
        processQueue("otp_queue", "otp_dlq");
        processQueue("transaction_queue", "transaction_dlq");
    }, POLL_INTERVAL);
}

startWorker();
