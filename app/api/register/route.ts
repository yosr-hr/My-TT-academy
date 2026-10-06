// app/api/register/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    // 1. Connexion à la base de données ges_form_bd
    await connectDB();

    // 2. Récupérer les données envoyées par le formulaire client
    const body = await req.json();
    const { N_CIN, matricule, nom, prenom, email, password, grade, Emploi_fonctionnel, telephone, qualification } = body;

    // 3. Validation de base (champs obligatoires)
    if (!N_CIN || !matricule || !nom || !prenom || !email || !password) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs obligatoires (CIN, Matricule, Nom, Prénom, Email, Mot de passe)" },
        { status: 400 }
      );
    }

    // 4. Vérifier si l'utilisateur existe déjà (par Email ou CIN ou Matricule)
    const userExists = await User.findOne({
      $or: [{ email }, { N_CIN }, { matricule }]
    });

    if (userExists) {
      return NextResponse.json(
        { error: "Un agent avec ce CIN, ce Matricule ou cet Email existe déjà." },
        { status: 400 }
      );
    }

    // 5. Créer le nouvel agent (le rôle sera "agent" par défaut grâce au modèle)
    const newUser = await User.create({
      N_CIN,
      matricule,
      nom,
      prenom,
      email,
      password, // Il sera haché automatiquement grâce au middleware de models/User.ts !
      grade,
      Emploi_functional: Emploi_fonctionnel, // Alignement avec le nom dans ton Schema
      telephone,
      qualification,
    });

    // 6. Réponse de succès (on ne renvoie pas le mot de passe dans la réponse par sécurité)
    return NextResponse.json(
      { 
        message: "Demande d'accès enregistrée avec succès !", 
        user: { id: newUser._id, nom: newUser.nom, prenom: newUser.prenom, email: newUser.email, role: newUser.role } 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Erreur lors de l'inscription :", error);
    return NextResponse.json(
      { error: "Une erreur interne du serveur est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
