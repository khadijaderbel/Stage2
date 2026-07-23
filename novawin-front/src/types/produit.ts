export interface Produit {
  id: number;
  sku: string;
  nom: string;
  statut: 'actif' | 'inactif' | 'rupture';
  caracteristiques: string | null;
  descriptionOriginale: string | null;
  descriptionGeneree: string | null;
  imageUrl: string | null;
  categorie: { id: number; nom: string } | null;
  utilisateur: { id: number; prenom: string; nom: string } | null;
  dateCreation: string | null;
  dateModification: string | null;
}

export interface Pagination {
  currentPage: number;
  pageCount: number;
  totalItems: number;
  itemsPerPage: number;
}