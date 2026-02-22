import { type Prisma, PrismaClient } from "@prisma/client";

declare global {
    var prisma: PrismaClient | undefined;
}

export const db =
    global.prisma ??
    new PrismaClient({
        log: [
            "query",
            "warn",
            "error",
        ],
    });

if (process.env.NODE_ENV !== "production") global.prisma = db;

export default db;

export type { Prisma };

export const BankNames = {
    bob: "bob",
    hdfc: "hdfc",
    icic: "icic",
    kotak: "kotak",
    yesbank: "yesbank",
} as const;

export const TransactionTypes = {
    CANCEL: "CANCEL",
    DEPOSIT: "DEPOSIT",
    PAYOUT: "PAYOUT",
    PURCHASE: "PURCHASE",
    REFUND: "REFUND",
    WITHDRAWAL: "WITHDRAWAL",
} as const;

export const Roles = {
    admin: "admin",
    organiser: "organiser",
    user: "user",
    verifier: "verifier",
} as const;

export const OTPPurposes = {
    forgot_password: "forgot_password",
    signup: "signup",
    ticket_validation: "ticket_validation",
} as const;

export const EventStatuses = {
    cancelled: "cancelled",
    draft: "draft",
    published: "published",
} as const;

export const EventCategory = {
    comedy: "comedy",
    concert: "concert",
    conference: "conference",
    exhibition: "exhibition",
    festival: "festival",
    movie: "movie",
    other: "other",
    sports: "sports",
    theatre: "theatre",
    workshop: "workshop",
} as const;

export const EventGenre = {
    action: "action",
    animation: "animation",
    classical: "classical",
    comedy: "comedy",
    documentary: "documentary",
    drama: "drama",
    fantasy: "fantasy",
    hip_hop: "hip_hop",
    horror: "horror",
    jazz: "jazz",
    other: "other",
    pop: "pop",
    rock: "rock",
    romance: "romance",
    sci_fi: "sci_fi",
    sports_general: "sports_general",
    thriller: "thriller",
} as const;

export const EventLanguage = {
    chinese: "chinese",
    english: "english",
    french: "french",
    german: "german",
    hindi: "hindi",
    japanese: "japanese",
    korean: "korean",
    marathi: "marathi",
    multi_language: "multi_language",
    spanish: "spanish",
    tamil: "tamil",
    telugu: "telugu",
} as const;

export const TicketStatus = {
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
    ISSUED: "ISSUED",
    USED: "USED",
};

// Types
export type BankName = (typeof BankNames)[keyof typeof BankNames];
export type TransactionType = (typeof TransactionTypes)[keyof typeof TransactionTypes];
export type Role = (typeof Roles)[keyof typeof Roles];
export type OTPPurpose = (typeof OTPPurposes)[keyof typeof OTPPurposes];
export type EventStatus = (typeof EventStatuses)[keyof typeof EventStatuses];
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];
export type EventGenre = (typeof EventGenre)[keyof typeof EventGenre];
export type EventLanguage = (typeof EventLanguage)[keyof typeof EventLanguage];
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
