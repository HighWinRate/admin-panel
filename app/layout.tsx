import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminNavbar } from "@/components/AdminNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "High Win Rate - پنل مدیریت",
  description: "پنل مدیریت فروشگاه استراتژی‌های معاملاتی",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AdminNavbar />
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

