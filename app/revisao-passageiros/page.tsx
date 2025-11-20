"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth, loadTrip } from "@/lib/firebase";

export default function RevisaoPassageirosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tripId = params.get("tripId");
  const [trip, setTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrip() {
      try {
        const user = auth?.currentUser || { uid: "local-dev-user" };
        if (!user || !tripId) return;
        const data = await loadTrip(user.uid, tripId);
        setTrip(data);
      } finally {
        setLoading(false);
      }
    }
    fetchTrip();
  }, [tripId]);

  if (loading) return <p>Carregando...</p>;
  if (!trip) return <p>Dados da viagem não encontrados.</p>;

  const formatISODate = (s: any) => {
    if (!s) return "";
    try {
      const str = typeof s === "string" ? s : new Date(s).toISOString();
      return str.split("T")[0];
    } catch {
      return String(s);
    }
  };

  const firstNameOf = (s: any) => {
    if (!s) return "";
    try {
      const n = String(s).trim();
      return n ? n.split(/\s+/)[0] : "";
    } catch {
      return String(s);
    }
  };

  const capitalizeName = (s: string) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Revisão dos Dados</h2>
        <p className="text-sm text-slate-600">Confirme as informações antes de seguir.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <p><span className="font-medium">Nome:</span> {trip.nomeCompleto}</p>
          <p><span className="font-medium">Endereço:</span> {trip.enderecoOrigem || "(não informado)"}</p>
          <p><span className="font-medium">Email:</span> {trip.email}</p>
          <p><span className="font-medium">Início:</span> {formatISODate(trip.dataInicio)}</p>
          <p><span className="font-medium">Fim:</span> {formatISODate(trip.dataFim)}</p>
        </div>
        <div className="mt-4">
          <h3 className="font-medium">Passageiros</h3>
          <ul className="list-disc ml-6">
            {trip.passageiros?.map((p: any, idx: number) => (
              <li key={idx}>
                {capitalizeName(idx === 0 ? firstNameOf(trip.nomeCompleto) : firstNameOf(p.nome))} — Nasc.: {p.dataNascimento} — Idade no dia da viagem: {p.idadeNaViagem}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full gap-3">
          <Button variant="secondary" onClick={() => router.push(`/dados-passageiros?tripId=${tripId}`)}>Editar</Button>
          <Button onClick={() => router.push(`/buscador-voo?tripId=${tripId}`)}>Confirmar</Button>
        </div>
      </CardFooter>
    </Card>
  );
}