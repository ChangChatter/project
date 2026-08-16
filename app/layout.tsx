import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BC Employer Issue Guide",
  description: "Informational triage tool for BC workplace human rights issues.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DisclaimerBanner />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
