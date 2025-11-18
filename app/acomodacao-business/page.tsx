"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";

export default function AcomodacaoBusinessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [cidade, setCidade] = useState("");
  const [hotel, setHotel] = useState("");
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
    }
    fetch();
  }, [tripId]);

  function linksHospedagem() {
    const dIni = trip?.dataInicio?.slice(0, 10);
    const dFim = trip?.dataFim?.slice(0, 10);
    const c = cidade || "Cidade";
    return [
      { nome: "Booking", url: `https://www.booking.com/searchresults.html?ss=${c}&checkin=${dIni}&checkout=${dFim}` },
      { nome: "Trivago", url: `https://www.trivago.com/?aDateRange%5Barr%5D=${dIni}&aDateRange%5Bdep%5D=${dFim}&sQuery=${c}` },
      { nome: "Hoteis.com", url: `https://www.hoteis.com/Search.do?destination=${c}&checkIn=${dIni}&checkOut=${dFim}` },
    ];
  }

  async function salvarSeguir() {
    const user = auth?.currentUser || { uid: "local-dev-user" };
    if (!user || !tripId) return;
    await updateTrip(user.uid, tripId, {
      tipoViagem: "BUSINESS",
      acomodacaoBusiness: {
        cidade,
        hotel,
        endereco,
        distanciaAeroporto: { valorKm: 15 },
        precoTransporte: {
          carroApp: { tempoMin: 20, preco: 45 },
          taxi: { tempoMin: 25, preco: 60 },
          tremMetro: { tempoMin: 40, preco: 10 },
        },
      },
    });
    router.push(`/calendario?tripId=${tripId}`);
  }

  if (!trip) return <p>Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Acomodação Business</h2>
        <p className="text-sm text-slate-600">Defina a cidade e hotel para a viagem de negócios.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <label className="text-sm">Nome da Cidade</label>
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: São Paulo" />
        </div>
        <div className="mt-2 grid gap-2">
          <label className="text-sm">Nome do Hotel</label>
          <Input value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="Ex: Hotel Center Business" />
        </div>
        <div className="mt-2 grid gap-2">
          <label className="text-sm">Endereço (opcional)</label>
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>

        <div className="mt-4">
          <h3 className="font-medium">Links de Busca</h3>
          <ul className="list-disc ml-6 text-sm">
            {linksHospedagem().map((l) => (
              <li key={l.nome}><a href={l.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{l.nome}</a></li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
          <p className="font-medium">Transporte (Simulado)</p>
          <ul className="list-disc ml-6">
            <li>Distância do Aeroporto de Chegada: 15 km</li>
            <li>Tempo Estimado (Opções): Carro App: 20 min - R$ 45; Táxi: 25 min - R$ 60; Trem/Metrô: 40 min - R$ 10.</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/detalhe-voo?tripId=${tripId}`)}>Voltar</Button>
          <Button onClick={salvarSeguir}>Seguir</Button>
        </div>
      </CardFooter>
    </Card>
  );
}