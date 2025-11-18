"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { auth, loadTrip, updateTrip } from "@/lib/firebase";

type Cidade = { nome: string; dataChegada: string; dataSaida: string };

export default function MultiplasCidadesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [proximaNome, setProximaNome] = useState("");
  const [saidaAtual, setSaidaAtual] = useState<Date | undefined>();
  const [openTransporte, setOpenTransporte] = useState<{ from?: string; to?: string } | null>(null);

  useEffect(() => {
    async function fetch() {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user || !tripId) return;
      const data = await loadTrip(user.uid, tripId);
      setTrip(data);
      const ini = data?.dataInicio;
      if (ini) setCidades([{ nome: data?.cidadeInicial || "Cidade 1", dataChegada: ini, dataSaida: ini }]);
    }
    fetch();
  }, [tripId]);

  function adicionarTrecho() {
    if (!saidaAtual || !proximaNome || !trip) return alert("Informe saída e próxima cidade.");
    const atual = cidades[cidades.length - 1];
    // atualiza saída da cidade atual
    const atualizada = cidades.map((c, i) => (i === cidades.length - 1 ? { ...c, dataSaida: saidaAtual.toISOString() } : c));
    // próxima cidade chega na data da saída da atual
    const prox: Cidade = { nome: proximaNome, dataChegada: saidaAtual.toISOString(), dataSaida: saidaAtual.toISOString() };
    setCidades([...atualizada, prox]);
    setProximaNome("");
    setSaidaAtual(undefined);
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
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Múltiplas Cidades</h2>
        <p className="text-sm text-slate-600">Adicione os trechos da viagem em sequência.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-sm">Cidade atual: {cidades[cidades.length - 1].nome}</p>
            <p className="text-sm">Chegada: {new Date(cidades[cidades.length - 1].dataChegada).toISOString().slice(0,10)}</p>
            <div className="mt-2">
              <label className="text-sm text-slate-700">Data de Saída da Cidade Atual</label>
              <Calendar value={saidaAtual} onChange={setSaidaAtual} />
            </div>
            <div className="mt-2 grid gap-2">
              <label className="text-sm text-slate-700">Nome da Próxima Cidade</label>
              <Input value={proximaNome} onChange={(e) => setProximaNome(e.target.value)} placeholder="Ex: Londres" />
            </div>
            <div className="mt-2">
              <Button onClick={adicionarTrecho}>Adicionar Trecho</Button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Lista de Cidades</h3>
            <div className="grid gap-2">
              {cidades.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-sm">
                  <div>
                    <span className="font-medium">{c.nome}</span> | Chegada: {c.dataChegada?.slice(0,10)} | Saída: {c.dataSaida?.slice(0,10)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open(`https://www.booking.com/searchresults.html?ss=${c.nome}&checkin=${c.dataChegada?.slice(0,10)}&checkout=${c.dataSaida?.slice(0,10)}`, "_blank")}>Busca</Button>
                    {i < cidades.length - 1 && (
                      <Button variant="ghost" onClick={() => setOpenTransporte({ from: cidades[i].nome, to: cidades[i+1].nome })}>Transporte (IA)</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={!!openTransporte} onOpenChange={() => setOpenTransporte(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opções de Transporte</DialogTitle>
              <DialogDescription>Entre {openTransporte?.from} e {openTransporte?.to}</DialogDescription>
            </DialogHeader>
            <ul className="list-disc ml-6 text-sm">
              <li>Carro: 300km — 4h — R$ 280 (estimado)</li>
              <li>Trem: 3h30 — R$ 120 (estimado)</li>
              <li>Ônibus: 5h — R$ 90 (estimado)</li>
            </ul>
            <DialogFooter>
              <Button onClick={() => setOpenTransporte(null)}>Fechar</Button>
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
    </Card>
  );
}