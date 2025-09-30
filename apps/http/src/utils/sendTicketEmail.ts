import dotenv from "dotenv";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import { Resend } from "resend";

dotenv.config();

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("Missing RESEND_API_KEY in environment");

const resend = new Resend(apiKey);

// =================== Helper: Format date to IST ===================
export function formatDateToIST(dateInput: string | Date): string {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const istOffset = 5.5 * 60; // minutes
    const istDate = new Date(date.getTime() + istOffset * 60 * 1000);
    const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        hour: "2-digit",
        hour12: true,
        minute: "2-digit",
        month: "short",
        year: "numeric",
    };
    return istDate.toLocaleString("en-IN", options);
}

// =================== Ticket Interface ===================
export interface TicketInfo {
    email: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    qrCodeUrl: string;
    seats?: string;
    eventStartISO?: string; // added
    eventEndISO?: string; // added
}

// =================== Email Template ===================
const TicketEmailTemplate = (
    ticket: TicketInfo & {
        attendeeName: string;
        organiser?: string;
        quantity: number;
        baseAmount: number;
        gstRate: number;
        gstAmount: number;
        convenienceFee: number;
        totalPaid: number;
        bookingDateTime: string;
        paymentType: string;
    },
) => `
<div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
  <div style="max-width:600px; margin:auto; background:#fff; border:1px solid #ddd; border-radius:12px; padding:20px;">
    <h3 style="margin-top:0; font-size:18px; border-bottom:1px solid #eee; padding-bottom:8px;">ORDER SUMMARY</h3>
    <table style="width:100%; font-size:14px; color:#333;">
      <tr>
        <td style="padding:6px 0;">TICKET AMOUNT</td>
        <td style="text-align:right;">₹${ticket.baseAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; font-size:13px; color:#666;">Quantity</td>
        <td style="text-align:right; font-size:13px; color:#666;">${ticket.quantity} tickets</td>
      </tr>
      <tr><td colspan="2" style="border-bottom:1px dashed #ddd; padding:4px 0;"></td></tr>
      <tr>
        <td style="padding:6px 0;">CONVENIENCE FEES</td>
        <td style="text-align:right;">₹${ticket.convenienceFee.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; font-size:13px; color:#666;">Base Amount</td>
        <td style="text-align:right; font-size:13px; color:#666;">₹${ticket.baseAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; font-size:13px; color:#666;">Central GST @ ${ticket.gstRate}%</td>
        <td style="text-align:right; font-size:13px; color:#666;">₹${(ticket.gstAmount / 2).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; font-size:13px; color:#666;">State GST @ ${ticket.gstRate}%</td>
        <td style="text-align:right; font-size:13px; color:#666;">₹${(ticket.gstAmount / 2).toFixed(2)}</td>
      </tr>
      <tr><td colspan="2" style="border-bottom:1px dashed #ddd; padding:4px 0;"></td></tr>
      <tr>
        <td style="padding:10px 0; font-weight:600;">AMOUNT PAID</td>
        <td style="text-align:right; font-weight:600;">₹${ticket.totalPaid.toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:14px;">
      <div>
        <p style="margin:0; font-weight:600;">Booking Date & Time</p>
        <p style="margin:4px 0; color:#444;">${ticket.bookingDateTime}</p>
      </div>
      <div>
        <p style="margin:0; font-weight:600;">Payment Type</p>
        <p style="margin:4px 0; color:#444;">${ticket.paymentType}</p>
      </div>
    </div>

    <div style="text-align:center; margin:20px 0;">
      <img src="${ticket.qrCodeUrl}" alt="QR Code" style="width:120px; height:120px;" />
      <p style="font-size:12px; color:#666; margin-top:8px;">
        You can also find your ticket in the attached PDF
      </p>
    </div>

    <div style="margin-top:20px; font-size:12px; color:#555; border-top:1px solid #eee; padding-top:12px;">
      <p style="margin:0 0 6px;"><b>IMPORTANT INSTRUCTIONS</b></p>
      <p style="margin:4px 0;">This transaction can be cancelled up to 20 mins before the show as per policy.</p>
      <p style="margin:4px 0;">Carry a valid ID along with this ticket.</p>
      <p style="margin:4px 0;">GST collected is paid to the department.</p>
    </div>
  </div>
</div>
`;

