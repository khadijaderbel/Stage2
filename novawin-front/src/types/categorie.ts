export interface Categorie {
  id: number;
  nom: string;
  description: string | null;
  utilisateur: {
    id: number;
    prenom: string;
    nom: string;
  } | null;
}