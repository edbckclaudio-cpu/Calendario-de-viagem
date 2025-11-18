"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Drawer, DrawerTrigger, DrawerContent } from "./drawer";
import { getCurrentUser, clearAuth } from "@/lib/auth-local";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };
const sections: NavSection[] = [
  {
    title: "Fluxo da Viagem",
    items: [
      { href: "/", label: "Início" },
      { href: "/dados-passageiros", label: "Dados do Passageiro" },
      { href: "/revisao-passageiros", label: "Revisão Passageiro" },
      { href: "/buscador-voo", label: "Busca de Voo" },
      { href: "/detalhe-voo", label: "Detalhe do Voo" },
      { href: "/acomodacao-picker", label: "Acomodação: Escolha" },
      { href: "/multiplas-cidades", label: "Múltiplas Cidades" },
      { href: "/acomodacao-detalhe", label: "Acomodação: Detalhes" },
      { href: "/acomodacao-business", label: "Acomodação Business" },
      { href: "/entretenimento", label: "Entretenimento" },
      { href: "/calendario", label: "Calendário" },
    ],
  },
  {
    title: "Institucional",
    items: [
      { href: "/sobre", label: "Sobre a Empresa" },
      { href: "/equipe", label: "Equipe" },
      { href: "/contato", label: "Contato" },
      { href: "/termos", label: "Termos de Uso" },
      { href: "/privacidade", label: "Privacidade" },
    ],
  },
];

const requiresTripId = [
  "/calendario",
  "/entretenimento",
  "/acomodacao-detalhe",
  "/acomodacao-business",
  "/multiplas-cidades",
  "/detalhe-voo",
];

function Icon({ href }: { href: string }) {
  const c = "w-4 h-4";
  if (href === "/") return <span className={c}>🏠</span>;
  if (href.includes("dados-passageiros")) return <span className={c}>🧍</span>;
  if (href.includes("buscador-voo")) return <span className={c}>✈️</span>;
  if (href.includes("detalhe-voo")) return <span className={c}>📝</span>;
  if (href.includes("acomodacao")) return <span className={c}>🏨</span>;
  if (href.includes("multiplas-cidades")) return <span className={c}>🗺️</span>;
  if (href.includes("entretenimento")) return <span className={c}>🎭</span>;
  if (href.includes("calendario")) return <span className={c}>📅</span>;
  return <span className={c}>📄</span>;
}

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripIdInput, setTripIdInput] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTripId(params.get("tripId"));
      setTripIdInput(params.get("tripId") ?? "");
      const u = getCurrentUser();
      setEmail(u?.email || null);
    }
  }, []);

  function applyTripId() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (tripIdInput) params.set("tripId", tripIdInput);
    else params.delete("tripId");
    router.replace(`${pathname}?${params.toString()}`);
    setTripId(tripIdInput || null);
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Deseja sair?");
      if (!ok) return;
    }
    clearAuth();
    setEmail(null);
    setShowToast(true);
    setTimeout(() => {
      router.push("/");
      setShowToast(false);
    }, 650);
  }

  return (
    <div className="mobile-topbar md:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <button aria-label="Abrir menu" className="mobile-menu-btn">☰ Menu</button>
        </DrawerTrigger>
        <DrawerContent side="left" className="p-4">
          <div className="mb-3">
            <p className="text-sm text-slate-600">Navegação rápida</p>
            {tripId === null && (
              <p className="text-xs text-amber-700 mt-1">
                Para algumas páginas, informe/abra um calendário com <code>tripId</code>.
              </p>
            )}
          </div>
          {email && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-slate-600">{email}</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>Sair</Button>
            </div>
          )}
          <div className="mb-4 flex items-center gap-2">
            <input
              value={tripIdInput}
              onChange={(e) => setTripIdInput(e.target.value)}
              placeholder="tripId"
              className="w-40 px-2 py-1 rounded-md border border-slate-300"
            />
            <button onClick={applyTripId} className="px-2 py-1 rounded-md bg-blue-600 text-white">Aplicar</button>
          </div>
          <div className="flex flex-col gap-4">
            {sections.map((sec) => (
              <div key={sec.title}>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{sec.title}</p>
                <nav className="flex flex-col gap-2">
                  {sec.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    const disabled = requiresTripId.includes(item.href) && tripId === null;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-2 py-2 rounded-md ${active ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100"} ${disabled ? "opacity-60" : ""}`}
                        onClick={(e) => {
                          if (disabled) {
                            e.preventDefault();
                            alert("Esta página requer um tripId ativo. Abra um calendário ou salve sua viagem primeiro.");
                          }
                        }}
                      >
                        <Icon href={item.href} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      {showToast && (
        <Toast message="Você saiu" type="success" position="top-right" onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}