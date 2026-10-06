"use client";
 
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Stack from '@mui/material/Stack';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import FilledAlert from "../../../components/alert/FilledAlerts";
import type { DemandeStatus, DemandeWithProfile } from "../../../lib/types/demandes";
import type { Formation } from "../../../lib/types/formations";
import { formatLongDate, formatShortDate } from "../../../utils/formatters";
import Modal from "../../../components/ui/Modal";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

type AttendanceStatus = "present" | "absent" | "justified";
type AttendanceParticipant = {
  demandeId: string;
  agentId: string;
  nom: string;
  prenom: string;
  matricule: string;
  cin: string;
  direction: string;
  entreprise: string;
  attendance: Record<string, AttendanceStatus>;
};
type AttendanceSheet = {
  formation: { _id: string; code: string; module: string; lieu: string; gouvernorat: string; horaires: string; pause: string; dateDebut: string; dateFin: string };
  dates: string[];
  participants: AttendanceParticipant[];
};
type ReportData = {
  summary: { totalFormations: number; attendanceRate: number; registeredParticipants: number; certificatesAwarded: number };
  monthlyAttendance: { month: string; volume: number; presenceRate: number }[];
  formationBreakdown: { labels: string[]; values: number[] };
  eligibility: { agentId: string; agentName: string; formationId: string; formationTitle: string; totalDays: number; attendedDays: number; absenceRate: number; eligible: boolean }[];
};

