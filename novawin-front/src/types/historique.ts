export interface ErreurDetail {
  ligne: number;
  sku: string;
  erreur: string;
  type?: string;
}

export interface HistoriqueListItem {
  id: number;
  nomFichier: string;
  formatFichier: string;
  dateImportation: string | null;
  nombreLignes: number;
  nombreImportes: number;
  nombreErreurs: number;
  statut: string;
}

export interface HistoriqueDetail extends HistoriqueListItem {
  messageResume: string | null;
  user: { id: number; prenom: string; nom: string } | null;
  erreurs: ErreurDetail[];
}

export interface HistoriqueStats {
  total: number;
  succes: number;
  succes_warnings: number;
  partiel: number;
  echec: number;
}