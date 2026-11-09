import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const noto = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BolKhata — kirana ka voice khata",
  description: "Udhaar, jama, kiraya, aur bills. Bolo ya likho, naam aur phone confirm karo, phir khata likhta hai.",
  applicationName: "BolKhata",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BolKhata" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1a1c1e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" translate="no" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}<PwaRegister /></body>
    </html>
  );
}
