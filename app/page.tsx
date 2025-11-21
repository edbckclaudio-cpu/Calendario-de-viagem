"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { seedAdmin, login, register, validatePassword, getUsers, getCurrentUser } from "@/lib/auth-local";
import { listTripsByEmail } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ email: string; role?: string }>>([]);
  const [emailSearches, setEmailSearches] = useState<Record<string, Array<{ tripId: string; cidade?: string; updatedAt?: string }>>>({});

  useEffect(() => {
    // Garante que o admin exista
    seedAdmin();
    const current = getCurrentUser();
    setIsAdmin(current?.role === "admin");
    setEmail(current?.email || "");
  }, []);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = login(email, password);
      if (!res.ok) {
        alert(res.error || "Falha no login");
        return;
      }
      setIsAdmin(res.role === "admin");
      setLoginOpen(false);
      setSuccessOpen(true);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.assign("/dados-passageiros");
        } else {
          router.push("/dados-passageiros");
        }
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  function openRegister() {
    setRegError(null);
    setRegisterOpen(true);
  }

  function handleRegister() {
    const v = validatePassword(regPassword);
    if (!v.ok) {
      setRegError(v.error || "Senha inválida");
      return;
    }
    const res = register(regEmail, regPassword);
    if (!res.ok) {
      setRegError(res.error || "Falha ao criar conta");
      return;
    }
    setRegisterOpen(false);
    alert("Conta criada! Agora faça login.");
  }

  function openAdmin() {
    if (!isAdmin) {
      setAdminLoginOpen(true);
      return;
    }
    const users = getUsers().map((u) => ({ email: u.email, role: u.role }));
    setUsersList(users);
    setAdminOpen(true);
    Promise.all(users.map(async (u) => ({ email: u.email, trips: await listTripsByEmail(u.email) }))).then((results) => {
      const acc: Record<string, Array<{ tripId: string; cidade?: string; updatedAt?: string }>> = {};
      results.forEach((r) => { acc[r.email] = r.trips; });
      setEmailSearches(acc);
    });
  }

  async function handleAdminLogin() {
    setLoading(true);
    try {
      const res = login(adminEmail, adminPassword);
      if (!res.ok || res.role !== "admin") {
        alert(res.error || "Acesso de admin inválido");
        return;
      }
      setIsAdmin(true);
      setAdminLoginOpen(false);
      setAdminEmail("");
      setAdminPassword("");
      const users = getUsers().map((u) => ({ email: u.email, role: u.role }));
      setUsersList(users);
      setAdminOpen(true);
      Promise.all(users.map(async (u) => ({ email: u.email, trips: await listTripsByEmail(u.email) }))).then((results) => {
        const acc: Record<string, Array<{ tripId: string; cidade?: string; updatedAt?: string }>> = {};
        results.forEach((r) => { acc[r.email] = r.trips; });
        setEmailSearches(acc);
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <p className="text-slate-600 dark:text-slate-300 text-center max-w-xl">
        Para acessar as etapas da viagem, faça login com email e senha. Se não tiver conta, crie uma.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => setLoginOpen(true)} size="lg">Entrar</Button>
        <Button onClick={openRegister} variant="secondary" size="lg">Criar conta</Button>
      </div>

      {/* Login */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>Acesse com seu email e senha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Email</label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Senha</label>
              <PasswordInput placeholder="sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleLogin} disabled={loading || !email || !password}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar Conta */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar conta</DialogTitle>
            <DialogDescription>Defina um email e senha (7–10, letras e números).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Email</label>
              <Input type="email" placeholder="seu@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Senha</label>
              <PasswordInput placeholder="7–10 caracteres, letras e números" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
            </div>
            {regError && <p className="text-red-600 text-sm">{regError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleRegister} disabled={!regEmail || !regPassword}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: lista usuários e buscas */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuários cadastrados</DialogTitle>
            <DialogDescription>Emails e suas viagens salvas/buscas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {usersList.length === 0 && <p className="text-sm text-slate-600">Nenhum usuário cadastrado.</p>}
            {usersList.map((u) => (
              <div key={u.email} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{u.email}{u.role === "admin" ? " (admin)" : ""}</span>
                  <span className="text-xs text-slate-500">{(emailSearches[u.email] || []).length} viagens</span>
                </div>
                <div className="mt-2 grid gap-1">
                  {(emailSearches[u.email] || []).map((t) => (
                    <div key={t.tripId} className="text-xs text-slate-700 flex items-center justify-between">
                      <span>{t.cidade || "—"}</span>
                      <span className="font-mono">{t.tripId}</span>
                      <span>{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Login */}
      <Dialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autenticação Admin</DialogTitle>
            <DialogDescription>Acesse com credenciais de administrador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Email</label>
              <Input type="email" placeholder="admin@email.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Senha</label>
              <PasswordInput placeholder="sua senha" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAdminLogin} disabled={loading || !adminEmail || !adminPassword}>{loading ? "Entrando..." : "Entrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sucesso */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login realizado!</DialogTitle>
            <DialogDescription>Acesso concedido. Redirecionando...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}