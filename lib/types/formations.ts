export type FormationStatus = "Disponible" | "Bientôt" | "Planifiée" | string;

export interface Formation {
  _id: string;
  code: string;
  module: string;
  type: string;
  populationCible: string;
  formateur: string;
  dateDebut: string;
  dateFin: string;
  duree: string;
  lieu: string;
  description: string;
  statut: FormationStatus;
  gouvernorat?: string;
  horaires?: string;
  pause?: string;
}
