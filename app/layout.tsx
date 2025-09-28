import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ScreenShareProvider } from "@/components/screen-share-provider"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "ShareScreen - Instant Screen Sharing",
  description: "Share your screen instantly with anyone using a simple 8-character code",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ScreenShareProvider>{children}</ScreenShareProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
