import { Decimal } from "@prisma/client/runtime/library";

export type EventFilters = {
    status?: string;
    organiser?: string;
    title?: string;
    location?: string;
    category?: string;
    genre?: string;
    language?: string;
    minPrice?: number;
    maxPrice?: number;
    isOnline?: boolean;
};

export function filterEvents(events: any[], filters: EventFilters) {
    return events.filter((event) => {
        const prices = (event.slots || []).map((s: any) =>
            Number(s.price instanceof Decimal ? s.price.toNumber() : s.price),
        );

        const minEventPrice = prices.length ? Math.min(...prices) : 0;
        const maxEventPrice = prices.length ? Math.max(...prices) : 0;

        return (
            (!filters.status || event.status === filters.status) &&
            (!filters.category || event.category === filters.category) &&
            (!filters.genre || event.genre === filters.genre) &&
            (!filters.language || event.language === filters.language) &&
            (filters.isOnline === undefined || event.is_online === filters.isOnline) &&
            (!filters.organiser ||
                event.organiser?.first_name
                    ?.toLowerCase()
                    .includes(filters.organiser.toLowerCase())) &&
            (!filters.title || event.title?.toLowerCase().includes(filters.title.toLowerCase())) &&
            (!filters.location ||
                event.location_name?.toLowerCase().includes(filters.location.toLowerCase())) &&
            (filters.minPrice === undefined || minEventPrice >= filters.minPrice) &&
            (filters.maxPrice === undefined || maxEventPrice <= filters.maxPrice)
        );
    });
}
