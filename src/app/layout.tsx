import type { Metadata } from "next";
import { Roboto_Flex, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Toaster } from "@/components/ui/sonner"


const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quant Science Platform",
  description: "Hedge Fund in a Box",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${robotoFlex.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "280px",
                "--header-height": "64px",
              } as React.CSSProperties
            }
          >
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                  <div className="flex items-center gap-2 text-sm font-bold tracking-tight uppercase italic opacity-50">
                     <span className="text-muted-foreground">Quant Science</span>
                     <span className="text-muted-foreground">/</span>
                     <span className="text-foreground">Terminal</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded border border-border">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Live Feed Active
                    </div>
                    <ThemeToggle />
                  </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
