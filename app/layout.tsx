import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/ui/sidebar";
import MobileNav from "@/components/ui/mobile-nav";
import BottomNav from "@/components/ui/bottom-nav";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import UserAuthControls from "@/components/ui/user-auth-controls";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TRAE - A Viagem",
  description: "TRAE - Trip Resource and Expedition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const useOldLayout = process.env.NEXT_PUBLIC_TRAE_LAYOUT === "old" || !process.env.NEXT_PUBLIC_TRAE_LAYOUT;
  return (
    <html lang="pt-br">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body>
        <div className="app-shell">
          {useOldLayout ? (
            <>
              <Sidebar />
              <div className="app-content">
                <header className="content-header">
                  <h1 className="header-title">TRAE - Trip Resource and Expedition</h1>
                </header>
                <main className="content-main">{children}</main>
              </div>
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <Sidebar />
              </div>
              <div className="app-content">
                <header className="content-header">
                  <MobileNav />
                  <h1 className="header-title">TRAE - Trip Resource and Expedition</h1>
                  <p className="subheader-title hidden sm:block">TRAE - A Viagem</p>
                  <div className="hidden md:block">
                    <Breadcrumbs />
                  </div>
                  <UserAuthControls />
                </header>
                <main className="content-main">{children}</main>
                <div className="md:hidden">
                  <BottomNav />
                </div>
              </div>
            </>
          )}
        </div>
      </body>
      <script dangerouslySetInnerHTML={{__html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/service-worker.js'); }); }`}} />
    </html>
  );
}