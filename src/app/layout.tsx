import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Med Bill Decoder",
  description:
    "Turn a medical bill or EOB into plain-English line items, error flags, an estimate of what you owe, and a dispute letter. Demo only.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col font-sans">
        <Disclaimer />
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          Med Bill Decoder · Demo project
        </footer>
      </body>
    </html>
  );
}
