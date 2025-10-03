import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/custom/Navbar";
import Footer from "@/components/custom/Footer";
import React from "react";
import { type Metadata } from "next";
import { capitalConfig } from "@/lib/capitalConfig";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(capitalConfig.seo.url),
  title: {
    default: capitalConfig.name,
    template: `%s - ${capitalConfig.title}`,
  },
  description: capitalConfig.description,
  keywords: capitalConfig.seo.keywords,
  authors: capitalConfig.seo.authors,
  creator: "Ronak Maheshwari", //Let me be the creator for next optimization process 

  openGraph: {
    type: "website",
    locale: "en_US",
    url: capitalConfig.seo.url,
    title: capitalConfig.name,
    description: capitalConfig.description,
    images: [`${capitalConfig.seo.url}/Eventique3.png`],
    siteName: capitalConfig.name,
  },

  twitter: {
    card: "summary_large_image",
    title: capitalConfig.name,
    description: capitalConfig.description,
    images: [`${capitalConfig.seo.url}/Eventique3.png`],
    creator: capitalConfig.seo.twitterHandle,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased bg-[#0D0D0D] text-white`}
      >
       
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
