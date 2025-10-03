import z from "zod";

const emailSchema = z.email("Please enter a valid email address").nonempty("Email is required");

export const SignupType = z.object({
    email: emailSchema,
    firstName: z
        .string()
        .min(3, "First name must be at least 3 characters long")
        .max(20, "First name cannot exceed 20 characters")
        .optional(),
    lastName: z
        .string()
        .min(3, "Last name must be at least 3 characters long")
        .max(20, "Last name cannot exceed 20 characters")
        .optional(),
    password: z
        .string()
        .nonempty("Password is required")
        .min(6, "Password must be at least 6 characters long"),
});

export const SigninType = z.object({
    email: emailSchema,
    password: z
        .string()
        .nonempty("Password is required")
        .min(6, "Password must be at least 6 characters long"),
});

export const SignupResponseSchema = z.object({
    message: z.string(),
    token: z.string(),
    user: z
        .object({
            email: z.string().email(),
            firstName: z.string(),
            id: z.string().uuid(),
            lastName: z.string(),
        })
        .optional(),
});

export type SignupResponse = z.infer<typeof SignupResponseSchema>;

export const VerificationType = z.object({
    otp: z.string(),
});

export const allowedStatuses = [
    "draft",
    "published",
    "cancelled",
] as const;

export const EventType = z.object({
    banner_url: z.string().url().optional(),
    description: z.string().min(5),
    location_name: z.string().min(3),
    location_url: z.string().url(),
    organiserId: z.string(),
    status: z.enum([
        "draft",
        "published",
        "cancelled",
    ] as const),
    title: z.string().min(3),
});

export const EventSlotType = z.object({
    capacity: z.number().positive(),
    end_time: z.string().datetime(),
    start_time: z.string().datetime(),
});

const BaseTransactionSchema = z.object({
    amount: z
        .string()
        .regex(/^\d{2,4}$/, "Amount must be 2 to 4 digits")
        .optional(),
    cardNumber: z
        .string()
        .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Card number must be in the format 1234-5678-9012-1234")
        .optional(),
    token: z.string(),
    userId: z.string().optional(),
});

export const WithdrawSchema = BaseTransactionSchema;
export type WithdrawType = z.infer<typeof WithdrawSchema>;

export const DepositSchema = BaseTransactionSchema;
export type DepositType = z.infer<typeof DepositSchema>;

export type TransactionType = {
    id: string;
    amount: string;
    cardId: string;
    type: "WITHDRAWAL" | "DEPOSIT";
    userId: string;
    createdAt: Date;
};

export type WithdrawResponse = {
    message: string;
    transaction?: TransactionType;
};

export type DepositResponse = {
    message: string;
    transaction?: TransactionType;
};

export const InitiateSchema = z.object({
    amount: z.string().regex(/^\d{2,4}$/, "Amount must be 2 to 4 digits"),
    bankName: z.string().optional(),
    cardNumber: z
        .string()
        .regex(
            /^\d{4}-\d{4}-\d{4}-\d{4}$/,
            "Card number must be in the format 1234-5678-9012-1234",
        ),
    token: z.string(),
});

export type InitiateType = z.infer<typeof InitiateSchema>;

export const TicketPurchaseSchema = z.object({
    cardNumber: z
        .string()
        .regex(
            /^\d{4}-\d{4}-\d{4}-\d{4}$/,
            "Card number must be in the format 1234-5678-9012-1234",
        ),
    eventSlotId: z.string(),
    quantity: z.number().positive().min(1).max(15),
    token: z.string(),
});
export type TicketPurchaseType = z.infer<typeof TicketPurchaseSchema>;

export const TicketPurchaseResponse = z.object({
    message: z.string(),
    ticketURL: z.url().optional(),
});

export type TicketPurchaseResponseType = z.infer<typeof TicketPurchaseResponse>;

//New Schema (NO NEED TO MIGRATE to v4 OR WILL MAKE OUR LIFE BAD)

// // Email Schema
// const emailSchema = z.string()
//     .email({ message: "Please enter a valid email address" })
//     .min(1, { message: "Email is required" });

