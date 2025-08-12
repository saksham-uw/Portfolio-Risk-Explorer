"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <div className={cn(
          "container mx-auto p-4 md:p-6",
          "min-h-[calc(100vh-4rem)]" // Adjust based on your header height
        )}>
          {children}
        </div>
      </div>
    </ThemeProvider>
  )
}