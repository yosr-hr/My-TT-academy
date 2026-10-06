import mongoose, { Schema, model, models } from "mongoose";
const FormationSchema = new mongoose.Schema({
  module: String,
  code: String,
  populationCible: String,
  formateur: String,
  dateDebut: Date,
  dateFin: Date,
  duree: String,
  type: String,
  lieu: String,
  gouvernorat: String,
  horaires: String,
  pause: String,
  description: String,
  statut: {
    type: String,
    default: "Disponible",
  },
});

export default mongoose.models.Formation ||
  mongoose.model("Formation", FormationSchema);
