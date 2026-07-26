/**
 * encryptTickets.ts
 *
 * Re-encryption pass for tickets that were purchased in a previous run and
 * whose stored signature may have been created with a now-stale private key
 * or a non-standard payload format.
 *
 * In the normal (fresh) run path, purchaseTickets.ts already calls
 * createSignedTicket() and stores the result. This module handles the
 * idempotent re-run case by re-parsing or re-signing as needed.
 *
 * Production parity:
 *   Calls encryptPayload() from @repo/keygen (XSalsa20-Poly1305, shared TICKET_SECRET_KEY).
 *   This is the same function called internally by createSignedTicket().
 *
 * IEEE Access reproducibility note:
 *   This module is intentionally thin — the heavy lifting is in purchaseTickets.ts.
 *   It exists as a clearly named stage in the pipeline for audit purposes.
 */

import { encryptPayload } from "@repo/keygen";
import type { TicketRecord } from "./purchaseTickets.js";

/**
 * Validation payload format consumed by /validator/validate.
 * Matches the k6 benchmark script exactly.
 */
export interface ValidationPayload {
    ticketId: string;
    ciphertext: string;
    nonce: string;
}

/**
 * Converts TicketRecord array to ValidationPayload array.
 *
 * In the current implementation, purchaseTickets.ts already populates
 * ciphertext and nonce directly from createSignedTicket(), so this
 * function is a straight passthrough with type narrowing.
 *
 * If a record somehow has empty ciphertext (e.g., from a corrupted prior
 * run), this function will throw to prevent silent data loss in the output.
 *
 * @param tickets - Array of ticket records from purchaseTickets.ts
 * @returns ValidationPayload array ready for JSON serialisation
 */
export function buildValidationPayloads(tickets: TicketRecord[]): ValidationPayload[] {
    const payloads: ValidationPayload[] = [];

    for (const ticket of tickets) {
        if (!ticket.ciphertext || !ticket.nonce) {
            // This should never happen in normal operation. Log and skip.
            console.warn(
                `[encryptTickets] WARNING: ticket ${ticket.ticketId} ` +
                    `has empty ciphertext/nonce — skipped.`,
            );
            continue;
        }

        payloads.push({
            ciphertext: ticket.ciphertext,
            nonce: ticket.nonce,
            ticketId: ticket.ticketId,
        });
    }

    return payloads;
}

/**
 * Re-encrypts a plaintext payload object using the application's
 * XSalsa20-Poly1305 secret-box scheme.
 *
 * This is exposed for testing and for the rare case where a ticket's
 * stored payload needs to be refreshed (e.g., after a TICKET_SECRET_KEY
 * rotation in a test environment).
 *
 * @param payload - Any serialisable object to encrypt
 * @returns { ciphertext: string, nonce: string } in Base64
 */
export async function reEncryptPayload(payload: Record<string, unknown>): Promise<{
    ciphertext: string;
    nonce: string;
}> {
    const result = await encryptPayload(payload as unknown as Parameters<typeof encryptPayload>[0]);
    return {
        ciphertext: result.cipherText,
        nonce: result.nonce,
    };
}
