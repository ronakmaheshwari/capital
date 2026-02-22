import db, { type BankName } from "@repo/db";

const BankPrefixes: Record<BankName, string> = {
    bob: "7890",
    hdfc: "5210",
    icic: "6543",
    kotak: "4321",
    yesbank: "3456",
};

async function generateUniqueCardNumber(bankName: BankName): Promise<string> {
    let cardNumber: string;
    let exists = true;

    while (exists) {
        const prefix = BankPrefixes[bankName];
        const segments = Array.from(
            {
                length: 3,
            },
            () => Math.floor(1000 + Math.random() * 9000),
        );
        cardNumber = [
            prefix,
            ...segments,
        ].join("-");

        const existingCard = await db.card.findUnique({
            where: {
                card_number: cardNumber,
            },
        });

        if (!existingCard) {
            exists = false;
        }
    }

    return cardNumber;
}

function getRandomBalance(): number {
    return parseFloat((1000 + Math.random() * 10000).toFixed(2));
}

export async function createCardsForUser(userId: string) {
    const banks = Object.keys(BankPrefixes) as BankName[];

    const selectedBanks = banks.sort(() => 0.5 - Math.random()).slice(0, 4);

    const cards = [];
    for (const bankName of selectedBanks) {
        const cardNumber = await generateUniqueCardNumber(bankName);

        cards.push({
            balance: getRandomBalance(),
            bank_name: bankName,
            card_number: cardNumber,
            userId,
        });
    }

    await db.card.createMany({
        data: cards,
    });

    return cards;
}

export async function createCardForOrganiser(userId: string): Promise<boolean> {
    try {
        const banks = Object.keys(BankPrefixes) as BankName[];
        const selectedBank = banks[Math.floor(Math.random() * banks.length)];
        const cardNumber = await generateUniqueCardNumber(selectedBank);
        await db.card.create({
            data: {
                balance: getRandomBalance(),
                bank_name: selectedBank,
                card_number: cardNumber,
                userId,
            },
        });
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// async function runTest() {
//     const userId = "4a8f79b0-d016-4f6a-bc34-763c9e8c9139";

//     const cards = await createCardsForUser(userId);

//     console.log("Generated Cards:", cards);

//     console.assert(cards.length === 4, "Should create 4 cards");

//     const bankNames = cards.map(card => card.bank_name);
//     const uniqueBanks = new Set(bankNames);
//     console.assert(uniqueBanks.size === 4, "Banks should be unique");

//     const formatRegex = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
//     for (const card of cards) {
//         console.assert(formatRegex.test(card.card_number), `Invalid format for ${card.card_number}`);
//     }

//     console.log("✅ All tests passed!");
// }

// runTest().catch(console.error);
