"use client";
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

  // aeroportos/cidades de partida
  const [idaOrigem, setIdaOrigem] = useState<string>("");
  const [idaDate, setIdaDate] = useState<Date | undefined>();
  const [idaHorarioFaixa, setIdaHorarioFaixa] = useState<string>("Sem Horário Preferido");
  const [idaClasse, setIdaClasse] = useState<string>("Econômica");
  const [idaCodigo, setIdaCodigo] = useState<string>("");
  const [idaHorarioDet, setIdaHorarioDet] = useState<string>("");

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

  useEffect(() => {
    async function fetchTrip() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      if (data) {
        setTrip(data);
        setIdaDate(data.dataInicio ? new Date(data.dataInicio) : undefined);
        setVoltaDate(data.dataFim ? new Date(data.dataFim) : undefined);
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
  const linksBusca = useMemo(() => {
    const dIda = idaDateISO?.slice(0, 10);
    const dVolta = voltaDateISO?.slice(0, 10);
    const classeKayak = idaClasse === "Business" ? "business" : idaClasse === "First" ? "first" : "economy";
    const classeSky = voltaClasse === "Business" ? "business" : voltaClasse === "First" ? "first" : "economy";
    const classeGoogle = idaClasse === "Business" ? "BUSINESS" : idaClasse === "First" ? "FIRST" : "ECONOMY";
    const horarioHint = (h: string) => {
      if (h?.startsWith("Manhã")) return "morning";
      if (h?.startsWith("Tarde")) return "afternoon";
      if (h?.startsWith("Noite")) return "night";
      return "any";
    };
    const hIda = horarioHint(idaHorarioFaixa);
    const hVolta = horarioHint(voltaHorarioFaixa);
    const o = idaOrigem || origem;
    const d = idaDestino || destino;
    return [
      { nome: "Google Flights", url: `https://www.google.com/travel/flights?q=${encodeURIComponent(o)}+to+${encodeURIComponent(d)}&d=${dIda}&cabin=${classeGoogle}&time=${hIda}` },
      { nome: "Kayak", url: `https://www.kayak.com/flights/${encodeURIComponent(o)}-${encodeURIComponent(d)}/${dIda}/${dVolta}?c=${classeKayak}&depart_time=${hIda}&return_time=${hVolta}` },
      { nome: "Skyscanner", url: `https://www.skyscanner.net/transport/flights/${encodeURIComponent(o)}/${encodeURIComponent(d)}/${dIda}/${dVolta}/?cabinclass=${classeSky}&depart_time=${hIda}&return_time=${hVolta}` },
      { nome: "LATAM", url: `https://www.latamairlines.com/br/pt/oferta?from=${encodeURIComponent(o)}&to=${encodeURIComponent(d)}&departure=${dIda}&cabin=${classeGoogle}&depart_time=${hIda}` },
      { nome: "GOL", url: `https://www.voegol.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(d)}&date=${dIda}&cabin=${classeGoogle}&depart_time=${hIda}` },
      { nome: "Azul", url: `https://www.voeazul.com.br/?from=${encodeURIComponent(o)}&to=${encodeURIComponent(d)}&date=${dIda}&cabin=${classeGoogle}&depart_time=${hIda}` },
    ];
  }, [origem, destino, idaDateISO, voltaDateISO, idaHorarioFaixa, voltaHorarioFaixa, idaClasse, voltaClasse, idaOrigem, idaDestino]);

  async function salvarIda() {
    if (!trip) return;
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId) return;
    const voo: Voo = {
      data: idaDate?.toISOString() || trip.dataInicio,
      horarioFaixa: idaHorarioFaixa,
      classe: idaClasse,
      // Código do voo e horário detalhado serão informados após a busca (página de detalhes)
      codigoVoo: "",
      horarioDetalhado: "",
    };
    await updateTrip(user.uid, tripId, { vooIda: voo });
    setOpenIda(false);
    showToast("Voo de ida salvo!", "success");
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

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Buscador de Vôo</h2>
        <p className="text-sm text-slate-600">Preencha as preferências de IDA e VOLTA.</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200 p-3 mb-4">
          <p className="text-sm">Viagem: {trip.nomeCompleto}</p>
          <p className="text-sm">Período: {trip.dataInicio?.slice(0,10)} → {trip.dataFim?.slice(0,10)}</p>
          <p className="text-sm">Passageiros: {trip.passageiros?.length || 0}</p>
          <div className="mt-2">
            <Button variant="outline" onClick={() => setOpenRegras(true)}>Regras para Crianças</Button>
          </div>
        </div>
        <div className="mb-4 text-sm text-slate-700">
          Dica TRAE: Se for usar Airbnb ou hotel, o check-in normalmente é a partir das 14h. Para evitar longas esperas, prefira voos que chegam perto do meio-dia em diante.
        </div>
        <div className="flex gap-4 items-center">
          <Drawer open={openIda} onOpenChange={setOpenIda}>
            <DrawerTrigger asChild>
              <Button>Escolha o vôo de ida</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Dados para solicitação do vôo</h3>
                <div>
                  <p className="text-sm text-slate-700">Data de Ida: {trip.dataInicio?.slice(0,10)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Aeroporto ou cidade de partida</label>
                  <Input list="listaOrigensIda" value={idaOrigem} onChange={(e) => setIdaOrigem(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaOrigensIda">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Aeroporto ou cidade de destino</label>
                  <Input list="listaDestinosIda" value={idaDestino} onChange={(e) => setIdaDestino(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" />
                  <datalist id="listaDestinosIda">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
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
                  <Button onClick={salvarIda}>Continuar</Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={openVolta} onOpenChange={setOpenVolta}>
            <DrawerTrigger asChild>
              <Button>Escolha o vôo da volta</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Dados para solicitação do vôo</h3>
                <div>
                  <p className="text-sm text-slate-700">Data de Volta: {trip.dataFim?.slice(0,10)}</p>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-slate-500">
                    Ida: {(idaDate?.toISOString()?.slice(0,10) || trip.dataInicio?.slice(0,10))} • {(idaOrigem || origem)} → {(idaDestino || destino)} • {(idaHorarioFaixa || "Sem horário preferido")} • {(idaClasse || "Econômica")}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Aeroporto ou cidade de partida</label>
                  <Input list="listaOrigensVolta" value={voltaOrigem} onChange={(e) => setVoltaOrigem(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" disabled={voltaOrigemUsarDestinoIda} />
                  <datalist id="listaOrigensVolta">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chkVoltaOrigemUsarDestinoIda"
                      checked={voltaOrigemUsarDestinoIda}
                      onChange={(e) => setVoltaOrigemUsarDestinoIda(e.target.checked)}
                    />
                    <label htmlFor="chkVoltaOrigemUsarDestinoIda" className="text-xs text-slate-600">
                      Usar o aeroporto de chegada da ida como partida da volta
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-700">Aeroporto ou cidade de destino</label>
                  <Input list="listaDestinosVolta" value={voltaDestino} onChange={(e) => setVoltaDestino(normalizeAirportInput(e.target.value))} placeholder="Clique para ver opções ou digite" disabled={voltaDestinoUsarOrigemIda} />
                  <datalist id="listaDestinosVolta">
                    {aeroportosComuns.map((a) => (
                      <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                  </datalist>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chkVoltaDestinoUsarOrigemIda"
                      checked={voltaDestinoUsarOrigemIda}
                      onChange={(e) => setVoltaDestinoUsarOrigemIda(e.target.checked)}
                    />
                    <label htmlFor="chkVoltaDestinoUsarOrigemIda" className="text-xs text-slate-600">
                      Usar o aeroporto de partida da ida como destino da volta
                    </label>
                  </div>
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
                  <Button onClick={salvarVolta}>Continuar</Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          <Button variant="secondary" onClick={aplicarPreferenciasBusca}>Fazer Busca</Button>
        </div>
        <div className="mt-6">
          <h3 className="font-medium">Links de Busca</h3>
          <ul className="list-disc ml-6 text-sm">
            {linksBusca.map((l) => (
              <li key={l.nome}>
                <a className="text-blue-700 underline" href={l.url} target="_blank" rel="noreferrer">
                  {l.nome}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <Dialog open={openRegras} onOpenChange={setOpenRegras}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regras de Idade para Crianças (Companhias Aéreas)</DialogTitle>
              <DialogDescription>Informações gerais (podem variar por companhia):</DialogDescription>
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
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/revisao-passageiros?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={continuarDetalhe}>Continuar</Button>
        </div>
      </CardFooter>
      {toast && (
        <Toast message={toast.message} type={toast.type} position="bottom-left" />
      )}
    </Card>
  );
}