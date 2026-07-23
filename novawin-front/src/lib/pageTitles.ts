interface PageTitleEntry {
  match: (path: string) => boolean;
  title: string;
  subtitle: string;
}

// Reproduit fidèlement la logique du JS Twig : le sous-titre d'une sous-page
// (ex: /dashboard/produit/nouveau) retombe sur celui de la page liste parente,
// via un préfixe plutôt qu'une correspondance exacte — comportement identique
// à `currentPath.includes(href)` dans base.html.twig.
const PAGE_TITLES: PageTitleEntry[] = [
  { match: (p) => p === '/dashboard', title: 'Tableau de bord', subtitle: "Vue d'ensemble de votre activité" },
  { match: (p) => p.startsWith('/dashboard/produit'), title: 'Gestion des Produits', subtitle: 'Gérez votre catalogue de produits' },
  { match: (p) => p.startsWith('/dashboard/categorie'), title: 'Gestion des Catégories', subtitle: 'Organisez votre catalogue par catégories' },
  { match: (p) => p.startsWith('/dashboard/import/historique'), title: "Historique d'import", subtitle: 'Suivez vos imports de catalogue' },
  { match: (p) => p.startsWith('/dashboard/import'), title: 'Nouvel import', subtitle: 'Importez un nouveau catalogue' },
  { match: (p) => p.startsWith('/dashboard/users'), title: 'Gestion des Utilisateurs', subtitle: 'Gérez les accès de votre équipe' },
  { match: (p) => p.startsWith('/dashboard/profile'), title: 'Mon profil', subtitle: 'Gérez vos informations personnelles' },
];

export function getPageTitle(pathname: string): { title: string; subtitle: string } {
  const found = PAGE_TITLES.find((entry) => entry.match(pathname));
  return found ? { title: found.title, subtitle: found.subtitle } : { title: 'NOVAWIN', subtitle: '' };
}