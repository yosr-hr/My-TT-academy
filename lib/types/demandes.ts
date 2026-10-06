export type DemandeStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DemandePayload {
  formationId: string;
  agent: { name: string; grade: string; email: string };
  formation: { code: string; module: string };
}

export interface Demande extends DemandePayload {
  _id: string;
  status: DemandeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DemandeWithProfile extends Demande {
  profil: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    qualification: string | null;
    grade: string;
    emploiFonctionnel: string | null;
    registrationDate: string | null;
  } | null;
  formationDetails: {
    _id: string;
    code: string;
    module: string;
  } | null;
}
