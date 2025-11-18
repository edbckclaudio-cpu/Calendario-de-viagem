import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/ui/sidebar";
import Breadcrumbs from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "TRAE - A Viagem",
  description: "TRAE - Trip Resource and Expedition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="app-content">
            <header className="content-header">
              <h1 className="header-title">TRAE - Trip Resource and Expedition</h1>
              <p className="subheader-title">TRAE - A Viagem</p>
              <Breadcrumbs />
            </header>
            <main className="content-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}