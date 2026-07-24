/**
 * index.ts — Benchmark Data Generator Orchestrator
 *
 * Entry point for the IEEE Access benchmark data generator.
 * Executes all pipeline stages in sequence, reports progress to stdout,
 * and writes validation-data.json + failed-users.json on completion.
 *
 * Usage (from monorepo root):
 *   npx ts-node --esm packages/benchmark/src/generator/index.ts
 *
 * Or via the package script:
 *   cd packages/benchmark && npm run generate
 *
 * Pipeline stages:
 *   1. Load + validate environment
 *   2. Create organiser
 *   3. Create benchmark event + slot
 *   4. Create benchmark users (with Ed25519 keypairs)
 *   5. Create wallets for all users
 *   6. Create cards for all users
 *   7. Purchase tickets for all users
 *   8. Build validation payloads
 *   9. Generate JWTs + assemble final dataset
 *  10. Write validation-data.json + failed-users.json
 *
 * IEEE Access reproducibility note:
 *   Re-running is safe (idempotent) — all stages skip already-created resources.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

// Resolve __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from packages/benchmark/ then apps/http/ as fallback
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../apps/http/.env") });

import config from "./benchmark.config.js";
import { createOrGetOrganiser } from "./createOrganiser.js";
import { createOrGetBenchmarkEvent } from "./createEvent.js";
import { createBenchmarkUsers } from "./createUsers.js";
import { ensureWallets } from "./createWallets.js";
import { createBenchmarkCards } from "./createCards.js";
import { purchaseBenchmarkTickets } from "./purchaseTickets.js";
import { buildValidationPayloads } from "./encryptTickets.js";
import { createBenchmarkVerifiers } from "./createVerifiers.js";
import {
    generateValidationDataset,
    writeValidationData,
} from "./generateValidationData.js";
import db from "@repo/db";

// ── Environment validation ────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = parseInt(
    process.env.SALT_ROUNDS ?? process.env.saltrounds ?? "10",
    10,
);

if (!JWT_SECRET) {
    console.error(
        "[generator] FATAL: JWT_SECRET is not set.\n" +
        "  Set it in packages/benchmark/.env or apps/http/.env.",
    );
    process.exit(1);
}
if (!process.env.SECRET_SALT) {
    console.error("[generator] FATAL: SECRET_SALT is not set.");
    process.exit(1);
}
if (!process.env.TICKET_SECRET_KEY) {
    console.error("[generator] FATAL: TICKET_SECRET_KEY is not set.");
    process.exit(1);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const c = {
    bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
    green: (s: string) => `\x1b[32m${s}\x1b[0m`,
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

function formatDuration(ms: number): string {
    if (ms < 1_000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60_000);
    const secs = ((ms % 60_000) / 1_000).toFixed(0);
    return `${mins}m ${secs}s`;
}

function progressBar(completed: number, total: number, width = 30): string {
    const pct = total > 0 ? completed / total : 0;
    const filled = Math.round(pct * width);
    const bar = "█".repeat(filled) + "░".repeat(width - filled);
    return `[${bar}] ${completed}/${total} (${(pct * 100).toFixed(1)}%)`;
}

function header(step: number, label: string): void {
    const pad = "─".repeat(Math.max(0, 52 - label.length));
    console.log(`\n${c.bold(c.cyan(`── Step ${step}: ${label}`))} ${pad}`);
}

function ok(msg: string): void {
    console.log(`  ${c.green("✔")} ${msg}`);
}

function warn(msg: string): void {
    console.log(`  ${c.yellow("⚠")} ${msg}`);
}

// ── Output paths ──────────────────────────────────────────────────────────────

// results/ directory sits at packages/benchmark/results/
const OUTPUT_DIR = path.resolve(__dirname, "../../results");
const VALIDATION_DATA_PATH = path.resolve(OUTPUT_DIR, config.output);
const FAILED_USERS_PATH = path.resolve(OUTPUT_DIR, config.failedOutput);

// ── Main orchestrator ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const globalStart = Date.now();

    console.log(
        c.bold("\n╔══════════════════════════════════════════════════════════╗\n") +
        c.bold("║     Capital Benchmark Data Generator — IEEE Access       ║\n") +
        c.bold("╚══════════════════════════════════════════════════════════╝"),
    );
    console.log(
        c.dim(`  Config : ${config.users} users | concurrency=${config.concurrency}\n`) +
        c.dim(`  Output : ${VALIDATION_DATA_PATH}\n`),
    );

    const allFailures: Array<{ email: string; reason: string }> = [];

    // ── Step 1: Organiser ────────────────────────────────────────────────────
    header(1, "Create Organiser");
    const t1 = Date.now();
    const organiser = await createOrGetOrganiser(config, SALT_ROUNDS);
    ok(`Organiser ready: ${c.cyan(organiser.email)} ${c.dim(`(id: ${organiser.id}) ${formatDuration(Date.now() - t1)}`)}`);

    // ── Step 2: Event + Slot ─────────────────────────────────────────────────
    header(2, "Create Event & Slot");
    const t2 = Date.now();
    const slot = await createOrGetBenchmarkEvent(organiser, config);
    ok(
        `Event: "${c.cyan(slot.eventTitle)}" | Slot: ${c.cyan(slot.slotId)}\n` +
        `    Cap: ${slot.capacity}  |  Price: ₹${slot.price}  ${c.dim(formatDuration(Date.now() - t2))}`,
    );

    // ── Step 2b: Verifiers ───────────────────────────────────────────────────
    header(3, "Create Verifiers");
    const tv = Date.now();
    const verifiers = await createBenchmarkVerifiers(config, SALT_ROUNDS, JWT_SECRET);
    ok(`Verifiers ready: ${c.cyan(String(verifiers.length))}  ${c.dim(formatDuration(Date.now() - tv))}`);

    // ── Step 4: Users ────────────────────────────────────────────────────────
    header(4, "Create Users");
    const t3 = Date.now();
    process.stdout.write("  ");

    const { users, failed: userFailed } = await createBenchmarkUsers(
        config,
        SALT_ROUNDS,
        (completed, total) => {
            process.stdout.write(`\r  ${progressBar(completed, total)}`);
        },
    );

    process.stdout.write("\n");
    allFailures.push(...userFailed);
    ok(
        `Users created: ${c.cyan(String(users.length))}` +
        (userFailed.length > 0 ? `  ${c.yellow(`(${userFailed.length} failed)`)}` : "") +
        `  ${c.dim(formatDuration(Date.now() - t3))}`,
    );

    if (users.length === 0) {
        console.error(c.red("\n  FATAL: No users were created. Aborting."));
        process.exit(1);
    }

    // ── Step 5: Wallets ──────────────────────────────────────────────────────
    header(5, "Ensure Wallets");
    const t4 = Date.now();
    process.stdout.write("  ");

    await ensureWallets(users, config.concurrency, (completed, total) => {
        process.stdout.write(`\r  ${progressBar(completed, total)}`);
    });

    process.stdout.write("\n");
    ok(`Wallets ensured: ${c.cyan(String(users.length))}  ${c.dim(formatDuration(Date.now() - t4))}`);

    // ── Step 6: Cards ────────────────────────────────────────────────────────
    header(6, "Create Cards");
    const t5 = Date.now();
    process.stdout.write("  ");

    const cardMap = await createBenchmarkCards(users, config, (completed, total) => {
        process.stdout.write(`\r  ${progressBar(completed, total)}`);
    });

    process.stdout.write("\n");
    ok(
        `Cards created: ${c.cyan(String(cardMap.size))} ` +
        c.dim(`(balance ₹${config.cardBalance} each)  ${formatDuration(Date.now() - t5)}`),
    );

    // ── Step 7: Purchase Tickets ─────────────────────────────────────────────
    header(7, "Purchase Tickets");
    const t6 = Date.now();
    process.stdout.write("  ");

    const { tickets, failures: ticketFailed } = await purchaseBenchmarkTickets(
        users,
        cardMap,
        slot,
        config,
        (completed, total) => {
            process.stdout.write(`\r  ${progressBar(completed, total)}`);
        },
    );

    process.stdout.write("\n");
    allFailures.push(...ticketFailed);
    ok(
        `Tickets purchased: ${c.cyan(String(tickets.length))}` +
        (ticketFailed.length > 0 ? `  ${c.yellow(`(${ticketFailed.length} failed)`)}` : "") +
        `  ${c.dim(formatDuration(Date.now() - t6))}`,
    );

    // ── Step 8: Build Validation Payloads ────────────────────────────────────
    header(8, "Build Validation Payloads");
    const t7 = Date.now();
    const payloads = buildValidationPayloads(tickets);
    ok(`Validation payloads: ${c.cyan(String(payloads.length))}  ${c.dim(formatDuration(Date.now() - t7))}`);

    // ── Step 9: Generate JWTs + Assemble Records ─────────────────────────────
    header(9, "Generate JWT Tokens");
    const t8 = Date.now();
    process.stdout.write("  ");

    const records = await generateValidationDataset(
        users,
        tickets,
        payloads,
        verifiers,
        config,
        JWT_SECRET,
        (completed, total) => {
            process.stdout.write(`\r  ${progressBar(completed, total)}`);
        },
    );

    process.stdout.write("\n");
    ok(`JWT tokens generated: ${c.cyan(String(records.length))}  ${c.dim(formatDuration(Date.now() - t8))}`);

    // ── Step 10: Write Output Files ──────────────────────────────────────────
    header(10, "Write Output Files");

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await writeValidationData(records, VALIDATION_DATA_PATH);
    ok(`${c.cyan(config.output)} → ${records.length} records`);
    ok(`Path: ${c.dim(VALIDATION_DATA_PATH)}`);

    await fs.writeFile(FAILED_USERS_PATH, JSON.stringify(allFailures, null, 2), "utf-8");
    if (allFailures.length > 0) {
        warn(`${allFailures.length} failure(s) logged → ${FAILED_USERS_PATH}`);
    } else {
        ok(`${c.cyan(config.failedOutput)} → 0 failures`);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalElapsed = Date.now() - globalStart;
    console.log(
        "\n" + c.bold("╔══════════════════════════════════════════════════════════╗") + "\n" +
        c.bold("║") + c.green("  ✔  Benchmark generation complete!                      ") + c.bold("║") + "\n" +
        c.bold("╠══════════════════════════════════════════════════════════╣") + "\n" +
        c.bold("║") + `  ${"Users created:".padEnd(24)}${c.cyan(String(users.length)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Cards created:".padEnd(24)}${c.cyan(String(cardMap.size)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Wallets ensured:".padEnd(24)}${c.cyan(String(users.length)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Tickets purchased:".padEnd(24)}${c.cyan(String(tickets.length)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Validation payloads:".padEnd(24)}${c.cyan(String(payloads.length)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"JSON records written:".padEnd(24)}${c.cyan(String(records.length)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Failed users:".padEnd(24)}${(allFailures.length > 0 ? c.yellow(String(allFailures.length)) : c.green("0")).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("║") + `  ${"Elapsed time:".padEnd(24)}${c.cyan(formatDuration(totalElapsed)).padEnd(32)}` + c.bold("║") + "\n" +
        c.bold("╚══════════════════════════════════════════════════════════╝") + "\n",
    );
}

// ── Run ───────────────────────────────────────────────────────────────────────

main()
    .catch((err: unknown) => {
        console.error(c.red("\n[generator] FATAL ERROR:"), err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
