"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { auth, loadTrip, updateTrip, indexTripForEmail } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { airportCoordsByIATA, cityCenterCoordsByName, parseCoordsFromAddress, haversineDistanceKm, estimateTransportOptions } from "@/lib/utils";

type Evento = { data: string; hora?: string; tipo: string; local?: string; descricao?: string; url?: string; source?: { kind: "atividade"; idx: number } };

export default function CalendarioPage() {
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [viewDate, setViewDate] = useState<Date | undefined>();
  const [editing, setEditing] = useState<null | { idx: number; data: string; hora?: string; nome?: string; reservaId?: string }>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportInfo, setTransportInfo] = useState<null | {
    origemEndereco?: string;
    aeroporto?: string;
    destinoEndereco?: string;
    distanciaKm: number | null;
    tempoEstimadoMin: number | null;
    horaSaidaSugerida?: string;
    modoUsado?: string;
    diaAnterior?: boolean;
    aviso?: string;
    gmapsUrl?: string;
  }>(null);

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
      setViewDate(data?.dataInicio ? new Date(data.dataInicio) : undefined);
    }
    fetch();
  }, [tripId]);

  const eventos: Evento[] = useMemo(() => {
    if (!trip) return [];
    const ev: Evento[] = [];
    if (trip.vooIda?.data) {
      const origemIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
      const destinoIda = trip?.buscaVoo?.ida?.destino || trip?.buscaVoo?.destino;
      ev.push({
        data: trip.vooIda.data,
        hora: trip.vooIda.horarioDetalhado,
        tipo: "Voo IDA",
        local: `${origemIda} → ${destinoIda}`,
        descricao: trip.vooIda?.codigoVoo ? `Código: ${trip.vooIda.codigoVoo}` : undefined,
      });
    }
    if (trip.vooVolta?.data) {
      const origemVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
      const destinoVolta = trip?.buscaVoo?.volta?.destino || trip?.buscaVoo?.origem;
      ev.push({
        data: trip.vooVolta.data,
        hora: trip.vooVolta.horarioDetalhado,
        tipo: "Voo VOLTA",
        local: `${origemVolta} → ${destinoVolta}`,
        descricao: trip.vooVolta?.codigoVoo ? `Código: ${trip.vooVolta.codigoVoo}` : undefined,
      });
    }
    (trip.cidadesAcomodacao || []).forEach((c: any) => {
      ev.push({ data: c.dataChegada, tipo: "Check-in", local: c.nome });
      ev.push({ data: c.dataSaida, tipo: "Check-out", local: c.nome });
    });
    (trip.atividades || []).forEach((a: any, idx: number) => {
      const cidadeInfo = (trip.cidadesAcomodacao || []).find((c: any) => c.nome === a.cidade);
      const data = a.data || cidadeInfo?.dataChegada;
      if (!data) return;
      const hora = a.hora || undefined;
      const tipo = a.tipo === "restaurante" ? "Reserva" : "Atividade";
      const local = a.nome || a.cidade;
      const partes: string[] = [];
      if (a.cidade) partes.push(a.cidade);
      if (a.detalhes) partes.push(a.detalhes);
      if (a.reservaId) partes.push(`Reserva: ${a.reservaId}`);
      if ((a as any).acomodacao) partes.push(`Hospedagem: ${(a as any).acomodacao}`);
      const descricao = partes.length ? partes.join(" — ") : undefined;
      ev.push({ data, hora, tipo, local, descricao, url: a.url, source: { kind: "atividade", idx } });
    });
    return ev.sort((x, y) => x.data.localeCompare(y.data));
  }, [trip]);

  // Calcula transporte até o aeroporto de embarque para o dia selecionado
  useEffect(() => {
    async function compute() {
      const dStr = viewDate ? new Date(viewDate).toISOString().slice(0, 10) : undefined;
      if (!popupOpen || !trip || !dStr) { setTransportInfo(null); return; }
      const flights = getFlightsForDate(dStr);
      if (!flights.length) { setTransportInfo(null); return; }
      // usa o primeiro voo do dia; se houver mais de um, já estão ordenados por hora
      const f = flights[0];
      const aeroportoOrigem = f.origem;
      const airportLabel = (code?: string) => {
        const map: Record<string, string> = {
          FCO: "Roma Fiumicino (FCO)",
          CIA: "Roma Ciampino (CIA)",
          GRU: "São Paulo/Guarulhos (GRU)",
          GIG: "Rio/Galeão (GIG)",
          SDU: "Rio/Santos Dumont (SDU)",
          CGH: "São Paulo/Congonhas (CGH)",
          VCP: "Campinas/Viracopos (VCP)",
          CDG: "Paris Charles de Gaulle (CDG)",
          ORY: "Paris Orly (ORY)",
          LHR: "Londres Heathrow (LHR)",
          JFK: "Nova York JFK (JFK)",
        };
        return (code && map[code]) || code || "";
      };
      const ap = airportCoordsByIATA(aeroportoOrigem || undefined);
      // tenta obter endereço da cidade ativa no dia
      const c = getCityForDate(dStr);
      const addressRaw = c ? ((c.endereco || c.hotelNome || "").trim()) : "";
      // Se não houver endereço, tenta centro da cidade; caso não haja cidade, mostra aviso
      setTransportLoading(true);
      let addrCoords = parseCoordsFromAddress(addressRaw);
      if (!addrCoords && addressRaw && c?.nome) {
        try {
          const q = `${addressRaw} ${c.nome}`;
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const j = await res.json();
            if (j?.lat && j?.lon) addrCoords = { lat: j.lat, lon: j.lon };
          }
        } catch {}
      }
      if (!addrCoords && c?.nome) addrCoords = cityCenterCoordsByName(c.nome) || null;

      // Monta link do Google Maps: origem = endereço, destino = aeroporto
      const originParam = addrCoords ? `${addrCoords.lat},${addrCoords.lon}` : (addressRaw && c?.nome ? `${addressRaw} ${c.nome}` : "");
      const destParam = ap ? `${ap.lat},${ap.lon}` : (aeroportoOrigem || "");
      const destinoEndereco = airportLabel(aeroportoOrigem);
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=driving`;

      if (!ap || (!addrCoords && !originParam)) {
        setTransportInfo({
          origemEndereco: addressRaw || undefined,
          aeroporto: aeroportoOrigem || undefined,
          destinoEndereco,
          distanciaKm: null,
          tempoEstimadoMin: null,
          aviso: addressRaw ? "Estimativa aproximada: faltam coordenadas precisas." : "Informe o endereço da acomodação para estimar deslocamento.",
          gmapsUrl,
        });
        setTransportLoading(false);
        return;
      }

      const distKm = addrCoords && ap ? haversineDistanceKm(ap, addrCoords) : null;
      let tempoMin: number | null = null;
      let modoUsado: string | undefined = undefined;
      if (distKm !== null) {
        const opts = estimateTransportOptions(distKm, c?.nome);
        // escolhe o modo mais rápido
        const fastest = opts.reduce((prev, cur) => (cur.tempoEstimadoMin < prev.tempoEstimadoMin ? cur : prev));
        tempoMin = fastest.tempoEstimadoMin;
        modoUsado = fastest.modo;
      }

      // calcula horário de saída: horário do voo - (3h + tempo deslocamento)
      let horaSaida: string | undefined = undefined;
      let diaAnterior = false;
      if (f.hora && tempoMin !== null) {
        const dt = new Date(`${dStr}T${f.hora}:00`);
        const leaveMs = dt.getTime() - (3 * 60 + tempoMin) * 60000;
        const leave = new Date(leaveMs);
        const hh = String(leave.getHours()).padStart(2, "0");
        const mm = String(leave.getMinutes()).padStart(2, "0");
        horaSaida = `${hh}:${mm}`;
        const leaveDayStr = leave.toISOString().slice(0, 10);
        diaAnterior = leaveDayStr < dStr; // se ultrapassou para o dia anterior
      }

      setTransportInfo({
        origemEndereco: addressRaw || undefined,
        aeroporto: aeroportoOrigem || undefined,
        destinoEndereco,
        distanciaKm: distKm !== null ? Math.round(distKm * 10) / 10 : null,
        tempoEstimadoMin: tempoMin,
        horaSaidaSugerida: horaSaida,
        modoUsado,
        diaAnterior,
        gmapsUrl,
      });
      setTransportLoading(false);
    }
    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen, viewDate, trip]);

  // Helpers para modal de dia
  function getCityForDate(dateStr?: string) {
    if (!trip?.cidadesAcomodacao || !dateStr) return null;
    return (trip.cidadesAcomodacao || []).find((c: any) => {
      const min = (c.dataChegada || "").slice(0, 10);
      const max = (c.dataSaida || "").slice(0, 10);
      return min && max && dateStr >= min && dateStr <= max;
    }) || null;
  }

  function getActivitiesForDate(dateStr?: string) {
    if (!trip?.atividades || !dateStr) return [] as any[];
    const list = (trip.atividades || []).filter((a: any) => (a.data || "").slice(0, 10) === dateStr);
    // ordena por hora crescente, undefined vai para o final
    return list.sort((a: any, b: any) => {
      const ha = a.hora || "99:99";
      const hb = b.hora || "99:99";
      return ha.localeCompare(hb);
    });
  }

  function getFlightsForDate(dateStr?: string) {
    const flights: Array<{ tipo: string; origem: string; destino: string; hora?: string; codigo?: string; classe?: string }> = [];
    if (!trip || !dateStr) return flights;
    if (trip.vooIda?.data?.slice(0,10) === dateStr) {
      const origemIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
      const destinoIda = trip?.buscaVoo?.ida?.destino || trip?.buscaVoo?.destino;
      flights.push({
        tipo: "Voo IDA",
        origem: origemIda,
        destino: destinoIda,
        hora: trip.vooIda?.horarioDetalhado,
        codigo: trip.vooIda?.codigoVoo,
        classe: trip.vooIda?.classe,
      });
    }
    if (trip.vooVolta?.data?.slice(0,10) === dateStr) {
      const origemVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
      const destinoVolta = trip?.buscaVoo?.volta?.destino || trip?.buscaVoo?.origem;
      flights.push({
        tipo: "Voo VOLTA",
        origem: origemVolta,
        destino: destinoVolta,
        hora: trip.vooVolta?.horarioDetalhado,
        codigo: trip.vooVolta?.codigoVoo,
        classe: trip.vooVolta?.classe,
      });
    }
    // ordena por hora quando disponível
    return flights.sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
  }

  async function removeAtividade(idx: number) {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const atividades = [...(trip.atividades || [])];
    atividades.splice(idx, 1);
    await updateTrip(user.uid, tripId, { atividades });
    const rec = await loadTrip(user.uid, tripId);
    setTrip(rec);
  }

  function beginEdit(idx: number) {
    const atual = (trip?.atividades || [])[idx];
    setEditing({
      idx,
      data: (atual?.data || "").slice(0, 10),
      hora: atual?.hora || "",
      nome: atual?.nome || "",
      reservaId: atual?.reservaId || "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const atividades = [...(trip.atividades || [])];
    const atual = atividades[editing.idx];
    atividades[editing.idx] = {
      ...atual,
      nome: editing.nome ?? atual?.nome,
      data: editing.data || atual?.data,
      hora: editing.hora ?? atual?.hora,
      reservaId: editing.reservaId ?? atual?.reservaId,
    };
    await updateTrip(user.uid, tripId, { atividades });
    const rec = await loadTrip(user.uid, tripId);
    setTrip(rec);
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  if (!trip) return <p>Carregando...</p>;

  function computeCityLabel() {
    return (
      trip?.cidadesAcomodacao?.[0]?.nome ||
      trip?.acomodacaoBusiness?.cidade ||
      trip?.buscaVoo?.ida?.destino ||
      trip?.buscaVoo?.destino ||
      "Viagem"
    );
  }

  function toIcsDate(dtStr?: string, timeStr?: string) {
    try {
      const base = dtStr ? new Date(dtStr) : new Date();
      if (timeStr && /\d{2}:\d{2}/.test(timeStr)) {
        const [hh, mm] = timeStr.split(":");
        base.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
      } else {
        base.setHours(9, 0, 0, 0);
      }
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, "0");
      const d = String(base.getDate()).padStart(2, "0");
      const hh = String(base.getHours()).padStart(2, "0");
      const mm = String(base.getMinutes()).padStart(2, "0");
      const ss = "00";
      return `${y}${m}${d}T${hh}${mm}${ss}`;
    } catch {
      return undefined;
    }
  }

  function buildICS() {
    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//TRAE//Calendario Viagem//PT");
    eventos.forEach((e, idx) => {
      const dtstart = toIcsDate(e.data, e.hora);
      const endRef = toIcsDate(e.data, e.hora);
      lines.push("BEGIN:VEVENT");
      if (dtstart) lines.push(`DTSTART:${dtstart}`);
      if (endRef) lines.push(`DTEND:${endRef}`);
      lines.push(`SUMMARY:${e.tipo}${e.local ? " — " + e.local : ""}`);
      if (e.descricao) lines.push(`DESCRIPTION:${e.descricao}`);
      if (e.url) lines.push(`URL:${e.url}`);
      lines.push(`UID:trae-${tripId}-${idx}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function handleEnviarEmail() {
    const email = localStorage.getItem("trae_email") || "";
    if (!email) {
      alert("Faça login com seu e-mail na página inicial.");
      return;
    }
    const ics = buildICS();
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trae-calendario.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    const resumo = eventos.map((e) => `${e.data?.slice(0,10)}${e.hora ? " " + e.hora : ""} — ${e.tipo}${e.local ? " — " + e.local : ""}${e.descricao ? " — " + e.descricao : ""}`).join("\n");
    const subject = `Calendário TRAE — ${computeCityLabel()}`;
    const body = `Olá,\n\nSegue o calendário da viagem (arquivo .ics baixado automaticamente).\n\nResumo:\n${resumo}\n\nLink do calendário no site: ${window.location.origin}/calendario?tripId=${tripId}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleSalvarViagem() {
    try {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const cidade = computeCityLabel();
      const email = localStorage.getItem("trae_email") || "";
      await updateTrip(user.uid, tripId, { cidadeLabel: cidade, saved: true, email, updatedAt: new Date().toISOString() });
      if (email) {
        await indexTripForEmail(email, tripId, { cidade, updatedAt: new Date().toISOString() });
      }
      alert("Viagem salva com seu usuário de e-mail.");
    } catch (err) {
      console.error("Falha ao salvar viagem", err);
      alert("Não foi possível salvar a viagem.");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Calendário</h2>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleSalvarViagem}>Salvar esta viagem</Button>
              <Button onClick={handleEnviarEmail}>Enviar calendário por email</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            value={viewDate}
            onChange={(d) => {
              setViewDate(d);
              if (d) setPopupOpen(true);
            }}
            disabled={trip?.dataInicio && trip?.dataFim ? [
              { before: new Date(trip.dataInicio) },
              { after: new Date(trip.dataFim) },
            ] : undefined}
          />
          <p className="mt-2 text-sm text-slate-600">Início: {trip.dataInicio?.slice(0,10)} — Fim: {trip.dataFim?.slice(0,10)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Lista Cronológica</h2>
        </CardHeader>
        <CardContent>
          <ul className="text-sm grid gap-2">
            {eventos.map((e, i) => (
              <li key={i} className="rounded-md border border-slate-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{e.data?.slice(0,10)}</span>
                    {e.hora ? ` - ${e.hora}` : ""} — {e.tipo}
                    {e.local ? ` — ${e.local}` : ""}
                    {e.descricao ? ` — ${e.descricao}` : ""}
                    {e.url ? (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 underline"
                        title={String(e.url).includes("google.com") ? "Ver no Google Maps" : "Abrir site de reserva"}
                      >
                        {String(e.url).includes("google.com") ? "Ver no Google Maps" : "Abrir site de reserva"}
                      </a>
                    ) : null}
                  </div>
                  {e.source?.kind === "atividade" && editing?.idx !== e.source.idx ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => removeAtividade(e.source!.idx)}>Remover</Button>
                      <Button onClick={() => beginEdit(e.source!.idx)}>Editar</Button>
                    </div>
                  ) : null}
                </div>
                {e.source?.kind === "atividade" && editing?.idx === e.source.idx ? (
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-sm">Dia</label>
                        <Input type="date" value={editing.data} onChange={(ev) => setEditing({ ...editing!, data: ev.target.value })} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm">Hora</label>
                        <Input type="time" value={editing.hora || ""} onChange={(ev) => setEditing({ ...editing!, hora: ev.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-sm">Nome da atração</label>
                        <Input value={editing.nome || ""} onChange={(ev) => setEditing({ ...editing!, nome: ev.target.value })} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm">ID da reserva (opcional)</label>
                        <Input value={editing.reservaId || ""} onChange={(ev) => setEditing({ ...editing!, reservaId: ev.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit}>Salvar</Button>
                      <Button variant="secondary" onClick={cancelEdit}>Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {/* Modal de dia selecionado */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do dia</DialogTitle>
            <DialogDescription>
              {(() => {
                const dStr = viewDate ? new Date(viewDate).toISOString().slice(0,10) : undefined;
                const c = getCityForDate(dStr || undefined);
                if (!dStr) return null;
                return (
                  <div className="text-sm">
                    <p><span className="font-medium">Data:</span> {dStr}</p>
                    {c ? (
                      <>
                        <p><span className="font-medium">Cidade:</span> {c.nome}</p>
                        <p><span className="font-medium">Acomodação:</span> {(c.endereco || c.hotelNome || "(não informado)")}</p>
                        {c.telefone ? <p><span className="font-medium">Telefone:</span> {c.telefone}</p> : null}
                        {c.anfitriao ? <p><span className="font-medium">Anfitrião:</span> {c.anfitriao}</p> : null}
                      </>
                    ) : (
                      <p className="text-slate-600">Fora do período de estadia.</p>
                    )}
                  </div>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            {(() => {
              const dStr = viewDate ? new Date(viewDate).toISOString().slice(0,10) : undefined;
              const acts = getActivitiesForDate(dStr || undefined);
              const fls = getFlightsForDate(dStr || undefined);
              if (!dStr) return null;
              return (
                <div className="grid gap-2">
                  {/* Transporte até o aeroporto de embarque */}
                  {fls.length ? (
                    <div className="rounded-md border border-slate-200 p-2">
                      <p className="font-medium">Transporte até o aeroporto</p>
                      {transportLoading ? (
                        <p className="text-sm text-slate-600">Calculando deslocamento...</p>
                      ) : transportInfo ? (
                        <div className="text-sm">
                          {transportInfo.origemEndereco ? (
                            <p><span className="font-medium">Origem:</span> {transportInfo.origemEndereco}</p>
                          ) : null}
                          {transportInfo.destinoEndereco ? (
                            <p><span className="font-medium">Destino:</span> {transportInfo.destinoEndereco}</p>
                          ) : transportInfo.aeroporto ? (
                            <p><span className="font-medium">Destino:</span> {transportInfo.aeroporto}</p>
                          ) : null}
                          <p><span className="font-medium">Distância:</span> {transportInfo.distanciaKm !== null ? `${transportInfo.distanciaKm} km` : "indeterminada"}</p>
                          <p><span className="font-medium">Tempo estimado:</span> {transportInfo.tempoEstimadoMin !== null ? `${transportInfo.tempoEstimadoMin} min` : "indeterminado"}</p>
                          {transportInfo.horaSaidaSugerida ? (
                            <p>
                              <span className="font-medium">Sair às:</span> {transportInfo.horaSaidaSugerida}
                              {transportInfo.diaAnterior ? (
                                <span className="ml-2 inline-block px-2 py-0.5 rounded border text-xs bg-amber-100 border-amber-200 text-amber-800 align-middle">⚠️ dia anterior</span>
                              ) : null}
                              {transportInfo.modoUsado ? ` — Modo: ${transportInfo.modoUsado}` : ""}
                              {" "}(3h de antecedência + deslocamento)
                            </p>
                          ) : null}
                          {transportInfo.diaAnterior ? (
                            <p className="text-xs text-red-700 mt-1">Atenção: o horário de saída cai no dia anterior ao voo.</p>
                          ) : null}
                          {transportInfo.aviso ? (
                            <p className="text-slate-600">{transportInfo.aviso}</p>
                          ) : null}
                          {transportInfo.gmapsUrl ? (
                            <p><a href={transportInfo.gmapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver rota no Google Maps</a></p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {fls.length ? (
                    <>
                      <p className="font-medium">Voo(s) do dia</p>
                      <ul className="grid gap-2 text-sm">
                        {fls.map((f, i) => (
                          <li key={i} className="rounded-md border border-slate-200 p-2">
                            <span className="font-medium">{f.tipo} — {f.origem} → {f.destino}</span>
                            <span className="block text-slate-600">{f.hora ? `Horário: ${f.hora}` : ""}{f.codigo ? ` — Código: ${f.codigo}` : ""}{f.classe ? ` — Classe: ${f.classe}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p className="font-medium">Atividades do dia</p>
                  {acts.length ? (
                    <ul className="grid gap-2 text-sm">
                      {acts.map((a: any, i: number) => (
                        <li key={i} className="rounded-md border border-slate-200 p-2">
                          <span className="font-medium">{a.hora ? `${a.hora} — ` : ""}{a.nome || a.tipo}</span>
                          <span className="block text-slate-600">{a.cidade} — {a.tipo}{a.detalhes ? ` — ${a.detalhes}` : ""}{a.reservaId ? ` — Reserva: ${a.reservaId}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">Sem atividades registradas para este dia.</p>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPopupOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}