import db, { type Prisma } from "@repo/db";
import { createSignedTicket } from "@repo/keygen";
import { type TicketPurchaseResponseType, TicketPurchaseSchema } from "@repo/types";
import { createClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import express, { type Request, type Response, type Router } from "express";
import QRCode from "qrcode";
import userMiddleware from "../middleware";
import { decrypt } from "../utils/encrypter";
import { sendTicketEmail } from "../utils/sendTicketEmail";

const ticketRouter: Router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
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
                    message: "userId, eventSlotId, quantity, and cardNumber are required",
                });
            }
            const { token, eventSlotId, quantity, cardNumber } = parsedData.data;

            if (!userId || !eventSlotId || !quantity || !cardNumber) {
                return res.status(400).json({
                    message: "userId, eventSlotId, quantity, and cardNumber are required",
                });
            }

            const [user, eventDetail, eventSlotDetail, CheckCard] = await Promise.all([
                db.user.findUnique({
                    where: {
                        id: userId,
                    },
                }),
                await db.event.findFirst({
                    include: {
                        organiser: true,
                    },
                    where: {
                        slots: {
                            some: {
                                id: eventSlotId,
                            },
                        },
                    },
                }),
                db.eventSlot.findUnique({
                    include: {
                        event: true,
                        tickets: true,
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
                !eventSlotDetail ||
                eventDetail.status === "cancelled" ||
                !CheckCard ||
                CheckCard.userId !== userId
            ) {
                return res.status(404).json({
                    message: "User not found or Eventslot is invalid",
                });
            }

            if (eventSlotDetail.capacity < eventSlotDetail.tickets.length + quantity) {
                return res.status(400).json({
                    message: "Not enough capacity in this slot",
                });
            }
            const ticketPrice = new Decimal(eventSlotDetail.price);
            const totalAmount = ticketPrice.mul(quantity);

            const ticketPayload = {
                email: user.email,
                eventEndTime: new Date(eventSlotDetail.end_time).toISOString(),
                eventId: eventDetail.id,
                eventLocation: eventDetail.location_name,
                eventSlotId: eventSlotDetail.id,
                eventStartTime: new Date(eventSlotDetail.start_time).toISOString(),
                eventTitle: eventDetail.title,
                firstName: user.first_name,
                issuedAt: new Date().toISOString(),
                lastName: user.last_name,
                quantity,
                ticketId: token,
                totalAmount: totalAmount.toNumber(),
                transactionToken: token,
            };
            const decryptedPrivateKey = decrypt(user.encrypted_private_key);
            const signedTicketPayload = createSignedTicket(ticketPayload, decryptedPrivateKey);

            const qrBuffer = await QRCode.toBuffer(
                JSON.stringify({
                    signedTicketPayload,
                }),
            );
            const fileName = `tickets/${userId}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from("tickets")
                .upload(fileName, qrBuffer, {
                    contentType: "image/png",
                });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from("tickets").getPublicUrl(fileName);
            const qrCodeUrl = publicUrlData.publicUrl;

            const _purchasedTicket = await db.$transaction(async (tx: Prisma.TransactionClient) => {
                const TicketCreate = await tx.ticket.create({
                    data: {
                        eventSlotId: eventSlotDetail.id,
                        qr_code_data: qrCodeUrl,
                        signature: (await signedTicketPayload).signature,
                        userId,
                    },
                });

                await tx.transaction.create({
                    data: {
                        amount: totalAmount.toNumber(),
                        bank_name: CheckCard.bank_name,
                        cardId: CheckCard.id,
                        description: `Tickets for ${user.email} was taken place`,
                        ticket_count: quantity,
                        ticketId: TicketCreate.id,
                        token,
                        type: "PURCHASE",
                        userId,
                    },
                });
            });

            //add ticketId of purchased in email as TXN<ticketId> or const purchasedTicketId = "TXN"+token;
            await sendTicketEmail({
                attendeeName: `${user.first_name?.trim()} ${user.last_name?.trim()}`,
                baseAmount: totalAmount.toNumber(),
                bookingDateTime: new Date().toISOString(),
                convenienceFee: 0,
                email: user.email,
                eventDate: new Date(eventSlotDetail.start_time).toISOString(),
                eventLocation: eventDetail.location_name,
                eventTime: `${eventSlotDetail.start_time} - ${eventSlotDetail.end_time}`,
                eventTitle: eventDetail.title,
                gstAmount: 0,
                gstRate: 0,
                organiser: `${eventDetail.organiser.first_name}`,
                paymentType: "Card",
                qrCodeUrl,
                quantity,
                seats: `General Admission x${quantity}`,
                totalPaid: totalAmount.toNumber(),
            });

            res.status(200).json({
                message: "Tickets purchased successfully",
                ticketURL: qrCodeUrl,
            });
        } catch (error) {
            console.error("Internal error record", error);
            return res.status(500).json({
                error: "Internal error occured",
                message: "Internal error occured",
            });
        }
    },
);

export default ticketRouter;
