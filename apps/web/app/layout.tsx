import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import type React from "react";
import { capitalConfig } from "@/lib/capitalConfig";

const geistSans = Geist({
    subsets: [
        "latin",
    ],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: [
        "latin",
    ],
    variable: "--font-geist-mono",
});

const inter = Inter({
    subsets: [
        "latin",
    ],
    variable: "--font-inter",
    weight: [
        "100",
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
    ],
});

export const metadata: Metadata = {
    authors: capitalConfig.seo.authors,
    creator: "Ronak Maheshwari", //Let me be the creator for next optimization process
    description: capitalConfig.description,
    keywords: capitalConfig.seo.keywords,
    metadataBase: new URL(capitalConfig.seo.url),

    openGraph: {
        description: capitalConfig.description,
        images: [
            `${capitalConfig.seo.url}/Eventique3.png`,
        ],
        locale: "en_US",
        siteName: capitalConfig.name,
        title: capitalConfig.name,
        type: "website",
        url: capitalConfig.seo.url,
    },
    title: {
        default: capitalConfig.name,
        template: `%s - ${capitalConfig.title}`,
    },

    twitter: {
        card: "summary_large_image",
        creator: capitalConfig.seo.twitterHandle,
        description: capitalConfig.description,
        images: [
            `${capitalConfig.seo.url}/Eventique3.png`,
        ],
        title: capitalConfig.name,
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased bg-[#FDFDFD]`}
            >
                {/* <Navbar /> */}
                <main className="min-h-screen">{children}</main>
                {/* <Footer /> */}
            </body>
        </html>
    );
}
