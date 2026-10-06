export type InscriptionStatus = "En cours" | "Terminé" | "À venir";

export interface InscriptionParticipant {
  id: string;
  name: string;
  email: string;
  attendance: string;
  certificate: "Délivré" | "En attente" | "Non éligible";
  registrationDate: string;
}

export interface AgentInscription {
  id: string;
  title: string;
  category: string;
  code: string;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  location: string;
  trainer: string;
  description: string;
  status: InscriptionStatus;
  participants: InscriptionParticipant[];
}
