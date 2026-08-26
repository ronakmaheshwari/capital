/**
 * mocks/sodium.mock.ts
 *
 * Partial mock for libsodium-wrappers that can be used in tests
 * that need to simulate crypto failures without calling real native code.
 *
 * NOTE: Most keygen unit tests use the REAL sodium (fast enough in Node),
 * so this mock is only imported when you specifically want to simulate failure paths.
 */

export const mockSodiumReady = Promise.resolve();

export const mockSodium = {
    ready: mockSodiumReady,
    crypto_sign_keypair: jest.fn().mockReturnValue({
        privateKey: new Uint8Array(64).fill(1),
        publicKey: new Uint8Array(32).fill(2),
    }),
    crypto_sign_detached: jest.fn().mockReturnValue(new Uint8Array(64).fill(3)),
    crypto_sign_verify_detached: jest.fn().mockReturnValue(true),
    crypto_secretbox_easy: jest.fn().mockReturnValue(new Uint8Array(32).fill(4)),
    crypto_secretbox_open_easy: jest.fn().mockReturnValue(
        new TextEncoder().encode(JSON.stringify({ test: "data" }))
    ),
    randombytes_buf: jest.fn().mockReturnValue(new Uint8Array(24).fill(5)),
    from_base64: jest.fn().mockImplementation((b64: string) => new Uint8Array(Buffer.from(b64, "base64"))),
    to_base64: jest.fn().mockImplementation((buf: Uint8Array) => Buffer.from(buf).toString("base64")),
    from_string: jest.fn().mockImplementation((str: string) => new TextEncoder().encode(str)),
    to_string: jest.fn().mockImplementation((buf: Uint8Array) => new TextDecoder().decode(buf)),
    crypto_secretbox_NONCEBYTES: 24,
    crypto_secretbox_KEYBYTES: 32,
};
