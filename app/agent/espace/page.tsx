"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import FilledAlert from "../../../components/alert/FilledAlerts";
import type { DemandePayload } from "../../../lib/types/demandes";
import type { AgentInscription } from "../../../lib/types/inscriptions";
import type { Formation } from "../../../lib/types/formations";
import { requestJson } from "../../../services/apiClient";
import Modal from "../../../components/ui/Modal";

type DashboardView = "catalogue" | "inscriptions";

function InscriptionCard({ inscription }: { inscription: AgentInscription }) {
  const statusClasses = {
    "En cours": "bg-blue-50 text-blue-700 border-blue-200",
    Terminé: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "À venir": "bg-amber-50 text-amber-700 border-amber-200",
  };
  const attendanceClasses = inscription.participants[0]?.attendance === "Absent"
    ? "bg-red-50 text-red-700"
    : "bg-blue-50 text-blue-700";
  const certificateClasses = inscription.participants[0]?.certificate === "Délivré"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-600";
  const participant = inscription.participants[0];
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
    : "Non renseignée";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#0077C8]">{inscription.category}</p>
          <h2 className="mt-2 text-lg font-bold leading-snug text-[#002F6C]">{inscription.title}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[inscription.status]}`}>{inscription.status}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <p><strong className="text-[#002F6C]">Code :</strong> {inscription.code}</p>
        <p><strong className="text-[#002F6C]">Dates :</strong> {formatDate(inscription.startDate)} → {formatDate(inscription.endDate)}</p>
        <p><strong className="text-[#002F6C]">Lieu :</strong> {inscription.location}</p>
        <p><strong className="text-[#002F6C]">Durée :</strong> {inscription.duration}</p>
      </div>
      {inscription.description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600">{inscription.description}</p>}

      {participant && <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-sm font-bold text-[#002F6C]">Mes informations</h3><p className="mt-1 text-sm font-semibold text-slate-700">{participant.name}</p><p className="text-xs text-slate-500">{participant.email}</p></div>
          <p className="text-right text-xs text-slate-500"><span className="block font-semibold text-slate-700">Inscrit le</span>{formatDate(participant.registrationDate)}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className={`rounded-md px-2.5 py-1 font-bold ${attendanceClasses}`}>Présence : {participant.attendance}</span><span className={`rounded-md px-2.5 py-1 font-bold ${certificateClasses}`}>Certificat : {participant.certificate}</span></div>
      </div>}
    </article>
  );
}

export default function AgentDashboardPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpenState] = useState<boolean>(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [user, setUser] = useState<{ nom: string; grade: string; email: string }>({
    nom: "", 
    grade: "",
    email: "",
  });
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("catalogue");
  const [inscriptions, setInscriptions] = useState<AgentInscription[]>([]);
  const [inscriptionsLoading, setInscriptionsLoading] = useState(false);
  const [inscriptionsError, setInscriptionsError] = useState("");

  const fetchProfile = async () => {
    try {
      const data = await requestJson<{ name?: string; nom?: string; grade?: string; email?: string }>("/api/profil");
      const nomUtilisateur = data.name || data.nom;
      const gradeUtilisateur = data.grade;
      setUser({ nom: nomUtilisateur || "", grade: gradeUtilisateur || "", email: data.email || "" });
    } catch (err) {
      console.error("Erreur profil", err);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchProfile(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  //  Charger les formations publiées par l'admin au démarrage
  useEffect(() => {
    const fetchFormations = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/formations`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des formations.");
        const data = await response.json() as Formation[];
        setFormations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les formations.");
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();
  }, []);

  // 2. Gestion de l'attribution dynamique des couleurs selon ton Sommaire des domaines TT
  const getDomainBadgeColor = (type: string) => {
    if (type === "Ingénierie, Réseaux & Technologies") return "bg-[#009FA2]/10 text-[#005F61] border-[#009FA2]/20";
    if (type === "Systèmes d'Information, Informatique") return "bg-[#84BD00]/10 text-[#3D5800] border-[#84BD00]/20";
    if (type === "Bonnes pratiques de Management et de Gouvernance des SI") return "bg-[#FF6A39]/10 text-[#A6320B] border-[#FF6A39]/20";
    if (type === "Tests et recettes des applications informatiques") return "bg-[#FFC20E]/12 text-[#8C6900] border-[#FFC20E]/25";
    if (type === "Marketing et Commercial") return "bg-[#0077C8]/10 text-[#00416E] border-[#0077C8]/20";
    if (type === "Transformation Digitale et Innovation") return "bg-[#B93A85]/10 text-[#6B1D4C] border-[#B93A85]/20";
    if (type === "Le Management Agile") return "bg-[#D22630]/10 text-[#7D1117] border-[#D22630]/20";
    if (type === "Management de Projets") return "bg-[#008751]/10 text-[#005231] border-[#008751]/20";
    if (type === "Ressources Humaines") return "bg-[#E40066]/10 text-[#8F003F] border-[#E40066]/20";
    if (type === "Développement Personnel") return "bg-[#00A3E0]/10 text-[#006085] border-[#00A3E0]/20";
    if (type === "Qualité") return "bg-[#64337E]/10 text-[#3C1E4C] border-[#64337E]/20";
    if (type === "Analyse des données & Data Science") return "bg-[#912626]/10 text-[#541313] border-[#912626]/20";
    if (type === "Finance") return "bg-[#225633]/10 text-[#11311C] border-[#225633]/20";
    if (type === "Audit, Droit et Réglementation") return "bg-[#E42313]/10 text-[#911107] border-[#E42313]/20";
    if (type === "Achats et Logistique") return "bg-[#1D428A]/10 text-[#0F2857] border-[#1D428A]/20";

  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "Non spécifiée";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return dateString;
    }
  };

  //  Soumission de la demande d'inscription à l'API Node.js
  const handleRegister = async (formationId: string) => {
    const formation = formations.find((item) => item._id === formationId);
    if (!formation) {
      setNotification({ type: "error", message: "Formation introuvable." });
      return;
    }

    setRegisteringId(formationId);
    setNotification(null);
    try {
      const payload: DemandePayload = {
        formationId,
        agent: { name: user.nom, grade: user.grade, email: user.email },
        formation: { code: formation.code, module: formation.module },
      };
      const response = await fetch("/api/demandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Échec de l'inscription.");
      setNotification({ type: "success", message: data.message });
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande.",
      });
    } finally {
      setRegisteringId(null);
    }
  };

  const showInscriptions = async () => {
    setActiveView("inscriptions");
    if (inscriptions.length > 0 || inscriptionsLoading) return;
    setInscriptionsLoading(true);
    setInscriptionsError("");
    try {
      const response = await fetch("/api/agent/inscriptions", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger vos inscriptions.");
      setInscriptions(data as AgentInscription[]);
    } catch (err) {
      setInscriptionsError(err instanceof Error ? err.message : "Impossible de charger vos inscriptions.");
    } finally {
      setInscriptionsLoading(false);
    }
  };

  // Setter wrapper used in the UI to open/close the detail panel
  function setIsDetailOpen(open: boolean) {
    setIsDetailOpenState(open);
    if (!open) setSelectedFormation(null);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      
      {/*  SIDEBAR AGENT */}
      <div className="w-72 bg-[#002F6C] text-white flex flex-col shadow-2xl z-10">
        <div className="p-5 bg-white flex items-center space-x-3 border-b border-slate-100 shadow-sm">
          <div className="relative w-14 h-14 flex items-center justify-center overflow-hidden rounded-full bg-white p-1 border shadow-sm">
            <Image src="/logo-tt.png" alt="Logo Tunisie Telecom" width={70} height={70} className="object-contain" style={{ height: "auto" }} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm text-[#002F6C]">My TT academy</span>
            <span className="text-[10px] font-bold text-[#84BD00] uppercase tracking-wider">Espace Agent</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveView("catalogue")} className={`w-full px-4 py-3 rounded-xl text-left font-semibold text-sm transition ${activeView === "catalogue" ? "bg-[#0077C8] text-white" : "text-slate-300 hover:bg-white/10"}`}>
             Formations Disponibles
          </button>
          <button onClick={showInscriptions} className={`w-full px-4 py-3 rounded-xl text-left font-semibold text-sm transition ${activeView === "inscriptions" ? "bg-[#0077C8] text-white" : "text-slate-300 hover:bg-white/10"}`}>
             Mes Inscriptions
          </button>
        </nav>

        <div className="p-4 border-t border-white/10 bg-[#00224f]">
          <Link href="/login" className="block text-center px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 transition text-sm">
             Déconnexion
          </Link>
        </div>
      </div>

      {/*  MAIN CONTENT  */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
       {/* TOPBAR */}
      <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-xl font-bold text-[#002F6C]">{activeView === "catalogue" ? "Catalogue des Formations" : "Mes Inscriptions"}</h1>
        <div className="flex items-center space-x-4">
       {/* Nom et Grade */}
        <div className="w-10 h-10 rounded-full bg-[#84BD00] flex items-center justify-center text-white font-bold shadow-md select-none">
          {user.nom?.charAt(0).toUpperCase()}
        </div> 
        <div className="text-left">
          <p className="text-sm font-bold text-slate-800 capitalize">{user.nom}</p>
          <p className="text-xs text-slate-400">{user.grade} </p>
        </div>
        </div>
      </header>

        {/* CONTAINER CATALOGUE */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          
          {notification && (
            <div className="mb-6">
              <FilledAlert alertType={notification.type} message={notification.message} />
            </div>
          )}
          {error && <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs">{error}</div>}

          {activeView === "inscriptions" ? (
            inscriptionsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-white border border-slate-200" />)}
              </div>
            ) : inscriptionsError ? (
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700">{inscriptionsError}</div>
            ) : inscriptions.length === 0 ? (
              <div className="flex justify-center items-center min-h-64 text-sm font-medium text-slate-500 bg-white border rounded-2xl shadow-sm p-8 text-center">
                Vous n&apos;êtes inscrit à aucune formation pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {inscriptions.map((inscription) => <InscriptionCard key={inscription.id} inscription={inscription} />)}
              </div>
            )
          ) : (
          loading ? (
            <div className="flex justify-center items-center h-64 text-sm font-medium text-slate-500">Chargement du catalogue en cours...</div>
          ) : formations.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-sm font-medium text-slate-400 bg-white border rounded-2xl shadow-sm p-8">
              Aucune formation n'est disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formations.map((f) => (
                <div key={f._id} className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition">
                  <div>
                    {/* Domaine et Titre */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wide whitespace-nowrap ${getDomainBadgeColor(f.type)}`}>
                          {f.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{f.code}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{f.module}</h3>
                    </div>
                    
                    {/* Infos Détails */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <p><span className="font-semibold text-[#002F6C]">Population cible :</span> {f.populationCible}</p>
                      <p>
                        <span className="font-semibold text-[#002F6C]">lieu :</span>{" "}
                        {f.lieu }
                      </p>
                      <p><span className="font-semibold text-[#002F6C]">duree :</span> {f.duree} </p>
                      <p> <span className="font-semibold text-[#002F6C]">formateur:</span>
                        "{f.formateur}"
                      </p>
                    </div>
                  </div>

                  {/* Zone d'action Inscription */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button 
                      onClick={() => handleRegister(f._id)}
                      disabled={registeringId === f._id}
                      className="bg-[#0077C8] hover:bg-[#002F6C] disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition active:scale-95 whitespace-nowrap"
                    >
                      {registeringId === f._id ? "Envoi..." : "S'inscrire"}
                    </button>
                    <button
                            onClick={() => {
                              setSelectedFormation(f);
                              setIsDetailOpen(true);
                            }}
                            className="bg-white hover:bg-[#0077C8] hover:text-white text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition duration-200 cursor-pointer shadow-sm"
                          >
                            Détails
                          </button>
                  </div>
                </div>
              ))}
            </div>
          )
          )}
           
      {isDetailOpen && selectedFormation && (
        <Modal onClose={() => setIsDetailOpen(false)}>

            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#002F6C] text-white rounded-t-2xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide opacity-80">
                  Détails de la Formation • Code: {selectedFormation.code}
                </span>
                <h3 className="text-xl font-black mt-1 leading-snug">
                  {selectedFormation.module}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition cursor-pointer border-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Type and Statut badges */}
              <div className="flex space-x-3">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-700 border-blue-100">
                  Type : {selectedFormation.type}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${selectedFormation.statut === "Disponible"
                  ? "bg-green-50 text-green-700 border-green-100"
                  : selectedFormation.statut === "Bientôt" || selectedFormation.statut === "Planifiée"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                  Statut : {selectedFormation.statut || "Disponible"}
                </span>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#002F6C] uppercase tracking-wider">
                  Description
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100 whitespace-pre-line">
                  {selectedFormation.description || "Aucune description fournie."}
                </div>
              </div>

              {/* Key Attributes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Formateur */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Formateur
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedFormation.formateur || "Non spécifié"}
                    </p>
                  </div>
                </div>

                {/* Population Cible */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Population Cible
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedFormation.populationCible || "Tous les agents"}
                    </p>
                  </div>
                </div>

                {/* Lieu */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Lieu
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedFormation.lieu || "Non spécifié"}
                    </p>
                  </div>
                </div>

                {/* Durée */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Durée
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedFormation.duree || "Non spécifiée"}
                    </p>
                  </div>
                </div>

                {/* Date Début */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Date de début
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {formatDate(selectedFormation.dateDebut)}
                    </p>
                  </div>
                </div>

                {/* Date Fin */}
                <div className="bg-white border rounded-xl p-4 flex items-start space-x-3 shadow-sm">
                  <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      Date de fin
                    </h5>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {formatDate(selectedFormation.dateFin)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-end bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer border-0"
              >
                Fermer
              </button>
            </div>
        </Modal>
      )}
        </main>
      </div>
    </div>
  );
  }
  
