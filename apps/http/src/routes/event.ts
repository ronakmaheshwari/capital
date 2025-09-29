import redisCache from "@repo/cache";
import db from "@repo/db";
import { allowedStatuses, EventSlotType, EventType } from "@repo/types";
import express, { type Request, type Response, type Router } from "express";
import { deleteCache } from "../schedule/eventCache";

const eventRouter: Router = express.Router();
/**
 * Helper: Apply Filters from Query Params
 */
function filterEvents(
    events: any[],
    filters: {
        status?: string;
        organiser?: string;
        title?: string;
        location?: string;
    },
) {
    return events.filter((event) => {
        return (
            (!filters.status || event.status === filters.status) &&
            (!filters.organiser ||
                event.organiser?.first_name
                    ?.toLowerCase()
                    .includes(filters.organiser.toLowerCase())) &&
            (!filters.title || event.title?.toLowerCase().includes(filters.title.toLowerCase())) &&
            (!filters.location ||
                event.location_name?.toLowerCase().includes(filters.location.toLowerCase()))
        );
    });
}

/**
 * Create a new event
 */
eventRouter.post("/", async (req: Request, res: Response) => {
    try {
        const parsed = EventType.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.format(),
                message: "Validation failed",
            });
        }

        const { organiserId, title, description, banner_url, status, location_name, location_url } =
            parsed.data;

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
                description,
                location_name,
                location_url,
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
 * Get events with optional filters (status, organiser name, title, location)
 */
eventRouter.get("/", async (req: Request, res: Response) => {
    try {
        const { status, organiser, title, location } = req.query;
        const cacheKey = `events:${status || "all"}:${organiser || "all"}:${title || "all"}:${location || "all"}`;

        const cached = await redisCache.get(cacheKey);
        if (cached) {
            return res.status(200).json({
                events: JSON.parse(cached.toString()),
                message: "Got from cache",
            });
        }

        const allEventsCache = await redisCache.get("events:all");
        let events: any[] = [];
        if (allEventsCache) {
            const allEvents = JSON.parse(allEventsCache.toString());
            events = filterEvents(allEvents, {
                location: location as string,
                organiser: organiser as string,
                status: status as string,
                title: title as string,
            });
        } else {
            events = await db.event.findMany({
                include: {
                    organiser: {
                        select: {
                            first_name: true,
                            id: true,
                        },
                    },
                },
                where: {
                    ...(status &&
                    typeof status === "string" &&
                    allowedStatuses.includes(status as any)
                        ? {
                              status: status as any,
                          }
                        : {}),
                    ...(title
                        ? {
                              title: {
                                  contains: title as string,
                                  mode: "insensitive",
                              },
                          }
                        : {}),
                    ...(location
                        ? {
                              location_name: {
                                  contains: location as string,
                                  mode: "insensitive",
                              },
                          }
                        : {}),
                    ...(organiser
                        ? {
                              organiser: {
                                  first_name: {
                                      contains: organiser as string,
                                      mode: "insensitive",
                                  },
                              },
                          }
                        : {}),
                },
            });
        }

        if (!events || events.length === 0) {
            return res.status(404).json({
                message: "No events found for the given filters",
            });
        }

        await redisCache.set(cacheKey, JSON.stringify(events), {
            EX: 30,
        });
        return res.status(200).json(events);
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Delete an event and its slots
 */
eventRouter.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const event = await db.event.findUnique({
            where: {
                id,
            },
        });
        if (!event) {
            return res.status(404).json({
                message: "Event not found",
            });
        }

        await db.eventSlot.deleteMany({
            where: {
                eventId: id,
            },
        });
        await db.event.delete({
            where: {
                id,
            },
        });
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
eventRouter.post("/:eventId/slots", async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const parsed = EventSlotType.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.format(),
                message: "Validation failed",
            });
        }

        const { start_time, end_time, capacity, price } = parsed.data;

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

        const slot = await db.eventSlot.create({
            data: {
                capacity,
                end_time: new Date(end_time),
                eventId: event.id,
                price,
                start_time: new Date(start_time),
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
        const cachedKey = `eventSlots:${eventId}`;
        const cached = await redisCache.get(cachedKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached.toString()));
        }

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

        const slots = await db.eventSlot.findMany({
            orderBy: {
                start_time: "asc",
            },
            where: {
                eventId,
            },
        });

        await redisCache.set(cachedKey, JSON.stringify(slots), {
            EX: 30,
        });
        return res.status(200).json({
            slots,
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

/**
 * Delete a specific slot
 */
eventRouter.delete("/:eventId/slots/:slotId", async (req: Request, res: Response) => {
    try {
        const { eventId, slotId } = req.params;

        const slot = await db.eventSlot.findFirst({
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

        await db.eventSlot.delete({
            where: {
                id: slotId,
            },
        });
        await deleteCache();

        return res.status(200).json({
            message: "Slot deleted successfully",
            slotId,
        });
    } catch (_error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

export default eventRouter;
