"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";
import { getFlightInfoByCode, formatConvertedLocalTimeWithGMT, formatLocalTimeWithGMT } from "@/lib/utils";
import Toast from "@/components/ui/toast";

export default function DetalheVooPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toast, setToast] = useState<null | { message: string; type: "success" | "error" | "info" }>(null);

  // hour/minute selectors
  const [idaHora, setIdaHora] = useState<string>("12");
  const [idaMin, setIdaMin] = useState<string>("00");
  const [idaCodigo, setIdaCodigo] = useState<string>("");
  const [voltaHora, setVoltaHora] = useState<string>("12");
  const [voltaMin, setVoltaMin] = useState<string>("00");
  const [voltaCodigo, setVoltaCodigo] = useState<string>("");
  // info derivada do código do voo
  const [idaFaixa, setIdaFaixa] = useState<string>(trip?.vooIda?.horarioFaixa || "");
  const [voltaFaixa, setVoltaFaixa] = useState<string>(trip?.vooVolta?.horarioFaixa || "");
  const [idaInfo, setIdaInfo] = useState<any | null>(null);
  const [voltaInfo, setVoltaInfo] = useState<any | null>(null);
  const [idaCodeError, setIdaCodeError] = useState<string | null>(null);
  const [voltaCodeError, setVoltaCodeError] = useState<string | null>(null);
  const [idaTimeError, setIdaTimeError] = useState<string | null>(null);
  const [voltaTimeError, setVoltaTimeError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
    }
    fetch();
  }, [tripId]);

  function hours() {
    // Inclui 00..24
    return Array.from({ length: 25 }, (_, i) => String(i).padStart(2, "0"));
  }
  function minutesForHour(h: string) {
    // Para 24, somente 00 é válido
    if (String(h) === "24") return ["00"];
    return ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  }

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function prefillByCodigo(tipo: "ida" | "volta") {
    if (!trip) return;
    const isIda = tipo === "ida";
    const code = isIda ? idaCodigo : voltaCodigo;
    const date = (isIda ? trip.vooIda?.data : trip.vooVolta?.data) || (isIda ? trip.dataInicio : trip.dataFim);
    if (!code || !date) {
      showToast("Informe o código e certifique-se que a data existe.", "error");
      return;
    }
    const params = new URLSearchParams({ code, date }).toString();
    fetch(`/api/flight-info?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao buscar informações do voo");
        return res.json();
      })
      .then((info) => {
        if (isIda) {
          setIdaHora(info.departureHour);
          setIdaMin(info.departureMinute);
          if (info.horarioFaixa) setIdaFaixa(info.horarioFaixa);
          setIdaInfo(info);
        } else {
          setVoltaHora(info.departureHour);
          setVoltaMin(info.departureMinute);
          if (info.horarioFaixa) setVoltaFaixa(info.horarioFaixa);
          setVoltaInfo(info);
        }
        showToast("Horário preenchido pelo código do voo.", "success");
      })
      .catch(() => {
        // Fallback local
        const local = getFlightInfoByCode(code, date);
        if (local) {
          if (isIda) {
            setIdaHora(local.departureHour);
            setIdaMin(local.departureMinute);
            setIdaFaixa(local.horarioFaixa);
            setIdaInfo(local);
          } else {
            setVoltaHora(local.departureHour);
            setVoltaMin(local.departureMinute);
            setVoltaFaixa(local.horarioFaixa);
            setVoltaInfo(local);
          }
          showToast("Usando horário estimado (sem API).", "info");
        } else {
          showToast("Não foi possível identificar o voo pelo código.", "error");
        }
      });
  }

  function normalizeFlightCode(raw: string): string {
    const s = String(raw || "").toUpperCase().replace(/\s|-/g, "");
    return s;
  }
  function isValidFlightCode(code: string): boolean {
    return /^[A-Z]{2,3}\d{1,4}$/.test(code);
  }
  function isValidHour(h?: string): boolean {
    return !!h && /^\d{2}$/.test(h) && Number(h) >= 0 && Number(h) <= 24;
  }
  function isValidMinute(m?: string, h?: string): boolean {
    if (!m || !/^\d{2}$/.test(m)) return false;
    if (h === "24") return m === "00";
    return ["00","05","10","15","20","25","30","35","40","45","50","55"].includes(m);
  }

  // Garante minutos "00" quando a hora for 24
  useEffect(() => {
    if (idaHora === "24" && idaMin !== "00") setIdaMin("00");
  }, [idaHora]);
  useEffect(() => {
    if (voltaHora === "24" && voltaMin !== "00") setVoltaMin("00");
  }, [voltaHora]);

  async function salvarDetalhes() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const idaHorarioDetalhado = `${idaHora}:${idaMin}`;
    const voltaHorarioDetalhado = `${voltaHora}:${voltaMin}`;
    setIdaTimeError(null);
    setVoltaTimeError(null);
    if (!isValidHour(idaHora) || !isValidMinute(idaMin, idaHora)) { setIdaTimeError("Horário inválido para ida"); return; }
    if (!isValidHour(voltaHora) || !isValidMinute(voltaMin, voltaHora)) { setVoltaTimeError("Horário inválido para volta"); return; }
    const idaCode = normalizeFlightCode(idaCodigo);
    if (idaCode && !isValidFlightCode(idaCode)) { setIdaCodeError("Código inválido (ex.: AV86, KL792)"); return; }
    const novoVooIda = { ...(trip.vooIda || {}), horarioDetalhado: idaHorarioDetalhado } as any;
    if (idaCode) novoVooIda.codigoVoo = idaCode;
    if (idaFaixa) novoVooIda.horarioFaixa = idaFaixa;
    if (idaInfo?.airline) novoVooIda.airline = idaInfo.airline;

    const voltaCode = normalizeFlightCode(voltaCodigo);
    if (voltaCode && !isValidFlightCode(voltaCode)) { setVoltaCodeError("Código inválido (ex.: AV86, KL792)"); return; }
    const novoVooVolta = { ...(trip.vooVolta || {}), horarioDetalhado: voltaHorarioDetalhado } as any;
    if (voltaCode) novoVooVolta.codigoVoo = voltaCode;
    if (voltaFaixa) novoVooVolta.horarioFaixa = voltaFaixa;
    if (voltaInfo?.airline) novoVooVolta.airline = voltaInfo.airline;

    // opcionalmente ajustar origem/destino se vier do código do voo
    const buscaAtual = trip.buscaVoo || {};
    const buscaAtualIda = buscaAtual.ida || {};
    const buscaAtualVolta = buscaAtual.volta || {};
    const buscaVooAtualizada = {
      ...buscaAtual,
      origem: buscaAtual.origem,
      destino: buscaAtual.destino,
      ida: {
        ...buscaAtualIda,
        origem: idaInfo?.origin || buscaAtualIda.origem || buscaAtual.origem,
        destino: idaInfo?.destination || buscaAtualIda.destino || buscaAtual.destino,
      },
      volta: {
        ...buscaAtualVolta,
        origem: voltaInfo?.origin || buscaAtualVolta.origem || buscaAtual.destino,
        destino: voltaInfo?.destination || buscaAtualVolta.destino || buscaAtual.origem,
      },
    };

    await updateTrip(user.uid, tripId, {
      vooIda: novoVooIda,
      vooVolta: novoVooVolta,
      buscaVoo: buscaVooAtualizada,
    });
    // Recarrega os dados da viagem para refletir imediatamente na UI
    const atualizado = await loadTrip(user.uid, tripId);
    setTrip(atualizado);
    showToast("Detalhes do voo salvos.", "success");
    setOpenDialog(false);
  }

  async function voltarLimparDetalhe() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!tripId) { router.push(`/buscador-voo?tripId=${tripId}`); return; }
    try {
      if (user) {
        await updateTrip(user.uid, tripId, { vooIda: null, vooVolta: null, buscaVoo: null, updatedAt: new Date().toISOString() });
      }
      showToast("Preferências de voo limpas.", "info");
    } catch {}
    router.push(`/buscador-voo?tripId=${tripId}`);
  }

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Detalhe da reserva de voo</h2>
        <p className="text-sm text-slate-600">Revise os dados e preencha horários detalhados.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          {(() => {
            const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const origemIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const idaHM = trip?.vooIda?.horarioDetalhado || null;
            const horaLabel = idaHM
              ? formatLocalTimeWithGMT(
                  trip.vooIda?.data || trip.dataInicio,
                  idaHM.split(":")[0],
                  idaHM.split(":")[1],
                  origemIda
                )
              : null;
            return (
              <p>
                <span className="font-medium">Ida:</span> {trip.vooIda?.data?.slice(0,10)} — Classe: {trip.vooIda?.classe} — Faixa: {trip.vooIda?.horarioFaixa}
                {horaLabel ? <> — Horário: {horaLabel} ({origemIda})</> : null}
              </p>
            );
          })()}
          {(() => {
            const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const origemVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
            const voltaHM = trip?.vooVolta?.horarioDetalhado || null;
            const horaLabel = voltaHM
              ? formatLocalTimeWithGMT(
                  trip.vooVolta?.data || trip.dataFim,
                  voltaHM.split(":")[0],
                  voltaHM.split(":")[1],
                  origemVolta
                )
              : null;
            return (
              <p>
                <span className="font-medium">Volta:</span> {trip.vooVolta?.data?.slice(0,10)} — Classe: {trip.vooVolta?.classe} — Faixa: {trip.vooVolta?.horarioFaixa}
                {horaLabel ? <> — Horário: {horaLabel} ({origemVolta})</> : null}
              </p>
            );
          })()}
        </div>
        <div className="mt-4">
          <Button onClick={() => setOpenDialog(true)}>Preencher dados do voo escolhido</Button>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Horários e Códigos</DialogTitle>
          <DialogDescription>Informe os horários detalhados do voo e códigos (opcional).</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <p className="font-medium">Voo IDA</p>
                <p className="text-sm text-slate-600">Data: {trip.vooIda?.data?.slice(0,10)}</p>
                <div className="mt-2 flex gap-2">
                  <Select value={idaHora} onValueChange={setIdaHora}>
                    <SelectTrigger className="w-24"><SelectValue placeholder="Hora" /></SelectTrigger>
                    <SelectContent>{hours().map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={idaMin} onValueChange={setIdaMin}>
                    <SelectTrigger className="w-24"><SelectValue placeholder="Min" /></SelectTrigger>
                    <SelectContent>{minutesForHour(idaHora).map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder="Código do Voo (opcional)"
                    value={idaCodigo}
                    onChange={(e) => { setIdaCodigo(e.target.value); setIdaCodeError(null); }}
                    onBlur={() => prefillByCodigo("ida")}
                    onKeyDown={(e) => { if (e.key === "Enter") prefillByCodigo("ida"); }}
                  />
                {idaCodeError ? <p className="text-xs text-red-600">{idaCodeError}</p> : <p className="text-xs text-slate-500">Ex.: AV86, KL792</p>}
                </div>
                {idaTimeError ? <p className="text-xs text-red-600 mt-1">{idaTimeError}</p> : (
                <p className="text-xs text-slate-600 mt-1">
                  {(() => {
                    const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
                    const origemIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
                    const label = formatLocalTimeWithGMT(
                      trip.vooIda?.data || trip.dataInicio,
                      idaHora,
                      idaMin,
                      origemIda
                    );
                    return <>Horário local de partida: {label} ({origemIda})</>;
                  })()}
                </p>
                )}
              </div>

              <div>
                <p className="font-medium">Voo VOLTA</p>
                <p className="text-sm text-slate-600">Data: {trip.vooVolta?.data?.slice(0,10)}</p>
                <div className="mt-2 flex gap-2">
                  <Select value={voltaHora} onValueChange={setVoltaHora}>
                    <SelectTrigger className="w-24"><SelectValue placeholder="Hora" /></SelectTrigger>
                    <SelectContent>{hours().map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={voltaMin} onValueChange={setVoltaMin}>
                    <SelectTrigger className="w-24"><SelectValue placeholder="Min" /></SelectTrigger>
                    <SelectContent>{minutesForHour(voltaHora).map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder="Código do Voo (opcional)"
                    value={voltaCodigo}
                    onChange={(e) => { setVoltaCodigo(e.target.value); setVoltaCodeError(null); }}
                    onBlur={() => prefillByCodigo("volta")}
                    onKeyDown={(e) => { if (e.key === "Enter") prefillByCodigo("volta"); }}
                  />
                {voltaCodeError ? <p className="text-xs text-red-600">{voltaCodeError}</p> : <p className="text-xs text-slate-500">Ex.: AV86, KL792</p>}
                </div>
                {voltaTimeError ? <p className="text-xs text-red-600 mt-1">{voltaTimeError}</p> : (
                <p className="text-xs text-slate-600 mt-1">
                  {(() => {
                    const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
                    const origemVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
                    const label = formatLocalTimeWithGMT(
                      trip.vooVolta?.data || trip.dataFim,
                      voltaHora,
                      voltaMin,
                      origemVolta
                    );
                    return <>Horário local de partida: {label} ({origemVolta})</>;
                  })()}
                </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button onClick={salvarDetalhes}>Salvar Detalhes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => setConfirmResetOpen(true)}>Voltar</Button>
          <Button onClick={() => router.push(`/acomodacao-picker?tripId=${tripId}`)}>Continuar</Button>
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
                    const oIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
                    const dIda = trip?.buscaVoo?.ida?.destino || trip?.buscaVoo?.destino;
                    const dataIda = (trip?.vooIda?.data || trip?.dataInicio)?.slice(0, 10);
                    return `Ida: ${oIda} → ${dIda} em ${dataIda}`;
                  })()}
                </span>
                <span className="block text-slate-700">
                  {(() => {
                    const oVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
                    const dVolta = trip?.buscaVoo?.volta?.destino || trip?.buscaVoo?.origem;
                    const dataVolta = (trip?.vooVolta?.data || trip?.dataFim)?.slice(0, 10);
                    return `Volta: ${oVolta} → ${dVolta} em ${dataVolta}`;
                  })()}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmResetOpen(false)}>Cancelar</Button>
              <Button onClick={voltarLimparDetalhe}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Card>
  );
}