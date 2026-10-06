// app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont obligatoires" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 });
    }

    // On passe le mot de passe EN TEXTE BRUT. 
    // Le UserSchema.pre("save") s'occupera de le hacher proprement !
    user.password = newPassword; 

    // On nettoie les codes de récupération
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    
    await user.save();

    return NextResponse.json({ message: "Votre mot de passe a été réinitialisé avec succès !" }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur Reset Password API:", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}