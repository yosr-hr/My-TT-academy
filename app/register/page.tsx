"use client";

import Link from "next/link";
import { useState } from "react";
import AuthHeader from "../../components/ui/AuthHeader";
import AuthShell from "../../components/ui/AuthShell";
import FormField from "../../components/ui/FormField";
import FormMessage from "../../components/ui/FormMessage";
import GradientButton from "../../components/ui/GradientButton";

const initialFormData = {
  matricule: "", nom: "", prenom: "", email: "", password: "", role: "agent",
  grade: "", Emploi_fonctionnel: "", N_CIN: "",
};

const fieldClassName = "border-gray-300";
const selectClassName = "border-gray-300 bg-gray-50/50 cursor-pointer appearance-none";

export default function RegisterPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      } else {
        setMessage({ type: "success", text: data.message });
        setFormData(initialFormData);
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell maxWidth="2xl">
      <AuthHeader title="Créer un compte" description="Formulaire d'enregistrement des nouveaux agents" imageSize={64} />

      {message.text && <FormMessage type={message.type as "success" | "error"}>{message.text}</FormMessage>}

      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <FormField label="Matricule" name="matricule" type="text" value={formData.matricule} required onChange={handleChange} className={fieldClassName} placeholder="M-2026" />
        <FormField label="N° CIN" name="N_CIN" type="text" value={formData.N_CIN} required onChange={handleChange} className={fieldClassName} placeholder="12345678" />
        <FormField label="Nom" name="nom" type="text" value={formData.nom} required onChange={handleChange} className={fieldClassName} placeholder="Nom" />
        <FormField label="Prénom" name="prenom" type="text" value={formData.prenom} required onChange={handleChange} className={fieldClassName} placeholder="Prénom" />
        <FormField wrapperClassName="sm:col-span-2" label="Adresse Email" name="email" type="email" value={formData.email} required onChange={handleChange} className={fieldClassName} placeholder="mouhamedTounsi@gmail.com" />
        <FormField wrapperClassName="sm:col-span-2" label="Mot de passe" name="password" type="password" value={formData.password} required onChange={handleChange} className={fieldClassName} placeholder="••••••••" />

        <FormField control="select" label="Grade" name="grade" value={formData.grade} onChange={handleChange} required className={selectClassName}>
          <option value="" disabled hidden>Sélectionnez votre grade</option>
          <option value="Agent">Agent</option>
          <option value="Agent principal">Agent principal</option>
          <option value="Technicien">Technicien</option>
          <option value="Technicien principal">Technicien principal</option>
          <option value="Ingénieur">Ingénieur</option>
          <option value="Ingénieur principal">Ingénieur principal</option>
          <option value="Chef de service">Chef de service</option>
          <option value="Sous-directeur">Sous-directeur</option>
          <option value="Directeur">Directeur</option>
        </FormField>

        <FormField control="select" label="Emploi Fonctionnel" name="Emploi_fonctionnel" value={formData.Emploi_fonctionnel} onChange={handleChange} required className={selectClassName}>
          <option value="" disabled hidden>Sélectionnez votre emploi</option>
          <optgroup label="Technique / Informatique">
            <option value="Développeur">Développeur</option>
            <option value="Administrateur Systèmes">Administrateur Systèmes</option>
            <option value="Administrateur Réseaux">Administrateur Réseaux</option>
            <option value="Ingénieur Télécom">Ingénieur Télécom</option>
            <option value="Ingénieur Cybersécurité">Ingénieur Cybersécurité</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="Chef de Projet IT">Chef de Projet IT</option>
          </optgroup>
          <optgroup label="Commercial / Clientèle">
            <option value="Conseiller Client">Conseiller Client</option>
            <option value="Chargé de Clientèle">Chargé de Clientèle</option>
            <option value="Responsable Commercial">Responsable Commercial</option>
          </optgroup>
          <optgroup label="Ressources Humaines & Formation">
            <option value="Agent RH">Agent RH</option>
            <option value="Chargé RH">Chargé RH</option>
            <option value="Responsable Formation">Responsable Formation</option>
            <option value="Responsable Recrutement">Responsable Recrutement</option>
          </optgroup>
          <optgroup label="Administration">
            <option value="Assistant Administratif">Assistant Administratif</option>
            <option value="Gestionnaire Administratif">Gestionnaire Administratif</option>
            <option value="Chef de Service Administratif">Chef de Service Administratif</option>
          </optgroup>
        </FormField>

        <div className="sm:col-span-2 mt-4">
          <GradientButton type="submit" disabled={loading} className="disabled:bg-none">
            {loading ? "Traitement en cours..." : "Demander l'accès Agent"}
          </GradientButton>
        </div>
      </form>

      <p className="text-center text-sm text-gray-500">
        Déjà inscrit?{" "}
        <Link href="/login" className="font-bold text-[#0077C8] hover:text-[#002F6C] hover:underline transition">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
