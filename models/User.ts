import mongoose, { Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new Schema(
  {
    N_CIN: {
      type: String,
      required: [true, "Le numéro de CIN est obligatoire"],
      unique: true,
      trim: true,
    },
    matricule: {
      type: String,
      required: [true, "Le matricule est obligatoire"],
      unique: true,
      trim: true,
    },
    nom: {
      type: String,
      required: [true, "Le nom est obligatoire"],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, "Le prénom est obligatoire"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'adresse email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Veuillez fournir un e-mail valide",
      ],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est obligatoire"],
      minlength: [6, "Le mot de passe doit faire au moins 6 caractères"],
      select: false, // Cache le mot de passe par défaut lors des requêtes 
    },
    role: {
      type: String,
      enum: ["agent", "admin"],
      default: "agent", 
    },
    grade: {
      type: String,
      default: "",
    },
    Emploi_functional: {
      type: String,
      default: "",
    },
    telephone: { type: String, default: "", trim: true },
    qualification: { type: String, default: "", trim: true },
    resetCode: { type: String, required: false },
    resetCodeExpires: { type: Date, required: false }
  },
  {
    timestamps: true, 
  }
);

UserSchema.pre("save", async function (this: any) {
  // SI le mot de passe n'a pas été modifié  on saute le hachage
  if (!this.isModified("password")) {
    return;
  }

  // On ne hache QUE si c'est un nouveau mot de passe en texte brut
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return;
  } catch (error: any) {
    throw error;
  }
});

// Méthode d'instance pour comparer un mot de passe en clair avec le hash stocké
UserSchema.methods.comparePassword = async function (this: any, candidatePassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};
// forcer la réinitialisation du modèle
if ((models as any).User) {
  delete (models as any).User;
}
const User = models.User || model("User", UserSchema);
export default User;
