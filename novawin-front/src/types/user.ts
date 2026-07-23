export interface User {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_SUPER_ADMIN';
  displayRole: string;
  actif: boolean;
  isSuperAdmin: boolean;
  isCurrentUser?: boolean | null;
  initial: string;
}