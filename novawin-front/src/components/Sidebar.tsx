'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/src/types/user';

interface SidebarProps {
  user: User;
  collapsed: boolean;
  mobileOpen: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'fa-chart-line', label: 'Tableau de bord', section: 'Administration' },
  { href: '/dashboard/produit', icon: 'fa-box', label: 'Produits', section: 'Administration' },
  { href: '/dashboard/categories', icon: 'fa-tags', label: 'Catégories', section: 'Administration' },
  { href: '/dashboard/users', icon: 'fa-users', label: 'Utilisateurs', section: 'Administration' },
  { href: '/dashboard/import/historique', icon: 'fa-clock-rotate-left', label: "Historique d'import", section: 'Gestion' },
  { href: '/dashboard/import', icon: 'fa-upload', label: 'Nouvel import', section: 'Gestion' },
];

export default function Sidebar({ user, collapsed, mobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = user.role === 'ROLE_SUPER_ADMIN';
  const isAdmin = isSuperAdmin || user.role === 'ROLE_ADMIN';

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  // Parmi toutes les entrées dont le href matche l'URL courante,
  // seule la plus longue (= la plus spécifique) doit s'allumer.
  // Ex: sur /dashboard/import/historique, les hrefs candidats sont
  // "/dashboard/import/historique" ET "/dashboard/import" — on ne garde que le plus long.
  const activeHref = [...NAV_ITEMS]
    .filter((item) => item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => href === activeHref;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div>
        {/* Brand - Logo centré avec 2 logos */}
        <div className="sidebar-brand-center">
          <img
            src="/images/logo.png"
            alt="Logo NOVAWIN"
            className="logo-normal"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/140x50/0b1329/00ffa3?text=NOVAWIN';
            }}
          />
          <img
            src="/images/logo1.png"
            alt="Logo NOVAWIN"
            className="logo-collapsed"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/45x45/0b1329/00ffa3?text=N';
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {isSuperAdmin && (
            <>
              <div className="sidebar-nav-section">
                <i className="fas fa-crown me-1" style={{ color: 'var(--emerald)' }}></i> Administration
              </div>
              {NAV_ITEMS.filter(item => item.section === 'Administration').map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span className="sidebar-nav-text">{item.label}</span>
                </Link>
              ))}
              <div className="sidebar-nav-section" style={{ marginTop: '1.5rem' }}>
                <i className="fas fa-cog me-1"></i> Gestion
              </div>
              {NAV_ITEMS.filter(item => item.section === 'Gestion').map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span className="sidebar-nav-text">{item.label}</span>
                </Link>
              ))}
            </>
          )}

          {!isSuperAdmin && isAdmin && (
            <>
              <div className="sidebar-nav-section">
                <i className="fas fa-users-cog me-1" style={{ color: 'var(--emerald)' }}></i> Gestion des utilisateurs
              </div>
              <Link
                href="/dashboard/users"
                className={`sidebar-nav-item ${isActive('/dashboard/users') ? 'active' : ''}`}
              >
                <i className="fas fa-users"></i>
                <span className="sidebar-nav-text">Utilisateurs</span>
              </Link>
              <div style={{ padding: '1rem 0.75rem', opacity: 0.3, fontSize: '0.7rem', color: 'var(--sidebar-text)', textAlign: 'center', borderTop: '1px solid var(--sidebar-border)', marginTop: '1rem' }}>
                <i className="fas fa-lock me-1"></i> Accès limité aux utilisateurs
              </div>
            </>
          )}

          {!isAdmin && (
            <>
              <div className="sidebar-nav-section">
                <i className="fas fa-lock me-1"></i> Accès restreint
              </div>
              <div style={{ padding: '2rem 0.75rem', opacity: 0.4, fontSize: '0.85rem', color: 'var(--sidebar-text)', textAlign: 'center' }}>
                <i className="fas fa-shield-alt fa-2x d-block mb-2" style={{ color: 'var(--emerald)', opacity: 0.5 }}></i>
                Vous n'avez pas les droits<br />d'accès à cette section.
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Profile */}
      <div className="sidebar-profile-container">
        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar">
            <div className="avatar-inner">{user.initial}</div>
          </div>
          <div className="sidebar-profile-details">
            <h4>{user.prenom} {user.nom}</h4>
            <span>{user.displayRole}</span>
          </div>
        </div>
        <button className="sidebar-logout-btn" title="Déconnexion" onClick={handleLogout}>
          <i className="fas fa-power-off"></i>
        </button>
      </div>
    </aside>
  );
}