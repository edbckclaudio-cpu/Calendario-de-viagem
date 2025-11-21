"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// Calendar removido do pop-up: usamos datas já informadas anteriormente
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Toast from "@/components/ui/toast";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";

type Voo = {
  data: string;
  horarioFaixa: string;
  classe: string;
  codigoVoo: string;
  horarioDetalhado: string;
};

export default function BuscadorVooPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);

  // states for drawers
  const [openIda, setOpenIda] = useState(false);
  const [openVolta, setOpenVolta] = useState(false);
  const [openRegras, setOpenRegras] = useState(false);
  const [openVerificaIntl, setOpenVerificaIntl] = useState(false);
  const [openCodigo, setOpenCodigo] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // aeroportos/cidades de partida
  const [idaOrigem, setIdaOrigem] = useState<string>("");
  const [idaDate, setIdaDate] = useState<Date | undefined>();
  const [idaHorarioFaixa, setIdaHorarioFaixa] = useState<string>("Sem Horário Preferido");
  const [idaClasse, setIdaClasse] = useState<string>("Econômica");
  const [idaCodigo, setIdaCodigo] = useState<string>("");
  const [idaHorarioDet, setIdaHorarioDet] = useState<string>("");
  const [idaOrigemUsarPadrao, setIdaOrigemUsarPadrao] = useState<boolean>(false);
  const [idaDestinoUsarPadrao, setIdaDestinoUsarPadrao] = useState<boolean>(false);

  const [voltaOrigem, setVoltaOrigem] = useState<string>("");
  const [idaDestino, setIdaDestino] = useState<string>("");
  const [voltaDestino, setVoltaDestino] = useState<string>("");
  const [voltaOrigemUsarDestinoIda, setVoltaOrigemUsarDestinoIda] = useState<boolean>(false);
  const [voltaDestinoUsarOrigemIda, setVoltaDestinoUsarOrigemIda] = useState<boolean>(false);
  const [voltaDate, setVoltaDate] = useState<Date | undefined>();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [voltaHorarioFaixa, setVoltaHorarioFaixa] = useState<string>("Sem Horário Preferido");
  const [voltaClasse, setVoltaClasse] = useState<string>("Econômica");
  const [voltaCodigo, setVoltaCodigo] = useState<string>("");
  const [voltaHorarioDet, setVoltaHorarioDet] = useState<string>("");
  const [voltaDerivadaDaIda, setVoltaDerivadaDaIda] = useState<boolean>(false);
  const [idaConfigurada, setIdaConfigurada] = useState(false);
  const [voltaConfigurada, setVoltaConfigurada] = useState(false);

  useEffect(() => {
    async function fetchTrip() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      if (data) {
        setTrip(data);
        setIdaDate(data.dataInicio ? new Date(data.dataInicio) : undefined);
        setVoltaDate(data.dataFim ? new Date(data.dataFim) : undefined);
        setIdaConfigurada(!!data.vooIda);
        setVoltaConfigurada(!!data.vooVolta);
      }
    }
    fetchTrip();
  }, [tripId]);

  const origem = useMemo(() => trip?.origem || "SAO", [trip]);
  const destino = useMemo(() => trip?.destino || "PAR", [trip]);
  const idaDateISO = useMemo(() => idaDate?.toISOString() || trip?.dataInicio, [idaDate, trip]);
  const voltaDateISO = useMemo(() => voltaDate?.toISOString() || trip?.dataFim, [voltaDate, trip]);
  // inicializar campos de origem com valores padrão
  useEffect(() => { if (!idaOrigem) setIdaOrigem(origem); }, [origem]);
  useEffect(() => { if (!voltaOrigem) setVoltaOrigem(destino); }, [destino]);
  useEffect(() => { if (idaOrigemUsarPadrao) setIdaOrigem(origem); }, [idaOrigemUsarPadrao, origem]);
  useEffect(() => { if (idaDestinoUsarPadrao) setIdaDestino(destino); }, [idaDestinoUsarPadrao, destino]);
  // inicializar campos de destino com valores padrão
  useEffect(() => { if (!idaDestino) setIdaDestino(destino); }, [destino]);
  useEffect(() => { if (!voltaDestino) setVoltaDestino(origem); }, [origem]);
  // sincronizar checks de volta com dados da ida
  useEffect(() => {
    if (voltaOrigemUsarDestinoIda) setVoltaOrigem(idaDestino || destino);
  }, [voltaOrigemUsarDestinoIda, idaDestino, destino]);
  useEffect(() => {
    if (voltaDestinoUsarOrigemIda) setVoltaDestino(idaOrigem || origem);
  }, [voltaDestinoUsarOrigemIda, idaOrigem, origem]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const isIata = (s: string | undefined | null) => !!s && /^[A-Z]{3}$/.test(s);

  const IATA_COUNTRY: Record<string, string> = {
    // Brasil
    GRU: "BR", CGH: "BR", VCP: "BR", GIG: "BR", SDU: "BR", BSB: "BR", CNF: "BR", CWB: "BR", POA: "BR", REC: "BR", FOR: "BR", SSA: "BR", MAO: "BR", PVH: "BR", BEL: "BR", MCP: "BR", PMW: "BR", CGB: "BR", RBR: "BR", NAT: "BR", MCZ: "BR", GYN: "BR", SLZ: "BR", THE: "BR", AJU: "BR", JPA: "BR", IGU: "BR", VIX: "BR", LDB: "BR", RAO: "BR", UDI: "BR", NVT: "BR",
    // Europa
    LIS: "PT", OPO: "PT", MAD: "ES", BCN: "ES", CDG: "FR", ORY: "FR", AMS: "NL", FRA: "DE", MUC: "DE", LHR: "GB", LGW: "GB", DUB: "IE", ZRH: "CH", VIE: "AT", BRU: "BE", PRG: "CZ", WAW: "PL", MXP: "IT", FCO: "IT", CIA: "IT",
    // EUA
    JFK: "US", EWR: "US", LGA: "US", LAX: "US", SFO: "US", MIA: "US", ORD: "US", DFW: "US", ATL: "US", BOS: "US", SEA: "US", IAD: "US", DCA: "US", PHX: "US", SAN: "US", LAS: "US", DEN: "US", IAH: "US",
    // Ásia e Oriente Médio (amostra)
    NRT: "JP", HND: "JP", ICN: "KR", HKG: "HK", SIN: "SG", DEL: "IN", BOM: "IN", KUL: "MY", BKK: "TH", TPE: "TW", MNL: "PH", DOH: "QA", AUH: "AE", DXB: "AE",
    // América do Sul
    EZE: "AR", AEP: "AR", SCL: "CL", BOG: "CO", LIM: "PE", MVD: "UY", ASU: "PY", UIO: "EC", GYE: "EC",
  };
  const countryOf = (iata?: string): string | undefined => (iata ? IATA_COUNTRY[(iata || "").toUpperCase()] : undefined);
  const isBR = (iata?: string) => countryOf(iata) === "BR";
  const isInternationalIda = useMemo(() => {
    const o = (idaOrigem || origem);
    const d = (idaDestino || destino);
    return isIata(o) && isIata(d) && isBR(o) !== isBR(d);
  }, [idaOrigem, idaDestino, origem, destino]);
  const isInternationalVolta = useMemo(() => {
    const o = (voltaOrigem || (idaDestino || destino));
    const d = (voltaDestino || (idaOrigem || origem));
    return isIata(o) && isIata(d) && isBR(o) !== isBR(d);
  }, [voltaOrigem, voltaDestino, idaDestino, idaOrigem, origem, destino]);
  const visitedCountries = useMemo(() => {
    const set = new Set<string>();
    const add = (iata?: string) => { const c = countryOf(iata); if (c) set.add(c); };
    add(idaDestino || destino);
    add(voltaOrigem || (idaDestino || destino));
    return Array.from(set);
  }, [idaDestino, destino, voltaOrigem]);

  const validatePreferencias = (): string[] => {
    const issues: string[] = [];
    const o = idaOrigem || origem;
    const d = idaDestino || destino;
    if (!isIata(o)) issues.push("Origem da ida deve ser código IATA (3 letras)");
    if (!isIata(d)) issues.push("Destino da ida deve ser código IATA (3 letras)");
    const oV = voltaOrigem || (idaDestino || destino);
    const dV = voltaDestino || (idaOrigem || origem);
    if (!isIata(oV)) issues.push("Origem da volta deve ser código IATA (3 letras)");
    if (!isIata(dV)) issues.push("Destino da volta deve ser código IATA (3 letras)");
    // Datas já possuem fallback do trip; manter verificação leve
    const idaData = idaDateISO || trip?.dataInicio;
    const voltaData = voltaDateISO || trip?.dataFim;
    if (!idaData) issues.push("Defina a data da ida");
    if (!voltaData) issues.push("Defina a data da volta");
    return issues;
  };
  // lista de aeroportos/cidades comuns (para datalist com nomes completos)
  const aeroportosComuns = [
    // Brasil
    { code: "GRU", label: "São Paulo (Guarulhos) — GRU" },
    { code: "CGH", label: "São Paulo (Congonhas) — CGH" },
    { code: "VCP", label: "Campinas (Viracopos) — VCP" },
    { code: "GIG", label: "Rio de Janeiro (Galeão) — GIG" },
    { code: "SDU", label: "Rio de Janeiro (Santos Dumont) — SDU" },
    { code: "BSB", label: "Brasília (JK) — BSB" },
    { code: "CNF", label: "Belo Horizonte (Confins) — CNF" },
    { code: "CWB", label: "Curitiba (Afonso Pena) — CWB" },
    { code: "POA", label: "Porto Alegre (Salgado Filho) — POA" },
    { code: "REC", label: "Recife (Guararapes) — REC" },
    { code: "FOR", label: "Fortaleza (Pinto Martins) — FOR" },
    { code: "SSA", label: "Salvador (Dep. Luís E. Magalhães) — SSA" },
    { code: "MAO", label: "Manaus (Eduardo Gomes) — MAO" },
    { code: "BEL", label: "Belém (Val-de-Cans) — BEL" },
    { code: "NAT", label: "Natal (São Gonçalo) — NAT" },
    { code: "MCZ", label: "Maceió (Zumbi dos Palmares) — MCZ" },
    { code: "CGB", label: "Cuiabá (Marechal Rondon) — CGB" },
    { code: "FLN", label: "Florianópolis (Hercílio Luz) — FLN" },
    { code: "IGU", label: "Foz do Iguaçu (Cataratas) — IGU" },
    { code: "VIX", label: "Vitória (Eurico Salles) — VIX" },
    { code: "GYN", label: "Goiânia (Santa Genoveva) — GYN" },
    { code: "SLZ", label: "São Luís (Cunha Machado) — SLZ" },
    { code: "THE", label: "Teresina — THE" },
    { code: "AJU", label: "Aracaju (Santa Maria) — AJU" },
    { code: "JPA", label: "João Pessoa (Castro Pinto) — JPA" },
    { code: "PMW", label: "Palmas — PMW" },
    { code: "RBR", label: "Rio Branco — RBR" },
    { code: "PVH", label: "Porto Velho — PVH" },
    { code: "MCP", label: "Macapá — MCP" },
    { code: "CGR", label: "Campo Grande — CGR" },
    { code: "LDB", label: "Londrina — LDB" },
    { code: "RAO", label: "Ribeirão Preto (Leite Lopes) — RAO" },
    { code: "UDI", label: "Uberlândia — UDI" },
    { code: "NVT", label: "Navegantes (Ministro Victor Konder) — NVT" },
    // Europa
    { code: "LIS", label: "Lisboa (Humberto Delgado) — LIS" },
    { code: "OPO", label: "Porto (Francisco Sá Carneiro) — OPO" },
    { code: "MAD", label: "Madrid (Barajas) — MAD" },
    { code: "BCN", label: "Barcelona (El Prat) — BCN" },
    { code: "CDG", label: "Paris (Charles de Gaulle) — CDG" },
    { code: "ORY", label: "Paris (Orly) — ORY" },
    { code: "AMS", label: "Amsterdã (Schiphol) — AMS" },
    { code: "FRA", label: "Frankfurt (Main) — FRA" },
    { code: "MUC", label: "Munique (Franz Josef Strauss) — MUC" },
    { code: "LHR", label: "Londres (Heathrow) — LHR" },
    { code: "LGW", label: "Londres (Gatwick) — LGW" },
    { code: "DUB", label: "Dublin (DUB) — DUB" },
    { code: "CPH", label: "Copenhague (Kastrup) — CPH" },
    { code: "ZRH", label: "Zurique — ZRH" },
    { code: "VIE", label: "Viena — VIE" },
    { code: "BRU", label: "Bruxelas — BRU" },
    { code: "PRG", label: "Praga — PRG" },
    { code: "WAW", label: "Varsóvia — WAW" },
    { code: "MXP", label: "Milão (Malpensa) — MXP" },
    { code: "FCO", label: "Roma (Fiumicino) — FCO" },
    // EUA
    { code: "JFK", label: "Nova York (JFK) — JFK" },
    { code: "EWR", label: "Nova York (Newark) — EWR" },
    { code: "LGA", label: "Nova York (LaGuardia) — LGA" },
    { code: "LAX", label: "Los Angeles (LAX) — LAX" },
    { code: "SFO", label: "San Francisco (SFO) — SFO" },
    { code: "MIA", label: "Miami (MIA) — MIA" },
    { code: "ORD", label: "Chicago (O'Hare) — ORD" },
    { code: "DFW", label: "Dallas/Fort Worth — DFW" },
    { code: "ATL", label: "Atlanta (Hartsfield-Jackson) — ATL" },
    { code: "BOS", label: "Boston (Logan) — BOS" },
    { code: "SEA", label: "Seattle (Sea-Tac) — SEA" },
    { code: "IAD", label: "Washington (Dulles) — IAD" },
    { code: "DCA", label: "Washington (Reagan) — DCA" },
    { code: "PHX", label: "Phoenix (Sky Harbor) — PHX" },
    { code: "SAN", label: "San Diego — SAN" },
    { code: "LAS", label: "Las Vegas — LAS" },
    { code: "DEN", label: "Denver — DEN" },
    { code: "IAH", label: "Houston (IAH) — IAH" },
    // Ásia
    { code: "NRT", label: "Tóquio (Narita) — NRT" },
    { code: "HND", label: "Tóquio (Haneda) — HND" },
    { code: "ICN", label: "Seul (Incheon) — ICN" },
    { code: "HKG", label: "Hong Kong — HKG" },
    { code: "SIN", label: "Singapura (Changi) — SIN" },
    { code: "DEL", label: "Delhi — DEL" },
    { code: "BOM", label: "Mumbai — BOM" },
    { code: "KUL", label: "Kuala Lumpur — KUL" },
    { code: "BKK", label: "Bangkok (Suvarnabhumi) — BKK" },
    { code: "TPE", label: "Taipé — TPE" },
    { code: "MNL", label: "Manila — MNL" },
    { code: "DOH", label: "Doha (Hamad) — DOH" },
    { code: "AUH", label: "Abu Dhabi — AUH" },
    { code: "DXB", label: "Dubai — DXB" },
    // América do Sul
    { code: "EZE", label: "Buenos Aires (Ezeiza) — EZE" },
    { code: "AEP", label: "Buenos Aires (Aeroparque) — AEP" },
    { code: "SCL", label: "Santiago (Arturo Merino Benítez) — SCL" },
    { code: "BOG", label: "Bogotá (El Dorado) — BOG" },
    { code: "LIM", label: "Lima — LIM" },
    { code: "MVD", label: "Montevidéu (Carrasco) — MVD" },
    { code: "ASU", label: "Assunção (Silvio Pettirossi) — ASU" },
    { code: "UIO", label: "Quito — UIO" },
    { code: "GYE", label: "Guayaquil — GYE" },
  ];

  // extrai automaticamente a sigla do formato "Cidade — SIGLA" ou variantes
  const extractAirportCode = (text: string): string | null => {
    if (!text) return null;
    const t = text.trim();
    const dashMatch = t.match(/[—\-]\s*([A-Za-z]{3})$/); // em dash ou hífen
    if (dashMatch) return dashMatch[1];
    const parenMatch = t.match(/\(([A-Za-z]{3})\)\s*$/);
    if (parenMatch) return parenMatch[1];
    const justCode = t.match(/^([A-Za-z]{3})$/);
    if (justCode) return justCode[1];
    return null;
  };

  const normalizeAirportInput = (text: string): string => {
    const code = extractAirportCode(text);
    if (code) return code.toUpperCase();
    return text; // mantém cidade livre quando não houver sigla
  };
  const linksIda = useMemo(() => {
    const d = idaDateISO?.slice(0, 10);
    const classeKayak = idaClasse === "Business" ? "business" : idaClasse === "First" ? "first" : "economy";
    const classeGoogle = idaClasse === "Business" ? "BUSINESS" : idaClasse === "First" ? "FIRST" : "ECONOMY";
    const horarioHint = (h: string) => {
      if (h?.startsWith("Manhã")) return "morning";
      if (h?.startsWith("Tarde")) return "afternoon";
      if (h?.startsWith("Noite")) return "night";
      return "any";
    };
    const h = horarioHint(idaHorarioFaixa);
    const o = idaOrigem || origem;
    const dest = idaDestino || destino;
    return [
      { nome: "Google Flights", url: `https://www.google.com/travel/flights?q=${encodeURIComponent(o)}+to+${encodeURIComponent(dest)}&d=${d}&cabin=${classeGoogle}&time=${h}` },
      { nome: "Kayak", url: `https://www.kayak.com/flights/${encodeURIComponent(o)}-${encodeURIComponent(dest)}/${d}?c=${classeKayak}&depart_time=${h}` },
      { nome: "Booking", url: `https://www.booking.com/flights/?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(dest)}&depart=${d}&cabinClass=${classeGoogle}&time=${h}` },
      { nome: "Viajanet", url: `https://www.viajanet.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
      { nome: "LATAM", url: `https://www.latamairlines.com/br/pt` },
      { nome: "GOL", url: `https://www.voegol.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
      { nome: "Azul", url: `https://www.voeazul.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
    ];
  }, [origem, destino, idaDateISO, idaHorarioFaixa, idaClasse, idaOrigem, idaDestino]);

  const linksVolta = useMemo(() => {
    const d = voltaDateISO?.slice(0, 10);
    const classeKayak = voltaClasse === "Business" ? "business" : voltaClasse === "First" ? "first" : "economy";
    const classeGoogle = voltaClasse === "Business" ? "BUSINESS" : voltaClasse === "First" ? "FIRST" : "ECONOMY";
    const horarioHint = (h: string) => {
      if (h?.startsWith("Manhã")) return "morning";
      if (h?.startsWith("Tarde")) return "afternoon";
      if (h?.startsWith("Noite")) return "night";
      return "any";
    };
    const h = horarioHint(voltaHorarioFaixa);
    const o = voltaOrigem || (idaDestino || destino);
    const dest = voltaDestino || (idaOrigem || origem);
    return [
      { nome: "Google Flights", url: `https://www.google.com/travel/flights?q=${encodeURIComponent(o)}+to+${encodeURIComponent(dest)}&d=${d}&cabin=${classeGoogle}&time=${h}` },
      { nome: "Kayak", url: `https://www.kayak.com/flights/${encodeURIComponent(o)}-${encodeURIComponent(dest)}/${d}?c=${classeKayak}&depart_time=${h}` },
      { nome: "Booking", url: `https://www.booking.com/flights/?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(dest)}&depart=${d}&cabinClass=${classeGoogle}&time=${h}` },
      { nome: "Viajanet", url: `https://www.viajanet.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
      { nome: "LATAM", url: `https://www.latamairlines.com/br/pt` },
      { nome: "GOL", url: `https://www.voegol.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
      { nome: "Azul", url: `https://www.voeazul.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(dest)}&date=${d}&cabin=${classeGoogle}&depart_time=${h}` },
    ];
  }, [origem, destino, voltaDateISO, voltaHorarioFaixa, voltaClasse, voltaOrigem, voltaDestino, idaDestino, idaOrigem]);

  async function salvarIda() {
    if (!trip) return;
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId) return;
    const vooIdaPayload: Voo = {
      data: idaDate?.toISOString() || trip.dataInicio,
      horarioFaixa: idaHorarioFaixa,
      classe: idaClasse,
      codigoVoo: "",
      horarioDetalhado: "",
    };
    const payload: any = { vooIda: vooIdaPayload };
    if (voltaDerivadaDaIda) {
      const oV = idaDestino || destino;
      const dV = idaOrigem || origem;
      const vooVoltaPayload: Voo = {
        data: voltaDate?.toISOString() || trip.dataFim,
        horarioFaixa: voltaHorarioFaixa,
        classe: voltaClasse,
        codigoVoo: "",
        horarioDetalhado: "",
      };
      payload.vooVolta = vooVoltaPayload;
      payload.buscaVoo = {
        origem: idaOrigem || origem,
        destino: idaDestino || destino,
        ida: { origem: idaOrigem || origem, destino: idaDestino || destino, data: idaDateISO, horarioFaixa: idaHorarioFaixa, classe: idaClasse },
        volta: { origem: oV, destino: dV, data: voltaDateISO, horarioFaixa: voltaHorarioFaixa, classe: voltaClasse },
      };
    }
    await updateTrip(user.uid, tripId, payload);
    setOpenIda(false);
    setIdaConfigurada(true);
    if (voltaDerivadaDaIda) {
      const oV = idaDestino || destino;
      const dV = idaOrigem || origem;
      setVoltaOrigem(oV);
      setVoltaDestino(dV);
      showToast("Ida confirmada. Links da volta permanecem desabilitados.", "success");
    } else {
      showToast("Voo de ida salvo!", "success");
    }
  }

  async function salvarVolta() {
    if (!trip) return;
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId) return;
    const voo: Voo = {
      data: voltaDate?.toISOString() || trip.dataFim,
      horarioFaixa: voltaHorarioFaixa,
      classe: voltaClasse,
      codigoVoo: "",
      horarioDetalhado: "",
    };
    await updateTrip(user.uid, tripId, { vooVolta: voo });
    setOpenVolta(false);
    setVoltaConfigurada(true);
    showToast("Voo de volta salvo!", "success");
  }

  async function aplicarPreferenciasBusca() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!tripId || !user) return;
    const issues = validatePreferencias();
    if (issues.length) {
      showToast(`Corrija: ${issues.join("; ")}` , "error");
      return;
    }
    await updateTrip(user.uid, tripId, {
      buscaVoo: {
        origem: idaOrigem || origem,
        destino: idaDestino || destino,
        ida: { origem: idaOrigem || origem, destino: idaDestino || destino, data: idaDateISO, horarioFaixa: idaHorarioFaixa, classe: idaClasse },
        volta: { origem: voltaOrigem || (idaDestino || destino), destino: voltaDestino || (idaOrigem || origem), data: voltaDateISO, horarioFaixa: voltaHorarioFaixa, classe: voltaClasse },
      },
    });
    showToast("Preferências aplicadas. Agora use os links abaixo.", "success");
  }

  async function continuarDetalhe() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!tripId || !user) return;
     const issues = validatePreferencias();
     if (issues.length) {
       showToast(`Corrija: ${issues.join("; ")}`, "error");
       return;
     }
    await updateTrip(user.uid, tripId, {
      buscaVoo: {
        origem: idaOrigem || origem,
        destino: idaDestino || destino,
        ida: { origem: idaOrigem || origem, destino: idaDestino || destino, data: idaDateISO, horarioFaixa: idaHorarioFaixa, classe: idaClasse },
        volta: { origem: voltaOrigem || (idaDestino || destino), destino: voltaDestino || (idaOrigem || origem), data: voltaDateISO, horarioFaixa: voltaHorarioFaixa, classe: voltaClasse },
      },
    });
    showToast("Preferências de busca salvas.", "success");
    router.push(`/detalhe-voo?tripId=${tripId}`);
  }

  async function voltarLimpar() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!tripId) { router.push(`/revisao-passageiros?tripId=${tripId}`); return; }
    try {
      if (user) {
        await updateTrip(user.uid, tripId, { vooIda: null, vooVolta: null, buscaVoo: null, updatedAt: new Date().toISOString() });
      }
    } catch {}
    setIdaConfigurada(false);
    setVoltaConfigurada(false);
    setVoltaDerivadaDaIda(false);
    setIdaOrigem("");
    setIdaDestino("");
    setVoltaOrigem("");
    setVoltaDestino("");
    setOpenIda(false);
    setOpenVolta(false);
    router.push(`/revisao-passageiros?tripId=${tripId}`);
  }

  if (!trip) return <p>Carregando...</p>;

  const pronto = idaConfigurada && (voltaDerivadaDaIda || voltaConfigurada);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Buscador de Voo</h2>
        <p className="text-sm text-slate-600">Preencha as preferências de IDA e VOLTA.</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200 p-3 mb-4">
          <p className="text-sm">Viagem: {trip.nomeCompleto}</p>
          <p className="text-sm">Período: {trip.dataInicio?.slice(0,10)} → {trip.dataFim?.slice(0,10)}</p>
          <p className="text-sm">Passageiros: {trip.passageiros?.length || 0}</p>
          <div className="mt-2">
            <Button variant="outline" onClick={() => setOpenRegras(true)}>Verifique as normas para voo de crianças</Button>
            {(isInternationalIda || isInternationalVolta) ? (
              <Button className="ml-2 bg-amber-500 text-white hover:bg-amber-600" onClick={() => setOpenVerificaIntl(true)}>Verificações de passaporte, visto e vacinas</Button>
            ) : null}
          </div>
        </div>
        <div className="mb-4 text-sm text-slate-700">
          Dica TRAE: Se chegar muito cedo na cidade, verifique se sua hospedagem permite guardar malas até o horário de check-in. Para reduzir esperas, prefira voos que cheguem próximo ao meio-dia em diante.
        </div>
        <div className="flex gap-4 items-center">
          <Drawer open={openIda} onOpenChange={setOpenIda}>
            <DrawerTrigger asChild>
              <Button>Configurar voo de ida</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Dados para solicitação do voo</h3>
                <div>
                  <p className="text-sm text-slate-700">Data de Ida: {trip.dataInicio?.slice(0,10)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Origem da ida</label>
                  <Input list="listaOrigensIda" value={idaOrigem} onChange={(e) => setIdaOrigem(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaOrigensIda">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Destino da ida</label>
                  <Input list="listaDestinosIda" value={idaDestino} onChange={(e) => setIdaDestino(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaDestinosIda">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" id="chkVoltaDerivada" checked={voltaDerivadaDaIda} onChange={(e) => setVoltaDerivadaDaIda(e.target.checked)} />
                    <label htmlFor="chkVoltaDerivada" className="text-xs text-slate-600">Voltar deste destino para a origem da ida</label>
                  </div>
                  {voltaDerivadaDaIda ? (
                    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      {(() => {
                        const oV = idaDestino || destino;
                        const dV = idaOrigem || origem;
                        const faixa = voltaHorarioFaixa || "Sem Horário Preferido";
                        const cls = voltaClasse || "Econômica";
                        return `Resumo da volta automática: ${oV} → ${dV} • ${faixa}, ${cls}`;
                      })()}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm text-slate-700">Faixa de Horário Preferida</label>
                  <Select value={idaHorarioFaixa} onValueChange={(v) => setIdaHorarioFaixa(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manhã: 06-12h">Manhã: 06-12h</SelectItem>
                      <SelectItem value="Tarde: 12-18h">Tarde: 12-18h</SelectItem>
                      <SelectItem value="Noite: 18-06h">Noite: 18-06h</SelectItem>
                      <SelectItem value="Sem Horário Preferido">Sem Horário Preferido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Classe</label>
                  <Select value={idaClasse} onValueChange={(v) => setIdaClasse(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Econômica">Econômica</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="First">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Código do voo e horário detalhado serão preenchidos na etapa posterior */}
                <div className="flex justify-end gap-2">
                  <DrawerClose asChild>
                    <Button variant="secondary">Fechar</Button>
                  </DrawerClose>
                  <Button variant="outline" onClick={() => setOpenIda(false)}>Cancelar</Button>
                  <Button onClick={salvarIda}>Confirmar</Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={openVolta} onOpenChange={setOpenVolta}>
            <DrawerTrigger asChild>
              <Button
                disabled={!idaConfigurada || voltaConfigurada || voltaDerivadaDaIda}
                title={
                  !idaConfigurada
                    ? "Configure a ida primeiro"
                    : voltaConfigurada
                    ? "Volta já definida"
                    : voltaDerivadaDaIda
                    ? "Volta não será usada neste fluxo"
                    : undefined
                }
              >
                Configurar voo de volta
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Dados para solicitação do voo</h3>
                <div>
                  <p className="text-sm text-slate-700">Data de Volta: {trip.dataFim?.slice(0,10)}</p>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-slate-500">
                    Ida: {(idaDate?.toISOString()?.slice(0,10) || trip.dataInicio?.slice(0,10))} • {(idaOrigem || origem)} → {(idaDestino || destino)} • {(idaHorarioFaixa || "Sem horário preferido")} • {(idaClasse || "Econômica")}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Origem da volta</label>
                  <Input list="listaOrigensVolta" value={voltaOrigem} onChange={(e) => setVoltaOrigem(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaOrigensVolta">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Destino da volta</label>
                  <Input list="listaDestinosVolta" value={voltaDestino} onChange={(e) => setVoltaDestino(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaDestinosVolta">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Faixa de Horário Preferida</label>
                  <Select value={voltaHorarioFaixa} onValueChange={(v) => setVoltaHorarioFaixa(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manhã: 06-12h">Manhã: 06-12h</SelectItem>
                      <SelectItem value="Tarde: 12-18h">Tarde: 12-18h</SelectItem>
                      <SelectItem value="Noite: 18-06h">Noite: 18-06h</SelectItem>
                      <SelectItem value="Sem Horário Preferido">Sem Horário Preferido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Classe</label>
                  <Select value={voltaClasse} onValueChange={(v) => setVoltaClasse(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Econômica">Econômica</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="First">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Código do voo e horário detalhado serão preenchidos na etapa posterior */}
                <div className="flex justify-end gap-2">
                  <DrawerClose asChild>
                    <Button variant="secondary">Fechar</Button>
                  </DrawerClose>
                  <Button variant="outline" onClick={() => setOpenVolta(false)}>Cancelar</Button>
                  <Button onClick={salvarVolta}>Confirmar</Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <div className="mt-6">
          <h3 className="font-medium">Links de Busca</h3>
          <p className="text-sm text-slate-700 mt-1">Estes links abrem diretamente os buscadores com suas preferências preenchidas. Compare opções. Após comprar, anote horários e o código do voo.</p>
          <div className="mt-2">
            <Button variant="outline" onClick={() => setOpenCodigo(true)}>Onde encontro o código do voo?</Button>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-sm">Voo de ida</h4>
              <ul className="list-disc ml-6 text-sm">
                {linksIda.map((l) => (
                  <li key={l.nome}>
                    {idaConfigurada ? (
                      <a className="text-blue-700 underline" href={l.url} target="_blank" rel="noreferrer">{l.nome}</a>
                    ) : (
                      <span className="text-slate-400" title="Configure a ida para habilitar">{l.nome}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm">Voo de volta</h4>
              <ul className="list-disc ml-6 text-sm">
                {linksVolta.map((l) => (
                  <li key={l.nome}>
                    {voltaConfigurada && !voltaDerivadaDaIda ? (
                      <a className="text-blue-700 underline" href={l.url} target="_blank" rel="noreferrer">{l.nome}</a>
                    ) : (
                      <span className="text-slate-400" title={voltaDerivadaDaIda ? "Desabilitado: volta não usada neste fluxo" : "Configure a volta para habilitar"}>{l.nome}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Dialog open={openRegras} onOpenChange={setOpenRegras}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Normas para voo de crianças</DialogTitle>
              <DialogDescription>Orientações gerais; confirme regras específicas na companhia aérea.</DialogDescription>
            </DialogHeader>
            <ul className="list-disc ml-6 text-sm">
              <li>Bebês (0–2 anos): geralmente viajam no colo; taxa reduzida.</li>
              <li>Crianças (2–11 anos): assento próprio; tarifas com desconto em alguns casos.</li>
              <li>Documentação: RG ou passaporte; autorização exigida em voos internacionais sem ambos os responsáveis.</li>
              <li>Assentos e berços: solicitação antecipada recomendada; quantidade limitada.</li>
            </ul>
            <DialogFooter>
              <Button onClick={() => setOpenRegras(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openCodigo} onOpenChange={setOpenCodigo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Código do voo</DialogTitle>
              <DialogDescription>O código aparece no e-ticket, confirmação de compra ou página da companhia. Exemplos: AV86, KL792.</DialogDescription>
            </DialogHeader>
            <div className="text-sm text-slate-700">
              <p>Procure por Número do voo ou Flight number no comprovante. Em buscadores, após escolher o voo, o código aparece ao lado da rota.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpenCodigo(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openVerificaIntl} onOpenChange={setOpenVerificaIntl}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verificações para viagem internacional</DialogTitle>
              <DialogDescription>Confirme regras específicas junto às autoridades e à companhia aérea.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 text-sm text-slate-700">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium">Passaporte</p>
                <p>Validade recomendada mínima de 6 meses após o retorno.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium">Visto</p>
                {(() => {
                  const links: Array<{label: string; url: string}> = [];
                  visitedCountries.forEach((cc) => {
                    if (["FR","IT","ES","PT","DE","NL","BE","AT","CH","CZ","PL"].includes(cc)) {
                      links.push({ label: "Visto Schengen (informações gerais)", url: "https://visa.vfsglobal.com/one-pager/schengen-visa/pt" });
                    }
                    if (cc === "GB") links.push({ label: "Regras de visto Reino Unido", url: "https://www.gov.uk/standard-visitor-visa" });
                    if (cc === "US") links.push({ label: "Visto EUA (informações oficiais)", url: "https://travel.state.gov/content/travel/en/us-visas.html" });
                  });
                  return (
                    <ul className="list-disc ml-6">
                      {links.length ? links.map((l) => (
                        <li key={l.url}><a className="text-blue-700 underline" href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>
                      )) : (
                        <li>Verifique exigências no site oficial do país de destino e no Itamaraty.</li>
                      )}
                    </ul>
                  );
                })()}
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium">Vacinas</p>
                <p>Alguns países exigem ou recomendam vacina de Febre Amarela. Consulte a rede de saúde e a Anvisa.</p>
                <a className="text-blue-700 underline" href="https://www.gov.br/anvisa/pt-br/assuntos/saude-do-viajante" target="_blank" rel="noreferrer">Saúde do Viajante — Anvisa</a>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="font-medium">Seguro viagem</p>
                <p>Para área Schengen, recomenda-se cobertura mínima de €30.000 para despesas médicas e repatriação.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpenVerificaIntl(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => setConfirmResetOpen(true)}>Voltar</Button>
          <Button onClick={continuarDetalhe} disabled={!pronto} title="Informar horários precisos e, se desejar, o código do voo">Preencher detalhes do voo</Button>
        </div>
      </CardFooter>
      {toast && (
        <Toast message={toast.message} type={toast.type} position="bottom-left" />
      )}
        <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reiniciar configuração de voos</DialogTitle>
              <DialogDescription>
                Isso vai limpar ida, volta e preferências de busca. Deseja continuar?
                <span className="block mt-2 text-slate-700">
                  {(() => {
                    const oIda = idaOrigem || origem;
                    const dIda = idaDestino || destino;
                    const dataIda = (idaDateISO || trip?.dataInicio)?.slice(0, 10);
                    return `Ida: ${oIda} → ${dIda} em ${dataIda}`;
                  })()}
                </span>
                <span className="block text-slate-700">
                  {(() => {
                    const oVolta = voltaOrigem || (idaDestino || destino);
                    const dVolta = voltaDestino || (idaOrigem || origem);
                    const dataVolta = (voltaDateISO || trip?.dataFim)?.slice(0, 10);
                    return `Volta: ${oVolta} → ${dVolta} em ${dataVolta}`;
                  })()}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmResetOpen(false)}>Cancelar</Button>
              <Button onClick={voltarLimpar}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Card>
  );
}