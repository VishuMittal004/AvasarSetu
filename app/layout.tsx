import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAProvider } from "@/components/PWAProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://careercompass.app"),
  title: {
    default: "AvasarSetu | Your Future. All in One Place.",
    template: "%s | AvasarSetu",
  },
  description: "Discover government jobs, scholarships, and schemes you're actually eligible for. No spam. No confusion.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AvasarSetu",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "AvasarSetu — Your Personalized Career & Benefits Discovery Engine",
    description: "Find jobs, scholarships, and schemes you actually qualify for.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      
      suppressHydrationWarning
    >
      <body>
        <PWAProvider />
        {children}
      </body>
    </html>
  );
}
