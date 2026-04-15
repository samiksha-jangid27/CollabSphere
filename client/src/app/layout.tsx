// ABOUTME: Root layout — Fraunces display + Inter body fonts, Editorial Noir theme, Toaster, AuthProvider.
// ABOUTME: Exposes --font-display and --font-body CSS variables globally.

import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollabSphere",
  description: "A collaboration marketplace for creators, influencers, and brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#111113",
                color: "#F5F0E6",
                border: "1px solid #2E2E33",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
