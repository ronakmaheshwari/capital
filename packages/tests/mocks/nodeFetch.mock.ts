/**
 * mocks/nodeFetch.mock.ts
 *
 * node-fetch@3 is ESM-only, which breaks ts-jest/CommonJS test runs when it's
 * transitively imported (via apps/http/src/utils/sendTicketEmail.ts). None of
 * the exercised integration tests send real emails, so it's safe to stub.
 */
export default async function fetch(): Promise<never> {
    throw new Error("node-fetch is mocked in the test environment");
}
