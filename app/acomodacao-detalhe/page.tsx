"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { airportCoordsByIATA, cityCenterCoordsByName, parseCoordsFromAddress, haversineDistanceKm, estimateTransportOptions } from "@/lib/utils";

export default function AcomodacaoDetalhePage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [cidades, setCidades] = useState<any[]>([]);
  const [popupIdx, setPopupIdx] = useState<number | null>(null);
  const [popupInfo, setPopupInfo] = useState<any | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  async function abrirPopupTransporte(idx: number, addressOverride?: string) {
    const c = cidades[idx];
    if (!trip || !c) return;
    const userAddressRaw = addressOverride ?? (c.endereco || c.hotelNome || "");
    const address = (userAddressRaw || "").trim();
    const chegadaIATA = trip?.buscaVoo?.ida?.destino || trip?.buscaVoo?.destino;
    const ap = airportCoordsByIATA(chegadaIATA || undefined);
    // Se não houver endereço, abre o pop-up com aviso e sem estimativas
    if (!address || address.length < 3) {
      setPopupLoading(false);
      setPopupIdx(idx);
      const originParam = ap ? `${ap.lat},${ap.lon}` : (chegadaIATA || "");
      const destParam = `${c.nome} centro`;
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=driving`;
      setPopupInfo({
        cidade: c.nome,
        address,
        aeroporto: chegadaIATA || "",
        distanciaKm: null,
        opcoes: [],
        aviso: "Preencha o endereço ou nome do hotel/local para estimar transporte.",
        gmapsUrl,
      });
      return;
    }
    setPopupLoading(true);
    // 1) Tenta coords embutidas no texto; 2) geocodifica; 3) fallback centro da cidade
    let addrCoords = parseCoordsFromAddress(address);
    if (!addrCoords && address && address.length >= 3) {
      try {
        const q = `${address} ${c.nome}`;
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const j = await res.json();
          if (j?.lat && j?.lon) addrCoords = { lat: j.lat, lon: j.lon };
        }
      } catch {}
    }
    if (!addrCoords) addrCoords = cityCenterCoordsByName(c.nome) || null;
    // Monta link do Google Maps
    const originParam = ap ? `${ap.lat},${ap.lon}` : (chegadaIATA || "");
    const destParam = addrCoords ? `${addrCoords.lat},${addrCoords.lon}` : `${address} ${c.nome}`;
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=driving`;

    if (!ap || !addrCoords) {
      setPopupIdx(idx);
      setPopupInfo({
        cidade: c.nome,
        address,
        aeroporto: chegadaIATA || "",
        distanciaKm: null,
        opcoes: [],
        aviso: address && address.length >= 3 ? "Estimativa aproximada: faltam coordenadas precisas." : "Informe um endereço ou nome válido para estimar.",
        gmapsUrl,
      });
      setPopupLoading(false);
      return;
    }

    const dist = haversineDistanceKm(ap, addrCoords);
    const options = estimateTransportOptions(dist, c.nome);
    setPopupIdx(idx);
    setPopupInfo({
      cidade: c.nome,
      address,
      aeroporto: chegadaIATA || "",
      distanciaKm: Math.round(dist * 10) / 10,
      opcoes: options,
      gmapsUrl,
    });
    setPopupLoading(false);
  }

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
      setCidades(data?.cidadesAcomodacao || []);
    }
    fetch();
  }, [tripId]);

  async function salvarSeguir() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId) return;
    // Atualiza cidades de acomodação
    await updateTrip(user.uid, tripId, { cidadesAcomodacao: cidades });
    // Após salvar cidades, propaga o nome da acomodação para atividades dentro do intervalo dessa cidade
    try {
      const rec = await loadTrip(user.uid, tripId);
      const atividades = [...(rec?.atividades || [])];
      const cidadesAtual = [...(cidades || [])];
      for (const c of cidadesAtual) {
        const nomeAcomodacao = (c.endereco || c.hotelNome || "").trim();
        if (!nomeAcomodacao) continue;
        const min = (c.dataChegada || "").slice(0, 10);
        const max = (c.dataSaida || "").slice(0, 10);
        if (!min || !max) continue;
        for (let i = 0; i < atividades.length; i++) {
          const a = atividades[i] || {};
          const dia = (a.data || "").slice(0, 10);
          if (dia && dia >= min && dia <= max) {
            atividades[i] = { ...a, acomodacao: nomeAcomodacao };
          }
        }
      }
      await updateTrip(user.uid, tripId, { atividades });
    } catch {}
    router.push(`/entretenimento?tripId=${tripId}`);
  }

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Acomodação Férias: Detalhes</h2>
        <p className="text-sm text-slate-600">Preencha os detalhes por cidade.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {cidades.map((c, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-medium">{c.nome}</p>
              <p className="text-sm text-slate-600">Chegada: {c.dataChegada?.slice(0,10)} — Saída: {c.dataSaida?.slice(0,10)}</p>
              <div className="mt-2 grid gap-2">
                <label className="text-sm">Endereço ou Nome do Hotel/Local (obrigatório)</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={c.endereco || c.hotelNome || ""}
                    onChange={(e) => setCidades((prev) => prev.map((cc, i) => i === idx ? { ...cc, endereco: e.target.value } : cc))}
                    onBlur={(e) => abrirPopupTransporte(idx, e.target.value)}
                    placeholder="Endereço ou Nome"
                  />
                  <Button variant="secondary" onClick={() => abrirPopupTransporte(idx)}>Info</Button>
                </div>
              </div>
              <div className="mt-2 grid gap-2">
                <label className="text-sm">Telefone (opcional)</label>
                <Input value={c.telefone || ""} onChange={(e) => setCidades((prev) => prev.map((cc, i) => i === idx ? { ...cc, telefone: e.target.value } : cc))} placeholder="(DDD) XXXX-XXXX" />
              </div>
              <div className="mt-2 grid gap-2">
                <label className="text-sm">Nome do Anfitrião (opcional)</label>
                <Input value={c.anfitriao || ""} onChange={(e) => setCidades((prev) => prev.map((cc, i) => i === idx ? { ...cc, anfitriao: e.target.value } : cc))} placeholder="Nome" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/acomodacao-picker?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={salvarSeguir}>Seguir</Button>
        </div>
      </CardFooter>
      <Dialog open={popupIdx !== null} onOpenChange={(o) => setPopupIdx(o ? popupIdx : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como chegar ao seu local</DialogTitle>
            <DialogDescription>
              {popupLoading ? "Calculando estimativas..." : (
                popupInfo ? (
                  <>
                    <span className="block">Cidade: {popupInfo.cidade}</span>
                    <span className="block">Endereço/Hotel: {popupInfo.address}</span>
                    <span className="block">Aeroporto de chegada: {popupInfo.aeroporto || "(não informado)"}</span>
                    {popupInfo.distanciaKm !== null ? (
                      <span className="block">Distância aproximada: {popupInfo.distanciaKm} km</span>
                    ) : (
                      <span className="block">Distância aproximada: indeterminada</span>
                    )}
                  </>
                ) : null
              )}
            </DialogDescription>
          </DialogHeader>
          {!popupLoading && popupInfo && (
            <div className="mt-3">
              <ul className="grid gap-2 text-sm">
                {popupInfo.opcoes?.length ? popupInfo.opcoes.map((o: any, i: number) => (
                  <li key={i} className="rounded-md border border-slate-200 p-2">
                    <span className="font-medium">{o.modo}</span> — Preço: {o.precoEstimado} — Tempo: {o.tempoEstimadoMin} min {o.observacao ? `— ${o.observacao}` : ""}
                  </li>
                )) : (
                  <li className="text-slate-600">Sem estimativas disponíveis.</li>
                )}
              </ul>
              {popupInfo.aviso ? <p className="mt-2 text-xs text-slate-500">{popupInfo.aviso}</p> : null}
            </div>
          )}
          <DialogFooter>
            {popupInfo?.gmapsUrl ? (
              <a href={popupInfo.gmapsUrl} target="_blank" rel="noopener noreferrer" className="mr-auto text-blue-600 underline">
                Abrir rota no Google Maps
              </a>
            ) : null}
            <Button variant="secondary" onClick={() => setPopupIdx(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}