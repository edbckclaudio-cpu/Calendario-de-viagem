"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false as any);
  const [tripId, setTripId] = useState<string | null | undefined>(undefined);

  function isActive(href: string) {
    if (!pathname) return false;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTripId(params.get("tripId"));
    }
  }, []);

  const requiresTripId: string[] = [
    "/calendario",
    "/entretenimento",
    "/acomodacao-detalhe",
    "/acomodacao-business",
    "/multiplas-cidades",
    "/detalhe-voo",
  ];
  function isDisabled(href: string) {
    if (!requiresTripId.includes(href)) return false;
    if (tripId === undefined) return false; // evita mismatch de hidratação
    return !tripId;
  }

  function Icon({ href }: { href: string }) {
    const common = "w-4 h-4";
    if (href === "/") return <span className={common}>🏠</span>;
    if (href.includes("dados-passageiros")) return <span className={common}>🧍</span>;
    if (href.includes("buscador-voo")) return <span className={common}>✈️</span>;
    if (href.includes("detalhe-voo")) return <span className={common}>📝</span>;
    if (href.includes("acomodacao")) return <span className={common}>🏨</span>;
    if (href.includes("multiplas-cidades")) return <span className={common}>🗺️</span>;
    if (href.includes("entretenimento")) return <span className={common}>🎭</span>;
    if (href.includes("calendario")) return <span className={common}>📅</span>;
    return <span className={common}>📄</span>;
  }

  return (
    <aside className={`sidebar-wrapper ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <button
          className="sidebar-toggle"
          aria-label="Alternar sidebar"
          title={collapsed ? "Expandir" : "Recolher"}
          onClick={() => setCollapsed(!collapsed)}
        >
          ☰
        </button>
        <div className="brand-icon">TR</div>
        {!collapsed && (
          <div>
            <p className="brand-title">TRAE</p>
            <p className="brand-sub">Trip Resource & Expedition</p>
          </div>
        )}
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="sidebar-section">
          {!collapsed && <p className="sidebar-section-title">{sec.title}</p>}
          <nav className="sidebar-nav">
            {sec.items.map((item) => {
              const active = isActive(item.href);
              const disabled = isDisabled(item.href);
              const cls = `sidebar-link ${active ? "sidebar-link-active" : ""} ${disabled ? "sidebar-link-disabled" : ""}`;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (disabled) {
                      e.preventDefault();
                      alert("Esta página requer um tripId ativo. Abra um calendário ou salve sua viagem primeiro.");
                    }
                  }}
                  className={cls}
                  title={disabled ? "Requer tripId ativo" : item.label}
                >
                  <Icon href={item.href} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        {!collapsed && <p className="text-xs text-slate-500">© {new Date().getFullYear()} TRAE</p>}
      </div>
    </aside>
  );
}