"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";
import { formatLocalTimeWithGMT } from "@/lib/utils";

export default function AcomodacaoPickerPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [cidade, setCidade] = useState("");
  const [linksUnicos, setLinksUnicos] = useState<{ nome: string; url: string }[]>([]);

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
    }
    fetch();
  }, [tripId]);

  async function cidadeUnica() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId || !trip) return;
    const cidadeObj = {
      nome: cidade || "Cidade Principal",
      dataChegada: trip.dataInicio,
      dataSaida: trip.dataFim,
      endereco: "",
      hotelNome: "",
      telefone: "",
      anfitriao: "",
      reservas: [],
    };
    await updateTrip(user.uid, tripId, { cidadesAcomodacao: [cidadeObj], tipoViagem: "FERIAS" });
    const dIni = trip.dataInicio?.slice(0, 10);
    const dFim = trip.dataFim?.slice(0, 10);
    setLinksUnicos([
      { nome: "Booking", url: `https://www.booking.com/searchresults.html?ss=${cidade}&checkin=${dIni}&checkout=${dFim}` },
      { nome: "Airbnb", url: `https://www.airbnb.com/s/${cidade}/homes?checkin=${dIni}&checkout=${dFim}` },
      { nome: "Trivago", url: `https://www.trivago.com/?aDateRange%5Barr%5D=${dIni}&aDateRange%5Bdep%5D=${dFim}&sQuery=${cidade}` },
    ]);
  }

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Acomodação Férias: Escolha</h2>
        <p className="text-sm text-slate-600">Defina se a viagem terá uma ou múltiplas cidades.</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200 p-3 mb-4 text-sm">
          <p><span className="font-medium">Passageiro:</span> {trip.nomeCompleto}</p>
          {(() => {
            const origemIda = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const destinoIda = trip?.buscaVoo?.ida?.destino || trip?.buscaVoo?.destino;
            const faixaIda = trip?.vooIda?.horarioFaixa || "Sem horário preferido";
            const codigoIda = trip?.vooIda?.codigoVoo ? ` — Código: ${trip.vooIda.codigoVoo}` : "";
            const detIda = trip?.vooIda?.horarioDetalhado ? ` — Detalhe: ${trip.vooIda.horarioDetalhado}` : "";
            const ciaIda = trip?.vooIda?.airline ? ` — Companhia: ${trip.vooIda.airline}` : "";
            const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const idaHM = trip?.vooIda?.horarioDetalhado;
            const horaLabel = idaHM ? formatLocalTimeWithGMT(
              trip.vooIda?.data || trip.dataInicio,
              idaHM.split(":")[0],
              idaHM.split(":")[1],
              origemIda
            ) : null;
            return (
              <p>
                <span className="font-medium">Voo IDA:</span> {trip.vooIda?.data?.slice(0,10)} — {origemIda} → {destinoIda} — Classe: {trip.vooIda?.classe} — Faixa: {faixaIda}{codigoIda}{detIda}{ciaIda}{horaLabel ? ` — Horário: ${horaLabel} (${origemIda})` : ""}
              </p>
            );
          })()}
          {(() => {
            const origemVolta = trip?.buscaVoo?.volta?.origem || trip?.buscaVoo?.destino;
            const destinoVolta = trip?.buscaVoo?.volta?.destino || trip?.buscaVoo?.origem;
            const faixaVolta = trip?.vooVolta?.horarioFaixa || "Sem horário preferido";
            const codigoVolta = trip?.vooVolta?.codigoVoo ? ` — Código: ${trip.vooVolta.codigoVoo}` : "";
            const detVolta = trip?.vooVolta?.horarioDetalhado ? ` — Detalhe: ${trip.vooVolta.horarioDetalhado}` : "";
            const ciaVolta = trip?.vooVolta?.airline ? ` — Companhia: ${trip.vooVolta.airline}` : "";
            const baseOrigem = trip?.buscaVoo?.ida?.origem || trip?.buscaVoo?.origem;
            const voltaHM = trip?.vooVolta?.horarioDetalhado;
            const horaLabel = voltaHM ? formatLocalTimeWithGMT(
              trip.vooVolta?.data || trip.dataFim,
              voltaHM.split(":")[0],
              voltaHM.split(":")[1],
              origemVolta
            ) : null;
            return (
              <p>
                <span className="font-medium">Voo VOLTA:</span> {trip.vooVolta?.data?.slice(0,10)} — {origemVolta} → {destinoVolta} — Classe: {trip.vooVolta?.classe} — Faixa: {faixaVolta}{codigoVolta}{detVolta}{ciaVolta}{horaLabel ? ` — Horário: ${horaLabel} (${origemVolta})` : ""}
              </p>
            );
          })()}
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-slate-700">Preencha o nome da cidade, depois clique em Somente esta cidade.</label>
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Paris" />
        </div>
        <div className="mt-3">
          <Button variant="outline" onClick={cidadeUnica}>Somente esta cidade</Button>
        </div>
        <div className="mt-4">
          <p className="text-sm text-slate-700">Mas se nesta viagem você vai visitar e dormir em varias cidades clique no botão abaixo</p>
          <div className="mt-2">
            <Button onClick={() => router.push(`/multiplas-cidades?tripId=${tripId}`)}>Esta viagem terá multiplas cidades</Button>
          </div>
        </div>
        {linksUnicos.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium">Links de Busca de Acomodação</h3>
            <ul className="list-disc ml-6 text-sm">
              {linksUnicos.map((l) => (
                <li key={l.nome}><a className="text-blue-700 underline" href={l.url} target="_blank" rel="noreferrer">{l.nome}</a></li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/detalhe-voo?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={() => router.push(`/acomodacao-detalhe?tripId=${tripId}`)}>Preencha os dados da acomodação escolhida</Button>
        </div>
      </CardFooter>
    </Card>
  );
}