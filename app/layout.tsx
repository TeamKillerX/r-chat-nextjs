import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ryzenth Chat UI",
  description: "A modern chat UI built with Next.js and TailwindCSS"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-gradient-to-br from-gray-900 to-black">
      <body className="bg-gradient-to-br from-gray-900 to-black">
        {children}
      </body>
    </html>
  )
}
