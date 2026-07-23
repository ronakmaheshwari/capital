import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "validation-profile.csv");

if (!fs.existsSync(file)) {
    fs.writeFileSync(
        file,
        "timestamp,total,decrypt,signature,ticketLookup,userLookup,otpClaim,ticketClaim,verificationInsert\n"
    );
}

export function appendProfile(data: {
    total: number;
    decrypt: number;
    verify: number;
    ticketLookup: number;
    userLookup: number;
    otpInsert: number;
    // otpClaim: number;
    // ticketClaim: number;
    // verificationInsert: number;
}) {
    fs.appendFileSync(
        file,
        `${new Date().toISOString()},${data.total},${data.decrypt},${data.verify},${data.ticketLookup},${data.userLookup}\n`
    );
}