// =================== Generate PDF ===================
async function generateTicketPDF(
    ticket: TicketInfo & {
        attendeeName: string;
        quantity: number;
    },
): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 25,
        size: [
            400,
            550,
        ],
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));

    const pdfEndPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
    });

    // Background
    doc.rect(0, 0, 400, 550).fill("#fdf6e3");

    // Header
    doc.fillColor("#1E90FF").fontSize(20).font("Helvetica-Bold");
    doc.text((ticket.eventTitle || "Event").toUpperCase(), {
        align: "center",
    });

    doc.moveDown(0.5).fontSize(12).fillColor("#333").font("Helvetica");
    doc.text(`Location: ${ticket.eventLocation || "Location"}`, {
        align: "center",
    });

    doc.moveDown(0.5);
    doc.text(`Time: ${ticket.eventTime || "00:00 - 00:00"} IST`, {
        align: "center",
    });

    doc.moveDown(1).fontSize(14).font("Helvetica-Bold").fillColor("#000");
    doc.text(`Attendee: ${ticket.attendeeName || "Attendee"}`, {
        align: "left",
    });

    doc.moveDown(0.5).fontSize(12).font("Helvetica").fillColor("#333");
    doc.text(`Number of Tickets: ${ticket.quantity || 1}`, {
        align: "left",
    });

    // QR Code (handle fetch separately)
    if (ticket.qrCodeUrl) {
        try {
            const response = await fetch(ticket.qrCodeUrl);
            const qrBuffer = await response.arrayBuffer();
            doc.image(Buffer.from(qrBuffer), 140, 250, {
                height: 120,
                width: 120,
            });
        } catch (err) {
            console.warn("QR code fetch failed:", err);
        }
    }

    // Footer
    doc.moveDown(12).fontSize(10).fillColor("#555");
    doc.text("Please carry a valid ID along with this ticket.", {
        align: "center",
    });
    doc.text("This ticket is non-transferable and must be presented at entry.", {
        align: "center",
    });

    doc.end();

    return pdfEndPromise;
}

// =================== Send Ticket Email ===================
export async function sendTicketEmail(
    ticket: TicketInfo & {
        attendeeName: string;
        organiser?: string;
        quantity: number;
        baseAmount: number;
        gstRate: number;
        gstAmount: number;
        convenienceFee: number;
        totalPaid: number;
        bookingDateTime: string;
        paymentType: string;
    },
) {
    try {
        // Safe fallback for strings
        ticket.email = typeof ticket.email === "string" ? ticket.email.trim() : "";
        ticket.attendeeName =
            typeof ticket.attendeeName === "string" ? ticket.attendeeName.trim() : "Attendee";
        ticket.eventTitle =
            typeof ticket.eventTitle === "string" ? ticket.eventTitle.trim() : "Event";
        ticket.eventLocation =
            typeof ticket.eventLocation === "string" ? ticket.eventLocation.trim() : "Location";
        ticket.seats = typeof ticket.seats === "string" ? ticket.seats.trim() : "General Admission";

        // Booking datetime
        ticket.bookingDateTime = formatDateToIST(ticket.bookingDateTime);

        // Event time calculation
        const eventStart = ticket.eventStartISO
            ? new Date(ticket.eventStartISO)
            : new Date(ticket.eventDate);
        const eventEnd = ticket.eventEndISO
            ? new Date(ticket.eventEndISO)
            : new Date(ticket.eventDate);

        const startTimePart = formatDateToIST(eventStart).split(",")[1]?.trim() || "00:00";
        const endTimePart = formatDateToIST(eventEnd).split(",")[1]?.trim() || "00:00";
        ticket.eventDate = formatDateToIST(eventStart).split(",")[0] || ticket.eventDate;
        ticket.eventTime = `${startTimePart} - ${endTimePart}`;

        const pdfBuffer = await generateTicketPDF(ticket);

        await resend.emails.send({
            attachments: [
                {
                    content: pdfBuffer.toString("base64"),
                    contentType: "application/pdf",
                    filename: "ticket.pdf",
                },
            ],
            from: "onboarding@hire.10xdevs.me",
            html: TicketEmailTemplate(ticket),
            subject: `🎟️ Your Ticket for ${ticket.eventTitle}`,
            to: ticket.email,
        });
    } catch (err) {
        console.error("❌ Error sending ticket email:", err);
    }
}
