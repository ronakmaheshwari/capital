/**
 * unit/helpers/eventFilters.unit.test.ts
 *
 * Unit tests for apps/http/src/helper/eventFilters.ts
 *
 * Tests cover every filter combination in filterEvents():
 *  - status, category, genre, language
 *  - is_online (boolean)
 *  - organiser name (partial, case-insensitive)
 *  - title (partial, case-insensitive)
 *  - location (partial, case-insensitive)
 *  - minPrice / maxPrice
 *  - Decimal price handling (@prisma/client Decimal type)
 *  - Multiple simultaneous filters
 *  - Empty filter object (returns all)
 *  - No matching events (returns empty array)
 */

import { Decimal } from "@prisma/client/runtime/library";
import { filterEvents } from "../../../../apps/http/src/helper/eventFilters";
import {
    makeEvent,
    makeEventWithDecimalPrice,
    makeEventWithPriceRange,
    makeOnlineEvent,
} from "../../fixtures/event.fixture";

describe("filterEvents – apps/http/src/helper/eventFilters.ts", () => {
    // Build a rich set of sample events
    const concertEvent = makeEvent({
        id: "evt-concert",
        title: "Summer Rock Concert",
        status: "published",
        category: "music",
        genre: "rock",
        language: "english",
        is_online: false,
        location_name: "Mumbai Arena",
        organiser: { id: "org-1", first_name: "Alice", last_name: "Smith" },
        slots: [{ id: "s1", price: 500, total_seats: 100, available_seats: 50 }],
    });

    const webinarEvent = makeOnlineEvent({
        id: "evt-webinar",
        title: "React Webinar",
        status: "published",
        category: "technology",
        genre: "tech",
        language: "english",
        is_online: true,
        location_name: "Online",
        organiser: { id: "org-2", first_name: "Bob", last_name: "Jones" },
        slots: [{ id: "s2", price: 100, total_seats: 500, available_seats: 400 }],
    });

    const draftEvent = makeEvent({
        id: "evt-draft",
        title: "Draft Jazz Night",
        status: "draft",
        category: "music",
        genre: "jazz",
        language: "hindi",
        is_online: false,
        location_name: "Delhi Club",
        organiser: { id: "org-1", first_name: "Alice", last_name: "Smith" },
        slots: [{ id: "s3", price: 200, total_seats: 50, available_seats: 50 }],
    });

    const expensiveEvent = makeEventWithPriceRange(2000, 5000);

    const events = [concertEvent, webinarEvent, draftEvent, expensiveEvent];

    // ─── Empty filter ─────────────────────────────────────────────────────────
    it("PASS: empty filter returns all events", () => {
        expect(filterEvents(events, {})).toHaveLength(events.length);
    });

    // ─── Status filter ────────────────────────────────────────────────────────
    it("PASS: filters by status=published returns only published events", () => {
        const result = filterEvents(events, { status: "published" });
        expect(result.every((e) => e.status === "published")).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    it("PASS: filters by status=draft returns only draft events", () => {
        const result = filterEvents(events, { status: "draft" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("evt-draft");
    });

    it("FAIL: unknown status returns empty array", () => {
        expect(filterEvents(events, { status: "nonexistent" })).toHaveLength(0);
    });

    // ─── Category filter ──────────────────────────────────────────────────────
    it("PASS: filters by category=music returns only music events", () => {
        const result = filterEvents(events, { category: "music" });
        expect(result.every((e) => e.category === "music")).toBe(true);
    });

    it("PASS: filters by category=technology returns webinar", () => {
        const result = filterEvents(events, { category: "technology" });
        expect(result.some((e) => e.id === "evt-webinar")).toBe(true);
    });

    // ─── Genre filter ─────────────────────────────────────────────────────────
    it("PASS: filters by genre=rock returns concert only", () => {
        const result = filterEvents(events, { genre: "rock" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("evt-concert");
    });

    it("PASS: filters by genre=jazz returns draft event", () => {
        const result = filterEvents(events, { genre: "jazz" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("evt-draft");
    });

    // ─── Language filter ──────────────────────────────────────────────────────
    it("PASS: filters by language=hindi returns draft event", () => {
        const result = filterEvents(events, { language: "hindi" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("evt-draft");
    });

    it("PASS: filters by language=english returns concert and webinar", () => {
        const result = filterEvents(events, { language: "english" });
        expect(result.every((e) => e.language === "english")).toBe(true);
    });

    // ─── isOnline filter ──────────────────────────────────────────────────────
    it("PASS: filters isOnline=true returns only online events", () => {
        const result = filterEvents(events, { isOnline: true });
        expect(result.every((e) => e.is_online === true)).toBe(true);
    });

    it("PASS: filters isOnline=false returns only offline events", () => {
        const result = filterEvents(events, { isOnline: false });
        expect(result.every((e) => e.is_online === false)).toBe(true);
    });

    it("PASS: isOnline=undefined (not set) does not filter by online status", () => {
        const result = filterEvents(events, {});
        expect(result.length).toBe(events.length);
    });

    // ─── Organiser filter ─────────────────────────────────────────────────────
    it("PASS: filters by organiser first name (case-insensitive, partial)", () => {
        const result = filterEvents(events, { organiser: "alice" });
        expect(result.every((e) => e.organiser?.first_name.toLowerCase().includes("alice"))).toBe(true);
    });

    it("PASS: filters by organiser partial name match", () => {
        const result = filterEvents(events, { organiser: "BOB" });
        expect(result.some((e) => e.id === "evt-webinar")).toBe(true);
    });

    it("FAIL: non-matching organiser returns empty", () => {
        expect(filterEvents(events, { organiser: "zzznomatch" })).toHaveLength(0);
    });

    // ─── Title filter ─────────────────────────────────────────────────────────
    it("PASS: filters by title (case-insensitive, partial)", () => {
        const result = filterEvents(events, { title: "rock" });
        expect(result.some((e) => e.id === "evt-concert")).toBe(true);
    });

    it("PASS: filters by title uppercase match", () => {
        const result = filterEvents(events, { title: "WEBINAR" });
        expect(result.some((e) => e.id === "evt-webinar")).toBe(true);
    });

    it("FAIL: non-matching title returns empty", () => {
        expect(filterEvents(events, { title: "abcxyz" })).toHaveLength(0);
    });

    // ─── Location filter ──────────────────────────────────────────────────────
    it("PASS: filters by location partial match (case-insensitive)", () => {
        const result = filterEvents(events, { location: "mumbai" });
        expect(result.some((e) => e.id === "evt-concert")).toBe(true);
    });

    it("PASS: filters by location DELHI (uppercase)", () => {
        const result = filterEvents(events, { location: "DELHI" });
        expect(result.some((e) => e.id === "evt-draft")).toBe(true);
    });

    // ─── Price filters ────────────────────────────────────────────────────────
    it("PASS: filters by minPrice removes cheap events", () => {
        const result = filterEvents(events, { minPrice: 1000 });
        result.forEach((e) => {
            const prices = (e.slots || []).map((s: any) => Number(s.price));
            const min = Math.min(...prices);
            expect(min).toBeGreaterThanOrEqual(1000);
        });
    });

    it("PASS: filters by maxPrice removes expensive events", () => {
        const result = filterEvents(events, { maxPrice: 300 });
        result.forEach((e) => {
            const prices = (e.slots || []).map((s: any) => Number(s.price));
            const max = Math.max(...prices);
            expect(max).toBeLessThanOrEqual(300);
        });
    });

    it("PASS: filters by minPrice=500 and maxPrice=600 narrows to concert", () => {
        const result = filterEvents(events, { minPrice: 500, maxPrice: 600 });
        expect(result.some((e) => e.id === "evt-concert")).toBe(true);
    });

    it("PASS: handles Decimal price type from Prisma", () => {
        const decimalEvent = makeEventWithDecimalPrice(750);
        const result = filterEvents([decimalEvent], { minPrice: 700, maxPrice: 800 });
        expect(result).toHaveLength(1);
    });

    it("FAIL: minPrice higher than all events returns empty array", () => {
        expect(filterEvents(events, { minPrice: 999999 })).toHaveLength(0);
    });

    // ─── Combined filters ─────────────────────────────────────────────────────
    it("PASS: status + category + language combined filter works", () => {
        const result = filterEvents(events, {
            status: "published",
            category: "music",
            language: "english",
        });
        expect(result.every((e) => e.status === "published" && e.category === "music")).toBe(true);
    });

    it("PASS: isOnline=true + category=technology returns webinar only", () => {
        const result = filterEvents(events, { isOnline: true, category: "technology" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("evt-webinar");
    });

    it("PASS: events with no slots get price 0 (min/max both 0)", () => {
        const noSlotEvent = makeEvent({ slots: [], id: "evt-noslots" });
        const result = filterEvents([noSlotEvent], { minPrice: 0, maxPrice: 0 });
        expect(result).toHaveLength(1);
    });
});
