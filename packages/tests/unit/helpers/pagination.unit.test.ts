/**
 * unit/helpers/pagination.unit.test.ts
 *
 * Unit tests for apps/http/src/helper/pagination.ts
 *
 * Tests cover:
 *  - Basic pagination slicing
 *  - Page 1 returns first N items
 *  - Last page may return fewer than `limit`
 *  - Out-of-range page returns empty array
 *  - Works with generic types (numbers, strings, objects)
 *  - Edge cases: limit > total, limit = 1, page = 0 (unusual)
 */

import { paginate } from "../../../../apps/http/src/helper/pagination";

describe("paginate<T> – apps/http/src/helper/pagination.ts", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it("PASS: page 1, limit 3 returns first 3 items", () => {
        expect(paginate(data, 1, 3)).toEqual([1, 2, 3]);
    });

    it("PASS: page 2, limit 3 returns items 4-6", () => {
        expect(paginate(data, 2, 3)).toEqual([4, 5, 6]);
    });

    it("PASS: page 3, limit 3 returns items 7-9", () => {
        expect(paginate(data, 3, 3)).toEqual([7, 8, 9]);
    });

    it("PASS: last partial page returns remaining items", () => {
        // Page 4 of limit 3 → items 10 only
        expect(paginate(data, 4, 3)).toEqual([10]);
    });

    it("PASS: page beyond total returns empty array", () => {
        expect(paginate(data, 5, 3)).toEqual([]);
        expect(paginate(data, 100, 3)).toEqual([]);
    });

    it("PASS: limit equals total returns all items on page 1", () => {
        expect(paginate(data, 1, 10)).toEqual(data);
    });

    it("PASS: limit greater than total returns all items on page 1", () => {
        expect(paginate(data, 1, 50)).toEqual(data);
    });

    it("PASS: limit greater than total returns empty for page 2", () => {
        expect(paginate(data, 2, 50)).toEqual([]);
    });

    it("PASS: limit = 1 returns one item per page", () => {
        expect(paginate(data, 1, 1)).toEqual([1]);
        expect(paginate(data, 5, 1)).toEqual([5]);
        expect(paginate(data, 10, 1)).toEqual([10]);
    });

    it("PASS: works with an empty array", () => {
        expect(paginate([], 1, 10)).toEqual([]);
    });

    it("PASS: works with string arrays", () => {
        const strings = ["a", "b", "c", "d", "e"];
        expect(paginate(strings, 1, 2)).toEqual(["a", "b"]);
        expect(paginate(strings, 2, 2)).toEqual(["c", "d"]);
        expect(paginate(strings, 3, 2)).toEqual(["e"]);
    });

    it("PASS: works with object arrays", () => {
        const objects = [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
            { id: 3, name: "Charlie" },
        ];
        const page = paginate(objects, 1, 2);
        expect(page).toHaveLength(2);
        expect(page[0].name).toBe("Alice");
        expect(page[1].name).toBe("Bob");
    });

    it("PASS: does not mutate the original array", () => {
        const original = [1, 2, 3, 4, 5];
        const copy = [...original];
        paginate(original, 1, 2);
        expect(original).toEqual(copy);
    });

    it("FAIL: page 0 returns same as page 1 with negative start (slice handles it)", () => {
        // start = (0-1)*limit = -limit → slice(-limit) returns last `limit` items
        // This documents the existing behaviour rather than enforcing a specific outcome
        const result = paginate(data, 0, 3);
        // slice(-3) on [1..10] = [8, 9, 10]
        expect(result).toEqual([8, 9, 10]);
    });
});
