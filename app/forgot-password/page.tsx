"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "../../components/ui/AuthHeader";
import AuthShell from "../../components/ui/AuthShell";
import FormField from "../../components/ui/FormField";
import FormMessage from "../../components/ui/FormMessage";
import GradientButton from "../../components/ui/GradientButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      } else {
        setMessage({ type: "success", text: data.message });
        setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 3000);
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeader title="Mot de passe oublié" description="Saisissez votre adresse email pour recevoir un code de vérification" />

      {message.text && <FormMessage type={message.type as "success" | "error"}>{message.text}</FormMessage>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField type="email" label="Adresse Email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mouhamedtounsi@gmail.com" />
        <GradientButton type="submit" disabled={loading}>
          {loading ? "Envoi en cours..." : "Recevoir le code"}
        </GradientButton>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="font-bold text-[#0077C8] hover:text-[#002F6C] hover:underline transition">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
