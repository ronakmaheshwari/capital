import database, { type Prisma } from "@repo/monolith-db";
import { EventSlotType, EventType, UpdateEventSlotSchema, updateEventSchema } from "@repo/types";
import Decimal from "decimal.js";
import express, { type Request, type Response, type Router } from "express";
import { formatDate, formatTime } from "../helper/date";
import userMiddleware, { organiserMiddleware } from "../middleware";
import { syncEventToCache } from "../schedule/eventCacheSync";
import eventMemoryCache, { slotMemoryCache } from "../utils/lru";

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

        const organiser = await database.user.findUnique({
            where: {
                id: organiserId,
            },
        });
        if (!organiser) {
            return res.status(400).json({
                message: "Organiser not found",
            });
        }

        const newEvent = await database.event.create({
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

        await syncEventToCache(newEvent.id);

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
            //organiser,
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

        const cacheKey = `events:${JSON.stringify(req.query)}`;

        const lruCache = eventMemoryCache.get(cacheKey);
        if (lruCache) {
            return res.status(200).json({
                data: lruCache,
                message: "Data was fetched from LRU Cache",
            });
        }

        const values = [];
        const filters = [];

        if (status) {
            values.push(status);
            filters.push(`e.status = $${values.length}`);
        }

        if (category) {
            values.push(category);
            filters.push(`e.category = $${values.length}`);
        }

        if (genre) {
            values.push(genre);
            filters.push(`e.genre = $${values.length}`);
        }

        if (language) {
            values.push(language);
            filters.push(`e.language = $${values.length}`);
        }

        if (isOnline !== undefined) {
            values.push(isOnline === "true");
            filters.push(`e.is_online = $${values.length}`);
        }

        if (title) {
            values.push(`%${title}%`);
            filters.push(`e.title ILIKE $${values.length}`);
        }

        if (location) {
            values.push(`%${location}%`);
            filters.push(`es.location_name ILIKE $${values.length}`);
        }

        if (minPrice) {
            values.push(Number(minPrice));
            filters.push(`es.price >= $${values.length}`);
        }

        if (maxPrice) {
            values.push(Number(maxPrice));
            filters.push(`es.price <= $${values.length}`);
        }

        if (date) {
            values.push(new Date(date as string));
            filters.push(`DATE(es.event_date) = $${values.length}`);
        }

        if (startDate) {
            values.push(new Date(startDate as string));
            filters.push(`es.event_date >= $${values.length}`);
        }

        if (endDate) {
            values.push(new Date(endDate as string));
            filters.push(`es.event_date <= $${values.length}`);
        }

        filters.push(`e.status != 'draft'`);

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
        const query = `
            SELECT e.*,
                    MIN(es.price) as "startingPrice",
                    MAX(es.price) as "maxPrice"
            FROM event_cache e
            LEFT JOIN event_slot_cache es ON e.id = es.event_id
            ${whereClause}
            GROUP BY e.id
            ORDER BY ${sortBy === "price" ? `"startingPrice"` : `e.${sortBy}`} ${order}
            ${isAll ? "" : `LIMIT ${limitNum} OFFSET ${(pageNum - 1) * limitNum}`}
        `;

        const events = await database.$queryRawUnsafe(query, ...values);
        const response = {
            events: Array.isArray(events) ? events : [],
            limit: isAll ? null : limitNum,
            page: isAll ? null : pageNum,
            total: Array.isArray(events) ? events.length : 0,
        };

        eventMemoryCache.set(cacheKey, response);

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

        const getEvent = await database.event.findUnique({
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

        const totalSlots = await database.eventSlot.count({
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

        const getEvent = await database.event.findUnique({
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

        const updatedEvent = await database.event.update({
            data: updateBody,
            where: {
                id,
            },
        });

        await syncEventToCache(updatedEvent.id);

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

        const event = await database.event.findUnique({
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

        await database.$transaction([
            database.eventSlot.deleteMany({
                where: {
                    eventId: id,
                },
            }),
            database.event.delete({
                where: {
                    id,
                },
            }),
        ]);

        await syncEventToCache(event.id);
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

        const event = await database.event.findUnique({
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

        const slot = await database.eventSlot.create({
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

        await syncEventToCache(slot.eventId);

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
eventRouter.get("/:eventId/slots", async (req, res) => {
    try {
        const { eventId } = req.params;
        const { location, capacity, event_date, minPrice, maxPrice } = req.query;

        const cacheKey = `eventSlots:${eventId}:${JSON.stringify(req.query)}`;

        const memory = slotMemoryCache.get(cacheKey);
        if (memory) {
            return res.status(200).json(memory);
        }

        const values: any[] = [];
        const filters: string[] = [];

        values.push(eventId);
        filters.push(`es.event_id = $${values.length}`);

        if (location) {
            values.push(location);
            filters.push(`LOWER(es.location_name) = LOWER($${values.length})`);
        }

        if (capacity) {
            values.push(Number(capacity));
            filters.push(`es.capacity >= $${values.length}`);
        }

        if (event_date) {
            values.push(new Date(`${event_date}T00:00:00.000Z`));
            values.push(new Date(`${event_date}T23:59:59.999Z`));
            filters.push(`es.event_date BETWEEN $${values.length - 1} AND $${values.length}`);
        }

        if (minPrice) {
            values.push(Number(minPrice));
            filters.push(`es.price >= $${values.length}`);
        }

        if (maxPrice) {
            values.push(Number(maxPrice));
            filters.push(`es.price <= $${values.length}`);
        }

        const slotQuery = `
      SELECT es.*
      FROM event_slot_cache es
      WHERE ${filters.join(" AND ")}
      ORDER BY es.event_date ASC, es.start_time ASC
    `;

        const cachedSlots: any[] = await database.$queryRawUnsafe(slotQuery, ...values);

        const event = await database.$queryRawUnsafe<any[]>(
            `SELECT * FROM event_cache WHERE id = $1`,
            eventId,
        );

        if (cachedSlots.length > 0 && event.length > 0) {
            const formattedSlots = cachedSlots.map((slot) => ({
                capacity: slot.capacity,
                endTime: formatTime(slot.end_time),
                eventDate: formatDate(slot.event_date),
                id: slot.id,
                location: slot.location_name,
                locationUrl: slot.location_url,
                price: Number(slot.price),
                raw: {
                    end_time: slot.end_time,
                    event_date: slot.event_date,
                    start_time: slot.start_time,
                },
                startTime: formatTime(slot.start_time),
            }));

            const response = {
                event: event[0],
                meta: {
                    filteredSlots: formattedSlots.length,
                    totalSlots: cachedSlots.length,
                },
                slots: formattedSlots,
            };

            slotMemoryCache.set(cacheKey, response);
            return res.status(200).json(response);
        }

        const eventSource = await database.event.findUnique({
            include: {
                slots: true,
            },
            where: {
                id: eventId,
            },
        });

        if (!eventSource) {
            return res.status(404).json({
                message: "Event not found",
            });
        }

        syncEventToCache(eventId).catch(console.error);

        const formattedSlots = eventSource.slots.map((slot) => ({
            capacity: slot.capacity,
            endTime: formatTime(slot.end_time),
            eventDate: formatDate(slot.event_date),
            id: slot.id,
            location: slot.location_name,
            locationUrl: slot.location_url,
            price: Number(slot.price),
            raw: {
                end_time: slot.end_time,
                event_date: slot.event_date,
                start_time: slot.start_time,
            },
            startTime: formatTime(slot.start_time),
        }));

        const response = {
            event: eventSource,
            meta: {
                filteredSlots: formattedSlots.length,
                totalSlots: formattedSlots.length,
            },
            slots: formattedSlots,
        };

        slotMemoryCache.set(cacheKey, response);

        return res.status(200).json(response);
    } catch (error) {
        console.error("EVENT SLOT ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

eventRouter.get("/:eventId/:slotId", userMiddleware, async (req, res) => {
    try {
        const user = req.userId;
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized user tried to access service",
            });
        }

        const { eventId, slotId } = req.params;

        const cacheKey = `singleSlot:${eventId}:${slotId}`;

        const memory = slotMemoryCache.get(cacheKey);
        if (memory) {
            return res.status(200).json(memory);
        }

        const slot = await database.$queryRawUnsafe<any[]>(
            `
      SELECT es.*, e.title, e.banner_url
      FROM event_slot_cache es
      JOIN event_cache e ON e.id = es.event_id
      WHERE es.id = $1 AND es.event_id = $2
      `,
            slotId,
            eventId,
        );

        if (slot.length > 0) {
            const response = {
                message: "Data was fetched successfully",
                slot: slot[0],
            };

            slotMemoryCache.set(cacheKey, response);
            return res.status(200).json(response);
        }

        const findSlot = await database.eventSlot.findUnique({
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

        syncEventToCache(eventId).catch(console.error);

        const response = {
            message: "Data was fetched successfully",
            slot: findSlot,
        };

        slotMemoryCache.set(cacheKey, response);

        return res.status(200).json(response);
    } catch (error) {
        console.error("EVENT SLOT ERROR:", error);
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

            const findEvent = await database.event.findUnique({
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
            const findSlot = await database.eventSlot.findUnique({
                where: {
                    id: slotId,
                },
            });

            if (!findSlot) {
                return res.status(404).json({
                    message: "Invalid Slot Id was provided",
                });
            }

            await database.eventSlot.update({
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

            await syncEventToCache(findEvent.id);

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

            const slot = await database.eventSlot.findFirst({
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

            await database.$transaction(async (tx) => {
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

            await syncEventToCache(slot.eventId);

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
