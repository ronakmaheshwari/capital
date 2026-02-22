import {
    BankName,
    Currency,
    EventCategory,
    EventGenre,
    EventLanguage,
    EventStatus,
    Prisma,
    PrismaClient,
    Role,
    TransactionType,
} from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const POSTER_SOURCES: Record<EventGenre, Partial<Record<EventLanguage, string[]>>> = {
    action: {
        english: [
            "tt0137523",
            "tt0468569",
            "tt2911666",
            "tt4154796",
            "tt1375666",
            "tt1877830",
            "tt0120815",
            "tt0088247",
            "tt0110413",
            "tt0107290",
        ],
        hindi: [
            "tt12844910",
            "tt8178634",
            "tt15654328",
            "tt10701074",
            "tt10295212",
            "tt9389998",
            "tt10811166",
            "tt8983202",
            "tt15097216",
            "tt14208870",
        ],
        japanese: [
            "tt5311514",
            "tt6751668",
            "tt0816692",
            "tt4154796",
            "tt0468569",
            "tt0137523",
            "tt0088763",
            "tt0096895",
            "tt0107290",
            "tt1877830",
        ],
        korean: [
            "tt4154796",
            "tt6751668",
            "tt8579674",
            "tt9263514",
            "tt1219827",
            "tt1375666",
            "tt0468569",
            "tt2911666",
            "tt4154664",
            "tt4633694",
        ],
        multi_language: [
            "tt4154796",
            "tt1375666",
            "tt0816692",
            "tt0468569",
            "tt0137523",
            "tt2911666",
            "tt1877830",
            "tt0107290",
            "tt0088763",
            "tt0096895",
        ],
        tamil: [
            "tt11385128",
            "tt4987556",
            "tt10579952",
            "tt11911336",
            "tt1262416",
            "tt1305797",
            "tt15654328",
            "tt8760670",
            "tt12844910",
            "tt8178634",
        ],
        telugu: [
            "tt8178634",
            "tt8772262",
            "tt2631186",
            "tt7466810",
            "tt15501640",
            "tt11604542",
            "tt12837256",
            "tt13622952",
            "tt14218138",
            "tt14359978",
        ],
    },

    animation: {
        english: [
            "tt2948356",
            "tt6105098",
            "tt4633694",
            "tt2380307",
            "tt2096673",
            "tt3606756",
            "tt2294629",
            "tt0398286",
            "tt0317219",
            "tt0110357",
        ],
        japanese: [
            "tt0245429",
            "tt5311514",
            "tt8075192",
            "tt0096283",
            "tt0347149",
            "tt0119698",
            "tt0092067",
            "tt0876563",
            "tt1308129",
            "tt5109784",
        ],
        multi_language: [
            "tt2948356",
            "tt6105098",
            "tt4633694",
            "tt2380307",
            "tt2096673",
            "tt3606756",
            "tt2294629",
            "tt0398286",
            "tt0317219",
            "tt0110357",
        ],
    },
    classical: {
        multi_language: [
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
            "tt0118799",
            "tt0086879",
            "tt0038650",
            "tt0047478",
            "tt0108052",
        ],
    },

    comedy: {
        english: [
            "tt0107048",
            "tt0110912",
            "tt0103639",
            "tt0365748",
            "tt0088763",
            "tt0241527",
            "tt0110357",
            "tt0080684",
            "tt0083866",
            "tt0116282",
        ],
        hindi: [
            "tt1562872",
            "tt1292703",
            "tt2338151",
            "tt1980986",
            "tt1954470",
            "tt5474036",
            "tt6967980",
            "tt8108198",
            "tt6862546",
            "tt1187043",
        ],
        multi_language: [
            "tt0107048",
            "tt0110912",
            "tt0103639",
            "tt0365748",
            "tt0088763",
            "tt0241527",
            "tt0110357",
            "tt0080684",
            "tt0083866",
            "tt0116282",
        ],
    },

    documentary: {
        english: [
            "tt2395427",
            "tt1028532",
            "tt1631867",
            "tt1149362",
            "tt0848228",
            "tt0317248",
            "tt2395427",
            "tt1305797",
            "tt4154796",
            "tt1375666",
        ],
        hindi: [
            "tt6845886",
            "tt8267604",
            "tt13534808",
            "tt9420648",
            "tt13391604",
            "tt14487556",
            "tt6845886",
            "tt8267604",
            "tt13534808",
            "tt9420648",
        ],
        multi_language: [
            "tt2395427",
            "tt1028532",
            "tt1631867",
            "tt1149362",
            "tt0848228",
            "tt0317248",
            "tt2395427",
            "tt1305797",
            "tt4154796",
            "tt1375666",
        ],
    },

    drama: {
        english: [
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
            "tt0118799",
            "tt0086879",
            "tt0133093",
            "tt0038650",
            "tt0047478",
        ],
        hindi: [
            "tt1562872",
            "tt2082197",
            "tt4849438",
            "tt8983160",
            "tt10295212",
            "tt8267604",
            "tt9420648",
            "tt13391604",
            "tt13534808",
            "tt14487556",
        ],
        korean: [
            "tt6751668",
            "tt8579674",
            "tt1219827",
            "tt0468569",
            "tt1375666",
            "tt0137523",
            "tt0109830",
            "tt0111161",
            "tt0086879",
            "tt0120689",
        ],
        marathi: [
            "tt5312232",
            "tt8045736",
            "tt10209318",
            "tt9860464",
            "tt13131074",
            "tt13391604",
            "tt13622952",
            "tt10811166",
            "tt10964430",
            "tt8999882",
        ],
        multi_language: [
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
            "tt0118799",
            "tt0086879",
            "tt0133093",
            "tt0038650",
            "tt0047478",
        ],
        tamil: [
            "tt11385128",
            "tt4987556",
            "tt10579952",
            "tt11911336",
            "tt8760670",
            "tt12844910",
            "tt15654328",
            "tt8178634",
            "tt1305797",
            "tt1262416",
        ],
    },
    fantasy: {
        multi_language: [
            "tt0120737",
            "tt0167260",
            "tt0088763",
            "tt0816692",
            "tt4154796",
            "tt1877830",
            "tt0096895",
            "tt0107290",
            "tt0110413",
            "tt0133093",
        ],
    },
    hip_hop: {
        multi_language: [
            "tt0468569",
            "tt1375666",
            "tt0137523",
            "tt4154796",
            "tt1877830",
            "tt2911666",
            "tt0816692",
            "tt0088763",
            "tt0107290",
            "tt0096895",
        ],
    },
    horror: {
        multi_language: [
            "tt0078748",
            "tt0081505",
            "tt7784604",
            "tt1179933",
            "tt0084787",
            "tt0102926",
            "tt0137523",
            "tt0468569",
            "tt1877830",
            "tt0816692",
        ],
    },
    jazz: {
        multi_language: [
            "tt2582802",
            "tt0057012",
            "tt0045152",
            "tt0086879",
            "tt0108052",
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
        ],
    },
    other: {
        multi_language: [
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
            "tt0118799",
            "tt0086879",
            "tt0133093",
            "tt0038650",
            "tt0047478",
        ],
    },
    pop: {
        multi_language: [
            "tt2865120",
            "tt0111161",
            "tt0365265",
            "tt0100935",
            "tt0117500",
            "tt0088258",
            "tt0103874",
            "tt0120601",
            "tt0113627",
            "tt0068646",
        ],
    },
    rock: {
        multi_language: [
            "tt0117500",
            "tt0100935",
            "tt0080455",
            "tt0365265",
            "tt0113627",
            "tt0088258",
            "tt0103874",
            "tt0120601",
            "tt0111161",
            "tt0068646",
        ],
    },

    romance: {
        multi_language: [
            "tt0332280",
            "tt0118799",
            "tt0109830",
            "tt0120338",
            "tt0110413",
            "tt0034583",
            "tt0133093",
            "tt0096895",
            "tt0107290",
            "tt0088763",
        ],
    },
    sci_fi: {
        multi_language: [
            "tt0816692",
            "tt1375666",
            "tt0133093",
            "tt0088763",
            "tt0096895",
            "tt0468569",
            "tt4154796",
            "tt1877830",
            "tt0107290",
            "tt0110413",
        ],
    },
    sports_general: {
        multi_language: [
            "tt0108052",
            "tt0111161",
            "tt0068646",
            "tt0109830",
            "tt0120689",
            "tt0169547",
            "tt0118799",
            "tt0086879",
            "tt0038650",
            "tt0047478",
        ],
    },
    thriller: {
        multi_language: [
            "tt0102926",
            "tt0137523",
            "tt0468569",
            "tt1375666",
            "tt1877830",
            "tt2911666",
            "tt0816692",
            "tt0088763",
            "tt0107290",
            "tt0096895",
        ],
    },
};

