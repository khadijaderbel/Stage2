export interface HistoriqueImport {
  id: number;
  nomFichier: string;
  statut: string;
  dateImportation: string | null;
  nombreImportes: number;
  nombreErreurs: number;
}

export interface DashboardStats {
  totalProduits: number;
  totalCategories: number;
  totalUsers: number;
  produitsActifs: number;
  produitsRupture: number;
  dernierImport: HistoriqueImport | null;
  importsMensuels: { months: string[]; counts: number[] };
  repartitionCategories: { categories: string[]; counts: number[] };
  derniersImports: HistoriqueImport[];
}