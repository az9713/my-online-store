import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WebVitals } from "@/components/analytics/WebVitals";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Merch Store",
    template: "%s | Merch Store",
  },
  description: "Custom merch storefront powered by Printify and Stripe. Browse featured products, search our catalog, and checkout securely.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://merch-store.vercel.app"),
  openGraph: {
    title: "Merch Store",
    description: "Custom merchandise, printed on demand and shipped to your door.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col bg-gray-50`}>
        <WebVitals />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
