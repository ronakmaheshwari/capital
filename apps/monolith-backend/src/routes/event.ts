import redisCache from "@repo/cache";
import db, {
    type EventCategory,
    type EventGenre,
    type EventLanguage,
    type EventStatus,
    type Prisma,
} from "@repo/db";
import { EventSlotType, EventType, UpdateEventSlotSchema, updateEventSchema } from "@repo/types";
import Decimal from "decimal.js";
import express, { type Request, type Response, type Router } from "express";
import { formatDate, formatTime } from "../helper/date";
import userMiddleware, { organiserMiddleware } from "../middleware";
import deleteCache from "../schedule/eventCache";

const eventRouter: Router = express.Router();

/**
 * Create a new event
 */
eventRouter.post("/", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const organiserId = req.organiserId;
        const parsed = EventType.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.format(),
                message: "Validation failed",
            });
        }

        const {
            title,
            description,
            banner_url,
            status,
            hero_image_url,
            category,
            genre,
            language,
            is_online,
        } = parsed.data;

        const organiser = await db.user.findUnique({
            where: {
                id: organiserId,
            },
        });
        if (!organiser) {
            return res.status(400).json({
                message: "Organiser not found",
            });
        }

        const newEvent = await db.event.create({
            data: {
                banner_url,
                category,
                description,
                genre,
                hero_image_url,
                is_online,
                language,
                organiserId,
                status,
                title,
            },
        });
        await deleteCache();
        return res.status(201).json({
            event: newEvent,
            message: "Event successfully created",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Get events with optional filters
 * Filters: status, organiser, title, location (slot-based), date, category, genre, language, price
 */
eventRouter.get("/", async (req: Request, res: Response) => {
    try {
        const {
            status,
            organiser,
            title,
            location,
            category,
            genre,
            language,
            minPrice,
            maxPrice,
            isOnline,
            date, // YYYY-MM-DD
            startDate, // YYYY-MM-DD
            endDate, // YYYY-MM-DD
            page = "1",
            limit = "10",
            all,
            sortBy = "created_at",
            order = "desc",
        } = req.query;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Number(limit));
        const isAll = all === "true";

        const cacheKey = `events:${JSON.stringify({
            category,
            date,
            endDate,
            genre,
            isOnline,
            language,
            limit: isAll ? "all" : limitNum,
            location,
            maxPrice,
            minPrice,
            order,
            organiser,
            page: isAll ? "all" : pageNum,
            sortBy,
            startDate,
            status,
            title,
        })}`;

        const cached = await redisCache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached.toString()));
        }

        const slotFilters: Prisma.EventSlotWhereInput = {
            ...(location && {
                location_name: {
                    contains: location as string,
                    mode: "insensitive",
                },
            }),
            ...(minPrice && {
                price: {
                    gte: Number(minPrice),
                },
            }),
            ...(maxPrice && {
                price: {
                    lte: Number(maxPrice),
                },
            }),
            ...(date && {
                event_date: new Date(date as string),
            }),
            ...(startDate || endDate
                ? {
                      event_date: {
                          ...(startDate && {
                              gte: new Date(startDate as string),
                          }),
                          ...(endDate && {
                              lte: new Date(endDate as string),
                          }),
                      },
                  }
                : {}),
        };

        const where: Prisma.EventWhereInput = {
            ...(status && {
                status: status as EventStatus,
            }),
            ...(category && {
                category: category as EventCategory,
            }),
            ...(genre && {
                genre: genre as EventGenre,
            }),
            ...(language && {
                language: language as EventLanguage,
            }),
            ...(isOnline !== undefined && {
                is_online: isOnline === "true",
            }),
            ...(title && {
                title: {
                    contains: title as string,
                    mode: "insensitive",
                },
            }),
            ...(organiser && {
                organiser: {
                    first_name: {
                        contains: organiser as string,
                        mode: "insensitive",
                    },
                },
            }),
            ...(Object.keys(slotFilters).length && {
                slots: {
                    some: slotFilters,
                },
            }),
            status: {
                not: "draft",
            },
        };

        const total = await db.event.count({
            where,
        });

        const events = await db.event.findMany({
            include: {
                organiser: {
                    select: {
                        first_name: true,
                        id: true,
                    },
                },
                slots: true,
            },
            where,
            ...(isAll
                ? {}
                : {
                      skip: (pageNum - 1) * limitNum,
                      take: limitNum,
                  }),
            orderBy:
                sortBy === "price"
                    ? {
                          created_at: "desc",
                      }
                    : {
                          [sortBy as string]: order,
                      },
        });

        const enriched = events.map((event) => {
            const prices = event.slots.map((s) => Number(s.price)).filter((p) => !Number.isNaN(p));

            return {
                ...event,
                maxPrice: prices.length ? Math.max(...prices) : 0,
                startingPrice: prices.length ? Math.min(...prices) : 0,
            };
        });

        if (sortBy === "price") {
            enriched.sort((a, b) =>
                order === "asc"
                    ? a.startingPrice - b.startingPrice
                    : b.startingPrice - a.startingPrice,
            );
        }

        const response = {
            events: enriched,
            limit: isAll ? null : limitNum,
            page: isAll ? null : pageNum,
            total,
        };

        await redisCache.set(cacheKey, JSON.stringify(response), {
            EX: 30,
        });

        return res.json(response);
    } catch (error) {
        console.error("EVENT ROUTE ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

eventRouter.get("/:id", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.organiserId;
        const { id } = req.params;

        const getEvent = await db.event.findUnique({
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
                status: true,
                title: true,
            },
            where: {
                id,
            },
        });

        if (!getEvent) {
            return res.status(404).json({
                message: "Event was not found",
            });
        }

        if (getEvent.organiserId !== user) {
            return res.status(401).json({
                message: "You are unauthorized to edit this event, as it doesnt belong to you",
            });
        }

        const totalSlots = await db.eventSlot.count({
            where: {
                eventId: id,
            },
        });

        return res.status(200).json({
            data: {
                banner_url: getEvent.banner_url,
                category: getEvent.category,
                description: getEvent.description,
                genre: getEvent.genre,
                hero_image_url: getEvent.hero_image_url,
                id: getEvent.id,
                is_online: getEvent.is_online,
                language: getEvent.language,
                status: getEvent.status,
                title: getEvent.title,
            },
            message: "Data was successfully fetched",
            meta: {
                total: totalSlots,
            },
        });
    } catch (error) {
        console.error("EVENT ROUTE GET ID ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

eventRouter.patch("/:id", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.organiserId;
        const { id } = req.params;
        const parsed = updateEventSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.flatten(),
                message: "Validation failed",
            });
        }
        const updateBody = parsed.data;

        const getEvent = await db.event.findUnique({
            where: {
                id: id,
            },
        });

        if (!getEvent) {
            return res.status(404).json({
                message: "Event was not found",
            });
        }

        if (getEvent.organiserId !== user) {
            return res.status(401).json({
                message: "You are unauthorized to edit this event, as it doesnt belong to you",
            });
        }

        await db.event.update({
            data: updateBody,
            where: {
                id,
            },
        });

        return res.status(200).json({
            message: "Event data updated successfully",
        });
    } catch (error) {
        console.error("EVENT ROUTE EDIT ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Delete an event and its slots
 */
eventRouter.delete("/:id", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.organiserId;

        const event = await db.event.findUnique({
            include: {
                slots: {
                    include: {
                        tickets: true,
                    },
                },
            },
            where: {
                id,
            },
        });

        if (!event) {
            return res.status(404).json({
                message: "Event not found",
            });
        }

        if (event.organiserId !== user) {
            return res.status(401).json({
                message: "You are unauthorized to delete this event, as it doesnt belong to you",
            });
        }

        const hasPurchasedTickets = event.slots.some((slot) =>
            slot.tickets.some((ticket) => ticket.status === "ISSUED"),
        );

        if (hasPurchasedTickets) {
            return res.status(400).json({
                message: "Cannot delete event because tickets have already been purchased",
            });
        }

        await db.$transaction([
            db.eventSlot.deleteMany({
                where: {
                    eventId: id,
                },
            }),
            db.event.delete({
                where: {
                    id,
                },
            }),
        ]);

        await deleteCache();
        return res.status(200).json({
            message: "Event deleted successfully",
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Create a slot for an event
 */
eventRouter.post("/:eventId/slots", organiserMiddleware, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const user = req.organiserId;

        const parsed = EventSlotType.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.format(),
                message: "Validation failed",
            });
        }

        const { location_name, location_url, event_date, start_time, end_time, capacity, price } =
            parsed.data;

        const startDateTime = new Date(`${event_date}T${start_time}:00Z`);
        const endDateTime = new Date(`${event_date}T${end_time}:00Z`);

        const event = await db.event.findUnique({
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
                message:
                    "Your are unauthorized to create slots as this event doesn`t belong to you",
            });
        }

        const slot = await db.eventSlot.create({
            data: {
                capacity,
                end_time: endDateTime,
                event_date: new Date(event_date),
                eventId: event.id,
                location_name,
                location_url,
                price,
                start_time: startDateTime,
            },
        });

        await deleteCache();

        return res.status(201).json({
            message: "Event slot created successfully",
            slot,
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Get all slots for an event
 */
eventRouter.get("/:eventId/slots", async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { location, capacity, event_date, minPrice, maxPrice } = req.query;

        const cacheKey = `eventSlots:${eventId}:${JSON.stringify(req.query)}`;

        const cached = await redisCache.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached.toString()));
        }

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

        const [allLocations, totalSlots] = await Promise.all([
            db.eventSlot.findMany({
                distinct: [
                    "location_name",
                ],
                select: {
                    location_name: true,
                },
                where: {
                    eventId,
                },
            }),
            db.eventSlot.count({
                where: {
                    eventId,
                },
            }),
        ]);

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

        const slots = await db.eventSlot.findMany({
            orderBy: [
                {
                    event_date: "asc",
                },
                {
                    start_time: "asc",
                },
            ],
            where: slotWhere,
        });

        const formattedSlots = slots.map((slot) => ({
            capacity: slot.capacity,
            endTime: formatTime(slot.end_time),

            eventDate: formatDate(slot.event_date),
            id: slot.id,
            location: slot.location_name,
            locationUrl: slot.location_url,
            price: Number(slot.price),

            raw: {
                end_time: slot.end_time.toISOString(),
                event_date: slot.event_date.toISOString(),
                start_time: slot.start_time.toISOString(),
            },
            startTime: formatTime(slot.start_time),
        }));

        const response = {
            event,
            meta: {
                filteredSlots: formattedSlots.length,
                locations: allLocations.map((l) => l.location_name),
                totalSlots,
            },
            slots: formattedSlots,
        };

        await redisCache.set(cacheKey, JSON.stringify(response), {
            EX: 30,
        });

        return res.status(200).json(response);
    } catch (error) {
        console.error("EVENT SLOT ERROR:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

eventRouter.get("/:eventId/:slotId", userMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.userId;
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized user tried to access service",
            });
        }
        const { eventId, slotId } = req.params;
        if (!eventId || !slotId) {
            return res.status(404).json({
                message: `EventId or SlotID was not provided`,
            });
        }
        const eventFinder = await db.event.findUnique({
            where: {
                id: eventId,
                slots: {
                    some: {
                        id: slotId,
                    },
                },
            },
        });

        if (!eventFinder) {
            return res.status(404).json({
                message: "Invalid EventId or SlotId was provided",
            });
        }

        const findSlot = await db.eventSlot.findUnique({
            include: {
                event: true,
            },
            where: {
                id: slotId,
            },
        });

        if (!findSlot) {
            return res.status(404).json({
                message: "Invalid slotId was provided",
            });
        }

        return res.status(200).json({
            message: "Data was fetched successfully",
            slot: findSlot,
        });
    } catch (error) {
        console.error("EVENT SLOT Couldnt be found ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

eventRouter.patch(
    "/:eventId/slots/:slotId",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const user = req.organiserId;
            const { eventId, slotId } = req.params;
            const parsed = UpdateEventSlotSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    message: parsed.error.flatten(),
                });
            }
            const updatedData = parsed.data;
            const startDateTime = new Date(
                `${updatedData.event_date}T${updatedData.start_time}:00Z`,
            );
            const endDateTime = new Date(`${updatedData.event_date}T${updatedData.end_time}:00Z`);

            const findEvent = await db.event.findUnique({
                where: {
                    id: eventId,
                },
            });

            if (!findEvent) {
                return res.status(404).json({
                    message: "Invalid Event Id was provided",
                });
            }

            if (findEvent.organiserId !== user) {
                return res.status(401).json({
                    message: "You are unauthorized to edit the slots that dont belong to you",
                });
            }
            const findSlot = await db.eventSlot.findUnique({
                where: {
                    id: slotId,
                },
            });

            if (!findSlot) {
                return res.status(404).json({
                    message: "Invalid Slot Id was provided",
                });
            }

            await db.eventSlot.update({
                data: {
                    capacity: updatedData.capacity,
                    end_time: endDateTime,
                    event_date: new Date(updatedData.event_date),
                    location_name: updatedData.location_name,
                    location_url: updatedData.location_url,
                    price: updatedData.price,
                    start_time: startDateTime,
                },
                where: {
                    id: slotId,
                },
            });
            return res.status(200).json({
                message: "Event Slot was successfully edited",
            });
        } catch (error) {
            console.error("EVENT SLOT Couldnt be found ERROR:", error);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

/**
 * Delete a specific slot
 */
eventRouter.delete(
    "/:eventId/slots/:slotId",
    organiserMiddleware,
    async (req: Request, res: Response) => {
        try {
            const user = req.organiserId;
            const { eventId, slotId } = req.params;

            const slot = await db.eventSlot.findFirst({
                include: {
                    event: true,
                },
                where: {
                    eventId,
                    id: slotId,
                },
            });

            if (!slot) {
                return res.status(404).json({
                    message: "Slot not found for this event",
                });
            }

            if (slot.event.organiserId !== user) {
                return res.status(401).json({
                    message:
                        "You are unauthorized to delete this slot, as it doesn`t belong to you",
                });
            }

            if (slot.start_time < new Date()) {
                return res.status(400).json({
                    message: "Cannot delete past slot",
                });
            }

            await db.$transaction(async (tx) => {
                const organiserWallet = await tx.wallet.findUnique({
                    where: {
                        userId: user,
                    },
                });

                if (!organiserWallet) {
                    throw new Error("Organiser wallet not found");
                }

                const paymentTransactions = await tx.transaction.findMany({
                    select: {
                        amount: true,
                        cardId: true,
                        id: true,
                        ticketId: true,
                        userId: true,
                    },
                    where: {
                        canceled_at: null,
                        ticket: {
                            eventSlotId: slotId,
                            status: "ISSUED",
                        },
                        type: "PURCHASE",
                    },
                });

                if (paymentTransactions.length === 0) {
                    await tx.eventSlot.delete({
                        where: {
                            id: slotId,
                        },
                    });
                    return;
                }

                const totalRefundAmount = paymentTransactions.reduce(
                    (acc, t) => acc.plus(t.amount),
                    new Decimal(0),
                );

                if (organiserWallet.balance.lt(totalRefundAmount)) {
                    throw new Error("Insufficient organiser wallet balance");
                }

                await tx.wallet.update({
                    data: {
                        balance: {
                            decrement: totalRefundAmount,
                        },
                    },
                    where: {
                        id: organiserWallet.id,
                    },
                });

                await tx.ticket.updateMany({
                    data: {
                        is_valid: false,
                        status: "CANCELLED",
                    },
                    where: {
                        eventSlotId: slotId,
                        status: "ISSUED",
                    },
                });

                await tx.transaction.updateMany({
                    data: {
                        canceled_at: new Date(),
                    },
                    where: {
                        id: {
                            in: paymentTransactions.map((t) => t.id),
                        },
                    },
                });

                const groupedByCard = paymentTransactions.reduce(
                    (acc, t) => {
                        acc[t.cardId] = acc[t.cardId]
                            ? acc[t.cardId].plus(t.amount)
                            : new Decimal(t.amount);
                        return acc;
                    },
                    {} as Record<string, Prisma.Decimal>,
                );

                for (const cardId of Object.keys(groupedByCard)) {
                    await tx.card.update({
                        data: {
                            balance: {
                                increment: groupedByCard[cardId],
                            },
                        },
                        where: {
                            id: cardId,
                        },
                    });
                }

                await tx.transaction.createMany({
                    data: paymentTransactions.map((t) => ({
                        amount: t.amount,
                        cardId: t.cardId,
                        description: "Refund due to slot cancellation",
                        ticketId: t.ticketId,
                        type: "REFUND",
                        userId: t.userId,
                    })),
                });

                await tx.eventSlot.delete({
                    where: {
                        id: slotId,
                    },
                });
            });

            await deleteCache();

            return res.status(200).json({
                message: "Slot deleted successfully",
            });
        } catch (_error) {
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    },
);

export default eventRouter;
