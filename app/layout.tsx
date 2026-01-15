import type { Metadata } from "next";
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
