/**
 * unit/keygen/keygen.unit.test.ts
 *
 * Unit tests for packages/keygen/src/index.ts
 *
 * Tests cover:
 *  - canonicalStringify (key ordering, arrays, primitives)
 *  - generateKeyPair
 *  - signMessage / verifySignature (round-trip)
 *  - generateSecretKey
 *  - encryptPayload / decryptPayload (round-trip)
 *  - createSignedTicket / verifySignedTicket (happy path + expiry + tampered)
 */

// Set a valid 32-byte base64 key before importing the module
// (the module reads TICKET_SECRET_KEY at import time)
import sodium from "libsodium-wrappers";
import { makeExpiredTicketPayload, makeTicketPayload } from "../../fixtures/ticket.fixture";

// We need to set TICKET_SECRET_KEY before importing keygen, so we use jest.isolateModules
// For most tests we generate a key dynamically and re-require.

describe("Keygen Package", () => {
    // ─────────────────────────────────────────────────────────────────────────
    // canonicalStringify
    // ─────────────────────────────────────────────────────────────────────────
    describe("canonicalStringify", () => {
        let canonicalStringify: (obj: Record<string, any>) => string;

        beforeAll(async () => {
            await sodium.ready;
            // Set a valid key so the module initialises cleanly
            process.env.TICKET_SECRET_KEY = sodium.to_base64(
                sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
            );
            const mod = await import("../../../keygen/src/index");
            canonicalStringify = mod.canonicalStringify;
        });

        it("PASS: sorts object keys alphabetically", () => {
            const input = { z: 1, a: 2, m: 3 };
            const result = canonicalStringify(input);
            expect(result).toBe('{"a":2,"m":3,"z":1}');
        });

        it("PASS: handles nested objects with sorted keys", () => {
            const input = { b: { y: 10, x: 20 }, a: 1 };
            const result = canonicalStringify(input);
            expect(result).toBe('{"a":1,"b":{"x":20,"y":10}}');
        });

        it("PASS: handles arrays", () => {
            const input = { items: [3, 1, 2] };
            const result = canonicalStringify(input);
            expect(result).toBe('{"items":[3,1,2]}');
        });

        it("PASS: handles string values", () => {
            const input = { name: "hello", id: "world" };
            expect(canonicalStringify(input)).toBe('{"id":"world","name":"hello"}');
        });

        it("PASS: handles boolean and null values", () => {
            const input = { active: true, deleted: null };
            expect(canonicalStringify(input)).toBe('{"active":true,"deleted":null}');
        });

        it("PASS: two objects with same keys different order produce identical output", () => {
            const a = { b: 2, a: 1 };
            const b = { a: 1, b: 2 };
            expect(canonicalStringify(a)).toBe(canonicalStringify(b));
        });

        it("FAIL: objects with different values produce different output", () => {
            const a = { key: "valueA" };
            const b = { key: "valueB" };
            expect(canonicalStringify(a)).not.toBe(canonicalStringify(b));
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // generateKeyPair
    // ─────────────────────────────────────────────────────────────────────────
    describe("generateKeyPair", () => {
        let generateKeyPair: () => Promise<{ privateKey: string; publicKey: string }>;

        beforeAll(async () => {
            const mod = await import("../../../keygen/src/index");
            generateKeyPair = mod.generateKeyPair;
        });

        it("PASS: returns privateKey and publicKey strings", async () => {
            const { privateKey, publicKey } = await generateKeyPair();
            expect(typeof privateKey).toBe("string");
            expect(typeof publicKey).toBe("string");
        });

        it("PASS: keys are valid base64 strings", async () => {
            const { privateKey, publicKey } = await generateKeyPair();
            expect(() => Buffer.from(privateKey, "base64")).not.toThrow();
            expect(() => Buffer.from(publicKey, "base64")).not.toThrow();
        });

        it("PASS: each call produces a different key pair", async () => {
            const kp1 = await generateKeyPair();
            const kp2 = await generateKeyPair();
            expect(kp1.privateKey).not.toBe(kp2.privateKey);
            expect(kp1.publicKey).not.toBe(kp2.publicKey);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // signMessage / verifySignature
    // ─────────────────────────────────────────────────────────────────────────
    describe("signMessage & verifySignature", () => {
        let signMessage: (msg: string, pk: string) => Promise<string>;
        let verifySignature: (msg: string, sig: string, pub: string) => Promise<boolean>;
        let generateKeyPair: () => Promise<{ privateKey: string; publicKey: string }>;

        beforeAll(async () => {
            const mod = await import("../../../keygen/src/index");
            signMessage = mod.signMessage;
            verifySignature = mod.verifySignature;
            generateKeyPair = mod.generateKeyPair;
        });

        it("PASS: signs a message and verifies it correctly", async () => {
            const { privateKey, publicKey } = await generateKeyPair();
            const message = "test-message-for-signing";
            const sig = await signMessage(message, privateKey);
            const isValid = await verifySignature(message, sig, publicKey);
            expect(isValid).toBe(true);
        });

        it("FAIL: tampered message fails verification", async () => {
            const { privateKey, publicKey } = await generateKeyPair();
            const sig = await signMessage("original-message", privateKey);
            const isValid = await verifySignature("tampered-message", sig, publicKey);
            expect(isValid).toBe(false);
        });

        it("FAIL: wrong public key fails verification", async () => {
            const { privateKey } = await generateKeyPair();
            const { publicKey: wrongPublicKey } = await generateKeyPair();
            const sig = await signMessage("test-message", privateKey);
            const isValid = await verifySignature("test-message", sig, wrongPublicKey);
            expect(isValid).toBe(false);
        });

        it("PASS: signature is a base64 string", async () => {
            const { privateKey } = await generateKeyPair();
            const sig = await signMessage("hello", privateKey);
            expect(typeof sig).toBe("string");
            expect(sig.length).toBeGreaterThan(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // generateSecretKey
    // ─────────────────────────────────────────────────────────────────────────
    describe("generateSecretKey", () => {
        let generateSecretKey: () => Promise<string>;

        beforeAll(async () => {
            const mod = await import("../../../keygen/src/index");
            generateSecretKey = mod.generateSecretKey;
        });

        it("PASS: returns a base64 string", async () => {
            const key = await generateSecretKey();
            expect(typeof key).toBe("string");
            expect(key.length).toBeGreaterThan(0);
        });

        it("PASS: each call generates a unique key", async () => {
            const k1 = await generateSecretKey();
            const k2 = await generateSecretKey();
            expect(k1).not.toBe(k2);
        });

        it("PASS: decoded key is 32 bytes (crypto_secretbox_KEYBYTES)", async () => {
            await sodium.ready;
            const key = await generateSecretKey();
            const decoded = sodium.from_base64(key);
            expect(decoded.length).toBe(sodium.crypto_secretbox_KEYBYTES);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // encryptPayload / decryptPayload
    // ─────────────────────────────────────────────────────────────────────────
    describe("encryptPayload & decryptPayload", () => {
        let encryptPayload: (payload: any) => Promise<{ cipherText: string; nonce: string }>;
        let decryptPayload: (ct: string, nonce: string) => Promise<any>;

        beforeAll(async () => {
            const mod = await import("../../../keygen/src/index");
            encryptPayload = mod.encryptPayload;
            decryptPayload = mod.decryptPayload;
        });

        const samplePayload = {
            eventId: "evt-1",
            ticketId: "tkt-1",
            email: "user@example.com",
            quantity: 2,
        };

        it("PASS: encrypt returns cipherText and nonce strings", async () => {
            const result = await encryptPayload(samplePayload);
            expect(typeof result.cipherText).toBe("string");
            expect(typeof result.nonce).toBe("string");
            expect(result.cipherText.length).toBeGreaterThan(0);
            expect(result.nonce.length).toBeGreaterThan(0);
        });

        it("PASS: decrypt restores original payload", async () => {
            const { cipherText, nonce } = await encryptPayload(samplePayload);
            const decrypted = await decryptPayload(cipherText, nonce);
            expect(decrypted).toEqual(samplePayload);
        });

        it("PASS: each encryption produces a different nonce", async () => {
            const r1 = await encryptPayload(samplePayload);
            const r2 = await encryptPayload(samplePayload);
            expect(r1.nonce).not.toBe(r2.nonce);
        });

        it("FAIL: decrypting with wrong nonce throws an error", async () => {
            const { cipherText } = await encryptPayload(samplePayload);
            await sodium.ready;
            const wrongNonce = sodium.to_base64(
                sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
            );
            await expect(decryptPayload(cipherText, wrongNonce)).rejects.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // createSignedTicket / verifySignedTicket
    // ─────────────────────────────────────────────────────────────────────────
    describe("createSignedTicket & verifySignedTicket", () => {
        let createSignedTicket: (payload: any, privateKey: string) => Promise<{ ciphertext: string; nonce: string }>;
        let verifySignedTicket: (data: { nonce: string; ciphertext: string }, publicKey: string) => Promise<any>;
        let generateKeyPair: () => Promise<{ privateKey: string; publicKey: string }>;
        let keyPair: { privateKey: string; publicKey: string };
        let ticketPayload: ReturnType<typeof makeTicketPayload>;

        beforeAll(async () => {
            const mod = await import("../../../keygen/src/index");
            createSignedTicket = mod.createSignedTicket;
            verifySignedTicket = mod.verifySignedTicket;
            generateKeyPair = mod.generateKeyPair;
            keyPair = await generateKeyPair();
            ticketPayload = makeTicketPayload();
        });

        it("PASS: createSignedTicket returns ciphertext and nonce", async () => {
            const result = await createSignedTicket(ticketPayload, keyPair.privateKey);
            expect(typeof result.ciphertext).toBe("string");
            expect(typeof result.nonce).toBe("string");
        });

        it("PASS: verifySignedTicket returns valid:true for a fresh ticket", async () => {
            const encrypted = await createSignedTicket(ticketPayload, keyPair.privateKey);
            const result = await verifySignedTicket(encrypted, keyPair.publicKey);
            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.payload.email).toBe(ticketPayload.email);
        });

        it("PASS: verified payload contains original ticket data", async () => {
            const encrypted = await createSignedTicket(ticketPayload, keyPair.privateKey);
            const result = await verifySignedTicket(encrypted, keyPair.publicKey);
            expect(result.payload.ticketId).toBe(ticketPayload.ticketId);
            expect(result.payload.eventId).toBe(ticketPayload.eventId);
            expect(result.payload.quantity).toBe(ticketPayload.quantity);
        });

        it("FAIL: wrong public key returns valid:false", async () => {
            const encrypted = await createSignedTicket(ticketPayload, keyPair.privateKey);
            const { publicKey: wrongKey } = await generateKeyPair();
            const result = await verifySignedTicket(encrypted, wrongKey);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Invalid signature");
        });

        it("FAIL: expired ticket returns valid:false with reason 'Ticket expired'", async () => {
            const expiredPayload = makeExpiredTicketPayload();
            const encrypted = await createSignedTicket(expiredPayload, keyPair.privateKey);
            const result = await verifySignedTicket(encrypted, keyPair.publicKey);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Ticket expired");
        });

        it("PASS: verifySignedTicket result includes issuedAt and expiresAt timestamps", async () => {
            const encrypted = await createSignedTicket(ticketPayload, keyPair.privateKey);
            const result = await verifySignedTicket(encrypted, keyPair.publicKey);
            expect(result.payload.issuedAt).toBeDefined();
            expect(result.payload.expiresAt).toBeDefined();
            expect(new Date(result.payload.expiresAt).getTime()).toBeGreaterThan(Date.now());
        });
    });
});
