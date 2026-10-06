"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthHeader from "../../components/ui/AuthHeader";
import AuthShell from "../../components/ui/AuthShell";
import FormField from "../../components/ui/FormField";
import FormMessage from "../../components/ui/FormMessage";
import GradientButton from "../../components/ui/GradientButton";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (!emailParam) return;
    const timer = window.setTimeout(() => setEmail(emailParam), 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      } else {
        setMessage({ type: "success", text: data.message });
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeader title="Nouveau mot de passe" description="Saisissez le code à 6 chiffres reçu par e-mail" imageSize={64} />

      {message.text && <FormMessage type={message.type as "success" | "error"}>{message.text}</FormMessage>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          type="text"
          label="Code de vérification"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center tracking-widest font-bold text-lg"
          placeholder="89746 "
        />
        <FormField
          type="password"
          label="Nouveau mot de passe"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
        />
        <GradientButton type="submit" disabled={loading}>
          {loading ? "Validation..." : "Confirmer le changement"}
        </GradientButton>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[#002F6C] font-bold">Chargement...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