const IMDB_TITLES: Record<string, string> = {
    tt0034583: "Casablanca",
    tt0068646: "The Godfather",

    // HORROR
    tt0078748: "Alien",
    tt0081505: "The Shining",
    tt0086879: "Amadeus",
    tt0088247: "The Terminator",
    tt0088763: "Back to the Future",
    tt0096895: "Batman",
    tt0103639: "Aladdin",

    // COMEDY
    tt0107048: "Groundhog Day",
    tt0107290: "Jurassic Park",
    tt0109830: "Forrest Gump",
    tt0110413: "Leon: The Professional",
    tt0110912: "Pulp Fiction",

    // DRAMA
    tt0111161: "The Shawshank Redemption",
    tt0118799: "Life Is Beautiful",

    // ROMANCE
    tt0120338: "Titanic",
    tt0120689: "The Green Mile",

    // FANTASY
    tt0120737: "The Lord of the Rings: The Fellowship of the Ring",
    tt0120815: "Saving Private Ryan",
    tt0133093: "The Matrix",
    // ACTION
    tt0137523: "Fight Club",
    tt0167260: "The Lord of the Rings: The Two Towers",
    tt0169547: "American Beauty",
    tt0332280: "The Notebook",
    tt0365748: "Shaun of the Dead",
    tt0468569: "The Dark Knight",

    // SCI-FI
    tt0816692: "Interstellar",
    tt1375666: "Inception",
    tt1877830: "The Batman",
    tt2096673: "Inside Out",
    tt2380307: "Coco",
    tt2911666: "John Wick",

    // ANIMATION
    tt2948356: "Zootopia",
    tt4154796: "Avengers: Endgame",
    tt4633694: "Spider-Man: Into the Spider-Verse",
    tt6105098: "The Lion King",
    tt7784604: "Hereditary",
};

