import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Demande from "@/models/Demandes";
import Formation from "@/models/Formation";
import Presence from "@/models/Presence";
import User from "@/models/User";

type AttendanceStatus = "present" | "absent" | "justified";

async function isAuthenticated() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return false;
  try { jwt.verify(token, process.env.JWT_SECRET || "TON_SECRET_JWT"); return true; } catch { return false; }
}

function daysBetween(start: Date, end: Date) {
  const from = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const to = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((to - from) / 86400000) + 1);
}

function monthKey(date: Date) { return date.toISOString().slice(0, 7); }

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  try {
    await connectDB();
    const [formations, demandes, presences] = await Promise.all([
      Formation.find().lean(),
      Demande.find().lean(),
      Presence.find().lean(),
    ]);
    const approved = demandes.filter((demande) => demande.status === "APPROVED");
    const formationMap = new Map(formations.map((formation) => [String(formation._id), formation]));
    const emailSet = [...new Set(approved.map((demande) => demande.agent.email))];
    const users = await User.find({ email: { $in: emailSet } }).select("_id email nom prenom matricule").lean();
    const userByEmail = new Map(users.map((user) => [user.email, user]));
    const presenceByPair = new Map<string, Map<string, AttendanceStatus>>();
    const monthly = new Map<string, { volume: number; present: number }>();
    for (const presence of presences) {
      const pair = String(presence.formationId) + ":" + String(presence.agentId);
      const dates = presenceByPair.get(pair) || new Map<string, AttendanceStatus>();
      dates.set(new Date(presence.date).toISOString().slice(0, 10), presence.status as AttendanceStatus);
      presenceByPair.set(pair, dates);
      const month = monthKey(new Date(presence.date));
      const metrics = monthly.get(month) || { volume: 0, present: 0 };
      metrics.volume += 1;
      if (presence.status === "present") metrics.present += 1;
      monthly.set(month, metrics);
    }

    let expectedAttendances = 0;
    let attendedAttendances = 0;
    const eligibility = approved.flatMap((demande) => {
      const formation = formationMap.get(String(demande.formationId));
      const user = userByEmail.get(demande.agent.email);
      if (!formation || !user) return [];
      const start = formation.dateDebut ? new Date(formation.dateDebut) : new Date();
      const end = formation.dateFin ? new Date(formation.dateFin) : start;
      const totalDays = daysBetween(start, end);
      const attendance = presenceByPair.get(`${formation._id}:${user._id}`) || new Map();
      const attendedDays = [...attendance.values()].filter((status) => status === "present").length;
      const absentDays = [...attendance.values()].filter((status) => status === "absent").length;
      expectedAttendances += totalDays;
      attendedAttendances += attendedDays;
      const absenceRate = (absentDays / totalDays) * 100;
      return [{
        agentId: String(user._id), agentName: `${user.prenom} ${user.nom}`.trim(), formationId: String(formation._id), formationTitle: formation.module || "Formation", totalDays, attendedDays, absenceRate: Number(absenceRate.toFixed(1)), eligible: absenceRate < 10,
      }];
    });
    const trend = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, metrics]) => ({ month, volume: metrics.volume, presenceRate: Number(((metrics.present / metrics.volume) * 100).toFixed(1)) }));
    const now = new Date();
    const completed = formations.filter((formation) => formation.dateFin && new Date(formation.dateFin) < now).length;
    return NextResponse.json({
      summary: { totalFormations: formations.length, attendanceRate: expectedAttendances ? Number(((attendedAttendances / expectedAttendances) * 100).toFixed(1)) : 0, registeredParticipants: demandes.length, certificatesAwarded: eligibility.filter((item) => item.eligible).length },
      monthlyAttendance: trend,
      formationBreakdown: { labels: ["Formations terminées", "Formations en cours"], values: [completed, Math.max(0, formations.length - completed)] },
      eligibility,
    });
  } catch (error) {
    console.error("Error in /api/rapports GET:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}
