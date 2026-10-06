import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Demande from "@/models/Demandes";
import Formation from "@/models/Formation";
import User from "@/models/User";
import type { DemandePayload, DemandeStatus } from "@/lib/types/demandes";

async function getAuthenticatedUserId() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "TON_SECRET_JWT");
  return typeof decoded === "object" && decoded !== null && "userId" in decoded
    ? String(decoded.userId)
    : null;
}

export async function POST(request: Request) {
  try {
    if (!(await getAuthenticatedUserId())) {
      return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
    }
    const body = (await request.json()) as Partial<DemandePayload>;
    const { formationId, agent, formation } = body;
    if (!formationId || !agent?.name || !agent.grade || !agent.email || !formation?.code || !formation.module) {
      return NextResponse.json({ message: "Les informations de l'agent et de la formation sont requises." }, { status: 400 });
    }

    await connectDB();
    const selectedFormation = await Formation.findById(formationId).select("code module").lean();
    if (!selectedFormation) return NextResponse.json({ message: "Formation introuvable." }, { status: 404 });
    const existing = await Demande.findOne({ "agent.email": agent.email, formationId });
    if (existing) return NextResponse.json({ message: "Vous avez déjà demandé cette formation." }, { status: 409 });

    await Demande.create({
      formationId,
      agent,
      formation: { code: selectedFormation.code, module: selectedFormation.module },
      status: "PENDING",
    });
    return NextResponse.json({ success: true, message: "Demande d'inscription enregistrée avec succès !" }, { status: 201 });
  } catch (error) {
    console.error("Error in /api/demandes POST:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    if (!(await getAuthenticatedUserId())) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const formationId = searchParams.get("formationId");
    const formationFilter = formationId && mongoose.isValidObjectId(formationId)
      ? { formationId: new mongoose.Types.ObjectId(formationId) }
      : null;
    const demandes = await Demande.aggregate([
      ...(formationFilter ? [{ $match: formationFilter }] : []),
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "users", localField: "agent.email", foreignField: "email", as: "profilResult" } },
      { $lookup: { from: "formations", localField: "formationId", foreignField: "_id", as: "formationResult" } },
      {
        $project: {
          _id: 1, formationId: 1, agent: 1, formation: 1, status: 1, createdAt: 1, updatedAt: 1,
          profil: {
            $cond: [
              { $gt: [{ $size: "$profilResult" }, 0] },
              {
                $let: {
                  vars: { profile: { $arrayElemAt: ["$profilResult", 0] } },
                  in: {
                    nom: "$$profile.nom", prenom: "$$profile.prenom", email: "$$profile.email",
                    telephone: "$$profile.telephone", qualification: "$$profile.qualification",
                    grade: "$$profile.grade", emploiFonctionnel: "$$profile.Emploi_functional",
                    registrationDate: "$$profile.createdAt",
                  },
                },
              },
              null,
            ],
          },
          formationDetails: {
            $let: {
              vars: { selected: { $arrayElemAt: ["$formationResult", 0] } },
              in: { _id: "$$selected._id", code: "$$selected.code", module: "$$selected.module" },
            },
          },
        },
      },
    ]);
    return NextResponse.json(demandes);
  } catch (error) {
    console.error("Error in /api/demandes GET:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await getAuthenticatedUserId())) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
    const { demandeId, status } = (await request.json()) as { demandeId?: string; status?: DemandeStatus };
    if (!demandeId || !status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Demande ou statut invalide." }, { status: 400 });
    }
    await connectDB();
    const demandeBeforeUpdate = await Demande.findById(demandeId).select("agent.email").lean();
    if (!demandeBeforeUpdate) return NextResponse.json({ message: "Demande introuvable." }, { status: 404 });
    const profile = status === "APPROVED"
      ? await User.findOne({ email: demandeBeforeUpdate.agent.email }).select("_id").lean()
      : null;
    if (status === "APPROVED" && !profile) {
      return NextResponse.json({ message: "Le profil de l'agent est introuvable." }, { status: 422 });
    }
    const update = status === "APPROVED"
      ? { status, agentId: profile?._id, assignedAt: new Date() }
      : { status, $unset: { agentId: 1, assignedAt: 1 } };
    const demande = await Demande.findByIdAndUpdate(demandeId, update, { new: true }).lean();
    if (!demande) return NextResponse.json({ message: "Demande introuvable." }, { status: 404 });
    return NextResponse.json(demande);
  } catch (error) {
    console.error("Error in /api/demandes PATCH:", error);
    return NextResponse.json({ message: "Erreur interne du serveur." }, { status: 500 });
  }
}
