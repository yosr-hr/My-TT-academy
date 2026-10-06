"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import FilledAlert from "../../components/alert/FilledAlerts";
import AuthHeader from "../../components/ui/AuthHeader";
import AuthShell from "../../components/ui/AuthShell";
import FormField from "../../components/ui/FormField";
import GradientButton from "../../components/ui/GradientButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Email ou mot de passe incorrect.");
        return;
      }

      const role = data?.user?.role || data?.role;
      router.push(role === "admin" ? "/admin/dashboard" : "/agent/espace");
    } catch {
      setError("Impossible de contacter le serveur. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeader title="Connectez-vous à votre espace" titleClassName="text-3xl font-medium" />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField type="email" label="Adresse Email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mouhamedTounsi@gmail.com" />
        <FormField type="password" label="Mot de passe" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

        {error && (
          <div className="my-2">
            <FilledAlert alertType="error" message={error} />
          </div>
        )}

        <div className="flex items-center justify-end">
          <Link href="/forgot-password" className="text-sm font-bold text-[#0077C8] hover:text-[#002F6C] hover:underline transition">
            Mot de passe oublié ?
          </Link>
        </div>

        <GradientButton type="submit" disabled={loading} className="focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Connexion en cours..." : "Se connecter"}
        </GradientButton>
      </form>

      <p className="text-center text-sm text-gray-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-bold text-[#0077C8] hover:text-[#002F6C] hover:underline transition">
          Créer un compte
        </Link>
      </p>
    </AuthShell>
  );
}
