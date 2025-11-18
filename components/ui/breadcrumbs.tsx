"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function labelFor(segment: string) {
  const map: Record<string, string> = {
    "": "Início",
    "dados-passageiros": "Dados do Passageiro",
    "revisao-passageiros": "Revisão Passageiro",
    "buscador-voo": "Busca de Voo",
    "detalhe-voo": "Detalhe do Voo",
    "acomodacao-picker": "Acomodação: Escolha",
    "multiplas-cidades": "Múltiplas Cidades",
    "acomodacao-detalhe": "Acomodação: Detalhes",
    "acomodacao-business": "Acomodação Business",
    "entretenimento": "Entretenimento",
    "calendario": "Calendário",
    "sobre": "Sobre",
    "equipe": "Equipe",
    "contato": "Contato",
    "termos": "Termos de Uso",
    "privacidade": "Privacidade",
  };
  return map[segment] || segment;
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [""];
  parts.forEach((p) => crumbs.push(p));
  const buildHref = (idx: number) => "/" + crumbs.slice(1, idx + 1).join("/");

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((seg, idx) => {
        const href = buildHref(idx);
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={href} className="breadcrumbs-item">
            {idx > 0 ? <span className="breadcrumbs-sep">/</span> : null}
            {isLast ? (
              <span className="breadcrumbs-current">{labelFor(seg)}</span>
            ) : (
              <Link href={href} className="breadcrumbs-link" title={labelFor(seg)}>
                {labelFor(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}