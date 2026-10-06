import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken"; // 💡 Pense à faire : npm i jsonwebtoken @types/jsonwebtoken
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    await connectDB();

    // 1. Récupérer le token depuis les cookies du navigateur
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Non autorisé (aucun token trouvé)" }, { status: 401 });
    }

    // 2. Vérifier et décoder le token JWT pour obtenir l'ID de l'agent
    // (Remplace 'TON_SECRET_JWT' par ta clé secrète définie lors du login)
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "TON_SECRET_JWT");
    
    // 3. Chercher l'utilisateur spécifique dans MongoDB par son ID unique
    const user = await User.findById(decoded.userId).select("-password"); // On exclut le mot de passe par sécurité

    if (!user) {
      return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 4. Renvoyer l'utilisateur connecté (avec son nom et son grade exacts)
    return NextResponse.json(user);

  } catch (error) {
    return NextResponse.json(
      { message: "Session expirée ou invalide" }, 
      { status: 401 }
    );
  }
}