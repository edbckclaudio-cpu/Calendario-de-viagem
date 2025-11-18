"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";

type Sugestao = { nome: string; detalhes: string; url?: string };

export default function EntretenimentoPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [openCity, setOpenCity] = useState<{ cidade: string; tipo: "atividade" | "restaurante" } | null>(null);
  const [selecionado, setSelecionado] = useState<Sugestao | null>(null);
  const [nomeFinal, setNomeFinal] = useState("");
  const [dataAtividade, setDataAtividade] = useState<string>("");
  const [horaAtividade, setHoraAtividade] = useState<string>("");
  const [reservaId, setReservaId] = useState<string>("");
  const [erroData, setErroData] = useState<string>("");
  const [erroEditData, setErroEditData] = useState<string>("");
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [dynamicSugestoes, setDynamicSugestoes] = useState<Sugestao[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSaved, setEditingSaved] = useState<null | { idx: number; data: string; hora?: string; nome?: string; reservaId?: string }>(null);

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
    }
    fetch();
  }, [tripId]);

  // Busca sugestões reais via API; aceita termo de busca livre
  async function buscarSugestoes(q?: string) {
    if (!openCity) return;
    setLoadingSugestoes(true);
    setDynamicSugestoes(null);
    try {
      const url = `/api/places?city=${encodeURIComponent(openCity.cidade)}&type=${openCity.tipo}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const items = (json?.items || []) as Sugestao[];
        if (Array.isArray(items) && items.length) setDynamicSugestoes(items);
      }
    } catch {}
    setLoadingSugestoes(false);
  }

  // Carrega sugestões reais via API quando o modal é aberto
  useEffect(() => {
    if (!openCity) return;
    buscarSugestoes();
  }, [openCity]);

  const GENERIC_ATIVIDADES: Sugestao[] = [
    { nome: "Tour pelo Centro Histórico", detalhes: "Compra recomendada com antecedência" },
    { nome: "Museu de Arte Moderna", detalhes: "Ingresso - ver dias com desconto" },
    { nome: "Passeio de barco", detalhes: "Duração média 2h" },
  ];
  const GENERIC_RESTAURANTES: Sugestao[] = [
    { nome: "Bistrô Central", detalhes: "Cozinha local - melhor reservar" },
    { nome: "Casa da Massa", detalhes: "Italiano - delivery até 23h" },
    { nome: "Restaurante Mar Azul", detalhes: "Peixes e frutos do mar" },
  ];

  // Sugestões por cidade (expandido, incluindo Roma conforme solicitado)
  const SUGESTOES_ATIVIDADES_BY_CITY: Record<string, Sugestao[]> = {
    roma: [
      { nome: "Tour pelo Coliseu e Fórum Romano", detalhes: "€16–€24 — Reserve horário para evitar filas", url: "https://parcocolosseo.it/en/tickets/" },
      { nome: "Museus do Vaticano e Capela Sistina", detalhes: "€20–€35 — Tour guiado recomendado", url: "https://tickets.museivaticani.va/" },
      { nome: "Basílica de São Pedro — subida à cúpula", detalhes: "€8–€10 — Vista panorâmica de Roma" },
      { nome: "Trastevere à noite (walking tour)", detalhes: "Grátis/€ — Bares e restaurantes típicos" },
      { nome: "Galeria Borghese", detalhes: "€13–€20 — Reserva obrigatória, visita 2h", url: "https://www.galleriaborghese.beniculturali.it/en/ticket-office/" },
    ],
    rome: [
      { nome: "Colosseum & Roman Forum guided tour", detalhes: "€25 — Fast-track entry", url: "https://parcocolosseo.it/en/tickets/" },
      { nome: "Vatican Museums & Sistine Chapel", detalhes: "€28 — Early access/skip-the-line", url: "https://tickets.museivaticani.va/" },
      { nome: "St. Peter’s Basilica dome climb", detalhes: "€10 — Amazing city views" },
      { nome: "Trastevere evening food tour", detalhes: "€45 — Street food & wine" },
      { nome: "Borghese Gallery timed entry", detalhes: "€15 — 2-hour slot", url: "https://www.galleriaborghese.beniculturali.it/en/ticket-office/" },
    ],
    paris: [
      { nome: "Tour Torre Eiffel (cume)", detalhes: "€29 — Reserve janela de horário", url: "https://eiffel-tower.paristickets.com/pt/?ci=2&cm=398513329_1304021149203880_c_o_torre%20eiffel_e_{extensionid}&msclkid=8537ca8d1c1e1f6e0424a39123418c4a&utm_source=bing&utm_medium=cpc&utm_campaign=Paris%20-%20Eiffel%20Tower%20-%20Portuguese%20-%20All%20-%20Search%20-%20All%20-%20All%20-%20cid243&utm_term=torre%20eiffel&utm_content=Generic%20-%20Exact%20-%20Portuguese%20-%20All" },
      { nome: "Museu do Louvre", detalhes: "€17 — Ingresso com hora marcada", url: "https://www.ticketlouvre.fr/" },
      { nome: "Passeio no Rio Sena", detalhes: "€16 — 1h cruzeiro", url: "https://www.bateauxparisiens.com/" },
    ],
    london: [
      { nome: "London Eye", detalhes: "£25 — Fast track disponível", url: "https://www.londoneye.com/tickets-and-prices/" },
      { nome: "British Museum highlights", detalhes: "Grátis — Tour de 1h" },
      { nome: "Tower of London", detalhes: "£33 — Crown Jewels", url: "https://www.hrp.org.uk/tower-of-london/visit/buy-tickets/" },
    ],
    "sao paulo": [
      { nome: "Avenida Paulista cultural tour", detalhes: "R$ — MASP, IMS, parques" },
      { nome: "Parque Ibirapuera bike", detalhes: "R$ — 2h passeio" },
    ],
    "rio de janeiro": [
      { nome: "Pão de Açúcar + Bondinho", detalhes: "R$ — Vista da cidade", url: "https://www.bondinho.com.br/" },
      { nome: "Cristo Redentor — Trem do Corcovado", detalhes: "R$ — Reserve com antecedência", url: "https://www.tremdocorcovado.rio/" },
    ],
  };

  const SUGESTOES_RESTAURANTES_BY_CITY: Record<string, Sugestao[]> = {
    roma: [
      { nome: "Trattoria típica em Trastevere", detalhes: "Cucina romana — Carbonara, Cacio e Pepe" },
      { nome: "Pizzeria al taglio", detalhes: "Slice — rápido e econômico" },
      { nome: "Gelateria artesanal", detalhes: "Clássicos italianos — pistache, nocciola" },
      { nome: "Enoteca — degustação de vinhos", detalhes: "Reserva recomendada" },
    ],
    rome: [
      { nome: "Traditional trattoria in Trastevere", detalhes: "Roman classics — Carbonara" },
      { nome: "Pizza al taglio", detalhes: "Quick bite — multiple toppings" },
      { nome: "Artisanal gelato", detalhes: "Local favorites — pistachio" },
    ],
    paris: [
      { nome: "Bistrô parisiense", detalhes: "Menu fixo — reserva recomendada" },
      { nome: "Creperie típica", detalhes: "Galette + cidra" },
    ],
    london: [
      { nome: "Gastro pub", detalhes: "Fish & chips, ales" },
      { nome: "Indian curry house", detalhes: "Soho/Brick Lane" },
    ],
  };

  const normalizeCity = (n?: string) => (n || "").toLowerCase();
  const ensureAtLeastTen = (primary: Sugestao[] | null, fallback: Sugestao[]): Sugestao[] => {
    const base = Array.isArray(primary) ? [...primary] : [];
    const names = new Set(base.map((s) => s.nome));
    for (const s of fallback) {
      if (base.length >= 10) break;
      if (!names.has(s.nome)) {
        base.push(s);
        names.add(s.nome);
      }
    }
    // Se ainda tiver menos de 10, completa com genéricos repetidos (último recurso)
    while (base.length < 10) {
      for (const s of GENERIC_ATIVIDADES) {
        if (base.length >= 10) break;
        if (!names.has(s.nome)) {
          base.push(s);
          names.add(s.nome);
        }
      }
      break;
    }
    return base.length ? base : fallback;
  };
  const getSugestoesAtividades = (cidade?: string): Sugestao[] => {
    const key = normalizeCity(cidade);
    const cityFallback = SUGESTOES_ATIVIDADES_BY_CITY[key] || GENERIC_ATIVIDADES;
    return ensureAtLeastTen(dynamicSugestoes, cityFallback);
  };
  const getSugestoesRestaurantes = (cidade?: string): Sugestao[] => {
    const key = normalizeCity(cidade);
    const cityFallback = SUGESTOES_RESTAURANTES_BY_CITY[key] || GENERIC_RESTAURANTES;
    return ensureAtLeastTen(dynamicSugestoes, cityFallback);
  };

  // Intervalo permitido de datas para a cidade, baseado na acomodação
  function getRangeForCity(cidade?: string): { min: string; max: string } | null {
    if (!trip?.cidadesAcomodacao || !cidade) return null;
    const alvo = (trip.cidadesAcomodacao || []).find(
      (c: any) => normalizeCity(c.nome) === normalizeCity(cidade)
    );
    if (!alvo) return null;
    const min = (alvo.dataChegada || "").slice(0, 10);
    const max = (alvo.dataSaida || "").slice(0, 10);
    if (!min || !max) return null;
    return { min, max };
  }

  // Gera link de busca no TripAdvisor para restaurantes pela cidade (e nome opcional)
  function tripAdvisorUrl(nome?: string, cidade?: string): string {
    const q = [nome, cidade, "restaurante"].filter(Boolean).join(" ");
    // Usa domínio brasileiro; ajusta para EN se preferir
    return `https://www.tripadvisor.com.br/Search?q=${encodeURIComponent(q)}`;
  }

  async function salvarAtividade(cidade: string, tipo: string) {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    if (!dataAtividade) {
      setErroData("Informe o dia da atividade ou reserva.");
      return;
    }
    const range = getRangeForCity(cidade);
    if (range) {
      const d = dataAtividade.slice(0, 10);
      if (d < range.min || d > range.max) {
        setErroData(`Escolha um dia entre ${range.min} e ${range.max}.`);
        return;
      }
    }
    const nova = {
      cidade,
      tipo,
      nome: nomeFinal || selecionado?.nome || "",
      detalhes: selecionado?.detalhes || "",
      url: selecionado?.url || undefined,
      data: dataAtividade || undefined,
      hora: horaAtividade || undefined,
      reservaId: reservaId || undefined,
    };
    const atividades = [...(trip.atividades || []), nova];
    await updateTrip(user.uid, tripId, { atividades });
    setOpenCity(null);
    setSelecionado(null);
    setNomeFinal("");
    setDataAtividade("");
    setHoraAtividade("");
    setReservaId("");
    setErroData("");
    setSearchTerm("");
    const recarregado = await loadTrip(user.uid, tripId);
    setTrip(recarregado);
  }

  async function removerSalvo(idx: number) {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const atividades = [...(trip.atividades || [])];
    atividades.splice(idx, 1);
    await updateTrip(user.uid, tripId, { atividades });
    const recarregado = await loadTrip(user.uid, tripId);
    setTrip(recarregado);
  }

  function iniciarEdicao(idx: number) {
    const atual = (trip?.atividades || [])[idx];
    setEditingSaved({
      idx,
      data: (atual?.data || "").slice(0, 10),
      hora: atual?.hora || "",
      nome: atual?.nome || "",
      reservaId: atual?.reservaId || "",
    });
    setErroEditData("");
  }

  async function salvarEdicao() {
    if (!editingSaved) return;
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const atividades = [...(trip.atividades || [])];
    const atual = atividades[editingSaved.idx];
    // valida intervalo da cidade para a data informada
    const range = getRangeForCity(atual?.cidade);
    const d = (editingSaved.data || "").slice(0, 10);
    if (range && d) {
      if (d < range.min || d > range.max) {
        setErroEditData(`Escolha um dia entre ${range.min} e ${range.max}.`);
        return;
      }
    }
    atividades[editingSaved.idx] = {
      ...atual,
      nome: editingSaved.nome ?? atual?.nome,
      data: editingSaved.data || atual?.data,
      hora: editingSaved.hora ?? atual?.hora,
      reservaId: editingSaved.reservaId ?? atual?.reservaId,
    };
    await updateTrip(user.uid, tripId, { atividades });
    const recarregado = await loadTrip(user.uid, tripId);
    setTrip(recarregado);
    setEditingSaved(null);
  }

  function cancelarEdicao() {
    setEditingSaved(null);
  }

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Entretenimento e Reservas</h2>
        <p className="text-sm text-slate-600">Adicione atividades e restaurantes por cidade.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {(trip.cidadesAcomodacao || []).map((c: any, idx: number) => (
            <div key={idx} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-medium">{c.nome} — {c.dataChegada?.slice(0,10)} até {c.dataSaida?.slice(0,10)}</p>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => setOpenCity({ cidade: c.nome, tipo: "atividade" })}>Busca Atividade</Button>
                <Button variant="outline" onClick={() => setOpenCity({ cidade: c.nome, tipo: "restaurante" })}>Busca Restaurante</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="font-medium">Atividades e reservas salvas</h3>
          {!(trip.atividades?.length) ? (
            <p className="text-sm text-slate-600">Nenhuma atividade ou restaurante salvo ainda.</p>
          ) : (
            <div className="mt-2 grid gap-2">
              {(trip.atividades || []).map((a: any, i: number) => (
                <div key={i} className="rounded-md border border-slate-200 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.nome}</p>
                      <p className="text-slate-600">{a.cidade} — {a.tipo}</p>
                      {a.data ? (
                        <p className="text-slate-600">
                          Dia: {(a.data || "").slice(0, 10)}{a.hora ? ` às ${a.hora}` : ""}
                        </p>
                      ) : null}
                      {a.detalhes ? <p className="text-slate-600">{a.detalhes}</p> : null}
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline ml-4"
                        >Abrir link</a>
                      ) : null}
                    </div>
                    {editingSaved?.idx !== i ? (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => removerSalvo(i)}>Remover</Button>
                        <Button onClick={() => iniciarEdicao(i)}>Editar</Button>
                      </div>
                    ) : null}
                  </div>
                  {editingSaved?.idx === i ? (
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="grid gap-1">
                          <label className="text-sm">Dia</label>
                          <Input
                            type="date"
                            value={editingSaved.data}
                            min={getRangeForCity(a.cidade)?.min}
                            max={getRangeForCity(a.cidade)?.max}
                            onChange={(ev) => {
                              setEditingSaved({ ...editingSaved!, data: ev.target.value });
                              if (ev.target.value) setErroEditData("");
                            }}
                          />
                          {erroEditData ? <p className="text-xs text-red-600">{erroEditData}</p> : null}
                        </div>
                        <div className="grid gap-1">
                          <label className="text-sm">Hora</label>
                          <Input type="time" value={editingSaved.hora || ""} onChange={(ev) => setEditingSaved({ ...editingSaved!, hora: ev.target.value })} />
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="grid gap-1">
                          <label className="text-sm">Nome da atração</label>
                          <Input value={editingSaved.nome || ""} onChange={(ev) => setEditingSaved({ ...editingSaved!, nome: ev.target.value })} />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-sm">ID da reserva (opcional)</label>
                          <Input value={editingSaved.reservaId || ""} onChange={(ev) => setEditingSaved({ ...editingSaved!, reservaId: ev.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={salvarEdicao}>Salvar</Button>
                        <Button variant="secondary" onClick={cancelarEdicao}>Cancelar</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!openCity} onOpenChange={() => setOpenCity(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {openCity?.tipo === "atividade" ? "Sugestões de Atividades" : "Sugestões de Restaurantes"}
              </DialogTitle>
              <DialogDescription>Selecione uma sugestão ou informe sua escolha final.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 mb-2">
            <label className="text-sm">Buscar por nome/tipo</label>
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={openCity?.tipo === "atividade" ? "Ex: Coliseu, Vatican Museums" : "Ex: Trattoria, Bistrô"}
              />
              <Button variant="outline" onClick={() => buscarSugestoes(searchTerm || undefined)}>Buscar</Button>
            </div>
          </div>
          <div className="grid gap-2">
            {loadingSugestoes ? (
              <p className="text-sm text-slate-600">Buscando sugestões reais…</p>
            ) : null}
              {(openCity?.tipo === "atividade" ? getSugestoesAtividades(openCity?.cidade) : getSugestoesRestaurantes(openCity?.cidade)).map((s) => (
                <button
                  key={s.nome}
                  className={`text-left rounded-md border p-2 text-sm ${selecionado?.nome === s.nome ? "border-blue-500" : "border-slate-200"}`}
                  onClick={() => {
                    if (s.url) {
                      try {
                        window.open(s.url, "_blank", "noopener,noreferrer");
                      } catch {
                        // se falhar, apenas seleciona
                        setSelecionado(s);
                      }
                    } else {
                      setSelecionado(s);
                    }
                  }}
                >
                  <p className="font-medium">{s.nome}</p>
                  <p className="text-slate-600">{s.detalhes}</p>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs"
                    >
                      {String(s.url).includes("google.com") ? "Ver no Google Maps" : "Abrir site de reserva"}
                    </a>
                  ) : null}
                  {openCity?.tipo === "restaurante" ? (
                    <a
                      href={tripAdvisorUrl(s.nome, openCity?.cidade)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs ml-2"
                    >
                      Ver no TripAdvisor
                    </a>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-1">
                  <label className="text-sm">Dia</label>
                  <Input
                    type="date"
                    required
                    min={getRangeForCity(openCity?.cidade)?.min}
                    max={getRangeForCity(openCity?.cidade)?.max}
                    value={dataAtividade}
                    onChange={(e) => {
                      setDataAtividade(e.target.value);
                      if (e.target.value) setErroData("");
                    }}
                  />
                  {erroData ? <p className="text-xs text-red-600">{erroData}</p> : null}
                </div>
                <div className="grid gap-1">
                  <label className="text-sm">Hora</label>
                  <Input type="time" value={horaAtividade} onChange={(e) => setHoraAtividade(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Nome da atração</label>
                <Input value={nomeFinal} onChange={(e) => setNomeFinal(e.target.value)} placeholder="Ex: Tour Louvre" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Identificação da reserva (opcional)</label>
                <Input value={reservaId} onChange={(e) => setReservaId(e.target.value)} placeholder="Ex: #ABC123" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenCity(null)}>Cancelar</Button>
              <Button onClick={() => salvarAtividade(openCity!.cidade, openCity!.tipo)}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/acomodacao-detalhe?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={() => router.push(`/calendario?tripId=${tripId}`)}>Seguir</Button>
        </div>
      </CardFooter>
    </Card>
  );
}