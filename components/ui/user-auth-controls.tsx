"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";
import { getCurrentUser, clearAuth } from "@/lib/auth-local";

export default function UserAuthControls() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setEmail(u?.email || null);
  }, [pathname]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Deseja sair?");
      if (!ok) return;
    }
    clearAuth();
    setEmail(null);
    setShowToast(true);
    setTimeout(() => {
      router.push("/");
      setShowToast(false);
    }, 650);
  }

  if (!email) return null;
  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-xs text-slate-600">{email}</span>
      <Button variant="secondary" size="sm" onClick={handleLogout}>Sair</Button>
      {showToast && (
        <Toast message="Você saiu" type="success" position="top-right" onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}