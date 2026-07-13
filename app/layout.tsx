import type { Metadata } from "next"
import type React from "react"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

import { AuthProvider } from "@/app/context/AuthContext"
import { ThemeProvider } from "@/app/context/ThemeContext"
import ToastProvider from "@/components/ToastProvider"
import OfflineIndicator from "@/components/OfflineIndicator"
import PageTransition from "@/components/PageTransition"

import { Inter, Geist_Mono } from 'next/font/google'

// Initialize fonts - Inter for modern, clean UI
const inter = Inter({ 
  subsets: ['latin'],
  weight: ["300","400","500","600","700","800"],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'], 
  weight: ["400","500","600","700"],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "SREP - Your Studymate to Score in Exams",
  description: "Generate flashcards, mock papers, analyze answers, and create study schedules",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased bg-[#DEEEEE] dark:bg-gray-900 transition-colors duration-300`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <OfflineIndicator />
            <PageTransition>
              {children}
            </PageTransition>
            <ToastProvider />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
