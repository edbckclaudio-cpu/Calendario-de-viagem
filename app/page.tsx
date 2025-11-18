"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ensureAuth, auth, listTripsByEmail, listTrips, loadTrip } from "@/lib/firebase";

export default function HomePage() {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useState<Array<{ tripId: string; cidade?: string }>>([]);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    try {
      const user = await ensureAuth(email);
      localStorage.setItem("trae_email", email);
      console.log("[TRAE] Usuário logado:", user.uid);
      setOpen(false);
      setSuccessOpen(true);
      setTimeout(() => router.push("/dados-passageiros"), 1200);
    } catch (e) {
      alert("Falha no login simulado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const e = localStorage.getItem("trae_email") || "";
    if (e) setEmail(e);
  }, []);

  async function carregarViagensSalvas() {
    try {
      const e = email || localStorage.getItem("trae_email") || "";
      if (!e) {
        setOpen(true);
        return;
      }
      const byEmail = await listTripsByEmail(e);
      let items = [...byEmail];
      // fallback: se índice por e-mail estiver vazio, tenta listar por usuário
      if (!items.length) {
        const user = auth?.currentUser || { uid: "local-dev-user" };
        const all = await listTrips(user.uid);
        // computa cidade pela viagem
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

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <p className="text-slate-600 dark:text-slate-300 text-center max-w-xl">
        Planeje sua viagem com praticidade: autentique-se, preencha os dados dos passageiros, busque voos e consolide tudo em um calendário final.
      </p>
      <Button onClick={() => setOpen(true)} size="lg">Começar</Button>
      <Button onClick={carregarViagensSalvas} variant="secondary" size="lg">Recuperar viagem salva</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login por Email</DialogTitle>
            <DialogDescription>Informe seu email para simular a autenticação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-slate-600">Email</label>
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleLogin} disabled={loading || !email}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login realizado!</DialogTitle>
            <DialogDescription>Acesso concedido. Redirecionando...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}