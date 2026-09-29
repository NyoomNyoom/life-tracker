import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// The optical-size axis tightens the big display type, as the design intends.
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Life Tracker", template: "%s · Life Tracker" },
  description: "Track workouts, body weight and to-dos, with reminders when you forget.",
  applicationName: "Life Tracker",
  appleWebApp: { capable: true, title: "Tracker", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f2ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${bricolage.variable} ${dmMono.variable}`}>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