const formatDate = formatLongDate;

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [demandes, setDemandes] = useState<DemandeWithProfile[]>([]);
  const [demandesLoading, setDemandesLoading] = useState<boolean>(false);
  const [demandesError, setDemandesError] = useState<string | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<DemandeWithProfile | null>(null);
  const [attendanceSheet, setAttendanceSheet] = useState<AttendanceSheet | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Notification state is rendered with FilledAlert below.
  /*
  children: React.ReactNode; // Utilise children à la place de message
  */

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

  const [notification, setNotification] = useState<{
  message: string;
  severity: "success" | "error" | "info" | "warning";
} | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    module: "", 
    code: "",
    populationCible: "",
    formateur: "",
    dateDebut: "",
    dateFin: "",
    duree: "",
    type: "",
    lieu: "",
    description: "",
    statut: "Disponible",
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchFormations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/formations");
      if (!res.ok) throw new Error("Erreur lors de la récupération des formations");
      const data = await res.json();
      setFormations(data);
    } catch {
      setNotification({
      message: "Impossible de joindre le serveur.",
      severity: "error"
    });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchFormations(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fetchDemandes = async () => {
    setDemandesLoading(true);
    setDemandesError(null);
    try {
      const response = await fetch("/api/demandes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger les demandes.");
      setDemandes(data);
    } catch (err) {
      setDemandesError(err instanceof Error ? err.message : "Impossible de charger les demandes.");
    } finally {
      setDemandesLoading(false);
    }
  };

  const updateDemandeStatus = async (demandeId: string, status: DemandeStatus) => {
    try {
      const response = await fetch("/api/demandes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de modifier la demande.");
      setDemandes((current) => current.map((demande) =>
        demande._id === demandeId ? { ...demande, status } : demande
      ));
      setSelectedDemande((current) => current?._id === demandeId ? { ...current, status } : current);
      setNotification({ message: "Le statut de la demande a été mis à jour.", severity: "success" });
    } catch (err) {
      setNotification({ message: err instanceof Error ? err.message : "Impossible de modifier la demande.", severity: "error" });
    }
  };

  const fetchAttendance = async (formationId: string) => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const response = await fetch(`/api/presences?formationId=${encodeURIComponent(formationId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger la feuille de présence.");
      setAttendanceSheet(data);
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Impossible de charger la feuille de présence.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const saveAttendance = async (agentId: string, date: string, status: AttendanceStatus) => {
    if (!attendanceSheet) return;
    const key = `${agentId}:${date}`;
    setSavingAttendance(key);
    setAttendanceSheet((current) => current && ({
      ...current,
      participants: current.participants.map((participant) => participant.agentId === agentId
        ? { ...participant, attendance: { ...participant.attendance, [date]: status } }
        : participant),
    }));
    try {
      const response = await fetch("/api/presences", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formationId: attendanceSheet.formation._id, agentId, date, status }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || "Impossible d'enregistrer la présence."); }
    } catch (err) {
      setNotification({ message: err instanceof Error ? err.message : "Impossible d'enregistrer la présence.", severity: "error" });
      void fetchAttendance(attendanceSheet.formation._id);
    } finally {
      setSavingAttendance(null);
    }
  };

  const fetchReport = async () => {
    setReportLoading(true); setReportError(null);
    try {
      const response = await fetch("/api/rapports", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger le rapport.");
      setReport(data);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Impossible de charger le rapport.");
    } finally { setReportLoading(false); }
  };

  const downloadCertificate = (item: ReportData["eligibility"][number]) => {
    const certificate = `CERTIFICAT DE PARTICIPATION\n\nNous certifions que ${item.agentName} a suivi la formation « ${item.formationTitle} ».\n\nPrésence : ${item.attendedDays}/${item.totalDays} jours\nTaux d'absence : ${item.absenceRate}%\n\nMy TT Academy`;
    const blob = new Blob([certificate], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certificat-${item.agentName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!report) return;
    const handleCertificateClick = (event: MouseEvent) => {
      const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
      if (!button || !button.className.includes("bg-[#0077C8]") || !button.textContent?.includes("G")) return;
      const row = button.closest("tr");
      const rows = row?.parentElement ? Array.from(row.parentElement.children) : [];
      const item = row && rows.indexOf(row) >= 0 ? report.eligibility[rows.indexOf(row)] : undefined;
      if (!item?.eligible) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      downloadCertificate(item);
    };
    document.addEventListener("click", handleCertificateClick, true);
    return () => document.removeEventListener("click", handleCertificateClick, true);
  }, [report]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  //notif disparaisse automatiquement dans 4 secondes 
  useEffect(() => {
  if (notification) {
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }
}, [notification]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la création de la formation");
      }

      await fetchFormations();
      setNotification({
      message: "La formation a été créée avec succès !",
      severity: "success"
      });
     setIsCreateOpen(false);
      // Reset form
      setFormData({
        module: "",
        code: "",
        populationCible: "",
        formateur: "",
        dateDebut: "",
        dateFin: "",
        duree: "",
        type: "",
        lieu: "",
        description: "",
        statut: "Disponible",
      });

      setIsCreateOpen(false);
    } catch {
      setNotification({
      message: "Impossible de joindre le serveur.",
      severity: "error"
    });
    } finally {
      setSubmitting(false);
    }
  };

  const menuItems = [
    { id: 1, name: "Formations TT" },
    { id: 2, name: "Demandes de formations" },
    { id: 3, name: "Présences" },
    { id: 5, name: "Rapports Généraux" },
  ];

  const activeTitle = menuItems.find((t) => t.id === activeTab)?.name;
const handleUpdateFormation = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    if (!selectedFormation?._id) {
      alert("Erreur : L'identifiant de la formation est introuvable.");
      return;
    }

    const response = await fetch(`/api/formations/${selectedFormation._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: formData.type,
        statut: formData.statut,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Formation modifiée avec succès !");
      setIsEditOpen(false);
      await fetchFormations();
    } else {
      alert(`Erreur du serveur : ${data.message || "Impossible de modifier"}`);
    }
  } catch (error) {
    console.error("Erreur API:", error);
    setNotification({
      message: "Impossible de joindre le serveur.",
      severity: "error"
    });
  } finally {
    setSubmitting(false);
  }
};
// 1. Déclare la fonction de suppression dans ton composant
const handleDelete = async (id: string) => {
  // Demande une confirmation à l'utilisateur avant de supprimer
  if (!confirm("Voulez-vous vraiment supprimer cette formation ?")) {
    return;
  }

  try {
    const response = await fetch(`/api/formations/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setNotification({
        message: "La formation a été supprimée avec succès !",
        severity: "success"
      });

      // Rafraîchir la liste des formations affichées
      await fetchFormations();

    } else {
      const data = await response.json();
      alert(`Erreur : ${data.message}`);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    setNotification({
      message: "Impossible de joindre le serveur.",
      severity: "error"
    });
  }
};

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">

      {/* SIDEBAR */}
      <div className="w-72 bg-[#002F6C] text-white flex flex-col shadow-2xl z-10">

        {/* HEADER */}
        <div className="p-5 bg-white flex items-center space-x-3 border-b border-slate-100 shadow-sm">
          <div className="relative w-20 h-20 flex items-center justify-center overflow-hidden rounded-full bg-white p-1 border shadow-sm">
            <Image
              src="/logo-tt.png"
              alt="Logo Tunisie Telecom"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>

          <div className="flex flex-col">
            <span className="font-black text-lg text-[#002F6C]">My TT academy</span>
            <span className="text-xs font-bold text-[#0077C8] uppercase">
              Espace Admin
            </span>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto ">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 2) void fetchDemandes();
                  if (item.id === 5) void fetchReport();
                }}
                className={`w-full px-4 py-3 rounded-xl text-left font-semibold text-sm transition ${isActive
                  ? "bg-[#0077C8] text-white "
                  : "text-slate-300 hover:bg-white/10"
                  }`}
              >
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-white/10 bg-[#00224f]">
          <Link
            href="/login"
            className="block text-center px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10"
          >
             Déconnexion
          </Link>
        </div>
      </div>

      {/* MAIN  */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {notification && (
          <div className="fixed top-24 right-8 z-50 max-w-md animate-fade-in-down">
            <FilledAlert
              alertType={notification.severity}
              message={notification.message}
            />
           </div>
      )}

        {/* TOPBAR */}
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#002F6C] ">
            {activeTitle}
          </h1>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold">Administrateur</p>
              <p className="text-xs text-slate-400">Tunisie Telecom</p>
            </div>

            <div className="w-10 h-10 rounded-full bg-[#0077C8] flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">

          {/* TAB 1 */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center ">
                <div>
                  <h2 className="text-2xl font-bold text-[#002F6C] tracking-tight">
                    les catalogues de formation Tunisie Telecom
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-[#0077C8] to-[#00B2A9] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:opacity-95 transition transform active:scale-98 cursor-pointer border-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Ajouter une formation</span>
                </button>
              </div>

              {/* LIST & CARDS */}
              {loading ? (
                // Skeletons
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-2xl border p-6 space-y-4 animate-pulse">
                      <div className="flex justify-between items-start">
                        <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
                        <div className="h-5 w-1/4 bg-slate-200 rounded-full"></div>
                      </div>
                      <div className="h-8 w-3/4 bg-slate-200 rounded mt-2"></div>
                      <div className="space-y-2 mt-4">
                        <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                        <div className="h-4 w-4/6 bg-slate-200 rounded"></div>
                      </div>
                      <div className="h-10 w-full bg-slate-200 rounded-xl mt-6"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center font-medium">
                  {error}
                </div>
              ) : formations.length === 0 ? (
                <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-[#0077C8]/10 rounded-full flex items-center justify-center text-[#0077C8]">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Aucune formation disponible</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Commencez par ajouter votre première formation pour qu'elle s'affiche ici et soit disponible pour les agents.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formations.map((f) => {
                    const isDisponible = f.statut === "Disponible";
                    const isBientot = f.statut === "Bientôt" || f.statut === "Planifiée";

                    // Colors based on type
                    let typeBadgeColor = "bg-slate-50 text-slate-700 border-slate-200"; // Valeur par défaut

                    if (f.type === "Ingénierie, Réseaux & Technologies") {
                      typeBadgeColor = "bg-[#009FA2]/10 text-[#005F61] border-[#009FA2]/20"; // Turquoise
                    }
                    else if (f.type === "Systèmes d'Information, Informatique") {
                      typeBadgeColor = "bg-[#84BD00]/10 text-[#3D5800] border-[#84BD00]/20"; // Vert Tunisie Telecom
                    }
                    else if (f.type === "Bonnes pratiques de Management et de Gouvernance des SI") {
                      typeBadgeColor = "bg-[#FF6A39]/10 text-[#A6320B] border-[#FF6A39]/20"; // Orange corail
                    }
                    else if (f.type === "Tests et recettes des applications informatiques") {
                      typeBadgeColor = "bg-[#FFC20E]/12 text-[#8C6900] border-[#FFC20E]/25"; // Jaune ambre
                    }
                    else if (f.type === "Marketing et Commercial") {
                      typeBadgeColor = "bg-[#0077C8]/10 text-[#00416E] border-[#0077C8]/20"; // Bleu azur
                    }
                    else if (f.type === "Transformation Digitale et Innovation") {
                      typeBadgeColor = "bg-[#B93A85]/10 text-[#6B1D4C] border-[#B93A85]/20"; // Rose violacé
                    }
                    else if (f.type === "Le Management Agile") {
                      typeBadgeColor = "bg-[#D22630]/10 text-[#7D1117] border-[#D22630]/20"; // Rouge brique
                    }
                    else if (f.type === "Management de Projets") {
                      typeBadgeColor = "bg-[#008751]/10 text-[#005231] border-[#008751]/20"; // Vert émeraude
                    }
                    else if (f.type === "Ressources Humaines") {
                      typeBadgeColor = "bg-[#E40066]/10 text-[#8F003F] border-[#E40066]/20"; // Rose fuchsia
                    }
                    else if (f.type === "Développement Personnel") {
                      typeBadgeColor = "bg-[#00A3E0]/10 text-[#006085] border-[#00A3E0]/20"; // Bleu ciel
                    }
                    else if (f.type === "Qualité") {
                      typeBadgeColor = "bg-[#64337E]/10 text-[#3C1E4C] border-[#64337E]/20"; // Violet
                    }
                    else if (f.type === "Analyse des données & Data Science") {
                      typeBadgeColor = "bg-[#912626]/10 text-[#541313] border-[#912626]/20"; // Rouge bordeaux
                    }
                    else if (f.type === "Finance") {
                      typeBadgeColor = "bg-[#225633]/10 text-[#11311C] border-[#225633]/20"; // Vert sapin
                    }
                    else if (f.type === "Audit, Droit et Réglementation") {
                      typeBadgeColor = "bg-[#E42313]/10 text-[#911107] border-[#E42313]/20"; // Rouge pur
                    }
                    else if (f.type === "Achats et Logistique") {
                      typeBadgeColor = "bg-[#1D428A]/10 text-[#0F2857] border-[#1D428A]/20"; // Bleu marine
                    }
                    return (
                      <div
                        key={f._id}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-300 flex flex-col justify-between overflow-hidden"
                      >
                        <div className="p-6 space-y-4">
                          {/* BADGES ROW */}
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${typeBadgeColor}`}>
                              {f.type}
                            </span>

                            <span className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isDisponible
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : isBientot
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isDisponible ? "bg-green-500" : isBientot ? "bg-amber-500" : "bg-slate-400"
                                }`}></span>
                              <span>{f.statut}</span>
                            </span>
                          </div>
    
                          {/* module & CODE */}
                          <div>
                            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                              Code: {f.code || "N/A"}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mt-0.5">
                              {f.module}
                            </h3>
                          </div>

                          {/* DATES & INFO SUMMARY */}
                          <div className="space-y-2 pt-2 border-t border-slate-50 text-slate-600 text-xs">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">
                                Du {formatLongDate(f.dateDebut)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{f.lieu}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Durée : {f.duree || "Non spécifiée"}</span>
                            </div>
                          </div>
                        </div>

                        {/* BUTTON */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500 truncate max-w-[150px]">
                            Formateur: <span className="font-semibold text-slate-700">{f.formateur || "Néant"}</span>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedFormation(f);
                              setIsDetailOpen(true);
                            }}
                            className="bg-white hover:bg-[#0077C8] hover:text-white text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition duration-200 cursor-pointer shadow-sm"
                          >
                            Détails
                          </button>
                            <Stack direction="row" spacing={2}>
                           <Button variant="outlined" startIcon={<DeleteIcon />}
                           size="small"
                           onClick={() => handleDelete(f._id)}
                          >
                           Delete
                           </Button>
                          </Stack>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2 */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[#002F6C]">
                Demandes d'inscription en attente
              </h2>

              {demandesLoading ? (
                <div className="bg-white rounded-2xl border p-12 text-center text-slate-500">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#0077C8]/20 border-t-[#0077C8]" />
                  Chargement des demandes...
                </div>
              ) : demandesError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700">
                  {demandesError}
                  <button onClick={() => void fetchDemandes()} className="ml-3 font-bold underline">Réessayer</button>
                </div>
              ) : demandes.length === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center text-slate-500">Aucune demande d'inscription trouvée.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                        <th className="px-5 py-4">Candidat</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Date d'inscription</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4 text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {demandes.map((demande) => {
                          const profil = demande.profil;
                          const name = profil ? `${profil.prenom} ${profil.nom}`.trim() : demande.agent.name;
                          const statusStyle = demande.status === "APPROVED" ? "bg-green-50 text-green-700 border-green-200" : demande.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
                          return <tr key={demande._id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-4"><p className="font-bold text-slate-800">{name || "Profil inconnu"}</p><p className="mt-1 text-xs text-slate-500">{profil?.qualification || profil?.grade || demande.agent.grade || "Qualification non renseignée"}</p></td>
                            <td className="px-5 py-4 text-xs text-slate-600"><p>{profil?.email || demande.agent.email}</p><p className="mt-1 text-slate-400">{profil?.telephone || "Téléphone non renseigné"}</p></td>
                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatLongDate(demande.createdAt)}</td>
                            <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyle}`}>{demande.status === "APPROVED" ? "Acceptée" : demande.status === "REJECTED" ? "Refusée" : "En attente"}</span></td>
                            <td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelectedDemande(demande)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Voir</button>{demande.status !== "APPROVED" && <button onClick={() => void updateDemandeStatus(demande._id, "APPROVED")} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Valider</button>}{demande.status !== "REJECTED" && <button onClick={() => void updateDemandeStatus(demande._id, "REJECTED")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Refuser</button>}</div></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="hidden bg-white p-5 rounded-2xl border flex justify-between">
                <div>
                  <h3 className="font-bold">Yosr Hrabi</h3>
                  <p className="text-xs text-slate-400">
                    Ingénieur • Informatique
                  </p>
                  <p className="text-xs text-[#0077C8] mt-2">
                    yosr.hrabi@issatso.tn
                  </p>
                </div>

                <div className="space-x-3">
                  <button className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs">
                    Valider
                  </button>
                  <button className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs">
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 */}
          {activeTab === 3 && (
            <div>
              <h2 className="text-lg font-bold text-[#002F6C]">
                Présences 
              </h2>
              {!attendanceSheet && <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{formations.map((formation) => <button key={formation._id} onClick={() => void fetchAttendance(formation._id)} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#0077C8] hover:shadow-md"><p className="text-xs font-bold uppercase text-[#0077C8]">{formation.code || "Formation"}</p><h3 className="mt-2 font-bold text-slate-800">{formation.module}</h3><p className="mt-3 text-xs text-slate-500">{formatDate(formation.dateDebut)} → {formatDate(formation.dateFin)} · {formation.lieu || "Lieu non renseigné"}</p></button>)}</div>}
              {attendanceLoading && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#0077C8]/20 border-t-[#0077C8]" />Chargement de la feuille...</div>}
              {attendanceError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{attendanceError}</div>}
              {attendanceSheet && !attendanceLoading && <div className="mt-6 space-y-4"><button onClick={() => setAttendanceSheet(null)} className="text-sm font-bold text-[#0077C8] hover:underline">← Retour aux formations</button><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4"><div><p className="text-[10px] font-bold uppercase text-slate-400">Réf. action</p><p className="font-semibold">{attendanceSheet.formation.code}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Thème</p><p className="font-semibold">{attendanceSheet.formation.module}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Lieu / Gouvernorat</p><p className="font-semibold">{attendanceSheet.formation.lieu} / {attendanceSheet.formation.gouvernorat}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Horaires / Pause</p><p className="font-semibold">{attendanceSheet.formation.horaires} / {attendanceSheet.formation.pause}</p></div></div><p className="mt-4 text-sm text-slate-600">Période : <strong>du {formatLongDate(attendanceSheet.formation.dateDebut)} au {formatLongDate(attendanceSheet.formation.dateFin)}</strong></p></div><div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-xs"><thead className="bg-[#002F6C] text-white"><tr><th className="px-3 py-3">N°</th><th className="px-3 py-3">Nom et Prénom</th><th className="px-3 py-3">Matricule</th><th className="px-3 py-3">N° CIN</th><th className="px-3 py-3">Direction / Service</th><th className="px-3 py-3">Entreprise</th>{attendanceSheet.dates.map((date) => <th key={date} className="min-w-[105px] px-3 py-3 text-center">Journée du {formatShortDate(date)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{attendanceSheet.participants.length === 0 ? <tr><td colSpan={6 + attendanceSheet.dates.length} className="p-10 text-center text-slate-500">Aucun participant approuvé pour cette formation.</td></tr> : attendanceSheet.participants.map((participant, index) => <tr key={participant.agentId}><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-bold">{participant.prenom} {participant.nom}</td><td className="px-3 py-3">{participant.matricule || "-"}</td><td className="px-3 py-3">{participant.cin || "-"}</td><td className="px-3 py-3">{participant.direction || "-"}</td><td className="px-3 py-3">{participant.entreprise}</td>{attendanceSheet.dates.map((date) => { const status = participant.attendance[date]; const key = `${participant.agentId}:${date}`; return <td key={date} className="px-3 py-3 text-center"><button disabled={savingAttendance === key} onClick={() => void saveAttendance(participant.agentId, date, status === "present" ? "absent" : status === "absent" ? "justified" : "present")} className={`h-9 w-9 rounded-lg border font-black ${status === "present" ? "border-green-200 bg-green-100 text-green-700" : status === "absent" ? "border-red-200 bg-red-100 text-red-700" : status === "justified" ? "border-amber-200 bg-amber-100 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{savingAttendance === key ? "…" : status === "present" ? "P" : status === "absent" ? "A" : status === "justified" ? "J" : "—"}</button></td>; })}</tr>)}</tbody></table></div><p className="border-t bg-slate-50 p-3 text-right text-[11px] text-slate-500">P = Présent · A = Absent · J = Justifié</p></div></div>}
            </div>
          )}
          {/* TAB 4 */}
          {activeTab === 5 && (
            <div>
              <h2 className="text-lg font-bold text-[#002F6C]">
                Rapports généraux
              </h2>
              {reportLoading && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Chargement du rapport...</div>}
              {reportError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{reportError}<button onClick={() => void fetchReport()} className="ml-3 font-bold underline">Réessayer</button></div>}
              {report && !reportLoading && <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Formations", report.summary.totalFormations], ["Taux de présence", `${report.summary.attendanceRate}%`], ["Participants inscrits", report.summary.registeredParticipants], ["Certificats obtenus", report.summary.certificatesAwarded]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-[#002F6C]">{value}</p></div>)}</div>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="mb-4 font-bold text-[#002F6C]">Tendance mensuelle de présence</h3><div className="h-72"><Line data={{ labels: report.monthlyAttendance.map((item) => item.month), datasets: [{ label: "Volume d'émargements", data: report.monthlyAttendance.map((item) => item.volume), borderColor: "#0077C8", backgroundColor: "#0077C8", yAxisID: "y" }, { label: "Taux de présence (%)", data: report.monthlyAttendance.map((item) => item.presenceRate), borderColor: "#00A3A0", backgroundColor: "#00A3A0", yAxisID: "y1" }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, max: 100, position: "right", grid: { drawOnChartArea: false } } } }} /></div></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="mb-4 font-bold text-[#002F6C]">Répartition des formations</h3><div className="mx-auto h-72 max-w-sm"><Doughnut data={{ labels: report.formationBreakdown.labels, datasets: [{ data: report.formationBreakdown.values, backgroundColor: ["#002F6C", "#00A3A0"], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div></div></div>
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[950px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Formation</th><th className="px-4 py-3">Jours</th><th className="px-4 py-3">Présents</th><th className="px-4 py-3">Absence</th><th className="px-4 py-3">Certification</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{report.eligibility.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Aucun participant approuvé à évaluer.</td></tr> : report.eligibility.map((item) => <tr key={`${item.agentId}-${item.formationId}`}><td className="px-4 py-3 font-bold">{item.agentName}</td><td className="px-4 py-3">{item.formationTitle}</td><td className="px-4 py-3">{item.totalDays}</td><td className="px-4 py-3">{item.attendedDays}</td><td className="px-4 py-3">{item.absenceRate}%</td><td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${item.eligible ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{item.eligible ? "Certifié" : "Non Certifié"}</span></td><td className="px-4 py-3">{item.eligible ? <button onClick={() => setNotification({ message: "Génération du certificat à connecter au service de documents.", severity: "info" })} className="rounded-lg bg-[#0077C8] px-3 py-2 text-xs font-bold text-white hover:bg-[#0060a3]">Générer</button> : <span className="text-xs text-slate-400">Non éligible</span>}</td></tr>)}</tbody></table></div></div>
              </div>}
            </div>
          )}

        </main>
      </div>

      {selectedDemande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-2xl bg-[#002F6C] p-5 text-white">
              <div><p className="text-xs uppercase tracking-wide text-white/70">Détails de la demande</p><h3 className="text-lg font-bold">{selectedDemande.profil ? `${selectedDemande.profil.prenom} ${selectedDemande.profil.nom}` : selectedDemande.agent.name}</h3></div>
              <button onClick={() => setSelectedDemande(null)} className="rounded-lg px-2 text-2xl leading-none hover:bg-white/10" aria-label="Fermer">×</button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 text-sm sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-slate-400">Email</p><p className="mt-1 text-slate-700">{selectedDemande.profil?.email || selectedDemande.agent.email}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Téléphone</p><p className="mt-1 text-slate-700">{selectedDemande.profil?.telephone || "Non renseigné"}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Qualification</p><p className="mt-1 text-slate-700">{selectedDemande.profil?.qualification || selectedDemande.profil?.grade || selectedDemande.agent.grade || "Non renseignée"}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Matricule / fonction</p><p className="mt-1 text-slate-700">{selectedDemande.profil?.emploiFonctionnel || "Non renseigné"}</p></div>
              <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Formation</p><p className="mt-1 font-semibold text-slate-700">{selectedDemande.formationDetails?.module || selectedDemande.formation.module} · {selectedDemande.formationDetails?.code || selectedDemande.formation.code}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Inscription</p><p className="mt-1 text-slate-700">{formatLongDate(selectedDemande.createdAt)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Profil créé le</p><p className="mt-1 text-slate-700">{selectedDemande.profil?.registrationDate ? formatLongDate(selectedDemande.profil.registrationDate) : "Non disponible"}</p></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-5"><button onClick={() => setSelectedDemande(null)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white">Fermer</button></div>
          </div>
        </div>
      )}

      {/*MODAL: CREATE FORMATION */}
      {isCreateOpen && (
        <Modal onClose={() => setIsCreateOpen(false)}>

            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#002F6C] to-[#0077C8] text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-extrabold">Publier une nouvelle formation</h3>
                <p className="text-xs opacity-80 mt-0.5">Remplissez les informations ci-dessous</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition cursor-pointer border-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Titre */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Module de Formation
                  </label>
                  <input
                    type="text"
                    name="module"
                    required
                    value={formData.module}
                    onChange={handleInputChange}
                    placeholder="ex: Développement Web avec Next.js"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Code Module *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="ex: TT-NEXT16"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Formateur */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Formateur *
                  </label>
                  <input
                    type="text"
                    name="formateur"
                    required
                    value={formData.formateur}
                    onChange={handleInputChange}
                    placeholder="Nom du formateur"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Type de Formation
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  >
                    <option value="" disabled hidden>  Sélectionnez un type
                    </option>
                    <option value="Ingénierie, Réseaux & Technologies">Ingénierie, Réseaux & Technologies</option>
                    <option value="Systèmes d’Information, Informatique">Systèmes d’Information, Informatique</option>
                    <option value="Bonnes pratiques de Management et de Gouvernance des SI">Bonnes pratiques de Management et de Gouvernance des SI</option>
                    <option value="Tests et recettes des applications informatiques">Tests et recettes des applications informatiques</option>
                    <option value="Marketing et Commercial">Marketing et Commercial</option>
                    <option value="Transformation Digitale et Innovation">Transformation Digitale et Innovation</option>
                    <option value="Le Management Agile">Le Management Agile</option>
                    <option value="Management de Projets">Management de Projets</option>
                    <option value="Ressources Humaines">Ressources Humaines</option>
                    <option value="Développement Personnel">Développement Personnel</option>
                    <option value="Qualité">Qualité</option>
                    <option value="Analyse des données & Data Science">Analyse des données & Data Science</option>
                    <option value="Finance">Finance</option>
                    <option value="Audit, Droit et Réglementation">Audit, Droit et Réglementation</option>
                    <option value="Achats et Logistique">Achats et Logistique</option>
                  </select>
                </div>

                {/* Lieu */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Lieu
                  </label>
                  <input
                    type="text"
                    name="lieu"
                    required
                    value={formData.lieu}
                    onChange={handleInputChange}
                    placeholder="ex: Tunis, En ligne, Sousse"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Date Début */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    name="dateDebut"
                    required
                    value={formData.dateDebut}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Date Fin */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    name="dateFin"
                    required
                    value={formData.dateFin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Durée *
                  </label>
                  <input
                    type="text"
                    name="duree"
                    required
                    value={formData.duree}
                    onChange={handleInputChange}
                    placeholder="ex: 3 jours, 15 heures"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Statut
                  </label>
                  <select
                    name="statut"
                    value={formData.statut}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Bientôt">Bientôt</option>
                    <option value="Clôturé">Clôturé</option>
                  </select>
                </div>

                {/* Population Cible */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Population Cible *
                  </label>
                  <select
                    name="populationCible"
                    required
                    value={formData.populationCible}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                     >
                     <optgroup label="Technique, Réseaux & Télécoms">
                      <option value="Technicien CSC">Technicien CSC</option>
                      <option value="Technicien Delivery">Technicien Delivery</option>
                      <option value="Technicien DEO&M">Technicien DEO&M</option>
                      <option value="Ingénieur / Technicien Data Center">Ingénieur et Technicien des Data Center</option>
                      <option value="Ingénieur Sécurité Réseaux">Ingénieur Sécurité des réseaux</option>
                      <option value="Cadre technique">Cadre technique</option>
                      <option value="Planification Core Network Ingénierie">Planification Core Network Ingénierie</option>
                      <option value="Technicien Direction Exécutive Service Delivery">Technicien Direction Exécutive Service Delivery</option>
                      <option value="Cadre Technique au niveau Central">Cadre Technique au niveau Central</option>
                      <option value="Technicien CNOC">Technicien CNOC</option>
                      <option value="Technicien Backbone">Technicien Backbone</option>
                      <option value="Technicien Direction Core et Plateformes Management">Technicien Direction Core et Plateformes Management</option>
                      <option value="Technicien ROC">Technicien ROC</option>
                      <option value="Technicien DCR">Technicien DCR</option>
                      <option value="Technicien Division Réseaux">Technicien Division Réseaux</option>
                      <option value="Technicien Direction Planification et Gestion Réseaux Radio">Technicien Direction Planification et Gestion Réseaux Radio</option>
                      <option value="Surveillant SDR / ROC / CSC">Surveillant SDR / ROC / CSC</option>
                      <option value="Backbone Planification Ingénierie">Backbone Planification Ingénierie</option>
                      <option value="Planification Mobile Core Network">Planification Mobile Core Network</option>
                      <option value="Groupes de soutien Core mobile Planification Ingénierie">Groupes de soutien Core mobile Planification Ingénierie</option>
                      <option value="Technicien Unités Radio (Régional)">Technicien Unités Radio au niveau régional</option>
                      <option value="Ingénierie Planification Core mobile et fixe Réseaux mobile">Ingénierie Planification Core mobile et fixe Réseaux mobile</option>
                      <option value="Service Planification & Ingénierie (SPI)">Service Planification & Ingénierie (SPI)</option>
                      <option value="Exploitant des centres internationaux">Exploitants des centres internationaux</option>
                      <option value="Technicien GNOC">Technicien GNOC</option>
                      <option value="Administrateur Réseaux, Système et Sécurité">Administrateur réseaux, système, et sécurité</option>
                      <option value="Administrateur Système et Réseau">Administrateurs système et administrateurs réseau</option>
                    </optgroup>

                    <optgroup label="Informatique, Développement & Data">
                     <option value="Administrateur de bases de données / Développeur SQL & PL/SQL">Administrateurs de bases de données, développeurs SQL et PL/SQL</option>
                     <option value="Ingénieur / Technicien Développement Informatique">Ingénieurs et Techniciens chargés de développement informatique</option>
                     <option value="Ingénieur / Technicien Développeur iOS">Ingénieurs et Techniciens développeurs d'applications sur la plateforme iOS</option>
                     <option value="Ingénieur / Technicien Développeur Windows Phone 8">Ingénieurs et Techniciens développeurs d'applications sous Windows phone8</option>
                     <option value="Spécialiste Datamining">Spécialiste Datamining</option>
                     <option value="Administrateur Système (Solaris)">Administrateurs système (notamment pour l'environnement Solaris)</option>
                     <option value="Ingénieur / Cadre Conception et Analyse de données">Ingénieurs ou cadres chargés de la conception et l'analyse de données</option>
                     <option value="Administrateur (Compréhension Cloud)">Administrateurs ayant besoin de comprendre le cloud</option>
                     <option value="Utilisateur de MS InfoPath">Utilisateurs de MS InfoPath</option>
                     <option value="Ingénieur et Technicien">Ingéneurs et techniciens (Général)</option>
                    </optgroup>

                   <optgroup label="Management, Audit & Sécurité des SI">
                     <option value="Chef CSC / Chef ROC / Chef Unité">Chef CSC / Chef ROC / Chefs unités</option>
                     <option value="Tout manager qui élabore des process">Tout manager qui élabore des process</option>
                     <option value="Ingénieur chargé de l'audit informatique">Ingénieurs chargés de l'audit informatique</option>
                     <option value="Auditeur de sécurité">Auditeur de sécurité</option>
                     <option value="Responsable de la sécurité des SI (RSSI)">Responsable de la sécurité des SI</option>
                     <option value="Responsable IT">Responsables IT</option>
                     <option value="Responsable Informatique / Auditeur Informatique">Responsables informatiques / Auditeurs informatiques</option>
                     <option value="Top Manager">Top Managers</option>
                     <option value="Manager Tunisie Telecom">Managers de Tunisie Telecom</option>
                     <option value="Cadre de la Direction Exécutive Production SI">Cadres de la Direction Exécutive Production SI</option>
                     <option value="Responsable Sécurité">Responsables Sécurité</option>
                     <option value="Professionnel de la Sécurité des SI">Responsables sécurité, aux auditeurs, aux professionnels de la sécurité...</option>
                     <option value="DSI / RSSI / Responsable PCA-PRA / Architecte">DSI, RSSI, responsable en charge du plan de continuité, architecte...</option>
                   </optgroup>

                   <optgroup label="Commercial, Clientèle & Administration">
                    <option value="Commerciaux Produits et Services Cloud">Commerciaux en relation avec les Produits et les services Cloud</option>
                    <option value="Technico-Commercial">Technico-Commerciaux</option>
                    <option value="Technicien Division Clientèle">Technicien Division Clientèle</option>
                    <option value="Cadre administratif">Cadre administratif</option>
                    <option value="Commercial / Marketing Cloud">Commerciaux ou professionnels du marketing qui vendent des services du cloud</option>
                    <option value="Différentes catégories (Bureautique)">Différentes catégories (pour la bureautique)</option>
                  </optgroup>
               </select>
              </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Décrivez l'objectif et le contenu de la formation..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-white">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0077C8] hover:bg-[#0060a3] text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2 border-0"
                >
                  {submitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{submitting ? "Création..." : "Publier"}</span>
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: DETAIL FORMATION */}
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
                      {formatLongDate(selectedFormation.dateDebut)}
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
                      {formatLongDate(selectedFormation.dateFin)}
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
  {/* Bouton Modifier */}
              <button
               onClick={() => {setIsDetailOpen(false); 
                              setIsEditOpen(true); 
              }}
              className="px-6 py-2.5 bg-[#0077C8] hover:bg-[#005FA1] text-white rounded-xl text-sm font-semibold transition cursor-pointer border-0 shadow-sm"
              >
               Modifier
               </button>
            </div>
        </Modal>
      )}
      {isEditOpen && (
        <Modal onClose={() => setIsEditOpen(false)} overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" panelClassName="contents">
          <form
            onSubmit={handleUpdateFormation} 
            className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 className="text-base font-bold text-slate-800">Modifier la Formation</h3>
            
           <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Statut
                  </label>
                  <select
                    name="statut"
                    value={formData.statut}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-[#0077C8] focus:outline-none focus:ring-4 focus:ring-[#0077C8]/10 transition"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Bientôt">Bientôt</option>
                    <option value="Clôturé">Clôturé</option>
                  </select>
                </div>
            {/* BOUTONS D'ACTION DU FORMULAIRE */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setIsEditOpen(false)} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold bg-[#0077C8] hover:bg-[#005FA1] text-white rounded-xl transition disabled:opacity-50"
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
