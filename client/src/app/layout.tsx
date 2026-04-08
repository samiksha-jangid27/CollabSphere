// ABOUTME: Root layout — Inter font, dark theme, Toaster provider, AuthProvider wrapper.
// ABOUTME: Applies CollabSphere design tokens globally.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#161B26",
                color: "#F1F3F9",
                border: "1px solid #2A3350",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
