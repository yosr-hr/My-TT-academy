// app/api/forgot-password/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "L'email est obligatoire" }, { status: 400 });
    }

    await connectDB();

    // 1. Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      // Pour la sécurité, on peut dire que si l'email existe, un code a été envoyé
      return NextResponse.json({ error: "Aucun compte associé à cet email" }, { status: 404 });
    }

    // 2. Générer un code à 6 chiffres aléatoires
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Le code sera valide pendant 15 minutes seulement
    const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Sauvegarder le code dans MongoDB sur l'utilisateur
    // Note : Ajoute temporairement ces deux champs à ton UserSchema s'ils n'y sont pas
    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    // 4. Configurer le transporteur d'email (Nodemailer avec Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 5. Contenu de l'email inspiré de Tunisie Telecom
    const mailOptions = {
      from: `"G.formation" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Code de récupération de mot de passe - G.formation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(to right, #0077C8, #00B2A9); padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">G.formation</h2>
          </div>
          <div style="padding: 20px; color: #333333; line-height: 1.6;">
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre espace de formation Tunisie Telecom.</p>
            <p>Voici votre code de sécurité unique (valable 15 minutes) :</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #002F6C; background-color: #f5f5f5; padding: 10px 20px; border-radius: 8px; border: 1px dashed #0077C8;">
                ${resetCode}
              </span>
            </div>
            <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
          </div>
        </div>
      `,
    };

    // 6. Envoyer l'email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Code de récupération envoyé par email !" }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur Forgot Password:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'envoi." }, { status: 500 });
  }
}