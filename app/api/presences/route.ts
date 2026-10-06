import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Demande from "@/models/Demandes";
import Formation from "@/models/Formation";
import Presence from "@/models/Presence";

type AttendanceStatus = "present" | "absent" | "justified";

async function isAuthenticated() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET || "TON_SECRET_JWT");
    return true;
  } catch {
    return false;
  }
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  const formationId = new URL(request.url).searchParams.get("formationId");
  if (!formationId || !mongoose.isValidObjectId(formationId)) {
    return NextResponse.json({ message: "Formation invalide." }, { status: 400 });
  }

  try {
    await connectDB();
    const formation = await Formation.findById(formationId).lean();
    if (!formation) return NextResponse.json({ message: "Formation introuvable." }, { status: 404 });
    const demandes = await Demande.aggregate([
      { $match: { formationId: new mongoose.Types.ObjectId(formationId), status: "APPROVED" } },
      { $lookup: { from: "users", localField: "agent.email", foreignField: "email", as: "profile" } },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: false } },
      { $project: { demandeId: "$_id", agentId: "$profile._id", nom: "$profile.nom", prenom: "$profile.prenom", matricule: "$profile.matricule", cin: "$profile.N_CIN", direction: "$profile.Emploi_functional", entreprise: { $literal: "Tunisie Telecom" } } },
      { $sort: { nom: 1, prenom: 1 } },
    ]);
    const presences = await Presence.find({ formationId: formation._id }).lean();
    const attendanceByAgent = new Map<string, Record<string, AttendanceStatus>>();
    for (const presence of presences) {
      const key = String(presence.agentId);
      const current = attendanceByAgent.get(key) || {};
      current[dayKey(new Date(presence.date))] = presence.status as AttendanceStatus;
      attendanceByAgent.set(key, current);
    }
    const start = formation.dateDebut ? new Date(formation.dateDebut) : new Date();
    const end = formation.dateFin ? new Date(formation.dateFin) : start;
    return NextResponse.json({
      formation: {
        _id: String(formation._id), code: formation.code || "-", module: formation.module || "-",
        lieu: formation.lieu || "-", gouvernorat: formation.gouvernorat || "-", horaires: formation.horaires || "08:30 - 14:30", pause: formation.pause || "-",
        dateDebut: start.toISOString(), dateFin: end.toISOString(),
      },
      dates: dateRange(start, end),
      participants: demandes.map((participant) => ({ ...participant, demandeId: String(participant.demandeId), agentId: String(participant.agentId), attendance: attendanceByAgent.get(String(participant.agentId)) || {} })),
    });
  } catch (error) {
    console.error("Error in /api/presences GET:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  try {
    const body = await request.json() as { formationId?: string; agentId?: string; date?: string; status?: AttendanceStatus };
    if (!body.formationId || !body.agentId || !body.date || !body.status || !["present", "absent", "justified"].includes(body.status) || !mongoose.isValidObjectId(body.formationId) || !mongoose.isValidObjectId(body.agentId)) {
      return NextResponse.json({ message: "Informations de présence invalides." }, { status: 400 });
    }
    await connectDB();
    const presence = await Presence.findOneAndUpdate(
      { formationId: body.formationId, agentId: body.agentId, date: new Date(`${body.date}T00:00:00.000Z`) },
      { $set: { status: body.status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json({ ...presence, _id: String(presence._id), formationId: String(presence.formationId), agentId: String(presence.agentId) });
  } catch (error) {
    console.error("Error in /api/presences PATCH:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}
