"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { auth, saveTrip, listTripsByEmail, listTrips } from "@/lib/firebase";

type Passageiro = { nome: string; dataNascimento?: string; idadeNaViagem?: number };

export default function DadosPassageirosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const existingTripId = params.get("tripId") || undefined;

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [enderecoOrigem, setEnderecoOrigem] = useState("");
  const [email, setEmail] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [qtdPassageiros, setQtdPassageiros] = useState(1);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([{ nome: "" }]);
  const [saving, setSaving] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useState<Array<{ tripId: string; cidade?: string }>>([]);

  useEffect(() => {
    const storedEmail = typeof window !== "undefined" ? localStorage.getItem("trae_email") : null;
    setEmail(storedEmail || "");
  }, []);

  useEffect(() => {
    // Ajusta o número de passageiros
    setPassageiros((prev) => {
      const next = [...prev];
      if (qtdPassageiros > prev.length) {
        for (let i = prev.length; i < qtdPassageiros; i++) next.push({ nome: "" });
      } else if (qtdPassageiros < prev.length) {
        next.length = qtdPassageiros;
      }
      return next;
    });
  }, [qtdPassageiros]);

  useEffect(() => {
    // Espelha continuamente Passageiro 1 com o Nome Completo
    setPassageiros((prev) => prev.map((p, i) => (i === 0 ? { ...p, nome: nomeCompleto } : p)));
  }, [nomeCompleto]);

  function calcularIdade(dataNasc?: string, inicio?: Date) {
    if (!dataNasc || !inicio) return undefined;
    const dn = new Date(dataNasc);
    let idade = inicio.getFullYear() - dn.getFullYear();
    const m = inicio.getMonth() - dn.getMonth();
    if (m < 0 || (m === 0 && inicio.getDate() < dn.getDate())) idade--;
    return idade;
  }

  useEffect(() => {
    // recalcula idades ao mudar dataInicio
    if (!dataInicio) return;
    setPassageiros((prev) => prev.map((p) => ({ ...p, idadeNaViagem: calcularIdade(p.dataNascimento, dataInicio) })));
  }, [dataInicio]);

  useEffect(() => {
    // Garante que data fim não fique antes da data início
    if (dataInicio && dataFim && dataFim < dataInicio) {
      setDataFim(undefined);
    }
  }, [dataInicio, dataFim]);

  async function carregarViagensSalvas() {
    try {
      const e = email || (typeof window !== "undefined" ? localStorage.getItem("trae_email") || "" : "");
      if (!e) {
        alert("Faça login pelo email na página Início para recuperar viagens.");
        router.push("/");
        return;
      }
      const byEmail = await listTripsByEmail(e);
      let items = [...byEmail];
      if (!items.length) {
        const user = auth?.currentUser || { uid: "local-dev-user" };
        const all = await listTrips(user.uid);
        const enriched = await Promise.all(all.map(async (t) => {
          let cidade = t.data?.cidadesAcomodacao?.[0]?.nome
            || t.data?.acomodacaoBusiness?.cidade
            || t.data?.buscaVoo?.ida?.destino
            || t.data?.buscaVoo?.destino
            || "Viagem";
          return { tripId: t.id, cidade };
        }));
        items = enriched;
      }
      setSavedTrips(items);
      setSavedOpen(true);
    } catch (err) {
      console.error("Falha ao carregar viagens salvas", err);
      alert("Não foi possível carregar viagens salvas.");
    }
  }

  async function handleSeguir() {
    if (!dataInicio || !dataFim) {
      alert("Selecione datas de início e fim da viagem.");
      return;
    }
    setSaving(true);
    try {
      const user = auth?.currentUser || { uid: "local-dev-user" };
      if (!user) {
        alert("Usuário não autenticado.");
        setSaving(false);
        return;
      }
      const tripId = existingTripId || (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}`);

      const tripData = {
        tripId,
        userId: user.uid,
        email,
        nomeCompleto,
        enderecoOrigem,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        passageiros: passageiros.map((p) => ({
          nome: p.nome,
          dataNascimento: p.dataNascimento || "",
          idadeNaViagem: calcularIdade(p.dataNascimento, dataInicio) || 0,
        })),
        tipoViagem: "FERIAS",
      };

      await saveTrip(user.uid, tripId, tripData);
      router.push(`/revisao-passageiros?tripId=${tripId}`);
    } catch (e) {
      console.error(e);
      alert("Falha ao salvar dados da viagem.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">TRAE - Dados dos Passageiros</h2>
        <div className="mt-2">
          <Button onClick={carregarViagensSalvas} variant="secondary" size="sm">Recuperar viagem salva</Button>
        </div>
        <p className="text-sm text-slate-600">Preencha os dados iniciais da viagem.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm text-slate-700">Nome Completo</label>
            <Input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Nome completo do passageiro principal" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-slate-700">Endereço</label>
            <Input
              value={enderecoOrigem}
              onChange={(e) => setEnderecoOrigem(e.target.value)}
              placeholder="Ex: Rua Exemplo, 123 — Bairro, Cidade"
            />
            <p className="text-xs text-slate-600">
              Usaremos este endereço para estimar o tempo até o aeroporto e sugerir o horário ideal de saída no calendário.
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-slate-700">Email</label>
            <Input value={email} disabled />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-700">Data Início da Viagem</label>
              <Calendar value={dataInicio} onChange={setDataInicio} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Data Fim da Viagem</label>
              <Calendar value={dataFim} onChange={setDataFim} disabled={dataInicio ? { before: dataInicio } : undefined} />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-slate-700">Quantidade de Passageiros</label>
            <Input type="number" min={1} value={qtdPassageiros} onChange={(e) => setQtdPassageiros(parseInt(e.target.value || "1"))} />
          </div>

          <div className="grid gap-4">
            {passageiros.map((p, idx) => (
              <div key={idx} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium">Passageiro {idx + 1}</p>
                <div className="mt-2 grid gap-2">
                  <label className="text-sm text-slate-700">Nome</label>
                  {idx === 0 ? (
                    <Input value={nomeCompleto} disabled />
                  ) : (
                    <Input value={p.nome} onChange={(e) => setPassageiros((prev) => prev.map((pp, i) => (i === idx ? { ...pp, nome: e.target.value } : pp)))} />
                  )}
                </div>
                <div className="mt-2 grid gap-2">
                  <label className="text-sm text-slate-700">Data de Nascimento</label>
                  <Input type="date" value={p.dataNascimento || ""} onChange={(e) => setPassageiros((prev) => prev.map((pp, i) => (i === idx ? { ...pp, dataNascimento: e.target.value, idadeNaViagem: calcularIdade(e.target.value, dataInicio) } : pp)))} />
                </div>
                {p.idadeNaViagem !== undefined && (
                  <p className="mt-2 text-sm text-slate-600">Idade na viagem: {p.idadeNaViagem} anos</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push("/")}>Voltar</Button>
          <Button onClick={handleSeguir} disabled={saving}>{saving ? "Salvando..." : "Seguir"}</Button>
        </div>
      </CardFooter>
      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Viagens salvas</DialogTitle>
            <DialogDescription>Selecione uma viagem para abrir o calendário.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {savedTrips.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma viagem encontrada para este e-mail.</p>
            ) : (
              savedTrips.map((v) => (
                <div key={v.tripId} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-sm">
                  <span>{v.cidade || "Viagem"}</span>
                  <Button onClick={() => router.push(`/calendario?tripId=${v.tripId}`)} size="sm">Abrir calendário</Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}