import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Demande from "@/models/Demandes";
import Formation from "@/models/Formation";
import Presence from "@/models/Presence";
import User from "@/models/User";
import type { AgentInscription, InscriptionParticipant } from "@/lib/types/inscriptions";

type JwtPayload = { userId?: string };
type AttendanceRecord = { status: "present" | "absent" | "justified" };

function getFormationStatus(startDate: Date | null, endDate: Date | null): AgentInscription["status"] {
  const now = new Date();
  if (startDate && now < startDate) return "À venir";
  if (endDate && now > endDate) return "Terminé";
  return "En cours";
}

function getCertificateStatus(status: AgentInscription["status"], attendance: string): InscriptionParticipant["certificate"] {
  if (status !== "Terminé") return "En attente";
  const percentage = Number.parseInt(attendance, 10);
  if (attendance === "Présent" || percentage >= 80) return "Délivré";
  return "Non éligible";
}

function getAttendanceLabel(records: AttendanceRecord[], status: AgentInscription["status"]): string {
  if (records.length === 0) return status === "À venir" ? "À venir" : "Non renseignée";
  const attended = records.filter((record) => record.status !== "absent").length;
  if (attended === records.length && records.length === 1) return "Présent";
  if (attended === 0) return "Absent";
  return `${Math.round((attended / records.length) * 100)}% effectué`;
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET() {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "TON_SECRET_JWT") as JwtPayload;
    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      return NextResponse.json({ message: "Session invalide." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId).select("_id email").lean();
    if (!user) return NextResponse.json({ message: "Utilisateur introuvable." }, { status: 404 });

    const demandes = await Demande.find({
      status: "APPROVED",
      $or: [{ agentId: user._id }, { "agent.email": user.email }],
    }).sort({ createdAt: -1 }).lean();

    const formationIds = demandes.map((demande) => demande.formationId);
    const formations = await Formation.find({ _id: { $in: formationIds } }).lean();
    const formationById = new Map(formations.map((formation) => [String(formation._id), formation]));
    const agentIds = demandes.map((demande) => demande.agentId).filter(Boolean);
    const presences = await Presence.find({ formationId: { $in: formationIds }, agentId: { $in: agentIds } }).select("formationId agentId status").lean();
    const presenceByRegistration = new Map<string, AttendanceRecord[]>();

    for (const presence of presences) {
      const key = `${String(presence.formationId)}:${String(presence.agentId)}`;
      const records = presenceByRegistration.get(key) || [];
      records.push({ status: presence.status as AttendanceRecord["status"] });
      presenceByRegistration.set(key, records);
    }

    const result: AgentInscription[] = [];
    for (const demande of demandes) {
      const formation = formationById.get(String(demande.formationId));
      if (!formation) continue;

      const startDate = formation.dateDebut ? new Date(formation.dateDebut) : null;
      const endDate = formation.dateFin ? new Date(formation.dateFin) : null;
      const status = getFormationStatus(startDate, endDate);
      const records = demande.agentId
        ? presenceByRegistration.get(`${String(demande.formationId)}:${String(demande.agentId)}`) || []
        : [];
      const attendance = getAttendanceLabel(records, status);
      const participant: InscriptionParticipant = {
        id: String(demande._id),
        name: demande.agent?.name || "Participant non renseigné",
        email: demande.agent?.email || "-",
        attendance,
        certificate: getCertificateStatus(status, attendance),
        registrationDate: new Date(demande.createdAt).toISOString(),
      };
      const existing = result.find((item) => item.id === String(demande.formationId));
      if (existing) existing.participants.push(participant);
      else result.push({
        id: String(demande.formationId),
        title: formation.module || "Formation sans titre",
        category: formation.type || "Catégorie non renseignée",
        code: formation.code || "-",
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        duration: formation.duree || "-",
        location: formation.lieu || "-",
        trainer: formation.formateur || "-",
        description: formation.description || "",
        status,
        participants: [participant],
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/agent/inscriptions GET:", error);
    return NextResponse.json({ message: "Impossible de charger vos inscriptions." }, { status: 500 });
  }
}
