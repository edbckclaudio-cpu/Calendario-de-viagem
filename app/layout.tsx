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
  return (
    <html lang="pt-br">
      <body>
        <div className="app-shell">
          {/* Sidebar só em telas médias ou maiores */}
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
            {/* BottomNav apenas no mobile */}
            <div className="md:hidden">
              <BottomNav />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}