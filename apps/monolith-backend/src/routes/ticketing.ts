import "dotenv/config";
import db from "@repo/db";
import { createSignedTicket } from "@repo/keygen";
import { AlphabeticOTP } from "@repo/notifications";
import { type TicketPurchaseResponseType, TicketPurchaseSchema } from "@repo/types";
import { createClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import express, { type Request, type Response, type Router } from "express";
import QRCode from "qrcode";
import userMiddleware from "../middleware";
import { decrypt } from "../utils/encrypter";
import { sendTicketEmail } from "../utils/sendTicketEmail";

const ticketRouter: Router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface TicketPurchaseErrorResponse {
    message: string;
    errors?: unknown;
    error: string;
}

ticketRouter.post(
    "/purchase",
    userMiddleware,
    async (
        req: Request,
        res: Response<TicketPurchaseResponseType | TicketPurchaseErrorResponse>,
    ) => {
        try {
            const userId = req.userId;

            const parsedData = TicketPurchaseSchema.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    errors: parsedData.error.issues,
                    message: "eventSlotId, quantity, cardNumber, token are required",
                });
            }

            const { token, eventSlotId, quantity, cardNumber } = parsedData.data;

            const [user, eventSlot, card] = await Promise.all([
                db.user.findUnique({
                    where: {
                        id: userId,
                    },
                }),
                db.eventSlot.findUnique({
                    include: {
                        event: {
                            include: {
                                organiser: true,
                            },
                        },
                    },
                    where: {
                        id: eventSlotId,
                    },
                }),
                db.card.findUnique({
                    where: {
                        card_number: cardNumber,
                    },
                }),
            ]);

            if (
                !user ||
                !eventSlot ||
                !eventSlot.event ||
                eventSlot.event.status === "cancelled" ||
                !card ||
                card.userId !== userId
            ) {
                return res.status(404).json({
                    message: "Invalid purchase request",
                });
            }

            const totalAmount = new Decimal(eventSlot.price).mul(quantity);

            const purchasedTicket = await db.$transaction(async (tx) => {
                if (eventSlot.capacity < quantity) {
                    throw new Error("Not enough capacity");
                }

                if (card.balance.lt(totalAmount)) {
                    throw new Error("Insufficient card balance");
                }

                const ticket = await tx.ticket.create({
                    data: {
                        eventSlotId,
                        qr_code_data: "",
                        signature: "",
                        userId,
                    },
                });
                const CreateWalletToken = AlphabeticOTP(6);
                await tx.transaction.create({
                    data: {
                        amount: totalAmount,
                        bank_name: card.bank_name,
                        cardId: card.id,
                        description: `Ticket purchase for ${eventSlot.event.title}`,
                        ticket_count: quantity,
                        ticketId: ticket.id,
                        token,
                        type: "PURCHASE",
                        userId,
                    },
                });

                await tx.eventSlot.update({
                    data: {
                        capacity: {
                            decrement: quantity,
                        },
                    },
                    where: {
                        id: eventSlotId,
                    },
                });

                await tx.card.update({
                    data: {
                        balance: {
                            decrement: totalAmount,
                        },
                    },
                    where: {
                        id: card.id,
                    },
                });

                const organiserWallet =
                    (await tx.wallet.findUnique({
                        where: {
                            userId: eventSlot.event.organiserId,
                        },
                    })) ??
                    (await tx.wallet.create({
                        data: {
                            balance: 0,
                            currency: "INR",
                            userId: eventSlot.event.organiserId,
                        },
                    }));

                await tx.wallet.update({
                    data: {
                        balance: {
                            increment: totalAmount,
                        },
                    },
                    where: {
                        id: organiserWallet.id,
                    },
                });

                await tx.transaction.create({
                    data: {
                        amount: totalAmount,
                        card: {
                            connect: {
                                id: card.id,
                            },
                        },
                        description: `Ticket sold for ${eventSlot.event.title}`,
                        ticket: {
                            connect: {
                                id: ticket.id,
                            },
                        },
                        token: CreateWalletToken,
                        type: "PAYOUT",
                        user: {
                            connect: {
                                id: eventSlot.event.organiserId,
                            },
                        },
                        wallet: {
                            connect: {
                                id: organiserWallet.id,
                            },
                        },
                    },
                });

                return ticket;
            });

            const ticketPayload = {
                email: user.email,
                eventEndTime: new Date(eventSlot.end_time).toISOString(),
                eventId: eventSlot.event.id,
                eventLocation: eventSlot.location_name,
                eventSlotId: eventSlot.id,
                eventStartTime: new Date(eventSlot.start_time).toISOString(),
                eventTitle: eventSlot.event.title,
                firstName: user.first_name,
                issuedAt: new Date().toISOString(),
                lastName: user.last_name,
                quantity,
                ticketId: token,
                totalAmount: totalAmount.toNumber(),
                transactionToken: token,
            };

            const decryptedPrivateKey = decrypt(user.encrypted_private_key);
            const signedPayload = await createSignedTicket(ticketPayload, decryptedPrivateKey);
            const qrData = Buffer.from(JSON.stringify(signedPayload)).toString("base64");
            const qrBuffer = await QRCode.toBuffer(qrData);
            const filePath = `tickets/${userId}-${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
                .from("uploads")
                .upload(filePath, qrBuffer, {
                    contentType: "image/png",
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
            await db.ticket.update({
                data: {
                    qr_code_data: data.publicUrl,
                    signature: JSON.stringify(signedPayload),
                },
                where: {
                    id: purchasedTicket.id,
                },
            });

            await sendTicketEmail({
                attendeeName: `${user.first_name} ${user.last_name}`,
                baseAmount: totalAmount.toNumber(),
                bookingDateTime: new Date().toISOString(),
                convenienceFee: 0,
                email: user.email,
                eventDate: eventSlot.start_time.toISOString(),
                eventLocation: eventSlot.location_name,
                eventTime: `${eventSlot.start_time} - ${eventSlot.end_time}`,
                eventTitle: eventSlot.event.title,
                gstAmount: 0,
                gstRate: 0,
                organiser: eventSlot.event.organiser.first_name,
                paymentType: "Card",
                qrCodeUrl: data.publicUrl,
                quantity,
                seats: `General Admission x${quantity}`,
                totalPaid: totalAmount.toNumber(),
                transactionId: `TXN${token}`,
            });

            return res.status(200).json({
                message: "Tickets purchased successfully",
                ticketURL: data.publicUrl,
            });
        } catch (error: any) {
            console.error("Purchase error:", error);
            return res.status(400).json({
                message: error.message || "Purchase failed",
            });
        }
    },
);

ticketRouter.get("/my", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const { issue, cancel, use, expired } = req.query;

        const filter: Record<string, any> = {
            userId,
        };

        const statuses: string[] = [];

        if (typeof issue === "string") statuses.push("ISSUED");
        if (typeof cancel === "string") statuses.push("CANCELLED");
        if (typeof use === "string") statuses.push("USED");
        if (typeof expired === "string") statuses.push("EXPIRED");

        if (statuses.length > 0) {
            filter.status = {
                in: statuses,
            };
        }

        const [issuedCount, cancelledCount, usedCount, expiredCount, totalCount, ticketRecords] =
            await Promise.all([
                db.ticket.count({
                    where: {
                        status: "ISSUED",
                        userId,
                    },
                }),
                db.ticket.count({
                    where: {
                        status: "CANCELLED",
                        userId,
                    },
                }),
                db.ticket.count({
                    where: {
                        status: "USED",
                        userId,
                    },
                }),
                db.ticket.count({
                    where: {
                        status: "EXPIRED",
                        userId,
                    },
                }),
                db.ticket.count({
                    where: filter,
                }),
                db.ticket.findMany({
                    select: {
                        eventSlot: {
                            select: {
                                event: {
                                    select: {
                                        category: true,
                                        title: true,
                                    },
                                },
                                location_name: true,
                                location_url: true,
                                price: true,
                            },
                        },
                        id: true,
                        issued_at: true,
                        status: true,
                    },
                    where: filter,
                }),
            ]);

        if (ticketRecords.length === 0) {
            return res.status(200).json({
                message: "No tickets found for the selected filters",
                meta: {
                    cancelled: cancelledCount,
                    expired: expiredCount,
                    issued: issuedCount,
                    total: totalCount,
                    used: usedCount,
                },
                ticketRecords: [],
            });
        }

        return res.status(200).json({
            message: "Successfully retrieved ticket records",
            meta: {
                cancelled: cancelledCount,
                expired: expiredCount,
                issued: issuedCount,
                total: totalCount,
                used: usedCount,
            },
            ticketRecords: ticketRecords,
        });
    } catch (error) {
        console.error("Internal error retrieving tickets", error);
        return res.status(500).json({
            error: "Internal server error",
            message: "Internal server error",
        });
    }
});

ticketRouter.get("/:ticketId", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const ticketId = req.params.ticketId;
        const getRecord = await db.ticket.findFirst({
            select: {
                eventSlot: {
                    select: {
                        event: {
                            select: {
                                organiser: {
                                    select: {
                                        email: true,
                                    },
                                },
                                status: true,
                                title: true,
                            },
                        },
                        location_name: true,
                        location_url: true,
                    },
                },
                eventSlotId: true,
                is_valid: true,
                signature: true,
                user: {
                    select: {
                        email: true,
                        first_name: true,
                        last_name: true,
                    },
                },
            },
            where: {
                id: ticketId,
                userId,
            },
        });
        if (!getRecord) {
            return res.status(404).json({
                message: "Invalid ticket id was provided or Ticket doesnt belong to you",
            });
        }
        return res.status(200).json({
            message: "Successfully retrieved the ticketDetail",
            ticketDetail: getRecord,
        });
    } catch (error) {
        console.error("Internal error record", error);
        return res.status(500).json({
            error: "Internal error occured",
            message: "Internal error occured",
        });
    }
});

export default ticketRouter;
