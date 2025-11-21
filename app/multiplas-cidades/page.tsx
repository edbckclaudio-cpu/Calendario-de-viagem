"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import Toast from "@/components/ui/toast";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";

function parseDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = s.slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return undefined;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const day = Number(parts[2]);
  if (!y || !m || !day) return undefined;
  return new Date(y, m - 1, day);
}

type Cidade = { nome: string; dataChegada: string; dataSaida: string; hotelNome?: string; endereco?: string };

export default function MultiplasCidadesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [proximaNome, setProximaNome] = useState("");
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [openBuscaIdx, setOpenBuscaIdx] = useState<number | null>(null);
  const [buscaNomeEndereco, setBuscaNomeEndereco] = useState("");
  const [openTransporte, setOpenTransporte] = useState<{ from?: string; to?: string; data?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [applyColors, setApplyColors] = useState(false);
  const [calendarModifiers, setCalendarModifiers] = useState<any>({});
  const [calendarModifiersStyles, setCalendarModifiersStyles] = useState<any>({});
  const [qtdCidades, setQtdCidades] = useState<string>("");
  const [consolidado, setConsolidado] = useState(false);
  const [focusNomeIdx, setFocusNomeIdx] = useState<number | null>(null);
  const [sugestoesPorIdx, setSugestoesPorIdx] = useState<Record<number, Array<{ label: string; value: string }>>>({});
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<any>(null);
  const [modoTransporte, setModoTransporte] = useState<string>("");
  const [terminalNome, setTerminalNome] = useState<string>("");
  const [horaEmbarque, setHoraEmbarque] = useState<string>("");


  const showToast = (message: string, type: "success" | "error" | "info" = "info", delayMs = 10000) => {
    window.setTimeout(() => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), 6000);
    }, delayMs);
  };

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
      const ini = data?.dataInicio;
      if (ini) {
        setCidades([{ nome: data?.cidadeInicial || "", dataChegada: ini, dataSaida: ini }]);
        setRange({ from: new Date(ini), to: new Date(ini) });
        showToast("Selecione a data de checkout da Cidade 1: clique no último dia da estadia para definir a faixa.", "info", 10000);
      }
    }
    fetch();
  }, [tripId]);

  function confirmarPeriodoAtual() {
    const idx = cidades.length - 1;
    const base = cidades[idx];
    const from = range.from || (base ? new Date(base.dataChegada) : undefined);
    const to = range.to || from;
    if (!from || !to) return;
    const arr = cidades.map((c, i) => (i === idx ? { ...c, dataChegada: from.toISOString(), dataSaida: to.toISOString() } : c));
    setCidades(arr);
  }

  function seguirParaProximaCidade() {
    if (!trip) return;
    const idx = cidades.length - 1;
    const base = cidades[idx];
    const from = range.from || (base ? new Date(base.dataChegada) : undefined);
    const to = range.to || from;
    if (!from || !to || !proximaNome) { alert("Selecione o período e informe o nome da próxima cidade."); return; }
    // Primeiro passo: se a cidade atual ainda não possui nome, use o nome informado
    if (cidades.length === 1 && !cidades[0].nome) {
      const atualizada = cidades.map((c, i) => (i === 0 ? { ...c, nome: proximaNome, dataChegada: from.toISOString(), dataSaida: to.toISOString() } : c));
      const prox: Cidade = { nome: "", dataChegada: to.toISOString(), dataSaida: to.toISOString() };
      setCidades([...atualizada, prox]);
      setProximaNome("");
      setRange({ from: new Date(to), to: new Date(to) });
    } else {
      const atualizada = cidades.map((c, i) => (i === idx ? { ...c, dataSaida: to.toISOString() } : c));
      const prox: Cidade = { nome: proximaNome, dataChegada: to.toISOString(), dataSaida: to.toISOString() };
      setCidades([...atualizada, prox]);
      setProximaNome("");
      setRange({ from: new Date(to), to: new Date(to) });
    }
    showToast("Informe o nome da próxima cidade e selecione o novo checkout. O primeiro dia da nova cidade aparece em cinza (transição).", "info", 10000);
  }

  function identificarCidadesNoCalendario() {
    if (!trip || !cidades.length) return;
    const idx = cidades.length - 1;
    const base = cidades[idx];
    const from = range.from || (base ? new Date(base.dataChegada) : undefined);
    const to = range.to || from;
    let sourceCities = [...cidades];
    if (from && to) {
      const typedName = (proximaNome || "").trim();
      const baseHasName = !!(base?.nome && base.nome.trim().length);
      if (baseHasName && typedName) {
        const novo = { nome: typedName, dataChegada: to.toISOString(), dataSaida: to.toISOString() } as Cidade;
        sourceCities = [...cidades, novo];
        setCidades(sourceCities);
        setProximaNome("");
      } else {
        const nomeFinal = baseHasName ? base.nome : (typedName || base?.nome || "");
        // Atualiza somente a saída para não alterar a chegada já fixada
        sourceCities = cidades.map((c, i) => (i === idx ? { ...c, nome: nomeFinal, dataSaida: to.toISOString() } : c));
        setCidades(sourceCities);
        if (typedName) setProximaNome("");
      }
    }

    const normalized = normalizePeriods(sourceCities, trip?.dataFim);
    setCidades(normalized);

    const palette = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#84cc16"];
    const mods: any = {};
    const modsStyles: any = {};
    normalized.forEach((c, i) => {
      const key = `cidade_${i}`;
      const fromD = c.dataChegada ? new Date(c.dataChegada) : undefined;
      const toD = c.dataSaida ? new Date(c.dataSaida) : undefined;
      if (fromD && toD) mods[key] = [{ from: fromD, to: toD }];
      const color = palette[i % palette.length];
      modsStyles[key] = { backgroundColor: color, color: "#fff" };
    });
    setCalendarModifiers(mods);
    setCalendarModifiersStyles(modsStyles);
    setApplyColors(true);
    showToast("Períodos das cidades destacados por cor no calendário. Os nomes na lista usam a mesma cor da respectiva faixa. Revise e prossiga.", "info", 10000);
  }

  function gerarCidades() {
    const n = parseInt(qtdCidades, 10);
    if (!trip || !n || n < 1) return;
    const arr: Cidade[] = Array.from({ length: n }, () => ({ nome: "", dataChegada: "", dataSaida: "" }));
    // Preenche regras iniciais: chegada da cidade 1 = início da viagem; saída da última = fim da viagem
    if (trip?.dataInicio) arr[0].dataChegada = trip.dataInicio;
    if (trip?.dataFim) arr[n - 1].dataSaida = trip.dataFim;
    setCidades(arr);
    setApplyColors(false);
    setCalendarModifiers({});
    setCalendarModifiersStyles({});
    showToast("Informe quantas cidades pretende visitar e preencha nome, chegada e saída de cada uma. Depois, clique em Visualizar para destacar no calendário.", "info", 10000);
  }

  async function buscarSugestoesCidade(q: string, idx: number) {
    const term = (q || "").trim();
    if (!term) {
      setSugestoesPorIdx((prev) => ({ ...prev, [idx]: [] }));
      return;
    }
    try {
      setLoadingSugestoes(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(term)}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      const data = await res.json();
      const list: Array<{ label: string; value: string }> = (data || []).map((d: any) => {
        const addr = d.address || {};
        const name = d.display_name || [addr.city || addr.town || addr.village || addr.hamlet, addr.state, addr.country].filter(Boolean).join(", ");
        return { label: name, value: name };
      });
      setSugestoesPorIdx((prev) => ({ ...prev, [idx]: list }));
    } catch (e) {
      setSugestoesPorIdx((prev) => ({ ...prev, [idx]: [] }));
    } finally {
      setLoadingSugestoes(false);
    }
  }

  function setCidade(i: number, campo: "nome" | "dataChegada" | "dataSaida", valor: string) {
    setCidades((prev) => {
      const next = prev.map((c, idx) => ({ ...c }));
      const ini = trip?.dataInicio || "";
      const fim = trip?.dataFim || "";
      if (campo === "dataChegada") {
        if (i === 0) {
          next[i].dataChegada = ini;
        } else {
          const prevSa = next[i - 1]?.dataSaida;
          if (prevSa) next[i].dataChegada = prevSa;
        }
      } else if (campo === "dataSaida") {
        if (i === next.length - 1) {
          next[i].dataSaida = fim;
        } else {
          next[i].dataSaida = valor;
          // Propaga chegada da próxima cidade
          if (valor) next[i + 1].dataChegada = valor;
        }
      } else if (campo === "nome") {
        next[i].nome = valor;
      }
      return next;
    });
  }

  function visualizarCidades(): boolean {
    const normalized = normalizePeriods(cidades, trip?.dataFim);
    // Validação básica: todos os campos preenchidos e ordem cronológica
    const iniTrip = parseDate(trip?.dataInicio);
    const fimTrip = parseDate(trip?.dataFim);
    for (let i = 0; i < normalized.length; i++) {
      const c = normalized[i];
      const ch = parseDate(c.dataChegada);
      const sa = parseDate(c.dataSaida);
      if (!c.nome || !ch || !sa) {
        showToast("Preencha nome, chegada e saída de todas as cidades antes de visualizar.", "error", 500);
        return false;
      }
      if (iniTrip && ch < iniTrip) {
        showToast("Alguma chegada está antes do início da viagem.", "error", 500);
        return false;
      }
      if (fimTrip && sa > fimTrip) {
        showToast("Alguma saída está após o fim da viagem.", "error", 500);
        return false;
      }
      if (sa < ch) {
        showToast("A saída não pode ser anterior à chegada.", "error", 500);
        return false;
      }
      if (i > 0) {
        const prevSa = parseDate(normalized[i - 1].dataSaida);
        if (prevSa && (!ch || ch.getTime() !== prevSa.getTime())) {
          showToast("A chegada da cidade seguinte deve coincidir com a saída da cidade anterior.", "error", 500);
          return false;
        }
      }
    }
    setCidades(normalized);
    const palette = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#84cc16"];
    const mods: any = {};
    const modsStyles: any = {};
    const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const daysBetweenInclusive = (a: Date, b: Date) => {
      const out: Date[] = [];
      let cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
      const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
      while (cur.getTime() <= end.getTime()) {
        out.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      return out;
    };
    normalized.forEach((c, i) => {
      const key = `cidade_${i}`;
      const fromD = parseDate(c.dataChegada);
      const toD = parseDate(c.dataSaida);
      if (fromD && toD) {
        const isLast = i === normalized.length - 1;
        const endInc = new Date(toD);
        if (!isLast) endInc.setDate(endInc.getDate() - 1); // evita pintar o dia de transição em ambas
        const days = daysBetweenInclusive(fromD, endInc);
        mods[key] = days;
      }
      const color = palette[i % palette.length];
      modsStyles[key] = { backgroundColor: color, color: "#fff" };
    });
    setCalendarModifiers(mods);
    setCalendarModifiersStyles(modsStyles);
    setApplyColors(true);
    showToast("Visualização pronta: períodos das cidades destacados por cor no calendário.", "info", 10000);
    return true;
  }

  function consolidarDados() {
    const ok = visualizarCidades();
    if (!ok) return;
    setConsolidado(true);
  }

  async function salvarSeguir() {
    if (!trip) return;
    if (cidades.length > 0) {
      // força última saída = dataFim
      const fim = trip.dataFim;
      const arr = cidades.map((c, i) => (i === cidades.length - 1 ? { ...c, dataSaida: fim } : c));
      const user = auth?.currentUser || { uid: "local-dev-user" };
      await updateTrip(user.uid, tripId!, { cidadesAcomodacao: arr });
    }
    router.push(`/acomodacao-detalhe?tripId=${tripId}`);
  }

  if (!trip || cidades.length === 0) return <p>Carregando...</p>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Múltiplas Cidades</h2>
        <p className="text-sm text-slate-600">Selecione o período de cada cidade, nomeie e siga para a próxima.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="rounded-md border border-slate-200 p-2">
            
            <div className="mt-1">
              {(() => {
                const ini = parseDate(trip?.dataInicio);
                const fim = parseDate(trip?.dataFim);
                const defaultMonth = ini;
                const disabled = ini && fim ? [ { before: ini }, { after: fim } ] : undefined;
                return (
                  <Calendar
                    mode="single"
                    disabled={disabled}
                    defaultMonth={defaultMonth}
                    fromMonth={ini}
                    toMonth={fim}
                    modifiers={applyColors ? calendarModifiers : undefined}
                    modifiersStyles={applyColors ? calendarModifiersStyles : undefined}
                  />
                );
              })()}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div>
                <label className="text-sm text-slate-700">Quantidade de cidades</label>
                <Input type="number" min={1} max={20} className="w-28" value={qtdCidades} onChange={(e) => setQtdCidades(e.target.value)} placeholder="Ex: 3" />
              </div>
              <Button variant="secondary" className="h-9 px-3" onClick={gerarCidades}>Gerar lista</Button>
            </div>
          </div>

          <div className="mt-4">
            {consolidado ? (
              <div className="grid gap-2">
                {cidades.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-slate-600">{c.dataChegada?.slice(0,10)} — {c.dataSaida?.slice(0,10)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setOpenBuscaIdx(i)}>Acomodação</Button>
                      <Button
                        onClick={() => {
                          if (i >= cidades.length - 1) return;
                          const from = cidades[i]?.nome || "";
                          const to = cidades[i + 1]?.nome || "";
                          const dt = cidades[i + 1]?.dataChegada || "";
                          setOpenTransporte({ from, to, data: dt });
                        }}
                        disabled={i >= cidades.length - 1}
                      >Transporte (IA)</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h3 className="font-medium">Lista de Cidades</h3>
                <div className="grid gap-2">
                  {cidades.map((c, i) => (
                    <div key={i} className="grid gap-2 rounded-md border border-slate-200 p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Cidade {i + 1}</span>
                      </div>
                      <div className="grid gap-2">
                        <div className="relative">
                          <Input
                            value={c.nome}
                            onFocus={() => setFocusNomeIdx(i)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (focusNomeIdx === i) setFocusNomeIdx(null);
                              }, 200);
                            }}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCidade(i, "nome", v);
                              if (debounceTimer) window.clearTimeout(debounceTimer);
                              const t = window.setTimeout(() => buscarSugestoesCidade(v, i), 250);
                              setDebounceTimer(t);
                            }}
                            placeholder="Nome da cidade"
                          />
                          {focusNomeIdx === i && (sugestoesPorIdx[i] || []).length > 0 ? (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-sm">
                              {(sugestoesPorIdx[i] || []).map((s, k) => (
                                <button
                                  key={k}
                                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => {
                                    setCidade(i, "nome", s.value);
                                    setSugestoesPorIdx((prev) => ({ ...prev, [i]: [] }));
                                    setFocusNomeIdx(null);
                                  }}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={(i === 0 ? trip?.dataInicio?.slice(0,10) : c.dataChegada?.slice(0,10)) || ""}
                            min={trip?.dataInicio?.slice(0,10) || undefined}
                            max={trip?.dataFim?.slice(0,10) || undefined}
                            disabled
                            onChange={(e) => setCidade(i, "dataChegada", new Date(e.target.value).toISOString())}
                          />
                          <Input
                            type="date"
                            value={(i === cidades.length - 1 ? trip?.dataFim?.slice(0,10) : c.dataSaida?.slice(0,10)) || ""}
                            min={trip?.dataInicio?.slice(0,10) || undefined}
                            max={trip?.dataFim?.slice(0,10) || undefined}
                            disabled={i === cidades.length - 1}
                            onChange={(e) => setCidade(i, "dataSaida", new Date(e.target.value).toISOString())}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const allFilled = cidades.length > 0 && cidades.every((cc) => (cc.nome && cc.dataChegada && cc.dataSaida));
                  if (allFilled) {
                    return (
                      <div className="mt-3">
                        <Button onClick={consolidarDados}>Consolidar dados</Button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>

        <Dialog open={openBuscaIdx !== null} onOpenChange={(o) => setOpenBuscaIdx(o ? openBuscaIdx : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buscar acomodação</DialogTitle>
              <DialogDescription>
                {openBuscaIdx !== null ? (
                  <span className="block">Cidade: {cidades[openBuscaIdx].nome} — {cidades[openBuscaIdx].dataChegada?.slice(0,10)} até {cidades[openBuscaIdx].dataSaida?.slice(0,10)}</span>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            {openBuscaIdx !== null ? (
              <div className="grid gap-3 text-sm">
                {(() => {
                  const c = cidades[openBuscaIdx];
                  const ci = c.dataChegada?.slice(0,10);
                  const co = c.dataSaida?.slice(0,10);
                  const city = encodeURIComponent(c.nome);
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <a className="text-blue-600 underline" href={`https://www.booking.com/searchresults.html?ss=${city}&checkin=${ci}&checkout=${co}`} target="_blank" rel="noopener noreferrer">Booking</a>
                      <a className="text-blue-600 underline" href={`https://www.airbnb.com/s/${city}/homes?checkin=${ci}&checkout=${co}`} target="_blank" rel="noopener noreferrer">Airbnb</a>
                      <a className="text-blue-600 underline" href={`https://www.trivago.com/?sQuery=${city}&aDateRange%5Barr%5D=${ci}&aDateRange%5Bdep%5D=${co}`} target="_blank" rel="noopener noreferrer">Trivago</a>
                    </div>
                  );
                })()}
                <div className="grid gap-2">
                  <label>Nome do hotel ou endereço</label>
                  <Input value={buscaNomeEndereco} onChange={(e) => setBuscaNomeEndereco(e.target.value)} placeholder="Ex: Hotel Central, Rua Principal 123" />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenBuscaIdx(null)}>Fechar</Button>
              <Button onClick={() => {
                if (openBuscaIdx === null) return;
                const val = (buscaNomeEndereco || "").trim();
                setCidades((prev) => prev.map((cc, i) => i === openBuscaIdx ? { ...cc, endereco: val } : cc));
                setOpenBuscaIdx(null);
              }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!openTransporte} onOpenChange={() => setOpenTransporte(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opções de Transporte</DialogTitle>
              <DialogDescription>Entre {openTransporte?.from} e {openTransporte?.to}</DialogDescription>
            </DialogHeader>
            {(() => {
              const from = encodeURIComponent(openTransporte?.from || "");
              const to = encodeURIComponent(openTransporte?.to || "");
              const when = (openTransporte as any)?.data ? String((openTransporte as any).data).slice(0,10) : "";
              return (
                <div className="grid gap-3 text-sm">
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                    <p className="text-amber-900">Recomendação: planeje a chegada após 12h. Check-ins costumam iniciar às 14h; ajuste o embarque para minimizar esperas.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className="text-blue-600 underline" href={`https://www.google.com/travel/flights?hl=pt-BR#flt=${from}.${to}.${when}`} target="_blank" rel="noopener noreferrer">Voos (Google Flights)</a>
                    <a className="text-blue-600 underline" href={`https://www.skyscanner.com/transport/flights/${from}/${to}/${when}/`} target="_blank" rel="noopener noreferrer">Voos (Skyscanner)</a>
                    <a className="text-blue-600 underline" href={`https://www.omio.com/search?departure=${from}&arrival=${to}&date=${when}`} target="_blank" rel="noopener noreferrer">Trens/Ônibus (Omio)</a>
                    <a className="text-blue-600 underline" href={`https://www.rome2rio.com/map/${from}/${to}`} target="_blank" rel="noopener noreferrer">Rotas (Rome2Rio)</a>
                    <a className="text-blue-600 underline" href={`https://www.busbud.com/en/results?origin=${from}&destination=${to}&outbound_date=${when}`} target="_blank" rel="noopener noreferrer">Ônibus (Busbud)</a>
                    <a className="text-blue-600 underline" href={`https://www.rentalcars.com/SearchResults.do?locationName=${from}&dropLocationName=${to}`} target="_blank" rel="noopener noreferrer">Carro (Rentalcars)</a>
                  </div>
                  <div className="grid gap-2 mt-2">
                    <div>
                      <label className="text-sm">Modo de transporte</label>
                      <Select value={modoTransporte} onValueChange={setModoTransporte}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Avião">Avião</SelectItem>
                          <SelectItem value="Trem">Trem</SelectItem>
                          <SelectItem value="Ônibus">Ônibus</SelectItem>
                          <SelectItem value="Barco">Barco</SelectItem>
                          <SelectItem value="Táxi">Táxi</SelectItem>
                          <SelectItem value="Carro alugado">Carro alugado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {modoTransporte && ["Avião","Trem","Ônibus","Barco"].includes(modoTransporte) ? (
                      <div>
                        <label className="text-sm">Aeroporto/Estação/Rodoviária/Porto</label>
                        <Input value={terminalNome} onChange={(e) => setTerminalNome(e.target.value)} placeholder="Ex: Paris Gare du Nord / ORY / Rodoviária Central" />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm">Ponto de embarque/retirada (opcional)</label>
                        <Input value={terminalNome} onChange={(e) => setTerminalNome(e.target.value)} placeholder="Endereço ou referência" />
                      </div>
                    )}
                    <div>
                      <label className="text-sm">Horário de embarque</label>
                      <Input type="time" value={horaEmbarque} onChange={(e) => setHoraEmbarque(e.target.value)} />
                    </div>
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenTransporte(null)}>Fechar</Button>
              <Button onClick={async () => {
                const user = auth?.currentUser || { uid: "local-dev-user" };
                if (!user || !trip || !openTransporte) return;
                const when = (openTransporte as any)?.data ? String((openTransporte as any).data).slice(0,10) : undefined;
                const atividade = {
                  cidade: openTransporte.from || "",
                  tipo: "transporte",
                  nome: `${modoTransporte || "Transporte"} ${openTransporte.from || ""} → ${openTransporte.to || ""}`.trim(),
                  detalhes: terminalNome ? `Embarque: ${terminalNome}` : undefined,
                  terminal: terminalNome || undefined,
                  data: when,
                  hora: horaEmbarque || undefined,
                } as any;
                const atividades = [...(trip.atividades || []), atividade];
                await updateTrip(user.uid, tripId!, { atividades });
                const rec = await loadTrip(user.uid, tripId!);
                setTrip(rec);
                setOpenTransporte(null);
                setModoTransporte("");
                setTerminalNome("");
                setHoraEmbarque("");
                showToast("Transporte adicionado ao calendário. Consulte a estimativa na página Calendário.", "success", 500);
              }}>Salvar transporte</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/acomodacao-picker?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={salvarSeguir}>Seguir</Button>
        </div>
      </CardFooter>
      {toast ? (
        <Toast message={toast.message} type={toast.type} position="bottom-left" />
      ) : null}
    </Card>
    </div>
  );
}
  function normalizePeriods(arr: Cidade[], tripFim?: string) {
    const res = arr.map((c) => ({ ...c }));
    for (let i = 0; i < res.length; i++) {
      const cur = res[i];
      const next = i < res.length - 1 ? res[i + 1] : undefined;
      const ch = parseDate(cur.dataChegada);
      const sa = parseDate(cur.dataSaida);
      if (i > 0) {
        const prev = res[i - 1];
        if (prev.dataSaida) {
          const prevSa = parseDate(prev.dataSaida)!;
          if (!ch || ch.getTime() !== prevSa.getTime()) cur.dataChegada = prevSa.toISOString();
        }
      }
      if (next && next.dataChegada) {
        const nch = parseDate(next.dataChegada)!;
        if (!sa || (ch && sa <= ch)) {
          cur.dataSaida = nch.toISOString();
        }
      } else if (!next && tripFim) {
        cur.dataSaida = tripFim;
      }
    }
    return res;
  }