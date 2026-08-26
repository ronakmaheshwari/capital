/**
 * mocks/resend.mock.ts
 *
 * Mock for the Resend email SDK.
 * Import this in tests that need to suppress/assert email sends.
 */

export const mockResendSend = jest.fn().mockResolvedValue({ id: "mock-email-id-123" });

jest.mock("resend", () => {
    return {
        Resend: jest.fn().mockImplementation(() => ({
            emails: {
                send: mockResendSend,
            },
        })),
    };
});