// // Signup Schema
// export const SignupType = z.object({
//     email: emailSchema,
//     firstName: z.string()
//         .min(3, { message: "First name must be at least 3 characters long" })
//         .max(20, { message: "First name cannot exceed 20 characters" })
//         .optional(),
//     lastName: z.string()
//         .min(3, { message: "Last name must be at least 3 characters long" })
//         .max(20, { message: "Last name cannot exceed 20 characters" })
//         .optional(),
//     password: z.string()
//         .min(6, { message: "Password must be at least 6 characters long" }),
// }).strict();

// export const SigninType = z.object({
//     email: emailSchema,
//     password: z.string()
//         .min(6, { message: "Password must be at least 6 characters long" }),
// }).strict();

// // Signup Response Schema
// export const SignupResponseSchema = z.object({
//     message: z.string(),
//     token: z.string(),
//     user: z.object({
//         email: z.string().email(),
//         firstName: z.string(),
//         id: z.string().uuid(),
//         lastName: z.string(),
//     }).optional(),
// }).strict();

// export type SignupResponse = z.infer<typeof SignupResponseSchema>;

// // Verification Schema
// export const VerificationType = z.object({
//     otp: z.string().min(1, { message: "OTP is required" }),
// }).strict();

// // Allowed Statuses
// export const allowedStatuses = ["draft", "published", "cancelled"] as const;

// // Event Schema
// export const EventType = z.object({
//     banner_url: z.string().url().optional(),
//     description: z.string().min(5),
//     location_name: z.string().min(3),
//     location_url: z.string().url(),
//     organiserId: z.string(),
//     status: z.enum(allowedStatuses),
//     title: z.string().min(3),
// }).strict();

// export const EventSlotType = z.object({
//     capacity: z.number().positive(),
//     end_time: z.string().datetime(),
//     start_time: z.string().datetime(),
// }).strict();

// // Base Transaction Schema
// const BaseTransactionSchema = z.object({
//     amount: z.string()
//         .regex(/^\d{2,4}$/, { message: "Amount must be 2 to 4 digits" })
//         .optional(),
//     cardNumber: z.string()
//         .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, { message: "Card number must be in the format 1234-5678-9012-1234" })
//         .optional(),
//     token: z.string(),
//     userId: z.string().optional(),
// }).strict();

// export const WithdrawSchema = BaseTransactionSchema;
// export type WithdrawType = z.infer<typeof WithdrawSchema>;

// export const DepositSchema = BaseTransactionSchema;
// export type DepositType = z.infer<typeof DepositSchema>;

// export type TransactionType = {
//     id: string;
//     amount: string;
//     cardId: string;
//     type: "WITHDRAWAL" | "DEPOSIT";
//     userId: string;
//     createdAt: Date;
// };

// export type WithdrawResponse = {
//     message: string;
//     transaction?: TransactionType;
// };

// export type DepositResponse = {
//     message: string;
//     transaction?: TransactionType;
// };

// // Initiate Schema
// export const InitiateSchema = z.object({
//     amount: z.string().regex(/^\d{2,4}$/, { message: "Amount must be 2 to 4 digits" }),
//     bankName: z.string().optional(),
//     cardNumber: z.string()
//         .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, { message: "Card number must be in the format 1234-5678-9012-1234" }),
//     token: z.string(),
// }).strict();

// export type InitiateType = z.infer<typeof InitiateSchema>;

// // Ticket Purchase Schema
// export const TicketPurchaseSchema = z.object({
//     token: z.string(),
//     eventSlotId: z.string().uuid("Invalid Event Slot ID"),
//     quantity: z.number().int().positive().min(1).max(15),
//     cardNumber: z.string()
//         .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, { message: "Card number must be in the format 1234-5678-9012-1234" }),
// }).strict();

// export type TicketPurchaseType = z.infer<typeof TicketPurchaseSchema>;

// export const TicketPurchaseResponse = z.object({
//     message: z.string(),
//     ticketURL: z.string().url().optional(),
// }).strict();

// export type TicketPurchaseResponseType = z.infer<typeof TicketPurchaseResponse>;
