import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Jewelry MES - ระบบจัดการการผลิตเครื่องประดับ",
  description: "ระบบ Manufacturing Execution System สำหรับโรงงานผลิตเครื่องประดับ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jewelry MES",
  },
  formatDetection: {
    telephone: false,
  },

};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f59e0b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
