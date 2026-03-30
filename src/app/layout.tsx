import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import NavbarServer from "@/components/NavbarServer";
import NavbarWrapper from "@/components/NavbarWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConfirmProvider } from "@/components/ConfirmModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import LayoutShell from "@/components/LayoutShell";
import LazyOnboardingTour from "@/components/LazyOnboardingTour";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Book-in — Digital PDF Library",
    template: "%s | Book-in",
  },
  description: "Digital PDF based library. Upload, read, and discuss your favorite PDFs with the community. Free and open for everyone.",
  keywords: ["digital library", "pdf reader", "read pdf online", "upload pdf", "reading community"],
  authors: [{ name: "Book-in" }],
  openGraph: {
    title: "Book-in — Digital PDF Library",
    description: "Upload, read, and discuss your favorite PDFs with the community.",
    type: "website",
    locale: "en_US",
  },
};

import { cookies } from "next/headers";
import { LanguageProvider } from "@/context/LanguageContext";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialLanguage = cookieStore.get("language")?.value || "id";

  return (
    <html lang={initialLanguage} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Material Symbols async to prevent render blocking */}
        <script dangerouslySetInnerHTML={{ __html: `!function(){var e=document.createElement("link");e.rel="stylesheet";e.href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";document.head.appendChild(e)}();` }} />
        <meta name="theme-color" content="#FF5A5F" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="google" content="notranslate" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} bg-bg-dark text-text-main font-display antialiased min-h-screen transition-colors duration-200`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider initialLanguage={initialLanguage}>
            <ToastProvider>
              <ConfirmProvider>
                <LayoutShell navbarServer={<NavbarServer />}>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </LayoutShell>
                <LazyOnboardingTour />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }`,
                  }}
                />
              </ConfirmProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
