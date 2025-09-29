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
        transactionId: string;
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

<p style="text-align:center; margin-top:12px; font-size:13px; color:#888;">
  Ticket ID: <b>${ticket.transactionId}</b>
</p>


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
export async function generateTicketPDF(
    ticket: TicketInfo & {
        attendeeName: string;
        quantity: number;
        baseAmount: number;
        gstRate: number;
        gstAmount: number;
        convenienceFee: number;
        totalPaid: number;
        bookingDateTime: string;
        paymentType: string;
        transactionId: string;
    },
): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 30,
        size: "A5",
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    const pdfEndPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
    });

    // ========== HEADER ==========
    doc.rect(0, 0, doc.page.width, 50).fill("#1B1B1B");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("Eventique", 0, 18, {
        align: "center",
    });
    doc.moveDown(2);

    // ========== EVENT DETAILS ==========
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Event Details", {
        align: "center",
        underline: true,
    });
    doc.moveDown(0.8);

    const eventValues = [
        ticket.eventTitle,
        ticket.eventLocation,
        ticket.eventDate,
        `${ticket.eventTime} IST`,
    ];
    eventValues.forEach((value) => {
        doc.font("Helvetica").fontSize(11).fillColor("#333").text(value, {
            align: "center",
        });
        doc.moveDown(0.3);
    });
    doc.moveDown(1);

    // ========== ATTENDEE INFO ==========
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Attendee Information", {
        underline: true,
    });
    doc.moveDown(0.5);

    const attendeeItems = [
        {
            label: "Name",
            value: ticket.attendeeName,
        },
        {
            label: "Tickets",
            value: `${ticket.quantity} x ${ticket.seats || "General Admission"}`,
        },
    ];
    attendeeItems.forEach(({ label, value }) => {
        doc.font("Helvetica").text(`${label}: `, {
            continued: true,
        });
        doc.font("Helvetica-Bold").text(value);
    });

    doc.moveDown(1);

    // ========== ORDER SUMMARY ==========
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Order Summary", {
        underline: true,
    });
    doc.moveDown(0.5);

    const orderSummary = [
        {
            label: "Transaction ID",
            value: ticket.transactionId,
        },
        {
            label: "Amount Paid",
            value: `₹${ticket.totalPaid.toFixed(2)}`,
        },
        {
            label: "Base Amount",
            value: `₹${ticket.baseAmount.toFixed(2)}`,
        },
        {
            label: `GST @ ${ticket.gstRate}%`,
            value: `₹${ticket.gstAmount.toFixed(2)}`,
        },
        {
            label: "Convenience Fee",
            value: `₹${ticket.convenienceFee.toFixed(2)}`,
        },
        {
            label: "Payment Method",
            value: ticket.paymentType,
        },
        {
            label: "Booking Time",
            value: ticket.bookingDateTime,
        },
    ];
    orderSummary.forEach(({ label, value }) => {
        doc.font("Helvetica").text(`${label}: `, {
            continued: true,
        });
        doc.font("Helvetica-Bold").text(value);
    });

    doc.moveDown(1);

    // ========== QR CODE ==========
    if (ticket.qrCodeUrl) {
        try {
            const response = await fetch(ticket.qrCodeUrl);
            const qrBuffer = await response.arrayBuffer();

            const imageSize = 110;
            const centerX = (doc.page.width - imageSize) / 2;

            doc.image(Buffer.from(qrBuffer), centerX, doc.y, {
                align: "center",
                fit: [
                    imageSize,
                    imageSize,
                ],
            });

            doc.moveDown(1.2);
        } catch (_err) {
            doc.fontSize(10).fillColor("red").text("QR Code could not be loaded.", {
                align: "center",
            });
        }
    }

    // ========== FOOTER ==========
    const footerY = doc.page.height - 50;
    doc.y = footerY;

    doc.moveTo(30, footerY)
        .lineTo(doc.page.width - 30, footerY)
        .stroke("#ccc");
    doc.moveDown(0.5);

    doc.fontSize(9)
        .fillColor("#555")
        .text(
            "Please carry a valid photo ID with this ticket.\nNon-transferable • Non-refundable • GST as applicable",
            {
                align: "center",
                lineGap: 2,
            },
        );

    doc.moveDown(0.5);
    doc.fillColor("#888").text("Powered by Eventique", {
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
        transactionId: string;
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

// // The below code is the code for sending ticket email with full invoice PDF generation using puppeteer and resend
// // need to install chromium browser in server to use puppeteer
// import dotenv from "dotenv";
// import { Resend } from "resend";
// import puppeteer from "puppeteer";
// import QRCode from "qrcode";

// dotenv.config();

// const apiKey = process.env.RESEND_API_KEY;
// if (!apiKey) throw new Error("Missing RESEND_API_KEY in environment");

// const resend = new Resend(apiKey);

// // Types
// interface Item {
//   description: string;
//   quantity: number;
//   unitPrice: number;
//   sacCode?: string;
// }

// interface PDFData {
//   invoiceNumber: string;
//   date: string;
//   customerName: string;
//   customerEmail: string;
//   items: Item[];
//   gstRate: number;
//   gstin: string;
//   pan: string;
//   totalPaid: number;
//   transactionId: string;
//   paymentMode: string;
//   companyName: string;
//   companyAddress: string;
//   ticketId: string;
//   eventFrom: string;
//   eventTo: string;
//   eventDate: string;
//   eventTime: string;
// }

// interface Ticket {
//   email: string;
//   attendeeName: string;
//   eventTitle: string;
//   eventLocation: string;
//   seats: string;
//   quantity?: number;
//   baseAmount?: number;
//   gstRate?: number;
//   gstin?: string;
//   pan?: string;
//   totalPaid?: number;
//   transactionId?: string;
//   paymentType?: string;
//   bookingDateTime?: string;
//   eventDate?: string;
//   eventTime?: string;
//   convenienceFee?: number;
//   gstAmount?: number;
//   organiser?: string;
//   qrCodeUrl?: string;
// }

// // PDF Generator
// export async function generateFullInvoicePDF(data: PDFData): Promise<Buffer> {
//   const qrData = await QRCode.toDataURL(data.ticketId);
//   const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
//   const gstAmount = (subtotal * data.gstRate) / 100;
//   const grandTotal = subtotal + gstAmount;

//   const html = `
//   <html>
//     <head>
//       <style>
//         body { font-family: Arial; margin: 20px; }
//         table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
//         th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
//         h1 { text-align: center; }
//         .page-break { page-break-after: always; }
//         .footer { font-size: 10px; margin-top: 20px; color: #666; }
//         .qr-wrapper {
//           width: 350px;
//           border: 2px dashed #ccc;
//           border-radius: 20px;
//           padding: 20px;
//           margin: 0 auto;
//           text-align: center;
//         }
//         .qr-ticket {
//           font-size: 14px;
//           margin-top: 15px;
//         }
//       </style>
//     </head>
//     <body>
//       <h1>Tax Invoice</h1>
//       <table>
//         <tr><td><b>Invoice No:</b> ${data.invoiceNumber}</td><td><b>Date:</b> ${data.date}</td></tr>
//         <tr><td><b>Customer:</b> ${data.customerName}</td><td><b>Email:</b> ${data.customerEmail}</td></tr>
//         <tr><td><b>GSTIN:</b> ${data.gstin}</td><td><b>PAN:</b> ${data.pan}</td></tr>
//         <tr><td colspan="2"><b>Company:</b> ${data.companyName}<br>${data.companyAddress}</td></tr>
//       </table>

//       <table>
//         <tr>
//           <th>Description</th><th>Qty</th><th>Price</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>Total</th>
//         </tr>
//         ${data.items
//           .map(
//             (item) => `
//             <tr>
//               <td>${item.description}</td>
//               <td>${item.quantity}</td>
//               <td>${item.unitPrice.toFixed(2)}</td>
//               <td>${(item.unitPrice * item.quantity).toFixed(2)}</td>
//               <td>${((item.unitPrice * item.quantity * data.gstRate) / 200).toFixed(2)}</td>
//               <td>${((item.unitPrice * item.quantity * data.gstRate) / 200).toFixed(2)}</td>
//               <td>${(item.unitPrice * item.quantity * (1 + data.gstRate / 100)).toFixed(2)}</td>
//             </tr>
//           `
//           )
//           .join("")}
//         <tr>
//           <td colspan="3"><b>Total</b></td>
//           <td><b>${subtotal.toFixed(2)}</b></td>
//           <td colspan="2"><b>${(gstAmount / 2).toFixed(2)} each</b></td>
//           <td><b>${grandTotal.toFixed(2)}</b></td>
//         </tr>
//       </table>

//       <div class="footer">
//         <p><b>Transaction ID:</b> ${data.transactionId}</p>
//         <p><b>Payment Mode:</b> ${data.paymentMode}</p>
//         <p><b>Total Paid:</b> ₹${data.totalPaid.toFixed(2)}</p>
//         <p>Certified that the particulars are true and correct. Authorized Signatory.</p>
//       </div>

//       <div class="page-break"></div>

//       <div class="qr-wrapper">
//         <img src="${qrData}" width="180" height="180" />
//         <div class="qr-ticket">
//           <p><b>${data.ticketId}</b></p>
//           <hr />
//           <p><b>${data.eventFrom}</b> → <b>${data.eventTo}</b></p>
//           <p><b>Date:</b> ${data.eventDate} (${data.eventTime})</p>
//           <p><b>Passenger:</b> ${data.items.reduce((a, b) => a + b.quantity, 0)} People</p>
//           <p><b>Amount:</b> ₹${data.totalPaid.toFixed(2)}</p>
//         </div>
//       </div>
//     </body>
//   </html>`;

//   const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: "networkidle0" });

//   const pdfUint8Array = await page.pdf({
//     format: "A4",
//     printBackground: true,
//     margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
//   });

//   await browser.close();

//   // Convert Uint8Array to Buffer before returning
//   return Buffer.from(pdfUint8Array);
// }

// // Email Template (keep as is)
// const TicketEmailTemplate = (ticket: Ticket) => `
//   <html>
//     <body>
//       <p>Hello ${ticket.attendeeName},</p>
//       <p>Thank you for your purchase! Please find your ticket attached.</p>
//       <p>Event: ${ticket.eventTitle}</p>
//       <p>Date: ${ticket.eventDate} ${ticket.eventTime}</p>
//       <p>Location: ${ticket.eventLocation}</p>
//       <p>Seats: ${ticket.seats}</p>
//       <p>Enjoy the event!</p>
//       <p>Regards,<br/>Your Company</p>
//     </body>
//   </html>
// `;

// // Send Email
// export async function sendTicketEmail(ticket: Ticket) {
//   try {
//     // Sanitize ticket fields
//     ticket.email = ticket.email?.trim() || "";
//     ticket.attendeeName = ticket.attendeeName?.trim() || "Attendee";
//     ticket.eventTitle = ticket.eventTitle?.trim() || "Event";
//     ticket.eventLocation = ticket.eventLocation?.trim() || "Location";
//     ticket.seats = ticket.seats?.trim() || "General Admission";

//     // Map ticket to PDF data
//     const pdfData: PDFData = {
//       invoiceNumber: ticket.transactionId || "N/A",
//       date: ticket.bookingDateTime || new Date().toISOString().split("T")[0],
//       customerName: ticket.attendeeName,
//       customerEmail: ticket.email,
//       items: [
//         {
//           description: ticket.eventTitle,
//           quantity: ticket.quantity || 1,
//           unitPrice: ticket.baseAmount || 0,
//           sacCode: "",
//         },
//       ],
//       gstRate: ticket.gstRate || 18,
//       gstin: ticket.gstin || "YOUR_GSTIN_HERE",
//       pan: ticket.pan || "YOUR_PAN_HERE",
//       totalPaid: ticket.totalPaid || 0,
//       transactionId: ticket.transactionId || "N/A",
//       paymentMode: ticket.paymentType || "N/A",
//       companyName: "Your Company Name",
//       companyAddress: "Your Company Address",
//       ticketId: ticket.transactionId || "N/A",
//       eventFrom: ticket.eventLocation,
//       eventTo: ticket.eventLocation,
//       eventDate: ticket.eventDate || "N/A",
//       eventTime: ticket.eventTime || "N/A",
//     };

//     // Generate PDF
//     const pdfBuffer = await generateFullInvoicePDF(pdfData);

//     // Send email with attachment
//     await resend.emails.send({
//       from: "onboarding@hire.10xdevs.me",
//       to: ticket.email,
//       subject: `🎟️ Your Ticket for ${ticket.eventTitle}`,
//       html: TicketEmailTemplate(ticket),
//       attachments: [
//         {
//           filename: "ticket.pdf",
//           content: pdfBuffer.toString("base64"),
//           contentType: "application/pdf",
//         },
//       ],
//     });

//     console.log("✅ Ticket email sent successfully!");
//   } catch (error) {
//     console.error("❌ Error sending ticket email:", error);
//     throw error;
//   }
// }