function getMovieTitle(imdbId: string) {
    return IMDB_TITLES[imdbId] ?? "Kantara Movie";
}

const prisma = new PrismaClient({
    log: [
        "error",
    ],
});

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];

const posterCache = new Map<string, string>();

async function fetchPoster(imdbId: string) {
    if (posterCache.has(imdbId)) return posterCache.get(imdbId)!;

    try {
        const res = await fetch(
            `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${imdbId}`,
        );
        const data = await res.json();
        const poster =
            data?.Poster && data.Poster !== "N/A"
                ? data.Poster
                : "https://theposterdb.com/api/assets/9798/view";

        posterCache.set(imdbId, poster);
        return poster;
    } catch {
        return "https://theposterdb.com/api/assets/9798/view";
    }
}

async function getMovieData(genre: EventGenre, language: EventLanguage) {
    const list =
        POSTER_SOURCES[genre]?.[language] ??
        POSTER_SOURCES[genre]?.multi_language ??
        POSTER_SOURCES[genre]?.english;

    const imdbId = list?.length ? pick(list) : null;

    return {
        imdbId,
        poster: imdbId ? await fetchPoster(imdbId) : "https://theposterdb.com/api/assets/9798/view",
        title: imdbId ? getMovieTitle(imdbId) : "Kantara",
    };
}

