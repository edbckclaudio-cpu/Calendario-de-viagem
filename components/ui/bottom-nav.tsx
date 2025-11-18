"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };
const items: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/dados-passageiros", label: "Passageiro" },
  { href: "/revisao-passageiros", label: "Revisão" },
  { href: "/buscador-voo", label: "Voo" },
  { href: "/detalhe-voo", label: "Detalhe" },
  { href: "/acomodacao-picker", label: "Acomodação" },
  { href: "/calendario", label: "Calendário" },
];

function Icon({ href }: { href: string }) {
  const c = "w-5 h-5";
  if (href === "/") return <span className={c}>🏠</span>;
  if (href.includes("dados-passageiros")) return <span className={c}>🧍</span>;
  if (href.includes("revisao-passageiros")) return <span className={c}>✔️</span>;
  if (href.includes("buscador-voo")) return <span className={c}>✈️</span>;
  if (href.includes("calendario")) return <span className={c}>📅</span>;
  return <span className={c}>📄</span>;
}

export default function BottomNav() {
  const pathname = usePathname();
  const [tripId, setTripId] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTripId(params.get("tripId"));
      try {
        const raw = sessionStorage.getItem("visitedPaths");
        setVisited(raw ? JSON.parse(raw) : []);
      } catch {}
    }
  }, [pathname]);

  function markVisited(href: string) {
    try {
      const next = Array.from(new Set([...(visited || []), href]));
      sessionStorage.setItem("visitedPaths", JSON.stringify(next));
      setVisited(next);
    } catch {}
  }

  return (
    <div className="bottom-nav md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
        const isVisited = visited.includes(item.href);
        const showIdBadge = item.href === "/calendario" && !!tripId;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-link ${active ? "bottom-nav-link-active" : ""}`}
            onClick={() => markVisited(item.href)}
          >
            <Icon href={item.href} />
            <span className="text-[11px]">{item.label}</span>
            {isVisited && <span className="bottom-nav-dot" />}
            {showIdBadge && <span className="bottom-nav-badge">ID</span>}
          </Link>
        );
      })}
    </div>
  );
}