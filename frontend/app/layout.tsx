import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseAuthProvider } from "@/lib/supabase"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Factum - Media Verification Platform",
  description: "Verify the authenticity of your photos and videos",
  generator: "v0.app",
  // icons removed to hide logo from title bar
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <SupabaseAuthProvider>
          {children}
          <Toaster />
          <Analytics />
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