const LOCATIONS = [
    {
        map: "https://maps.google.com?q=Mumbai",
        name: "Mumbai Convention Center",
    },
    {
        map: "https://maps.google.com?q=Pune",
        name: "Wadia College of Engineering",
    },
    {
        map: "https://maps.google.com?q=Bangalore",
        name: "Bangalore Palace Grounds",
    },
    {
        map: "https://maps.google.com?q=Delhi",
        name: "Delhi Pragati Maidan",
    },
    {
        map: "https://maps.google.com?q=Hyderabad",
        name: "Hyderabad HITEX",
    },
    {
        map: "https://maps.google.com?q=Chennai",
        name: "Chennai Trade Centre",
    },
    {
        map: "https://maps.google.com?q=Kolkata",
        name: "Kolkata Biswa Bangla",
    },
];

export const EVENT_TITLES = [
    "Tomorrowland",
    "Coachella Valley Music and Arts Festival",
    "Lollapalooza India",
    "Sunburn Festival",
    "NH7 Weekender",
    "Ultra Music Festival",
    "Boiler Room Live",
    "Ziro Music Festival",
    "Comic Con India",
    "Indian Premier League Opening Ceremony",
    "Arijit Singh Live in Concert",
    "Diljit Dosanjh – Born To Shine Tour",
    "Coldplay: Music of the Spheres",
    "Ed Sheeran Mathematics Tour",
    "DIVINE – Gully Gang Live",
    "Zakir Khan – Manpasand Stand-Up Special",
    "Vir Das: Mind Fool Tour",
    "Biswa Kalyan Rath Live",
];

export const EVENT_DESCRIPTIONS = [
    "Experience an unforgettable evening filled with energy, emotion, and world-class performances. Join us for a spectacular event you won’t want to miss.",
    "Get ready to immerse yourself in a captivating experience that brings people together through entertainment, creativity, and excitement.",
    "From stunning visuals to powerful moments, this event promises to deliver memories that will stay with you long after the curtains close.",
    "Step into a world of entertainment where passion meets performance. Perfect for fans, families, and first-timers alike.",
    "An extraordinary event crafted to entertain, inspire, and leave you wanting more. Be part of the moment everyone will be talking about.",
    "Whether you’re a long-time fan or discovering it for the first time, this experience offers something truly special for everyone.",
    "Join thousands of enthusiasts for a high-energy experience featuring top-tier talent, immersive production, and an electrifying atmosphere.",
    "A carefully curated event designed to deliver joy, excitement, and unforgettable live moments from start to finish.",
    "Witness the magic unfold as this event brings together art, performance, and emotion in a way that’s truly one of a kind.",
    "Don’t miss this chance to be part of an incredible experience that blends entertainment, atmosphere, and unforgettable performances.",
];

