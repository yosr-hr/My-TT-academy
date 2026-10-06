"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FilledAlert from "../../components/alert/FilledAlerts";
import type { Demande, DemandeStatus } from "../../lib/types/demandes";

const statusLabels: Record<DemandeStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

export default function DemandesPage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDemandes = useCallback(async () => {
    try {
      const response = await fetch("/api/demandes");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger les demandes.");
      setDemandes(data);
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Impossible de charger les demandes." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchDemandes(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchDemandes]);

  const updateStatus = async (demandeId: string, status: DemandeStatus) => {
    try {
      const response = await fetch("/api/demandes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de modifier la demande.");
      setDemandes((current) => current.map((demande) => demande._id === demandeId ? { ...demande, status } : demande));
      setNotification({ type: "success", message: `Demande ${statusLabels[status].toLowerCase()}.` });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Impossible de modifier la demande." });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#0077C8]">Administration</p>
            <h1 className="text-3xl font-black text-[#002F6C]">Demandes de formations</h1>
          </div>
          <Link href="/admin/dashboard" className="rounded-xl bg-[#002F6C] px-4 py-2 text-sm font-bold text-white">Retour au tableau de bord</Link>
        </div>

        {notification && <div className="mb-6"><FilledAlert alertType={notification.type} message={notification.message} /></div>}

        {loading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Chargement des demandes...</p>
        ) : demandes.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Aucune demande reçue.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {demandes.map((demande) => (
              <article key={demande._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-[#002F6C]">{demande.agent.name}</h2>
                    <p className="text-sm text-slate-500">{demande.agent.grade} · {demande.agent.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{statusLabels[demande.status]}</span>
                </div>
                <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
                  <p><span className="font-bold text-[#002F6C]">Code :</span> {demande.formation.code}</p>
                  <p><span className="font-bold text-[#002F6C]">Module :</span> {demande.formation.module}</p>
                </div>
                {demande.status === "PENDING" && (
                  <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => updateStatus(demande._id, "REJECTED")} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600">Refuser</button>
                    <button onClick={() => updateStatus(demande._id, "APPROVED")} className="rounded-xl bg-[#0077C8] px-4 py-2 text-sm font-bold text-white">Approuver</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