async function main() {
    await prisma.user.createMany({
        data: Array.from({
            length: 20,
        }).map((_, i) => ({
            email: `user${i + 1}@mail.com`,
            first_name: `User${i + 1}`,
            id: `user-${i + 1}`,
            is_verified: true,
            last_name: "Demo",
            password: "Pass@123",
            role:
                i < 12 ? Role.user : i < 15 ? Role.organiser : i < 18 ? Role.verifier : Role.admin,
        })),
    });

    const users = await prisma.user.findMany();
    const buyers = users.filter((u) => u.role === Role.user);
    const organisers = users.filter((u) => u.role === Role.organiser);
    const verifiers = users.filter((u) => u.role === Role.verifier);

    if (!buyers.length || !organisers.length || !verifiers.length) {
        throw new Error("Missing required user roles for seeding");
    }

    await prisma.wallet.createMany({
        data: users.map((u) => ({
            balance: new Prisma.Decimal(rand(2000, 10000)),
            currency: Currency.INR,
            userId: u.id,
        })),
    });

    await prisma.card.createMany({
        data: users.map((u, i) => ({
            balance: new Prisma.Decimal(rand(1000, 5000)),
            bank_name: pick(Object.values(BankName)),
            card_number: `4242-4242-4242-${1000 + i}`,
            userId: u.id,
        })),
    });

    const cards = await prisma.card.findMany();
    const cardByUser = new Map(
        cards.map((c) => [
            c.userId,
            c,
        ]),
    );

    const EVENTS_PER_GENRE_LANG = 10;
    const eventData: Prisma.EventCreateManyInput[] = [];

    for (const genre of Object.values(EventGenre)) {
        for (const language of Object.values(EventLanguage)) {
            const poster = await getMovieData(genre, language);

            for (let i = 0; i < EVENTS_PER_GENRE_LANG; i++) {
                const category = pick(Object.values(EventCategory));

                eventData.push({
                    banner_url: poster.poster,
                    category,
                    description: "An unforgettable premium event experience.",
                    genre,
                    is_online: false,
                    language,
                    organiserId: pick(organisers).id,
                    status: EventStatus.published,
                    title:
                        category === EventCategory.movie ? poster.title : `${pick(EVENT_TITLES)}`,
                });
            }
        }
    }

    await prisma.event.createMany({
        data: eventData,
    });

    const createdEvents = await prisma.event.findMany({
        where: {},
    });

    const slotData: Prisma.EventSlotCreateManyInput[] = [];

    for (const event of createdEvents) {
        const baseDate = daysFromNow(rand(1, 120));

        const eventDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

        const locationCount = rand(4, 5);
        const eventLocations = [
            ...LOCATIONS,
        ]
            .sort(() => 0.5 - Math.random())
            .slice(0, locationCount);

        for (const loc of eventLocations) {
            const slotsPerLocation = rand(8, 10);

            for (let i = 0; i < slotsPerLocation; i++) {
                //  const HOURS = [9, 12, 15, 18, 21, 23];
                //  const start = new Date(eventDate.getTime() + HOURS[i] * 60 * 60 * 1000);
                const start = new Date(eventDate.getTime() + i * 3 * 60 * 60 * 1000);

                slotData.push({
                    capacity: rand(80, 300),
                    end_time: new Date(start.getTime() + 2 * 60 * 60 * 1000),

                    event_date: eventDate,
                    eventId: event.id,

                    location_name: loc.name,
                    location_url: loc.map,
                    price:
                        i >= 5
                            ? new Prisma.Decimal(rand(999, 2499))
                            : new Prisma.Decimal(rand(299, 799)),

                    start_time: start,
                });
            }
        }
    }

    await prisma.eventSlot.createMany({
        data: slotData,
    });

    const slots = await prisma.eventSlot.findMany();
    const tickets: Prisma.TicketCreateManyInput[] = [];
    const transactions: Prisma.TransactionCreateManyInput[] = [];
    const verifications: Prisma.TicketVerificationCreateManyInput[] = [];

    for (const slot of slots) {
        for (let i = 0; i < rand(5, 20); i++) {
            const buyer = pick(buyers);
            const card = cardByUser.get(buyer.id);
            if (!card) continue;

            const ticketId = crypto.randomUUID();
            const verified = Math.random() > 0.65;

            tickets.push({
                eventSlotId: slot.id,
                id: ticketId,
                is_verified: verified,
                qr_code_data: JSON.stringify({
                    ticketId,
                }),
                signature: `sig-${ticketId}`,
                userId: buyer.id,
            });

            transactions.push({
                amount: slot.price,
                cardId: card.id,
                description: "Ticket purchase",
                ticketId,
                token: `txn-${ticketId}`,
                type: TransactionType.PURCHASE,
                userId: buyer.id,
            });

            if (verified) {
                verifications.push({
                    is_successful: true,
                    ticketId,
                    verification_time: new Date(),
                    verifierId: pick(verifiers).id,
                });
            }
        }
    }

    const BATCH = 10_000;

    for (let i = 0; i < tickets.length; i += BATCH) {
        await prisma.ticket.createMany({
            data: tickets.slice(i, i + BATCH),
        });
    }
    for (let i = 0; i < transactions.length; i += BATCH) {
        await prisma.transaction.createMany({
            data: transactions.slice(i, i + BATCH),
        });
    }
    for (let i = 0; i < verifications.length; i += BATCH) {
        await prisma.ticketVerification.createMany({
            data: verifications.slice(i, i + BATCH),
        });
    }
}

main()
    .catch((e) => {
        console.error("Seeder FAILED! Contact RONAK immediately", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
